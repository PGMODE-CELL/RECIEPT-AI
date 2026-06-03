import secrets
from datetime import datetime, timedelta, UTC

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database_async import get_async_db as get_db
from app.models.user import User
from app.schemas.auth import RegisterRequest, LoginRequest, ForgotPasswordRequest, ResetPasswordRequest
from app.security import hash_password, verify_password
from app.auth import create_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["Auth"])


@router.post("/register")
async def register(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    if (await db.execute(select(User).filter(User.email == data.email))).scalar_one_or_none():
        raise HTTPException(400, "Email already exists")
    user = User(
        email=data.email,
        hashed_password=hash_password(data.password),
        full_name=data.full_name,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return {
        "token": create_token(user.id),
        "user": {"id": user.id, "email": user.email, "name": user.full_name},
    }


@router.post("/login")
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = (await db.execute(select(User).filter(User.email == data.email))).scalar_one_or_none()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(401, "Invalid credentials")
    return {
        "token": create_token(user.id),
        "user": {"id": user.id, "email": user.email, "name": user.full_name},
    }


@router.post("/forgot-password")
async def forgot_password(data: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    user = (await db.execute(select(User).filter(User.email == data.email))).scalar_one_or_none()
    if not user:
        return {"message": "If that email exists, a reset link has been sent."}
    user.reset_token = secrets.token_urlsafe(32)
    user.reset_token_expires_at = datetime.now(UTC) + timedelta(hours=1)
    await db.commit()
    return {"message": "If that email exists, a reset link has been sent.", "reset_token": user.reset_token}


@router.post("/reset-password")
async def reset_password(data: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    user = (await db.execute(
        select(User).filter(
            User.reset_token == data.token,
            User.reset_token_expires_at > datetime.now(UTC),
        )
    )).scalar_one_or_none()
    if not user:
        raise HTTPException(400, "Invalid or expired reset token")
    user.hashed_password = hash_password(data.password)
    user.reset_token = None
    user.reset_token_expires_at = None
    await db.commit()
    return {"message": "Password reset successfully"}


@router.get("/me")
async def me(user: User = Depends(get_current_user)):
    return {"id": user.id, "email": user.email, "name": user.full_name}
