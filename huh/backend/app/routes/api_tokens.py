import secrets
from fastapi import APIRouter, HTTPException, Depends, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database_async import get_async_db as get_db
from app.models.user import User
from app.models.api_token import ApiToken
from app.auth import get_current_user

router = APIRouter(prefix="/api/auth/tokens", tags=["API Tokens"])


@router.post("")
async def create_token(name: str = Form(...), scopes: str = Form("read"),
                 user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    raw = secrets.token_urlsafe(32)
    hashed = raw  # stored plain for simplicity; user sees it once
    token = ApiToken(user_id=user.id, name=name, scopes=scopes, token=hashed)
    db.add(token)
    await db.commit()
    return {"id": token.id, "name": name, "token": raw, "scopes": scopes,
            "message": "Save this token — it won't be shown again"}


@router.get("")
async def list_tokens(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    tokens = (await db.execute(select(ApiToken).filter(ApiToken.user_id == user.id).order_by(ApiToken.created_at.desc()))).scalars().all()
    return [{
        "id": t.id, "name": t.name, "scopes": t.scopes,
        "last_used_at": t.last_used_at.isoformat() if t.last_used_at else None,
        "active": t.active, "created_at": t.created_at.isoformat(),
        "token_preview": t.token[:12] + "..." if t.token else "",
    } for t in tokens]


@router.put("/{token_id}/toggle")
async def toggle_token(token_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    token = (await db.execute(select(ApiToken).filter(ApiToken.id == token_id, ApiToken.user_id == user.id))).scalar_one_or_none()
    if not token:
        raise HTTPException(404, "Token not found")
    token.active = not token.active
    await db.commit()
    return {"active": token.active}


@router.delete("/{token_id}")
async def delete_token(token_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    token = (await db.execute(select(ApiToken).filter(ApiToken.id == token_id, ApiToken.user_id == user.id))).scalar_one_or_none()
    if not token:
        raise HTTPException(404, "Token not found")
    await db.delete(token)
    await db.commit()
    return {"message": "Token deleted"}
