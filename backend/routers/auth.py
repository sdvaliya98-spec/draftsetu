from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func
from datetime import timedelta, datetime
import bcrypt
import jwt
import os
import re
import threading

from backend import models, database
from pydantic import BaseModel
from backend.schemas.user import (
    UserCreate,
    UserLogin,
    ForgotPasswordRequest,
    ForgotPasswordVerify,
    ForgotPasswordReset,
    TokenVerificationRequest,
    GoogleAuthRequest,
    CompleteProfileRequest,
    UserProfileUpdate
)
from backend.core.config import settings
import logging

logger = logging.getLogger("backend.routers.auth")

router = APIRouter(tags=["auth"])

# In-memory login & forgot-password rate limiter tracking
FAILED_ATTEMPTS = {}
FAILED_ATTEMPTS_LOCK = threading.Lock()

FORGOT_ATTEMPTS = {}
FORGOT_ATTEMPTS_LOCK = threading.Lock()

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

def check_forgot_password_rate_limit(ip: str) -> bool:
    """
    Checks if the IP has exceeded 5 forgot password requests in the last minute.
    """
    now = datetime.utcnow()
    one_minute_ago = now - timedelta(minutes=1)
    with FORGOT_ATTEMPTS_LOCK:
        if ip not in FORGOT_ATTEMPTS:
            FORGOT_ATTEMPTS[ip] = []
        FORGOT_ATTEMPTS[ip] = [t for t in FORGOT_ATTEMPTS[ip] if t > one_minute_ago]
        if len(FORGOT_ATTEMPTS[ip]) >= 5:
            return True
        FORGOT_ATTEMPTS[ip].append(now)
        return False

from backend.services.auth_service import (
    verify_password,
    get_password_hash,
    create_access_token,
    is_password_reset_allowed,
    create_password_reset_token,
    verify_password_reset_token,
    invalidate_password_reset_jti,
    get_current_user,
    get_admin_user,
    ACCESS_TOKEN_EXPIRE_MINUTES
)

@router.post("/auth/register")
@router.post("/register")
async def register(user: UserCreate, db: Session = Depends(database.get_db)):
    # 1. Full Name validation
    full_name = (user.full_name or "").strip()
    if not full_name:
        raise HTTPException(status_code=400, detail="Full Name is required")

    # 2. Email Address validation
    email = (user.email or "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email Address is required")
    if not re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", email):
        raise HTTPException(status_code=400, detail="Please enter a valid email address")

    # Email uniqueness check
    existing_email = db.query(models.User).filter(
        models.User.email.isnot(None),
        func.lower(models.User.email) == email
    ).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already registered")

    # 3. Username validation (EXACTLY 6 characters, letters and numbers only)
    username = (user.username or "").strip()
    if len(username) != 6:
        raise HTTPException(status_code=400, detail="Username must be exactly 6 characters.")
    if not re.match(r"^[a-zA-Z0-9]{6}$", username):
        raise HTTPException(status_code=400, detail="Username must contain only letters and numbers.")

    # Username uniqueness check
    existing_user = db.query(models.User).filter(
        func.lower(models.User.username) == username.lower()
    ).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")

    # 4. Phone / Mobile number validation
    mobile_raw = (user.mobile_number or "").strip()
    if not mobile_raw:
        raise HTTPException(status_code=400, detail="Mobile number is required")
    mobile_cleaned = "".join(c for c in mobile_raw if c.isdigit())
    if len(mobile_cleaned) < 10:
        raise HTTPException(status_code=400, detail="Mobile number must be at least 10 digits long")

    # 5. City validation
    city = (user.city or "").strip()
    if not city:
        raise HTTPException(status_code=400, detail="City is required")

    # 6. Password strength validation
    password = user.password or ""
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters long")
    if not any(c.isupper() for c in password):
        raise HTTPException(status_code=400, detail="Password must contain at least one uppercase letter")
    if not any(c.islower() for c in password):
        raise HTTPException(status_code=400, detail="Password must contain at least one lowercase letter")
    if not any(c.isdigit() for c in password):
        raise HTTPException(status_code=400, detail="Password must contain at least one number")

    hashed = get_password_hash(password)
    new_user = models.User(
        username=username,
        email=email,
        full_name=full_name,
        city=city,
        password_hash=hashed,
        birth_date=(user.birth_date or "").strip() if user.birth_date else None,
        mobile_number=mobile_cleaned,
        auth_provider="local",
        document_limit=10,
        is_active=True
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
            "username": new_user.username, "is_admin": new_user.is_admin,
            "document_limit": new_user.document_limit}

@router.get("/auth/me")
@router.get("/me")
def get_current_user_profile(
    current_user: models.User = Depends(get_current_user)
):
    """Retrieve authenticated user's profile and configured document limit."""
    requires_profile_completion = (
        current_user.auth_provider == "google" and
        (not current_user.mobile_number or not current_user.city or not current_user.full_name)
    )
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "mobile_number": current_user.mobile_number,
        "city": current_user.city,
        "is_admin": current_user.is_admin,
        "is_active": current_user.is_active,
        "document_limit": current_user.document_limit,
        "auth_provider": current_user.auth_provider,
        "requires_profile_completion": bool(requires_profile_completion),
        "created_at": current_user.created_at.isoformat() if current_user.created_at else None
    }

@router.put("/auth/profile")
@router.put("/profile")
async def update_current_user_profile(
    payload: UserProfileUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Self-service profile update for authenticated users and Google Profile Completion.
    Users can edit only: Full Name, Username, Mobile Number, City.
    User ID, Email, Role, document_limit, and wallet are immutable here.
    """
    from backend.services.activity_service import log_activity

    fields_set = payload.model_fields_set if hasattr(payload, "model_fields_set") else getattr(payload, "__fields_set__", set())

    is_completing_profile = (
        current_user.auth_provider == "google" and
        (not current_user.mobile_number or not current_user.city or not current_user.full_name)
    )

    if is_completing_profile:
        # Profile completion for Google users requires full name, mobile (10 digits), and city
        if "full_name" in fields_set and payload.full_name is not None:
            raw_name = payload.full_name.strip()
            if not raw_name:
                raise HTTPException(status_code=400, detail="Full Name cannot be empty")
            current_user.full_name = raw_name

        if "username" in fields_set and payload.username is not None:
            raw_username = payload.username.strip()
            if not raw_username:
                raise HTTPException(status_code=400, detail="Username cannot be empty")
            if raw_username.lower() != current_user.username.lower():
                if len(raw_username) != 6:
                    raise HTTPException(status_code=400, detail="Username must be exactly 6 characters.")
                if not re.match(r"^[a-zA-Z0-9]{6}$", raw_username):
                    raise HTTPException(status_code=400, detail="Username must contain only letters and numbers.")
                dup_user = db.query(models.User).filter(
                    func.lower(models.User.username) == raw_username.lower(),
                    models.User.id != current_user.id
                ).first()
                if dup_user:
                    raise HTTPException(status_code=400, detail="Username is already taken by another user")
                current_user.username = raw_username

        # Mobile validation for profile completion
        raw_mobile = (payload.mobile_number or "").strip()
        if not raw_mobile:
            raise HTTPException(status_code=400, detail="Mobile number is required")
        digits_only = "".join(c for c in raw_mobile if c.isdigit())
        if len(digits_only) != 10:
            raise HTTPException(status_code=400, detail="Mobile number must be exactly 10 digits")
        current_user.mobile_number = digits_only

        # City validation for profile completion
        raw_city = (payload.city or "").strip()
        if not raw_city:
            raise HTTPException(status_code=400, detail="City is required")
        current_user.city = raw_city

    else:
        # 1. Full Name
        if "full_name" in fields_set:
            raw_name = (payload.full_name or "").strip()
            current_user.full_name = raw_name if raw_name else None

        # 2. Username (6-character alphanumeric validation and uniqueness)
        if "username" in fields_set and payload.username is not None:
            raw_username = payload.username.strip()
            if not raw_username:
                raise HTTPException(status_code=400, detail="Username cannot be empty")
            if raw_username.lower() != current_user.username.lower():
                if len(raw_username) != 6:
                    raise HTTPException(status_code=400, detail="Username must be exactly 6 characters.")
                if not re.match(r"^[a-zA-Z0-9]{6}$", raw_username):
                    raise HTTPException(status_code=400, detail="Username must contain only letters and numbers.")

                dup_user = db.query(models.User).filter(
                    func.lower(models.User.username) == raw_username.lower(),
                    models.User.id != current_user.id
                ).first()
                if dup_user:
                    raise HTTPException(status_code=400, detail="Username is already taken by another user")
                current_user.username = raw_username

        # 3. Mobile Number (10 digits validation when provided)
        if "mobile_number" in fields_set:
            raw_mobile = (payload.mobile_number or "").strip()
            if raw_mobile:
                digits_only = "".join(c for c in raw_mobile if c.isdigit())
                if len(digits_only) != 10:
                    raise HTTPException(status_code=400, detail="Mobile number must be exactly 10 digits")
                current_user.mobile_number = digits_only
            else:
                current_user.mobile_number = None

        # 4. City
        if "city" in fields_set:
            raw_city = (payload.city or "").strip()
            current_user.city = raw_city if raw_city else None

    db.commit()
    db.refresh(current_user)

    log_activity(db, current_user.username, "Profile Updated")

    requires_profile_completion = (
        current_user.auth_provider == "google" and
        (not current_user.mobile_number or not current_user.city or not current_user.full_name)
    )

    access_token = create_access_token(
        data={"sub": current_user.username, "is_admin": current_user.is_admin},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "mobile_number": current_user.mobile_number,
        "city": current_user.city,
        "is_admin": current_user.is_admin,
        "is_active": current_user.is_active,
        "document_limit": current_user.document_limit,
        "auth_provider": current_user.auth_provider,
        "requires_profile_completion": bool(requires_profile_completion)
    }

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
            "username": db_user.username, "is_admin": db_user.is_admin, "user_id": db_user.id,
            "document_limit": db_user.document_limit}


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
    google_client_id = (
        (settings.GOOGLE_CLIENT_ID.strip() if settings.GOOGLE_CLIENT_ID else None)
        or os.getenv("GOOGLE_CLIENT_ID", "").strip()
        or None
    )
    
    try:
        id_info = id_token.verify_oauth2_token(
            token_str,
            google_requests.Request(),
            audience=google_client_id
        )
    except Exception as e:
        record_failed_attempt(client_ip)
        cid_display = f"{google_client_id[:12]}...{google_client_id[-10:]}" if google_client_id and len(google_client_id) > 22 else (google_client_id or "None")
        logger.warning(f"Google ID token verification failed: {type(e).__name__} - {e} (Configured Audience: {cid_display})")
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
    full_name = (id_info.get("name") or "").strip()

    # 6. Account Resolution & Linking Strategy
    # Priority 1: Match by existing google_sub
    db_user = db.query(models.User).filter(models.User.google_sub == google_sub).first()

    if db_user:
        if not db_user.is_active:
            log_activity(db, db_user.username, "Google Login Blocked - Inactive Account")
            raise HTTPException(status_code=403, detail="Account disabled. Contact administrator.")
        
        # Update email/avatar/full_name if needed
        if email and db_user.email != email:
            db_user.email = email
            db_user.email_verified = True
        if avatar_url and db_user.avatar_url != avatar_url:
            db_user.avatar_url = avatar_url
        if full_name and not db_user.full_name:
            db_user.full_name = full_name
        db.commit()
        db.refresh(db_user)
    else:
        # Priority 2: Match by verified email for safe account linking (case-insensitive)
        db_user = db.query(models.User).filter(
            models.User.email.isnot(None),
            func.lower(models.User.email) == email
        ).first()
        if db_user:
            if not db_user.is_active:
                log_activity(db, db_user.username, "Google Login Blocked - Inactive Account")
                raise HTTPException(status_code=403, detail="Account disabled. Contact administrator.")
            
            # Link Google sub to existing account (DO NOT grant duplicate bonus)
            db_user.google_sub = google_sub
            db_user.email_verified = True
            db_user.auth_provider = "both" if (db_user.password_hash and db_user.password_hash.startswith("$2")) else "google"
            if avatar_url and not db_user.avatar_url:
                db_user.avatar_url = avatar_url
            if full_name and not db_user.full_name:
                db_user.full_name = full_name
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
            while db.query(models.User).filter(func.lower(models.User.username) == unique_username.lower()).first() is not None:
                unique_username = f"{base_username}_{counter}"
                counter += 1

            new_user = models.User(
                username=unique_username,
                email=email,
                google_sub=google_sub,
                auth_provider="google",
                email_verified=True,
                avatar_url=avatar_url,
                full_name=full_name or None,
                password_hash="!google_oauth_no_password",
                document_limit=10,
                is_active=True
            )
            db.add(new_user)
            db.flush()  # Generate new_user.id for wallet creation

            try:
                WalletService.grant_signup_bonus(db, new_user.id)
                db.commit()
            except Exception as e:
                db.rollback()
                logger.error(f"Failed to create user wallet during Google signup: {e}", exc_info=True)
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

    requires_profile_completion = (
        db_user.auth_provider == "google" and
        (not db_user.mobile_number or not db_user.city or not db_user.full_name)
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "username": db_user.username,
        "is_admin": db_user.is_admin,
        "user_id": db_user.id,
        "email": db_user.email,
        "full_name": db_user.full_name,
        "mobile_number": db_user.mobile_number,
        "city": db_user.city,
        "avatar_url": db_user.avatar_url,
        "document_limit": db_user.document_limit,
        "auth_provider": db_user.auth_provider,
        "requires_profile_completion": bool(requires_profile_completion)
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


@router.post("/auth/forgot-password/request")
@router.post("/forgot-password/request")
async def forgot_password_request(
    request: Request,
    data: ForgotPasswordRequest,
    db: Session = Depends(database.get_db)
):
    client_ip = request.headers.get("X-Forwarded-For") or (request.client.host if request.client else "127.0.0.1")
    if client_ip and "," in client_ip:
        client_ip = client_ip.split(",")[0].strip()

    if check_forgot_password_rate_limit(client_ip):
        raise HTTPException(
            status_code=429,
            detail="Too many password reset requests. Please try again after 1 minute."
        )

    identifier = (data.identifier or "").strip()
    generic_response = {
        "status": "ok",
        "message": "If an account exists with this email, a password reset link has been sent."
    }

    if not identifier:
        return generic_response

    # Look up user by username or email case-insensitively
    db_user = db.query(models.User).filter(
        or_(
            models.User.username == identifier,
            func.lower(models.User.username) == identifier.lower(),
            and_(models.User.email.isnot(None), func.lower(models.User.email) == identifier.lower())
        )
    ).first()

    if db_user and is_password_reset_allowed(db_user):
        token = create_password_reset_token(db_user, expires_minutes=15)
        
        # Origin or fallback local URL
        base_url = request.headers.get("origin") or "http://127.0.0.1:5500"
        reset_link = f"{base_url}/?reset_token={token}"
        
        logger.info(f"🔑 [PASSWORD RESET LINK for user '{db_user.username}']: {reset_link}")

        # Send password reset email if user has a registered email address
        if db_user.email and "@" in db_user.email:
            try:
                from backend.services.email_service import send_password_reset_email
                send_password_reset_email(
                    to_email=db_user.email,
                    username=db_user.username,
                    reset_link=reset_link
                )
            except Exception as mail_err:
                logger.error(f"Failed to dispatch password reset email: {mail_err}")
        
        # In development/test mode, provide the dev_reset_link for local testing convenience
        is_dev = settings.ENV.lower() in ("development", "dev", "test")
        if is_dev:
            return {
                **generic_response,
                "dev_reset_link": reset_link,
                "dev_token": token
            }

    return generic_response


@router.get("/auth/forgot-password/verify-token")
@router.get("/forgot-password/verify-token")
@router.post("/auth/forgot-password/verify-token")
@router.post("/forgot-password/verify-token")
async def forgot_password_verify_token(
    request: Request,
    token: str | None = None,
    payload: TokenVerificationRequest | None = None,
    db: Session = Depends(database.get_db)
):
    token_str = token or (payload.token if payload else None) or request.query_params.get("token") or request.query_params.get("reset_token")
    if not token_str:
        raise HTTPException(status_code=400, detail="Token is required.")
    
    try:
        user, _ = verify_password_reset_token(token_str, db)
        return {"valid": True, "username": user.username}
    except HTTPException as e:
        return JSONResponse(status_code=e.status_code, content={"valid": False, "detail": e.detail})
    except Exception:
        return JSONResponse(status_code=400, content={"valid": False, "detail": "Reset link expired or invalid."})


@router.post("/auth/forgot-password/verify")
@router.post("/forgot-password/verify")
async def forgot_password_verify(data: ForgotPasswordVerify, db: Session = Depends(database.get_db)):
    db_user = db.query(models.User).filter(models.User.username == data.username.strip()).first()
    if not db_user or not is_password_reset_allowed(db_user):
        raise HTTPException(status_code=400, detail="User details do not match.")
    
    # We clean the input mobile number to compare digits-only
    input_mobile = "".join(c for c in data.mobile_number if c.isdigit())
    db_mobile = "".join(c for c in (db_user.mobile_number or "") if c.isdigit())
    
    # Compare DOB and mobile number
    if db_user.birth_date != data.birth_date.strip() or db_mobile != input_mobile:
        raise HTTPException(status_code=400, detail="User details do not match.")
        
    token = create_password_reset_token(db_user, expires_minutes=15)
    return {"status": "verified", "token": token}


@router.post("/auth/forgot-password/reset")
@router.post("/forgot-password/reset")
async def forgot_password_reset(data: ForgotPasswordReset, db: Session = Depends(database.get_db)):
    from backend.services.activity_service import log_activity
    
    db_user, jti = verify_password_reset_token(data.token, db)
    if not is_password_reset_allowed(db_user):
        raise HTTPException(status_code=400, detail="Password reset is not permitted for this account.")
        
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
    
    # Invalidate JTI immediately
    invalidate_password_reset_jti(jti)
    
    # Log password reset action
    log_activity(db, db_user.username, "Password Reset")
    
    db.commit()
    return {"status": "success", "message": "Password reset successfully"}

