from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
import json
from app.database import get_db
from app.models.recurring_billing import RecurringBillingPlan
from app.models.invoice import Invoice
from app.auth import get_current_user

router = APIRouter(prefix="/api/recurring-billing", tags=["Recurring Billing"])


@router.post("/{org_id}")
def create_plan(org_id: int, contact_id: int = None, name: str = "", frequency: str = "monthly", interval_count: int = 1, total_amount: float = 0, items: str = "[]", tax_rate_id: int = None, start_date: str = None, max_cycles: int = None, auto_send: str = "yes", notes: str = "", db: Session = Depends(get_db), user=Depends(get_current_user)):
    sd = datetime.strptime(start_date, "%Y-%m-%d") if start_date else datetime.now(timezone.utc)
    parsed_items = json.loads(items)
    next_billing = sd
    plan = RecurringBillingPlan(org_id=org_id, contact_id=contact_id, name=name, frequency=frequency, interval_count=interval_count, total_amount=total_amount, items=parsed_items, tax_rate_id=tax_rate_id, start_date=sd, max_cycles=max_cycles, next_billing_date=next_billing, auto_send=(auto_send == "yes"), notes=notes, status="active")
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return {"success": True, "plan": {"id": plan.id, "name": plan.name, "frequency": plan.frequency, "total_amount": plan.total_amount, "next_billing_date": str(plan.next_billing_date.date()) if plan.next_billing_date else None}}


@router.get("/{org_id}")
def list_plans(org_id: int, status: str = None, db: Session = Depends(get_db), user=Depends(get_current_user)):
    q = db.query(RecurringBillingPlan).filter(RecurringBillingPlan.org_id == org_id)
    if status:
        q = q.filter(RecurringBillingPlan.status == status)
    plans = q.order_by(RecurringBillingPlan.created_at.desc()).all()
    return {"plans": [{"id": p.id, "name": p.name, "contact_id": p.contact_id, "frequency": p.frequency, "total_amount": p.total_amount, "next_billing_date": str(p.next_billing_date.date()) if p.next_billing_date else None, "current_cycle": p.current_cycle, "max_cycles": p.max_cycles, "status": p.status} for p in plans]}


@router.post("/{org_id}/{plan_id}/generate-invoice")
def generate_invoice(org_id: int, plan_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    plan = db.query(RecurringBillingPlan).filter(RecurringBillingPlan.id == plan_id, RecurringBillingPlan.org_id == org_id).first()
    if not plan:
        raise HTTPException(404, "Plan not found")
    if plan.status != "active":
        raise HTTPException(400, "Plan is not active")
    if plan.max_cycles and plan.current_cycle >= plan.max_cycles:
        plan.status = "completed"
        db.commit()
        raise HTTPException(400, "Plan has reached maximum cycles")
    inv_count = db.query(Invoice).filter(Invoice.org_id == org_id).count()
    inv = Invoice(org_id=org_id, contact_id=plan.contact_id, number=f"RBILL-{org_id}-{inv_count+1}", date=datetime.now(timezone.utc), due_date=datetime.now(timezone.utc) + timedelta(days=30), total=plan.total_amount, paid=0, status="draft", items=plan.items)
    db.add(inv)
    plan.current_cycle += 1
    next_date = plan.next_billing_date
    if plan.frequency == "daily":
        next_date += timedelta(days=plan.interval_count)
    elif plan.frequency == "weekly":
        next_date += timedelta(weeks=plan.interval_count)
    elif plan.frequency == "monthly":
        next_date += timedelta(days=30 * plan.interval_count)
    elif plan.frequency == "quarterly":
        next_date += timedelta(days=90 * plan.interval_count)
    elif plan.frequency == "yearly":
        next_date += timedelta(days=365 * plan.interval_count)
    if plan.end_date and next_date > plan.end_date:
        plan.status = "completed"
        plan.next_billing_date = None
    elif plan.max_cycles and plan.current_cycle >= plan.max_cycles:
        plan.status = "completed"
        plan.next_billing_date = None
    else:
        plan.next_billing_date = next_date
    db.commit()
    db.refresh(inv)
    return {"success": True, "invoice": {"id": inv.id, "number": inv.number, "total": inv.total, "status": inv.status}}


@router.post("/{org_id}/{plan_id}/toggle")
def toggle_plan(org_id: int, plan_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    plan = db.query(RecurringBillingPlan).filter(RecurringBillingPlan.id == plan_id, RecurringBillingPlan.org_id == org_id).first()
    if not plan:
        raise HTTPException(404, "Plan not found")
    plan.status = "paused" if plan.status == "active" else "active"
    db.commit()
    return {"success": True, "status": plan.status}
