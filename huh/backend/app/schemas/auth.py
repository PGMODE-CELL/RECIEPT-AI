from pydantic import BaseModel, Field, EmailStr


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    totp_code: str | None = None


class AuthResponse(BaseModel):
    token: str
    user: dict


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    password: str = Field(..., min_length=6)


class UserResponse(BaseModel):
    id: int
    email: EmailStr
    name: str
