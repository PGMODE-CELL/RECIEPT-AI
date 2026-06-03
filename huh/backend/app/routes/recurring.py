from datetime import date, timedelta
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database_async import get_async_db as get_db
from app.models.user import User
from app.models.recurring import RecurringTransaction
from app.auth import get_current_user

router = APIRouter(prefix="/api/recurring", tags=["Recurring"])


FREQUENCY_MAP = {
    "daily": 1,
    "weekly": 7,
    "biweekly": 14,
    "monthly": 30,
    "quarterly": 90,
    "yearly": 365,
}


@router.post("/{org_id}")
async def create_recurring(
    org_id: int,
    description: str,
    amount: float,
    frequency: str = "monthly",
    category: str = None,
    transaction_type: str = "money_out",
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    interval = FREQUENCY_MAP.get(frequency)
    if not interval:
        raise HTTPException(400, f"Invalid frequency: {frequency}")

    recurring = RecurringTransaction(
        org_id=org_id,
        description=description,
        amount=amount,
        category=category,
        frequency=frequency,
        interval_days=interval,
        next_date=date.today() + timedelta(days=interval),
        transaction_type=transaction_type,
    )
    db.add(recurring)
    await db.commit()
    await db.refresh(recurring)
    return {
        "id": recurring.id,
        "description": description,
        "amount": amount,
        "frequency": frequency,
        "next_date": str(recurring.next_date),
    }


@router.get("/{org_id}")
async def list_recurring(
    org_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(RecurringTransaction)
        .filter(RecurringTransaction.org_id == org_id, RecurringTransaction.active)
    )
    items = result.scalars().all()
    return [
        {
            "id": r.id,
            "description": r.description,
            "amount": float(r.amount),
            "frequency": r.frequency,
            "next_date": str(r.next_date),
            "category": r.category,
            "transaction_type": r.transaction_type,
        }
        for r in items
    ]


@router.put("/{org_id}/{recurring_id}/toggle")
async def toggle_recurring(
    org_id: int,
    recurring_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    item = (
        await db.execute(
            select(RecurringTransaction)
            .filter(RecurringTransaction.id == recurring_id, RecurringTransaction.org_id == org_id)
        )
    ).scalar_one_or_none()
    if not item:
        raise HTTPException(404, "Recurring transaction not found")
    item.active = not item.active
    await db.commit()
    return {"active": item.active}


@router.get("/{org_id}/{recurring_id}")
async def get_recurring(
    org_id: int,
    recurring_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    item = (
        await db.execute(
            select(RecurringTransaction)
            .filter(RecurringTransaction.id == recurring_id, RecurringTransaction.org_id == org_id)
        )
    ).scalar_one_or_none()
    if not item:
        raise HTTPException(404, "Recurring transaction not found")
    return {
        "id": item.id, "description": item.description, "amount": float(item.amount),
        "frequency": item.frequency, "next_date": str(item.next_date),
        "category": item.category, "transaction_type": item.transaction_type, "active": item.active,
    }


@router.delete("/{org_id}/{recurring_id}")
async def delete_recurring(
    org_id: int,
    recurring_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    item = (
        await db.execute(
            select(RecurringTransaction)
            .filter(RecurringTransaction.id == recurring_id, RecurringTransaction.org_id == org_id)
        )
    ).scalar_one_or_none()
    if not item:
        raise HTTPException(404, "Recurring transaction not found")
    await db.delete(item)
    await db.commit()
    return {"message": "Recurring transaction deleted"}
