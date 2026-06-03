from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from datetime import date

from app.database_async import get_async_db as get_db
from app.models.user import User
from app.models.invoice import Invoice
from app.models.payroll import Payslip
from app.models.contact import Contact
from app.services.email_service import send_email, invoice_email, payslip_email, reminder_email
from app.auth import get_current_user

router = APIRouter(prefix="/api/email", tags=["Email"])


@router.post("/invoice/{invoice_id}")
async def send_invoice(invoice_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    inv = (await db.execute(select(Invoice).filter(Invoice.id == invoice_id))).scalar_one_or_none()
    if not inv:
        raise HTTPException(404, "Invoice not found")
    contact = (await db.execute(select(Contact).filter(Contact.id == inv.contact_id))).scalar_one_or_none()
    if not contact or not contact.email:
        raise HTTPException(400, "Contact has no email")
    html = invoice_email(contact.name, inv.number or f"INV-{inv.id}", float(inv.total), str(inv.due_date or ""))
    ok = send_email(contact.email, f"Invoice #{inv.number or inv.id}", html)
    if not ok:
        raise HTTPException(502, "Email sending failed (check SMTP config)")
    inv.status = "sent" if inv.status == "draft" else inv.status
    await db.commit()
    return {"message": f"Invoice sent to {contact.email}"}


@router.post("/payslip/{payslip_id}")
async def send_payslip(payslip_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    slip = (await db.execute(select(Payslip).filter(Payslip.id == payslip_id).options(selectinload(Payslip.employee)))).scalar_one_or_none()
    if not slip:
        raise HTTPException(404, "Payslip not found")
    if not slip.employee.email:
        raise HTTPException(400, "Employee has no email")
    html = payslip_email(slip.employee.name, slip.month, float(slip.net_pay))
    ok = send_email(slip.employee.email, f"Payslip - {slip.month}", html)
    if not ok:
        raise HTTPException(502, "Email sending failed")
    return {"message": f"Payslip sent to {slip.employee.email}"}


@router.post("/reminders/{org_id}")
async def send_reminders(org_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    today = date.today()
    result = await db.execute(
        select(Invoice).filter(
            Invoice.org_id == org_id, Invoice.status.notin_(["paid", "draft"]),
            Invoice.due_date < today,
        )
    )
    overdue = result.scalars().all()
    sent = 0
    for inv in overdue:
        contact = (await db.execute(select(Contact).filter(Contact.id == inv.contact_id))).scalar_one_or_none()
        if not contact or not contact.email:
            continue
        days = (today - inv.due_date).days
        html = reminder_email(contact.name, inv.number or f"INV-{inv.id}", float(inv.total), days)
        ok = send_email(contact.email, f"Reminder: Invoice #{inv.number or inv.id} overdue", html)
        if ok:
            sent += 1
    return {"message": f"Reminders sent to {sent} contact(s)", "total_overdue": len(overdue)}
