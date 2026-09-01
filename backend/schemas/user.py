from pydantic import BaseModel

class UserCreate(BaseModel):
    username: str
    password: str
    birth_date: str
    mobile_number: str

class UserLogin(BaseModel):
    username: str
    password: str

class ForgotPasswordVerify(BaseModel):
    username: str
    birth_date: str
    mobile_number: str

class ForgotPasswordReset(BaseModel):
    token: str
    new_password: str

class GoogleAuthRequest(BaseModel):
    id_token: str

