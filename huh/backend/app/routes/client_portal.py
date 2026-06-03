from fastapi import APIRouter, HTTPException, Depends, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timezone
from jose import jwt
import os

from app.database_async import get_async_db as get_db
from app.models.invoice import Invoice
from app.models.contact import Contact
from app.models.attachment import Attachment
from app.models.payment import Payment

router = APIRouter(prefix="/api/client-portal", tags=["Client Portal"])

CLIENT_PORTAL_SECRET = os.getenv("CLIENT_PORTAL_SECRET", "")
if not CLIENT_PORTAL_SECRET:
    import warnings
    warnings.warn("CLIENT_PORTAL_SECRET not set — client portal login will be insecure")
    CLIENT_PORTAL_SECRET = "dev-client-portal-secret"


def create_client_token(contact_id: int, org_id: int) -> str:
    return jwt.encode({"contact_id": contact_id, "org_id": org_id, "exp": datetime.now(timezone.utc)}, CLIENT_PORTAL_SECRET, algorithm="HS256")


@router.post("/login")
async def client_login(email: str = Form(...), db: AsyncSession = Depends(get_db)):
    contact = (await db.execute(select(Contact).filter(Contact.email == email))).scalar_one_or_none()
    if not contact:
        raise HTTPException(404, "No client found with this email")
    token = create_client_token(contact.id, contact.org_id)
    return {"token": token, "contact_id": contact.id, "name": contact.name, "org_id": contact.org_id}


@router.get("/invoices")
async def client_invoices(contact_id: int = Form(...), org_id: int = Form(...), db: AsyncSession = Depends(get_db)):
    invs = (await db.execute(select(Invoice).filter(
        Invoice.contact_id == contact_id, Invoice.org_id == org_id
    ).order_by(Invoice.date.desc()))).scalars().all()
    return [{
        "id": i.id, "number": i.number, "date": str(i.date), "due_date": str(i.due_date),
        "total": float(i.total), "paid": float(i.paid), "status": i.status,
        "due": float(i.total) - float(i.paid),
    } for i in invs]


@router.get("/invoices/{invoice_id}")
async def client_invoice_detail(invoice_id: int, contact_id: int = Form(...), org_id: int = Form(...), db: AsyncSession = Depends(get_db)):
    inv = (await db.execute(select(Invoice).filter(
        Invoice.id == invoice_id, Invoice.contact_id == contact_id, Invoice.org_id == org_id
    ))).scalar_one_or_none()
    if not inv:
        raise HTTPException(404, "Invoice not found")
    return {
        "id": inv.id, "number": inv.number, "date": str(inv.date), "due_date": str(inv.due_date),
        "total": float(inv.total), "paid": float(inv.paid), "status": inv.status,
        "items": inv.items, "due": float(inv.total) - float(inv.paid),
    }


@router.get("/invoices/{invoice_id}/attachments")
async def client_invoice_attachments(invoice_id: int, contact_id: int = Form(...), org_id: int = Form(...), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Attachment).filter(
            Attachment.record_type == "invoice", Attachment.record_id == invoice_id,
            Attachment.org_id == org_id,
        )
    )
    atts = result.scalars().all()
    return [{"id": a.id, "original_name": a.original_name, "size": a.size} for a in atts]


@router.get("/payments")
async def client_payments(contact_id: int = Form(...), org_id: int = Form(...), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Payment).join(Invoice).filter(
            Invoice.contact_id == contact_id, Payment.org_id == org_id
        ).order_by(Payment.created_at.desc())
    )
    pays = result.scalars().all()
    return [{
        "id": p.id, "amount": float(p.amount), "currency": p.currency,
        "gateway": p.gateway, "status": p.status, "paid_at": str(p.paid_at) if p.paid_at else None,
    } for p in pays]
