from datetime import date
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.user import User
from app.models.account import Account
from app.models.transaction import Transaction
from app.models.invoice import Invoice
from app.models.bill import Bill
from app.models.budget import Budget
from app.auth import get_current_user

router = APIRouter(prefix="/api/reports", tags=["Reports"])


@router.get("/{org_id}/dashboard")
def get_dashboard(
    org_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    income = (
        db.query(func.sum(Transaction.amount))
        .filter(Transaction.org_id == org_id, Transaction.type == "money_in")
        .scalar()
        or 0
    )
    expenses = (
        db.query(func.sum(Transaction.amount))
        .filter(Transaction.org_id == org_id, Transaction.type == "money_out")
        .scalar()
        or 0
    )
    outstanding = (
        db.query(func.sum(Invoice.total - Invoice.paid))
        .filter(Invoice.org_id == org_id, Invoice.status != "paid")
        .scalar()
        or 0
    )
    bills_due = (
        db.query(func.sum(Bill.total - Bill.paid))
        .filter(Bill.org_id == org_id, Bill.status != "paid")
        .scalar()
        or 0
    )
    accounts = db.query(Account).filter(Account.org_id == org_id).all()

    today = date.today()
    overdue_inv = db.query(Invoice).filter(
        Invoice.org_id == org_id, Invoice.status.notin_(["paid", "draft"]),
        Invoice.due_date < today
    ).count()
    upcoming_bills = db.query(Bill).filter(
        Bill.org_id == org_id, Bill.status.notin_(["paid", "draft"]),
        Bill.due_date >= today, Bill.due_date <= today
    ).count()  # due today
    budgets = db.query(Budget).filter(Budget.org_id == org_id).all()
    over_budget = sum(1 for b in budgets if float(b.spent or 0) > float(b.limit or 0))

    recent = (
        db.query(Transaction)
        .filter(Transaction.org_id == org_id)
        .order_by(Transaction.date.desc())
        .limit(10)
        .all()
    )

    cash = (
        db.query(func.sum(Account.balance))
        .filter(Account.org_id == org_id, Account.type == "asset")
        .scalar() or 0
    )

    return {
        "plain_english": {
            "summary": f"You made ${float(income):.2f} and spent ${float(expenses):.2f}. "
            f"Your profit is ${float(income) - float(expenses):.2f}.",
            "outstanding": (
                f"People owe you ${float(outstanding):.2f}. "
                f"You owe suppliers ${float(bills_due):.2f}."
                if outstanding > 0 or bills_due > 0
                else "All caught up! No outstanding payments."
            ),
            "health": (
                "Your business looks healthy!"
                if float(income) > float(expenses)
                else "You're spending more than you make. Consider reducing expenses."
            ),
        },
        "numbers": {
            "total_income": float(income),
            "total_expenses": float(expenses),
            "profit": float(income) - float(expenses),
            "outstanding_invoices": float(outstanding),
            "outstanding_bills": float(bills_due),
            "cash_balance": float(cash),
            "overdue_invoices": overdue_inv,
            "bills_due_today": upcoming_bills,
            "over_budget": over_budget,
            "account_balances": [
                {"name": a.name, "balance": float(a.balance)} for a in accounts
            ],
        },
        "recent_transactions": [
            {
                "id": t.id,
                "description": t.description,
                "amount": float(t.amount),
                "type": t.type,
                "date": t.date.isoformat(),
            }
            for t in recent
        ],
    }


@router.get("/{org_id}/profit-loss")
def get_profit_loss(
    org_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    income = (
        db.query(func.sum(Transaction.amount))
        .filter(Transaction.org_id == org_id, Transaction.type == "money_in")
        .scalar()
        or 0
    )
    expenses = (
        db.query(func.sum(Transaction.amount))
        .filter(Transaction.org_id == org_id, Transaction.type == "money_out")
        .scalar()
        or 0
    )

    return {
        "plain_english": (
            f"In simple terms: You earned ${float(income):.2f} and spent "
            f"${float(expenses):.2f}. You kept ${float(income) - float(expenses):.2f}."
        ),
        "revenue": float(income),
        "expenses": float(expenses),
        "profit": float(income) - float(expenses),
        "margin": (
            round(
                (float(income) - float(expenses)) / float(income) * 100, 1
            )
            if income > 0
            else 0
        ),
    }
