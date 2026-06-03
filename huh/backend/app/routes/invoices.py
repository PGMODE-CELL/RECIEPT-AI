import json
from datetime import date, timedelta
from fastapi import APIRouter, HTTPException, Depends, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from decimal import Decimal

from app.database_async import get_async_db as get_db
from app.models.user import User
from app.models.invoice import Invoice
from app.auth import get_current_user

router = APIRouter(prefix="/api/invoices", tags=["Invoices"])


@router.post("/{org_id}")
async def create_invoice(
    org_id: int,
    contact_id: int = Form(...),
    items: str = Form(...),
    due_days: int = Form(30),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    items_list = json.loads(items)
    total = sum(item["price"] * item["quantity"] for item in items_list)

    count = (await db.execute(select(func.count()).select_from(Invoice).filter(Invoice.org_id == org_id))).scalar()
    invoice = Invoice(
        org_id=org_id,
        contact_id=contact_id,
        number=f"INV-{count+1:04d}",
        due_date=date.today() + timedelta(days=due_days),
        total=total,
        items=items_list,
    )
    db.add(invoice)
    await db.commit()
    await db.refresh(invoice)
    return {
        "invoice_id": invoice.id,
        "number": invoice.number,
        "total": total,
        "message": f"Invoice #{invoice.number} created for ${total:.2f}",
    }


@router.get("/{org_id}")
async def list_invoices(
    org_id: int,
    page: int = 1,
    per_page: int = 25,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    offset = (page - 1) * per_page
    total = (await db.execute(select(func.count()).select_from(Invoice).filter(Invoice.org_id == org_id))).scalar()
    result = await db.execute(
        select(Invoice)
        .filter(Invoice.org_id == org_id)
        .order_by(Invoice.date.desc())
        .offset(offset)
        .limit(per_page)
    )
    invoices = result.scalars().all()
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
async def pay_invoice(
    org_id: int,
    invoice_id: int,
    amount: float = Form(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    invoice = (
        await db.execute(
            select(Invoice).filter(Invoice.id == invoice_id, Invoice.org_id == org_id)
        )
    ).scalar_one_or_none()
    if not invoice:
        raise HTTPException(404, "Invoice not found")
    invoice.paid = Decimal(str(float(invoice.paid) + amount))
    if invoice.paid >= invoice.total:
        invoice.status = "paid"
    await db.commit()
    return {
        "message": f"Recorded payment of ${amount:.2f}",
        "remaining": float(invoice.total) - float(invoice.paid),
    }


@router.get("/{org_id}/{invoice_id}")
async def get_invoice(
    org_id: int,
    invoice_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    invoice = (
        await db.execute(
            select(Invoice).filter(Invoice.id == invoice_id, Invoice.org_id == org_id)
        )
    ).scalar_one_or_none()
    if not invoice:
        raise HTTPException(404, "Invoice not found")
    return {
        "id": invoice.id, "org_id": invoice.org_id, "contact_id": invoice.contact_id,
        "number": invoice.number, "date": invoice.date.isoformat(),
        "due_date": invoice.due_date.isoformat(), "total": float(invoice.total),
        "paid": float(invoice.paid), "status": invoice.status,
        "items": invoice.items,
    }


@router.delete("/{org_id}/{invoice_id}")
async def delete_invoice(
    org_id: int,
    invoice_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    invoice = (
        await db.execute(
            select(Invoice).filter(Invoice.id == invoice_id, Invoice.org_id == org_id)
        )
    ).scalar_one_or_none()
    if not invoice:
        raise HTTPException(404, "Invoice not found")
    await db.delete(invoice)
    await db.commit()
    return {"message": "Invoice deleted"}


@router.put("/{org_id}/{invoice_id}/status")
async def update_invoice_status(
    org_id: int,
    invoice_id: int,
    status: str = Form(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    invoice = (
        await db.execute(
            select(Invoice).filter(Invoice.id == invoice_id, Invoice.org_id == org_id)
        )
    ).scalar_one_or_none()
    if not invoice:
        raise HTTPException(404, "Invoice not found")
    invoice.status = status
    await db.commit()
    return {"message": f"Status updated to {status}"}


@router.put("/{org_id}/{invoice_id}")
async def update_invoice(
    org_id: int,
    invoice_id: int,
    contact_id: int = Form(...),
    items: str = Form(...),
    due_days: int = Form(30),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    invoice = (
        await db.execute(
            select(Invoice).filter(Invoice.id == invoice_id, Invoice.org_id == org_id)
        )
    ).scalar_one_or_none()
    if not invoice:
        raise HTTPException(404, "Invoice not found")
    items_list = json.loads(items)
    invoice.contact_id = contact_id
    invoice.items = items_list
    invoice.due_date = date.today() + timedelta(days=due_days)
    invoice.total = sum(item["price"] * item["quantity"] for item in items_list)
    await db.commit()
    await db.refresh(invoice)
    return {
        "invoice_id": invoice.id,
        "number": invoice.number,
        "total": float(invoice.total),
        "message": f"Invoice #{invoice.number} updated",
    }
