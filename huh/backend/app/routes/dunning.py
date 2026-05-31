from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from app.database import get_db
from app.models.dunning import DunningEntry
from app.models.invoice import Invoice
from app.auth import get_current_user

router = APIRouter(prefix="/api/dunning", tags=["Dunning"])


@router.post("/process/{org_id}")
def process_dunning(org_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    today = datetime.now(timezone.utc)
    overdue_invoices = db.query(Invoice).filter(Invoice.org_id == org_id, Invoice.status.in_(["sent", "overdue"]), Invoice.paid < Invoice.total).all()
    processed = []
    for inv in overdue_invoices:
        if not inv.due_date:
            continue
        days_overdue = (today - inv.due_date).days
        if days_overdue <= 0:
            continue
        existing = db.query(DunningEntry).filter(DunningEntry.invoice_id == inv.id).order_by(DunningEntry.level.desc()).first()
        level = (existing.level + 1) if existing else 1
        if level > 5:
            continue
        entry = DunningEntry(org_id=org_id, invoice_id=inv.id, contact_id=inv.contact_id, level=level, days_overdue=days_overdue, amount_due=inv.total - inv.paid, status="pending")
        db.add(entry)
        actions = {1: "reminder_email", 2: "reminder_email", 3: "phone_call", 4: "demand_letter", 5: "legal_notice"}
        entry.action_taken = actions.get(level, "reminder_email")
        entry.status = "sent"
        entry.action_date = datetime.now(timezone.utc)
        processed.append({"invoice_id": inv.id, "level": level, "days_overdue": days_overdue, "action": entry.action_taken})
    db.commit()
    return {"success": True, "processed": processed}


@router.get("/{org_id}")
def list_dunning(org_id: int, status: str = None, db: Session = Depends(get_db), user=Depends(get_current_user)):
    q = db.query(DunningEntry).filter(DunningEntry.org_id == org_id)
    if status:
        q = q.filter(DunningEntry.status == status)
    entries = q.order_by(DunningEntry.created_at.desc()).all()
    return {"entries": [{"id": e.id, "invoice_id": e.invoice_id, "level": e.level, "days_overdue": e.days_overdue, "amount_due": e.amount_due, "action_taken": e.action_taken, "status": e.status, "action_date": str(e.action_date.date()) if e.action_date else None} for e in entries]}
