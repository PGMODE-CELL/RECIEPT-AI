import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timedelta, timezone
from app.database_async import get_async_db as get_db
from app.models.contact import Contact
from app.models.purchase_order import PurchaseOrder
from app.models.bill import Bill
from app.auth import get_current_user
from jose import jwt, JWTError

router = APIRouter(prefix="/api/vendor-portal", tags=["Vendor Portal"])
VENDOR_PORTAL_SECRET = os.getenv("VENDOR_PORTAL_SECRET", "")
if not VENDOR_PORTAL_SECRET:
    import warnings
    warnings.warn("VENDOR_PORTAL_SECRET not set — vendor portal login will be insecure")
    VENDOR_PORTAL_SECRET = "dev-vendor-portal-secret"


@router.post("/login")
async def vendor_login(email: str = "", db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    contact = (await db.execute(select(Contact).filter(Contact.email == email))).scalar_one_or_none()
    if not contact:
        raise HTTPException(404, "Vendor not found")
    token = jwt.encode({"contact_id": contact.id, "org_id": contact.org_id, "exp": datetime.now(timezone.utc) + timedelta(days=7)}, VENDOR_PORTAL_SECRET, algorithm="HS256")
    return {"success": True, "token": token, "vendor": {"id": contact.id, "name": contact.name, "email": contact.email}}


def get_vendor_from_token(token: str, db: AsyncSession):
    try:
        payload = jwt.decode(token, VENDOR_PORTAL_SECRET, algorithms=["HS256"])
        return payload
    except JWTError:
        raise HTTPException(401, "Invalid token")


@router.get("/purchase-orders")
async def vendor_list_pos(token: str = "", db: AsyncSession = Depends(get_db)):
    payload = get_vendor_from_token(token, db)
    contact_id = payload.get("contact_id")
    org_id = payload.get("org_id")
    pos = (await db.execute(select(PurchaseOrder).filter(PurchaseOrder.org_id == org_id, PurchaseOrder.contact_id == contact_id).order_by(PurchaseOrder.created_at.desc()))).scalars().all()
    return {"purchase_orders": [{"id": po.id, "number": po.number, "date": str(po.date.date()), "total": po.total, "status": po.status} for po in pos]}


@router.get("/bills")
async def vendor_list_bills(token: str = "", db: AsyncSession = Depends(get_db)):
    payload = get_vendor_from_token(token, db)
    contact_id = payload.get("contact_id")
    org_id = payload.get("org_id")
    bills = (await db.execute(select(Bill).filter(Bill.org_id == org_id, Bill.contact_id == contact_id).order_by(Bill.created_at.desc()))).scalars().all()
    return {"bills": [{"id": b.id, "number": b.number, "date": str(b.date.date()), "total": b.total, "status": b.status} for b in bills]}
