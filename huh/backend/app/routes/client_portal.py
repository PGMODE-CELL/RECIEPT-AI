from fastapi import APIRouter, HTTPException, Depends, Form
from sqlalchemy.orm import Session
from datetime import datetime, date, timezone
from jose import jwt, JWTError
import os

from app.database import get_db
from app.models.user import User
from app.models.invoice import Invoice
from app.models.bill import Bill
from app.models.contact import Contact
from app.models.attachment import Attachment
from app.models.payment import Payment
from app.auth import get_current_user

router = APIRouter(prefix="/api/client-portal", tags=["Client Portal"])

CLIENT_PORTAL_SECRET = os.getenv("CLIENT_PORTAL_SECRET", "")
if not CLIENT_PORTAL_SECRET:
    import warnings
    warnings.warn("CLIENT_PORTAL_SECRET not set — client portal login will be insecure")
    CLIENT_PORTAL_SECRET = "dev-client-portal-secret"


def create_client_token(contact_id: int, org_id: int) -> str:
    return jwt.encode({"contact_id": contact_id, "org_id": org_id, "exp": datetime.now(timezone.utc)}, CLIENT_PORTAL_SECRET, algorithm="HS256")


@router.post("/login")
def client_login(email: str = Form(...), db: Session = Depends(get_db)):
    contact = db.query(Contact).filter(Contact.email == email).first()
    if not contact:
        raise HTTPException(404, "No client found with this email")
    token = create_client_token(contact.id, contact.org_id)
    return {"token": token, "contact_id": contact.id, "name": contact.name, "org_id": contact.org_id}


@router.get("/invoices")
def client_invoices(contact_id: int = Form(...), org_id: int = Form(...), db: Session = Depends(get_db)):
    invs = db.query(Invoice).filter(
        Invoice.contact_id == contact_id, Invoice.org_id == org_id
    ).order_by(Invoice.date.desc()).all()
    return [{
        "id": i.id, "number": i.number, "date": str(i.date), "due_date": str(i.due_date),
        "total": float(i.total), "paid": float(i.paid), "status": i.status,
        "due": float(i.total) - float(i.paid),
    } for i in invs]


@router.get("/invoices/{invoice_id}")
def client_invoice_detail(invoice_id: int, contact_id: int = Form(...), org_id: int = Form(...), db: Session = Depends(get_db)):
    inv = db.query(Invoice).filter(
        Invoice.id == invoice_id, Invoice.contact_id == contact_id, Invoice.org_id == org_id
    ).first()
    if not inv:
        raise HTTPException(404, "Invoice not found")
    return {
        "id": inv.id, "number": inv.number, "date": str(inv.date), "due_date": str(inv.due_date),
        "total": float(inv.total), "paid": float(inv.paid), "status": inv.status,
        "items": inv.items, "due": float(inv.total) - float(inv.paid),
    }


@router.get("/invoices/{invoice_id}/attachments")
def client_invoice_attachments(invoice_id: int, contact_id: int = Form(...), org_id: int = Form(...), db: Session = Depends(get_db)):
    atts = db.query(Attachment).filter(
        Attachment.record_type == "invoice", Attachment.record_id == invoice_id,
        Attachment.org_id == org_id,
    ).all()
    return [{"id": a.id, "original_name": a.original_name, "size": a.size} for a in atts]


@router.get("/payments")
def client_payments(contact_id: int = Form(...), org_id: int = Form(...), db: Session = Depends(get_db)):
    pays = db.query(Payment).join(Invoice).filter(
        Invoice.contact_id == contact_id, Payment.org_id == org_id
    ).order_by(Payment.created_at.desc()).all()
    return [{
        "id": p.id, "amount": float(p.amount), "currency": p.currency,
        "gateway": p.gateway, "status": p.status, "paid_at": str(p.paid_at) if p.paid_at else None,
    } for p in pays]
