import json
from datetime import date, timedelta
from fastapi import APIRouter, HTTPException, Depends, Form
from sqlalchemy.orm import Session
from decimal import Decimal

from app.database import get_db
from app.models.user import User
from app.models.organization import Organization
from app.models.invoice import Invoice
from app.auth import get_current_user

router = APIRouter(prefix="/api/invoices", tags=["Invoices"])


@router.post("/{org_id}")
def create_invoice(
    org_id: int,
    contact_id: int = Form(...),
    items: str = Form(...),
    due_days: int = Form(30),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    items_list = json.loads(items)
    total = sum(item["price"] * item["quantity"] for item in items_list)

    count = db.query(Invoice).filter(Invoice.org_id == org_id).count()
    invoice = Invoice(
        org_id=org_id,
        contact_id=contact_id,
        number=f"INV-{count+1:04d}",
        due_date=date.today() + timedelta(days=due_days),
        total=total,
        items=items_list,
    )
    db.add(invoice)
    db.commit()
    db.refresh(invoice)
    return {
        "invoice_id": invoice.id,
        "number": invoice.number,
        "total": total,
        "message": f"Invoice #{invoice.number} created for ${total:.2f}",
    }


@router.get("/{org_id}")
def list_invoices(
    org_id: int,
    page: int = 1,
    per_page: int = 25,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    offset = (page - 1) * per_page
    total = db.query(Invoice).filter(Invoice.org_id == org_id).count()
    invoices = (
        db.query(Invoice)
        .filter(Invoice.org_id == org_id)
        .order_by(Invoice.date.desc())
        .offset(offset)
        .limit(per_page)
        .all()
    )
    return {
        "total": total,
        "page": page,
        "per_page": per_page,
        "items": [{
            "id": inv.id, "org_id": inv.org_id, "contact_id": inv.contact_id,
            "number": inv.number, "date": inv.date.isoformat(),
            "due_date": inv.due_date.isoformat(), "total": float(inv.total),
            "paid": float(inv.paid), "status": inv.status,
            "items": inv.items,
        } for inv in invoices],
    }


@router.post("/{org_id}/{invoice_id}/pay")
def pay_invoice(
    org_id: int,
    invoice_id: int,
    amount: float = Form(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    invoice = (
        db.query(Invoice)
        .filter(Invoice.id == invoice_id, Invoice.org_id == org_id)
        .first()
    )
    if not invoice:
        raise HTTPException(404, "Invoice not found")
    invoice.paid = Decimal(str(float(invoice.paid) + amount))
    if invoice.paid >= invoice.total:
        invoice.status = "paid"
    db.commit()
    return {
        "message": f"Recorded payment of ${amount:.2f}",
        "remaining": float(invoice.total) - float(invoice.paid),
    }
