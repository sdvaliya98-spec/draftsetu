from pydantic import BaseModel

class UserCreate(BaseModel):
    username: str
    password: str
    full_name: str | None = None
    email: str | None = None
    mobile_number: str | None = None
    city: str | None = None
    birth_date: str | None = None

class UserLogin(BaseModel):
    username: str
    password: str

class ForgotPasswordRequest(BaseModel):
    identifier: str

class ForgotPasswordVerify(BaseModel):
    username: str
    birth_date: str
    mobile_number: str

class ForgotPasswordReset(BaseModel):
    token: str
    new_password: str

class TokenVerificationRequest(BaseModel):
    token: str

class GoogleAuthRequest(BaseModel):
    id_token: str

class UserProfileUpdate(BaseModel):
    full_name: str | None = None
    username: str | None = None
    mobile_number: str | None = None
    city: str | None = None

# Backward compatibility alias
CompleteProfileRequest = UserProfileUpdate

