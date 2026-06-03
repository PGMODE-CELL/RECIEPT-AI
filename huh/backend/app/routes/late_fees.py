from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timezone
from app.database_async import get_async_db as get_db
from app.models.late_fee import LateFeeRule, LateFeeApplied
from app.models.invoice import Invoice
from app.auth import get_current_user

router = APIRouter(prefix="/api/late-fees", tags=["Late Fees"])


@router.post("/rules/{org_id}")
async def create_rule(org_id: int, name: str = "", fee_type: str = "percentage", fee_value: float = 0, grace_period_days: int = 0, max_fee: float = None, recurring: str = "once", applies_to: str = "all", db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    rule = LateFeeRule(org_id=org_id, name=name, fee_type=fee_type, fee_value=fee_value, grace_period_days=grace_period_days, max_fee=max_fee, recurring=recurring, applies_to=applies_to, active=True)
    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    return {"success": True, "rule": {"id": rule.id, "name": rule.name, "fee_type": rule.fee_type, "fee_value": rule.fee_value}}


@router.get("/rules/{org_id}")
async def list_rules(org_id: int, db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    rules = (await db.execute(select(LateFeeRule).filter(LateFeeRule.org_id == org_id))).scalars().all()
    return {"rules": [{"id": r.id, "name": r.name, "fee_type": r.fee_type, "fee_value": r.fee_value, "grace_period_days": r.grace_period_days, "active": r.active} for r in rules]}


@router.post("/apply/{org_id}")
async def apply_late_fees(org_id: int, rule_id: int = None, db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    today = datetime.now(timezone.utc)
    invoices = (await db.execute(select(Invoice).filter(Invoice.org_id == org_id, Invoice.status.in_(["sent", "overdue"]), Invoice.paid < Invoice.total))).scalars().all()
    if rule_id:
        rule = (await db.execute(select(LateFeeRule).filter(LateFeeRule.id == rule_id, LateFeeRule.org_id == org_id))).scalar_one_or_none()
        if not rule:
            raise HTTPException(404, "Rule not found")
        rules = [rule]
    else:
        rules = (await db.execute(select(LateFeeRule).filter(LateFeeRule.org_id == org_id, LateFeeRule.active))).scalars().all()
    applied = []
    for inv in invoices:
        if not inv.due_date:
            continue
        days_overdue = (today - inv.due_date).days
        if days_overdue <= 0:
            continue
        for rule in rules:
            effective_days = days_overdue - rule.grace_period_days
            if effective_days <= 0:
                continue
            existing = (await db.execute(select(LateFeeApplied).filter(LateFeeApplied.invoice_id == inv.id, LateFeeApplied.rule_id == rule.id))).scalar_one_or_none()
            if existing and rule.recurring == "once":
                continue
            if rule.fee_type == "percentage":
                fee_amount = inv.total * (rule.fee_value / 100)
            else:
                fee_amount = rule.fee_value
            if rule.max_fee and fee_amount > rule.max_fee:
                fee_amount = rule.max_fee
            la = LateFeeApplied(org_id=org_id, invoice_id=inv.id, rule_id=rule.id, amount=round(fee_amount, 2), days_overdue=days_overdue)
            db.add(la)
            inv.total += round(fee_amount, 2)
            if inv.total < 0:
                inv.total = 0
            applied.append({"invoice_id": inv.id, "amount": round(fee_amount, 2), "days_overdue": days_overdue})
    await db.commit()
    return {"success": True, "applied": applied}


@router.get("/applied/{org_id}")
async def list_applied_fees(org_id: int, db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    fees = (await db.execute(select(LateFeeApplied).filter(LateFeeApplied.org_id == org_id).order_by(LateFeeApplied.applied_at.desc()))).scalars().all()
    return {"fees": [{"id": f.id, "invoice_id": f.invoice_id, "amount": f.amount, "days_overdue": f.days_overdue, "applied_at": str(f.applied_at.date())} for f in fees]}
