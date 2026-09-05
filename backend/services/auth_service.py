import bcrypt
import jwt
from datetime import timedelta, datetime, timezone
import os
from sqlalchemy.orm import Session
from fastapi import HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer
from backend import models, database
from backend.core.config import settings

SECRET_KEY = settings.SECRET_KEY
ALGORITHM = settings.ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login", auto_error=False)

def verify_password(plain: str, hashed: str | None) -> bool:
    if not hashed or not isinstance(hashed, str) or not hashed.startswith("$2"):
        return False
    try:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception:
        return False

def get_password_hash(password: str):
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

import secrets
import hashlib
import threading

_USED_RESET_JTIS = set()
_USED_RESET_LOCK = threading.Lock()

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    expire_time = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire_time})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def is_password_reset_allowed(user: models.User | None) -> bool:
    """
    Checks if password reset is permitted for this user.
    Permitted for LOCAL and BOTH (account-linked) users with a valid local bcrypt password.
    Blocked for Google-only accounts and inactive accounts.
    """
    if not user or not user.is_active:
        return False
    if user.auth_provider == "google":
        return False
    if not user.password_hash or not user.password_hash.startswith("$2"):
        return False
    return True

def create_password_reset_token(user: models.User, expires_minutes: int = 15) -> str:
    """
    Generates a secure password reset token cryptographically bound to the user's
    current password hash, with a unique JTI and expiration timestamp.
    """
    if not is_password_reset_allowed(user):
        raise HTTPException(status_code=400, detail="Password reset is not permitted for this account.")

    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=expires_minutes)
    jti = secrets.token_hex(16)
    pwh_fingerprint = hashlib.sha256((user.password_hash or "").encode()).hexdigest()[:16]
    
    payload = {
        "sub": user.username,
        "purpose": "password_reset",
        "jti": jti,
        "pwh": pwh_fingerprint,
        "iat": int(now.timestamp()),
        "exp": expires_at
    }
    
    # Secret derived from SECRET_KEY + current user password_hash
    derived_secret = f"{SECRET_KEY}:{user.password_hash}"
    return jwt.encode(payload, derived_secret, algorithm=ALGORITHM)

def verify_password_reset_token(token: str, db: Session) -> tuple[models.User, str]:
    """
    Validates a password reset token. Supports both the new cryptographically bound
    single-use token format and the legacy token format for complete backward compatibility.
    Returns (user, jti).
    """
    try:
        unverified_payload = jwt.decode(token, options={"verify_signature": False})
    except Exception:
        raise HTTPException(status_code=400, detail="Reset link expired or invalid.")

    username = unverified_payload.get("sub")
    purpose = unverified_payload.get("purpose")
    jti = unverified_payload.get("jti", "")

    if not username or purpose not in ("password_reset", "reset_password"):
        raise HTTPException(status_code=400, detail="Reset link expired or invalid.")

    if jti:
        with _USED_RESET_LOCK:
            if jti in _USED_RESET_JTIS:
                raise HTTPException(status_code=400, detail="Reset link has already been used.")

    user = db.query(models.User).filter(models.User.username == username).first()
    if not user or not is_password_reset_allowed(user):
        raise HTTPException(status_code=400, detail="Reset link expired or invalid.")

    try:
        if purpose == "password_reset":
            derived_secret = f"{SECRET_KEY}:{user.password_hash}"
            verified_payload = jwt.decode(token, derived_secret, algorithms=[ALGORITHM])
            expected_pwh = hashlib.sha256((user.password_hash or "").encode()).hexdigest()[:16]
            if verified_payload.get("pwh") != expected_pwh:
                raise HTTPException(status_code=400, detail="Reset link expired or invalid.")
        else:
            # Legacy token verification
            jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=400, detail="Reset link has expired.")
    except jwt.PyJWTError:
        raise HTTPException(status_code=400, detail="Reset link expired or invalid.")

    return user, jti

def invalidate_password_reset_jti(jti: str):
    """Marks a JTI as consumed to prevent replay attacks before DB commit."""
    if jti:
        with _USED_RESET_LOCK:
            _USED_RESET_JTIS.add(jti)
            if len(_USED_RESET_JTIS) > 5000:
                _USED_RESET_JTIS.clear()

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(database.get_db)):
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Token has expired or is invalid")
        
    user = db.query(models.User).filter(models.User.username == username).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")
    return user

def get_admin_user(current_user: models.User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user
