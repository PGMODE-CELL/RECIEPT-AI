from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select

from app.database_async import get_async_db as get_db
from app.models.user import User
from app.models.organization import Organization
from app.models.transaction import Transaction
from app.models.account import Account
from app.models.invoice import Invoice
from app.models.bill import Bill
from app.auth import get_current_user

router = APIRouter(prefix="/api/consolidation", tags=["Consolidation"])


@router.get("/{org_id}/summary")
async def consolidated_summary(org_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    org = (await db.execute(select(Organization).filter(Organization.id == org_id))).scalar_one_or_none()
    if not org:
        raise HTTPException(404, "Organization not found")

    income = (await db.execute(select(func.sum(Transaction.amount)).filter(
        Transaction.org_id == org_id, Transaction.type == "money_in"
    ))).scalar() or 0

    expenses = (await db.execute(select(func.sum(Transaction.amount)).filter(
        Transaction.org_id == org_id, Transaction.type == "money_out"
    ))).scalar() or 0

    cash = (await db.execute(select(func.sum(Account.balance)).filter(
        Account.org_id == org_id, Account.type == "asset"
    ))).scalar() or 0

    outstanding = (await db.execute(select(func.sum(Invoice.total - Invoice.paid)).filter(
        Invoice.org_id == org_id, Invoice.status != "paid"
    ))).scalar() or 0

    bills_due = (await db.execute(select(func.sum(Bill.total - Bill.paid)).filter(
        Bill.org_id == org_id, Bill.status != "paid"
    ))).scalar() or 0

    return {
        "org_name": org.name,
        "org_currency": org.currency or "USD",
        "income": float(income),
        "expenses": float(expenses),
        "profit": float(income - expenses),
        "cash_balance": float(cash),
        "outstanding_receivables": float(outstanding),
        "outstanding_payables": float(bills_due),
    }


@router.get("/all")
async def all_orgs_summary(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    orgs = (await db.execute(select(Organization).filter(Organization.owner_id == user.id))).scalars().all()
    if not orgs:
        raise HTTPException(404, "No organizations found")

    total_income = 0
    total_expenses = 0
    orgs_data = []

    for org in orgs:
        income = (await db.execute(select(func.sum(Transaction.amount)).filter(
            Transaction.org_id == org.id, Transaction.type == "money_in"
        ))).scalar() or 0
        expenses = (await db.execute(select(func.sum(Transaction.amount)).filter(
            Transaction.org_id == org.id, Transaction.type == "money_out"
        ))).scalar() or 0
        total_income += income
        total_expenses += expenses
        orgs_data.append({
            "org_id": org.id, "name": org.name,
            "currency": org.currency or "USD",
            "income": float(income), "expenses": float(expenses),
            "profit": float(income - expenses),
        })

    return {
        "total_orgs": len(orgs),
        "total_income": float(total_income),
        "total_expenses": float(total_expenses),
        "total_profit": float(total_income - total_expenses),
        "orgs": orgs_data,
    }
