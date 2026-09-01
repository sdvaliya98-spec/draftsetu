from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from datetime import timedelta, datetime
import bcrypt
import jwt
import os
import threading

from backend import models, database
from pydantic import BaseModel
from backend.schemas.user import UserCreate, UserLogin, ForgotPasswordVerify, ForgotPasswordReset, GoogleAuthRequest
from backend.core.config import settings
import logging

logger = logging.getLogger("backend.routers.auth")

router = APIRouter(tags=["auth"])

# In-memory login rate limiter tracking
FAILED_ATTEMPTS = {}
FAILED_ATTEMPTS_LOCK = threading.Lock()

def check_login_rate_limit(ip: str) -> bool:
    """
    Checks if the IP has exceeded 5 failed login attempts in the last minute.
    Returns True if rate limit is exceeded, False otherwise.
    """
    now = datetime.utcnow()
    one_minute_ago = now - timedelta(minutes=1)
    with FAILED_ATTEMPTS_LOCK:
        if ip in FAILED_ATTEMPTS:
            FAILED_ATTEMPTS[ip] = [t for t in FAILED_ATTEMPTS[ip] if t > one_minute_ago]
            if len(FAILED_ATTEMPTS[ip]) >= 5:
                return True
        return False

def record_failed_attempt(ip: str):
    """
    Records a failed login attempt for the given IP.
    """
    now = datetime.utcnow()
    with FAILED_ATTEMPTS_LOCK:
        if ip not in FAILED_ATTEMPTS:
            FAILED_ATTEMPTS[ip] = []
        FAILED_ATTEMPTS[ip].append(now)

from backend.services.auth_service import (
    verify_password,
    get_password_hash,
    create_access_token,
    get_current_user,
    get_admin_user,
    ACCESS_TOKEN_EXPIRE_MINUTES
)

@router.post("/auth/register")
@router.post("/register")
async def register(user: UserCreate, db: Session = Depends(database.get_db)):
    if len(user.username.strip()) < 3:
        raise HTTPException(status_code=400, detail="Username must be at least 3 characters")
    
    # Password strength validation
    password = user.password
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters long")
    if not any(c.isupper() for c in password):
        raise HTTPException(status_code=400, detail="Password must contain at least one uppercase letter")
    if not any(c.islower() for c in password):
        raise HTTPException(status_code=400, detail="Password must contain at least one lowercase letter")
    if not any(c.isdigit() for c in password):
        raise HTTPException(status_code=400, detail="Password must contain at least one number")

    if not user.birth_date or not user.birth_date.strip():
        raise HTTPException(status_code=400, detail="Birth date is required")
    if not user.mobile_number or not user.mobile_number.strip():
        raise HTTPException(status_code=400, detail="Mobile number is required")

    mobile_cleaned = "".join(c for c in user.mobile_number if c.isdigit())
    if len(mobile_cleaned) < 10:
        raise HTTPException(status_code=400, detail="Mobile number must be at least 10 digits long")

    existing = db.query(models.User).filter(models.User.username == user.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    hashed = get_password_hash(user.password)
    new_user = models.User(
        username=user.username,
        password_hash=hashed,
        birth_date=user.birth_date.strip(),
        mobile_number=mobile_cleaned
    )
    db.add(new_user)
    db.flush()  # Generate user.id for referencing in wallet

    try:
        from backend.services.wallet_service import WalletService
        WalletService.grant_signup_bonus(db, new_user.id)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create user wallet and credit signup bonus: {str(e)}"
        )

    db.refresh(new_user)
    
    access_token = create_access_token(data={"sub": new_user.username, "is_admin": new_user.is_admin})
    return {"access_token": access_token, "token_type": "bearer", 
            "username": new_user.username, "is_admin": new_user.is_admin}

@router.post("/auth/login")
@router.post("/login")
async def login(request: Request, user: UserLogin, db: Session = Depends(database.get_db)):
    from backend.services.activity_service import log_activity

    # Extract client IP (handles Nginx reverse proxy headers)
    client_ip = request.headers.get("X-Forwarded-For") or (request.client.host if request.client else "127.0.0.1")
    if client_ip and "," in client_ip:
        client_ip = client_ip.split(",")[0].strip()

    # Check login rate limit
    if check_login_rate_limit(client_ip):
        raise HTTPException(
            status_code=429,
            detail="Too many failed login attempts. Please try again after 1 minute."
        )

    login_successful = False
    try:
        db_user = db.query(models.User).filter(models.User.username == user.username).first()
        if not db_user:
            log_activity(db, user.username, "Login Failed")
            raise HTTPException(status_code=401, detail="Incorrect username or password")
        
        # Check if account is active
        if not db_user.is_active:
            log_activity(db, db_user.username, "Login Failed")
            raise HTTPException(status_code=403, detail="Account disabled. Contact administrator.")
            
        if not verify_password(user.password, db_user.password_hash):
            log_activity(db, db_user.username, "Login Failed")
            raise HTTPException(status_code=401, detail="Incorrect username or password")
        
        login_successful = True
    finally:
        if not login_successful:
            record_failed_attempt(client_ip)

    access_token = create_access_token(data={"sub": db_user.username, "is_admin": db_user.is_admin}, 
                                      expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    
    # Log login success activity
    log_activity(db, db_user.username, "Login Success")

    return {"access_token": access_token, "token_type": "bearer", 
            "username": db_user.username, "is_admin": db_user.is_admin, "user_id": db_user.id}


@router.post("/auth/google")
@router.post("/google")
async def google_login(
    request: Request,
    payload: GoogleAuthRequest,
    db: Session = Depends(database.get_db)
):
    from backend.services.activity_service import log_activity
    from backend.services.wallet_service import WalletService
    from google.oauth2 import id_token
    from google.auth.transport import requests as google_requests
    import re

    # 1. Client IP rate limiting
    client_ip = request.headers.get("X-Forwarded-For") or (request.client.host if request.client else "127.0.0.1")
    if client_ip and "," in client_ip:
        client_ip = client_ip.split(",")[0].strip()

    if check_login_rate_limit(client_ip):
        raise HTTPException(
            status_code=429,
            detail="Too many failed authentication attempts. Please try again after 1 minute."
        )

    token_str = payload.id_token.strip() if payload.id_token else ""
    if not token_str:
        record_failed_attempt(client_ip)
        raise HTTPException(status_code=400, detail="Missing Google ID token")

    # 2. Verify Google ID token server-side
    google_client_id = settings.GOOGLE_CLIENT_ID.strip() if settings.GOOGLE_CLIENT_ID else None
    
    try:
        id_info = id_token.verify_oauth2_token(
            token_str,
            google_requests.Request(),
            audience=google_client_id
        )
    except Exception as e:
        record_failed_attempt(client_ip)
        logger.warning(f"Google ID token verification failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid or expired Google authentication token")

    # 3. Validate issuer
    issuer = id_info.get("iss")
    if issuer not in ["accounts.google.com", "https://accounts.google.com"]:
        record_failed_attempt(client_ip)
        raise HTTPException(status_code=401, detail="Invalid token issuer")

    # 4. Validate google_sub
    google_sub = id_info.get("sub")
    if not google_sub:
        record_failed_attempt(client_ip)
        raise HTTPException(status_code=400, detail="Invalid Google profile identifier")

    # 5. Validate email and email_verified
    email = id_info.get("email")
    email_verified = id_info.get("email_verified", False)
    if not email:
        raise HTTPException(status_code=400, detail="Google account must provide an email address")
    if not email_verified:
        raise HTTPException(status_code=400, detail="Google email is not verified")

    email = email.strip().lower()
    avatar_url = id_info.get("picture")

    # 6. Account Resolution & Linking Strategy
    # Priority 1: Match by existing google_sub
    db_user = db.query(models.User).filter(models.User.google_sub == google_sub).first()

    if db_user:
        if not db_user.is_active:
            log_activity(db, db_user.username, "Google Login Blocked - Inactive Account")
            raise HTTPException(status_code=403, detail="Account disabled. Contact administrator.")
        
        # Update email/avatar if needed
        if email and db_user.email != email:
            db_user.email = email
            db_user.email_verified = True
        if avatar_url and db_user.avatar_url != avatar_url:
            db_user.avatar_url = avatar_url
        db.commit()
        db.refresh(db_user)
    else:
        # Priority 2: Match by verified email for safe account linking
        db_user = db.query(models.User).filter(models.User.email == email).first()
        if db_user:
            if not db_user.is_active:
                log_activity(db, db_user.username, "Google Login Blocked - Inactive Account")
                raise HTTPException(status_code=403, detail="Account disabled. Contact administrator.")
            
            # Link Google sub to existing account (DO NOT grant duplicate bonus)
            db_user.google_sub = google_sub
            db_user.email_verified = True
            db_user.auth_provider = "both"
            if avatar_url and not db_user.avatar_url:
                db_user.avatar_url = avatar_url
            db.commit()
            db.refresh(db_user)
            log_activity(db, db_user.username, "Google Account Linked")
        else:
            # Priority 3: Create a new Google user
            base_username = re.sub(r'[^a-zA-Z0-9_]', '_', email.split("@")[0]).strip("_")
            if len(base_username) < 3:
                base_username = f"user_{base_username}"
            
            unique_username = base_username
            counter = 1
            while db.query(models.User).filter(models.User.username == unique_username).first() is not None:
                unique_username = f"{base_username}_{counter}"
                counter += 1

            new_user = models.User(
                username=unique_username,
                email=email,
                google_sub=google_sub,
                auth_provider="google",
                email_verified=True,
                avatar_url=avatar_url,
                password_hash=None,
                is_active=True
            )
            db.add(new_user)
            db.flush()  # Generate new_user.id for wallet creation

            try:
                WalletService.grant_signup_bonus(db, new_user.id)
                db.commit()
            except Exception as e:
                db.rollback()
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to create user wallet and credit signup bonus: {str(e)}"
                )

            db.refresh(new_user)
            db_user = new_user
            log_activity(db, db_user.username, "Google Signup & Login Success")

    # 7. Mint standard DraftSetu JWT
    access_token = create_access_token(
        data={"sub": db_user.username, "is_admin": db_user.is_admin},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    log_activity(db, db_user.username, "Google Login Success")

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "username": db_user.username,
        "is_admin": db_user.is_admin,
        "user_id": db_user.id,
        "email": db_user.email,
        "avatar_url": db_user.avatar_url
    }


@router.post("/auth/logout")
@router.post("/logout")
async def logout(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Log logout activity
    from backend.services.activity_service import log_activity
    log_activity(db, current_user.username, "Logout")
    return {"status": "ok"}


@router.post("/auth/forgot-password/verify")
@router.post("/forgot-password/verify")
async def forgot_password_verify(data: ForgotPasswordVerify, db: Session = Depends(database.get_db)):
    db_user = db.query(models.User).filter(models.User.username == data.username.strip()).first()
    if not db_user:
        raise HTTPException(status_code=400, detail="User details do not match.")
    
    # We clean the input mobile number to compare digits-only
    input_mobile = "".join(c for c in data.mobile_number if c.isdigit())
    db_mobile = "".join(c for c in (db_user.mobile_number or "") if c.isdigit())
    
    # Compare DOB and mobile number
    if db_user.birth_date != data.birth_date.strip() or db_mobile != input_mobile:
        raise HTTPException(status_code=400, detail="User details do not match.")
        
    # Generate a short-lived token (10 minutes) for reset password
    token = create_access_token(
        data={"sub": db_user.username, "purpose": "reset_password"},
        expires_delta=timedelta(minutes=10)
    )
    return {"status": "verified", "token": token}


@router.post("/auth/forgot-password/reset")
@router.post("/forgot-password/reset")
async def forgot_password_reset(data: ForgotPasswordReset, db: Session = Depends(database.get_db)):
    from backend.services.activity_service import log_activity
    from backend.services.auth_service import SECRET_KEY, ALGORITHM
    
    try:
        payload = jwt.decode(data.token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        purpose: str = payload.get("purpose")
        if username is None or purpose != "reset_password":
            raise HTTPException(status_code=400, detail="Reset link expired or invalid.")
    except jwt.PyJWTError:
        raise HTTPException(status_code=400, detail="Reset link expired or invalid.")
        
    db_user = db.query(models.User).filter(models.User.username == username).first()
    if not db_user:
        raise HTTPException(status_code=400, detail="User not found.")
        
    # Password strength validation
    password = data.new_password
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters long")
    if not any(c.isupper() for c in password):
        raise HTTPException(status_code=400, detail="Password must contain at least one uppercase letter")
    if not any(c.islower() for c in password):
        raise HTTPException(status_code=400, detail="Password must contain at least one lowercase letter")
    if not any(c.isdigit() for c in password):
        raise HTTPException(status_code=400, detail="Password must contain at least one number")
        
    hashed = get_password_hash(password)
    db_user.password_hash = hashed
    
    # Log password reset action
    log_activity(db, db_user.username, "Password Reset")
    
    db.commit()
    return {"status": "success", "message": "Password reset successfully"}
