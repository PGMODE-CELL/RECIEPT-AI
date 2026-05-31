from datetime import date, timedelta
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from app.database import get_db
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
def create_recurring(
    org_id: int,
    description: str,
    amount: float,
    frequency: str = "monthly",
    category: str = None,
    transaction_type: str = "money_out",
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
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
    db.commit()
    db.refresh(recurring)
    return {
        "id": recurring.id,
        "description": description,
        "amount": amount,
        "frequency": frequency,
        "next_date": str(recurring.next_date),
    }


@router.get("/{org_id}")
def list_recurring(
    org_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    items = (
        db.query(RecurringTransaction)
        .filter(RecurringTransaction.org_id == org_id, RecurringTransaction.active)
        .all()
    )
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
def toggle_recurring(
    org_id: int,
    recurring_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = (
        db.query(RecurringTransaction)
        .filter(RecurringTransaction.id == recurring_id, RecurringTransaction.org_id == org_id)
        .first()
    )
    if not item:
        raise HTTPException(404, "Recurring transaction not found")
    item.active = not item.active
    db.commit()
    return {"active": item.active}
