from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import timedelta
from app.database import get_db
from app.models.payment_reminder import PaymentReminder, ReminderLog
from app.models.invoice import Invoice
from app.auth import get_current_user

router = APIRouter(prefix="/api/payment-reminders", tags=["Payment Reminders"])


@router.post("/{org_id}")
def create_reminder(org_id: int, invoice_id: int = None, contact_id: int = None, days_before_due: int = 0, days_after_due: int = 0, schedule: str = "once", max_reminders: int = 5, template_id: int = None, db: Session = Depends(get_db), user=Depends(get_current_user)):
    next_send = None
    if invoice_id:
        inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
        if inv and inv.due_date:
            if days_before_due > 0:
                next_send = inv.due_date - timedelta(days=days_before_due)
            else:
                next_send = inv.due_date + timedelta(days=days_after_due)
    reminder = PaymentReminder(org_id=org_id, invoice_id=invoice_id, contact_id=contact_id, days_before_due=days_before_due, days_after_due=days_after_due, schedule=schedule, max_reminders=max_reminders, template_id=template_id, next_send_at=next_send, active=True)
    db.add(reminder)
    db.commit()
    db.refresh(reminder)
    return {"success": True, "reminder": {"id": reminder.id, "schedule": reminder.schedule, "next_send_at": str(reminder.next_send_at) if reminder.next_send_at else None}}


@router.get("/{org_id}")
def list_reminders(org_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    reminders = db.query(PaymentReminder).filter(PaymentReminder.org_id == org_id).order_by(PaymentReminder.created_at.desc()).all()
    return {"reminders": [{"id": r.id, "invoice_id": r.invoice_id, "schedule": r.schedule, "last_sent_at": str(r.last_sent_at) if r.last_sent_at else None, "next_send_at": str(r.next_send_at) if r.next_send_at else None, "sent_count": r.sent_count, "active": r.active} for r in reminders]}


@router.post("/{org_id}/{reminder_id}/toggle")
def toggle_reminder(org_id: int, reminder_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    reminder = db.query(PaymentReminder).filter(PaymentReminder.id == reminder_id, PaymentReminder.org_id == org_id).first()
    if not reminder:
        raise HTTPException(404, "Reminder not found")
    reminder.active = not reminder.active
    db.commit()
    return {"success": True, "active": reminder.active}


@router.get("/{org_id}/logs")
def list_reminder_logs(org_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    logs = db.query(ReminderLog).join(PaymentReminder).filter(PaymentReminder.org_id == org_id).order_by(ReminderLog.sent_at.desc()).limit(100).all()
    return {"logs": [{"id": log.id, "reminder_id": log.reminder_id, "sent_at": str(log.sent_at), "status": log.status} for log in logs]}
