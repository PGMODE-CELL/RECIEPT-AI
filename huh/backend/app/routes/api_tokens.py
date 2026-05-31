import secrets
from fastapi import APIRouter, HTTPException, Depends, Form
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.api_token import ApiToken
from app.auth import get_current_user

router = APIRouter(prefix="/api/auth/tokens", tags=["API Tokens"])


@router.post("")
def create_token(name: str = Form(...), scopes: str = Form("read"),
                 user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    raw = secrets.token_urlsafe(32)
    hashed = raw  # stored plain for simplicity; user sees it once
    token = ApiToken(user_id=user.id, name=name, scopes=scopes, token=hashed)
    db.add(token)
    db.commit()
    return {"id": token.id, "name": name, "token": raw, "scopes": scopes,
            "message": "Save this token — it won't be shown again"}


@router.get("")
def list_tokens(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    tokens = db.query(ApiToken).filter(ApiToken.user_id == user.id).order_by(ApiToken.created_at.desc()).all()
    return [{
        "id": t.id, "name": t.name, "scopes": t.scopes,
        "last_used_at": t.last_used_at.isoformat() if t.last_used_at else None,
        "active": t.active, "created_at": t.created_at.isoformat(),
        "token_preview": t.token[:12] + "..." if t.token else "",
    } for t in tokens]


@router.put("/{token_id}/toggle")
def toggle_token(token_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    token = db.query(ApiToken).filter(ApiToken.id == token_id, ApiToken.user_id == user.id).first()
    if not token:
        raise HTTPException(404, "Token not found")
    token.active = not token.active
    db.commit()
    return {"active": token.active}


@router.delete("/{token_id}")
def delete_token(token_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    token = db.query(ApiToken).filter(ApiToken.id == token_id, ApiToken.user_id == user.id).first()
    if not token:
        raise HTTPException(404, "Token not found")
    db.delete(token)
    db.commit()
    return {"message": "Token deleted"}
