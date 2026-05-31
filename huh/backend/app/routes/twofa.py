import pyotp
import qrcode
import io
from fastapi import APIRouter, HTTPException, Depends, Form
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.auth import get_current_user

router = APIRouter(prefix="/api/auth/2fa", tags=["2FA"])


@router.post("/setup")
def setup_2fa(password: str = Form(...), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from app.security import verify_password
    if not verify_password(password, user.hashed_password):
        raise HTTPException(400, "Invalid password")
    secret = pyotp.random_base32()
    user.totp_secret = secret
    user.totp_enabled = False
    db.commit()
    uri = pyotp.totp.TOTP(secret).provisioning_uri(user.email, issuer_name="ReceiptAI")
    return {"secret": secret, "uri": uri, "message": "Scan QR with authenticator app, then verify with /verify"}


@router.post("/verify")
def verify_2fa(token: str = Form(...), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not user.totp_secret:
        raise HTTPException(400, "2FA not set up")
    totp = pyotp.TOTP(user.totp_secret)
    if totp.verify(token):
        user.totp_enabled = True
        db.commit()
        return {"message": "2FA enabled successfully"}
    raise HTTPException(400, "Invalid token")


@router.post("/disable")
def disable_2fa(password: str = Form(...), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from app.security import verify_password
    if not verify_password(password, user.hashed_password):
        raise HTTPException(400, "Invalid password")
    user.totp_secret = None
    user.totp_enabled = False
    db.commit()
    return {"message": "2FA disabled"}


@router.post("/qr")
def get_qr(user: User = Depends(get_current_user)):
    if not user.totp_secret:
        raise HTTPException(400, "2FA not set up")
    uri = pyotp.totp.TOTP(user.totp_secret).provisioning_uri(user.email, issuer_name="ReceiptAI")
    img = qrcode.make(uri)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return Response(content=buf.getvalue(), media_type="image/png")


@router.get("/status")
def status_2fa(user: User = Depends(get_current_user)):
    return {"enabled": user.totp_enabled, "has_secret": bool(user.totp_secret)}
