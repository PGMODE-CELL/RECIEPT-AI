import logging
import secrets
from datetime import datetime, timedelta, UTC

from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config import settings
from app.database_async import get_async_db as get_db
from app.models.user import User
from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
)
from app.security import hash_password, verify_password
from app.security_middleware import limiter
from app.auth import create_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["Auth"])
logger = logging.getLogger("receipt_ai")


@router.post("/register")
@limiter.limit(settings.RATE_LIMIT_AUTH)
async def register(
    request: Request, data: RegisterRequest, db: AsyncSession = Depends(get_db)
):
    if (
        await db.execute(select(User).filter(User.email == data.email))
    ).scalar_one_or_none():
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
@limiter.limit(settings.RATE_LIMIT_AUTH)
async def login(
    request: Request, data: LoginRequest, db: AsyncSession = Depends(get_db)
):
    user = (
        await db.execute(select(User).filter(User.email == data.email))
    ).scalar_one_or_none()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(401, "Invalid credentials")
    if user.totp_enabled:
        if not data.totp_code:
            raise HTTPException(401, "2FA code required")
        import pyotp

        if not user.totp_secret or not pyotp.TOTP(user.totp_secret).verify(
            data.totp_code
        ):
            raise HTTPException(401, "Invalid 2FA code")
    return {
        "token": create_token(user.id),
        "user": {"id": user.id, "email": user.email, "name": user.full_name},
    }


@router.post("/forgot-password")
@limiter.limit(settings.RATE_LIMIT_AUTH)
async def forgot_password(
    request: Request, data: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)
):
    user = (
        await db.execute(select(User).filter(User.email == data.email))
    ).scalar_one_or_none()
    if not user:
        return {"message": "If that email exists, a reset link has been sent."}
    user.reset_token = secrets.token_urlsafe(32)
    user.reset_token_expires_at = datetime.now(UTC) + timedelta(hours=1)
    await db.commit()
    # The token is delivered out-of-band (email); never return it in the API response.
    # Outside production we log it so local development can complete the flow
    # without an email provider configured.
    if settings.ENVIRONMENT != "production":
        logger.info("Password reset token for %s: %s", user.email, user.reset_token)
    return {"message": "If that email exists, a reset link has been sent."}


@router.post("/reset-password")
@limiter.limit(settings.RATE_LIMIT_AUTH)
async def reset_password(
    request: Request, data: ResetPasswordRequest, db: AsyncSession = Depends(get_db)
):
    user = (
        await db.execute(
            select(User).filter(
                User.reset_token == data.token,
                User.reset_token_expires_at > datetime.now(UTC),
            )
        )
    ).scalar_one_or_none()
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
