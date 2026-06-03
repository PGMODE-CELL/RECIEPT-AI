from datetime import date
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database_async import get_async_db as get_db
from app.models.user import User
from app.models.invoice import Invoice
from app.models.bill import Bill
from app.auth import get_current_user

router = APIRouter(prefix="/api/aging", tags=["Aging"])


def bucket_aging(days: int) -> str:
    if days <= 0:
        return "current"
    if days <= 30:
        return "1-30"
    if days <= 60:
        return "31-60"
    if days <= 90:
        return "61-90"
    return "90+"


@router.get("/{org_id}/receivables")
async def ar_aging(org_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    today = date.today()
    result = await db.execute(
        select(Invoice).filter(
            Invoice.org_id == org_id, Invoice.status != "paid"
        ).options(selectinload(Invoice.contact))
    )
    invoices = result.scalars().all()
    buckets = {"current": 0, "1-30": 0, "31-60": 0, "61-90": 0, "90+": 0}
    details = []
    for inv in invoices:
        due = inv.due_date or inv.date
        days = (today - due).days if due else 0
        bucket = bucket_aging(days)
        total = float(inv.total or 0) - float(inv.paid or 0)
        buckets[bucket] = buckets.get(bucket, 0) + total
        details.append({
            "id": inv.id, "number": inv.number or f"INV-{inv.id}",
            "contact": inv.contact.name if inv.contact else "N/A",
            "total": total, "days": max(days, 0),
            "bucket": bucket, "due_date": due.isoformat() if due else "",
        })
    return {"buckets": buckets, "total": sum(buckets.values()), "details": details}


@router.get("/{org_id}/payables")
async def ap_aging(org_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    today = date.today()
    result = await db.execute(
        select(Bill).filter(
            Bill.org_id == org_id, Bill.status != "paid"
        ).options(selectinload(Bill.contact))
    )
    bills = result.scalars().all()
    buckets = {"current": 0, "1-30": 0, "31-60": 0, "61-90": 0, "90+": 0}
    details = []
    for b in bills:
        due = b.due_date or b.date
        days = (today - due).days if due else 0
        bucket = bucket_aging(days)
        total = float(b.total or 0) - float(b.paid or 0)
        buckets[bucket] = buckets.get(bucket, 0) + total
        details.append({
            "id": b.id, "number": b.number or f"BILL-{b.id}",
            "contact": b.contact.name if b.contact else "N/A",
            "total": total, "days": max(days, 0),
            "bucket": bucket, "due_date": due.isoformat() if due else "",
        })
    return {"buckets": buckets, "total": sum(buckets.values()), "details": details}
