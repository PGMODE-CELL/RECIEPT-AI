from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.user import User
from app.models.organization import Organization
from app.models.transaction import Transaction
from app.models.account import Account
from app.models.invoice import Invoice
from app.models.bill import Bill
from app.auth import get_current_user

router = APIRouter(prefix="/api/consolidation", tags=["Consolidation"])


@router.get("/{org_id}/summary")
def consolidated_summary(org_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(404, "Organization not found")

    income = db.query(func.sum(Transaction.amount)).filter(
        Transaction.org_id == org_id, Transaction.type == "money_in"
    ).scalar() or 0

    expenses = db.query(func.sum(Transaction.amount)).filter(
        Transaction.org_id == org_id, Transaction.type == "money_out"
    ).scalar() or 0

    cash = db.query(func.sum(Account.balance)).filter(
        Account.org_id == org_id, Account.type == "asset"
    ).scalar() or 0

    outstanding = db.query(func.sum(Invoice.total - Invoice.paid)).filter(
        Invoice.org_id == org_id, Invoice.status != "paid"
    ).scalar() or 0

    bills_due = db.query(func.sum(Bill.total - Bill.paid)).filter(
        Bill.org_id == org_id, Bill.status != "paid"
    ).scalar() or 0

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
def all_orgs_summary(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    orgs = db.query(Organization).filter(Organization.owner_id == user.id).all()
    if not orgs:
        raise HTTPException(404, "No organizations found")

    total_income = 0
    total_expenses = 0
    orgs_data = []

    for org in orgs:
        income = db.query(func.sum(Transaction.amount)).filter(
            Transaction.org_id == org.id, Transaction.type == "money_in"
        ).scalar() or 0
        expenses = db.query(func.sum(Transaction.amount)).filter(
            Transaction.org_id == org.id, Transaction.type == "money_out"
        ).scalar() or 0
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
