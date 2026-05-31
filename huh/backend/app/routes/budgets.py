from decimal import Decimal
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.user import User
from app.models.budget import Budget
from app.models.transaction import Transaction
from app.auth import get_current_user

router = APIRouter(prefix="/api/budgets", tags=["Budgets"])


@router.post("/{org_id}")
def create_budget(
    org_id: int,
    category: str,
    amount: float,
    period: str = "monthly",
    alert_at: float = 80.0,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    budget = Budget(
        org_id=org_id,
        category=category,
        amount=amount,
        period=period,
        alert_at=alert_at,
    )
    db.add(budget)
    db.commit()
    db.refresh(budget)
    return {"budget_id": budget.id, "category": category, "amount": amount}


@router.get("/{org_id}")
def list_budgets(
    org_id: int,
    page: int = 1,
    per_page: int = 25,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    offset = (page - 1) * per_page
    total = db.query(Budget).filter(Budget.org_id == org_id).count()
    budgets = (
        db.query(Budget)
        .filter(Budget.org_id == org_id)
        .offset(offset)
        .limit(per_page)
        .all()
    )
    result = []

    for budget in budgets:
        spent = (
            db.query(func.sum(Transaction.amount))
            .filter(
                Transaction.org_id == org_id,
                Transaction.type == "money_out",
                Transaction.description.ilike(f"%{budget.category}%"),
            )
            .scalar()
            or 0
        )

        pct = (float(spent) / float(budget.amount) * 100) if budget.amount > 0 else 0
        result.append({
            "id": budget.id,
            "category": budget.category,
            "budgeted": float(budget.amount),
            "spent": float(spent),
            "remaining": float(budget.amount) - float(spent),
            "percent": round(pct, 1),
            "alert": pct >= float(budget.alert_at),
            "period": budget.period,
            "alert_at": float(budget.alert_at),
        })

    return {
        "total": total,
        "page": page,
        "per_page": per_page,
        "items": result,
    }


@router.put("/{org_id}/{budget_id}")
def update_budget(
    org_id: int,
    budget_id: int,
    amount: float = None,
    alert_at: float = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    budget = (
        db.query(Budget)
        .filter(Budget.id == budget_id, Budget.org_id == org_id)
        .first()
    )
    if not budget:
        raise HTTPException(404, "Budget not found")
    if amount is not None:
        budget.amount = amount
    if alert_at is not None:
        budget.alert_at = alert_at
    db.commit()
    return {"message": "Budget updated"}


@router.delete("/{org_id}/{budget_id}")
def delete_budget(
    org_id: int,
    budget_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    budget = (
        db.query(Budget)
        .filter(Budget.id == budget_id, Budget.org_id == org_id)
        .first()
    )
    if not budget:
        raise HTTPException(404, "Budget not found")
    db.delete(budget)
    db.commit()
    return {"message": "Budget deleted"}
