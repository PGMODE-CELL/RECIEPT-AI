from datetime import date, datetime
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from decimal import Decimal

from app.database import get_db
from app.models.user import User
from app.models.organization import Organization
from app.models.account import Account
from app.models.transaction import Transaction, TransactionLine
from app.schemas.transaction import SimpleTransactionRequest
from app.services.ledger import update_account_balance
from app.auth import get_current_user

router = APIRouter(prefix="/api/transactions", tags=["Transactions"])


@router.post("/simple")
def add_transaction(
    data: SimpleTransactionRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    org = (
        db.query(Organization)
        .filter(
            Organization.id == data.org_id, Organization.owner_id == user.id
        )
        .first()
    )
    if not org:
        raise HTTPException(404, "Organization not found")

    if data.type == "money_in":
        debit_acc = (
            db.query(Account)
            .filter(Account.org_id == data.org_id, Account.type == "asset")
            .first()
        )
        credit_acc = (
            db.query(Account)
            .filter(
                Account.org_id == data.org_id,
                Account.name.ilike(f"%{data.category}%"),
            )
            .first()
        )
        if not credit_acc:
            credit_acc = (
                db.query(Account)
                .filter(Account.org_id == data.org_id, Account.type == "income")
                .first()
            )
    else:
        debit_acc = (
            db.query(Account)
            .filter(
                Account.org_id == data.org_id,
                Account.name.ilike(f"%{data.category}%"),
            )
            .first()
        )
        if not debit_acc:
            debit_acc = (
                db.query(Account)
                .filter(Account.org_id == data.org_id, Account.type == "expense")
                .first()
            )
        credit_acc = (
            db.query(Account)
            .filter(Account.org_id == data.org_id, Account.type == "asset")
            .first()
        )

    if not debit_acc or not credit_acc:
        raise HTTPException(400, "Could not find matching accounts")

    trans = Transaction(
        org_id=data.org_id,
        description=data.description,
        amount=data.amount,
        type=data.type,
        currency=data.currency or "",
        exchange_rate=Decimal(str(data.exchange_rate)) if data.exchange_rate else None,
        original_amount=Decimal(str(data.original_amount)) if data.original_amount else None,
        date=(
            datetime.strptime(data.date, "%Y-%m-%d").date()
            if data.date
            else date.today()
        ),
    )
    db.add(trans)
    db.flush()

    db.add(
        TransactionLine(
            transaction_id=trans.id,
            debit_account_id=debit_acc.id,
            credit_account_id=credit_acc.id,
            amount=data.amount,
        )
    )

    amount_dec = Decimal(str(data.amount))
    update_account_balance(db, debit_acc.id, amount_dec, is_debit=True)
    update_account_balance(db, credit_acc.id, amount_dec, is_debit=False)

    db.commit()

    return {
        "message": "Recorded!",
        "transaction_id": trans.id,
        "plain_english": f"You {data.type.replace('_', ' ')} ${data.amount:.2f} for {data.description}",
    }


@router.get("/{org_id}")
def get_transactions(
    org_id: int,
    page: int = 1,
    per_page: int = 25,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    offset = (page - 1) * per_page
    total = db.query(Transaction).filter(Transaction.org_id == org_id).count()
    txs = (
        db.query(Transaction)
        .filter(Transaction.org_id == org_id)
        .order_by(Transaction.date.desc())
        .offset(offset)
        .limit(per_page)
        .all()
    )
    return {
        "total": total,
        "page": page,
        "per_page": per_page,
        "items": [{
            "id": t.id, "org_id": t.org_id, "date": t.date.isoformat(),
            "description": t.description, "amount": float(t.amount),
            "type": t.type, "reference": t.reference,
            "currency": t.currency, "exchange_rate": float(t.exchange_rate) if t.exchange_rate else None,
            "original_amount": float(t.original_amount) if t.original_amount else None,
            "created_at": t.created_at.isoformat(),
        } for t in txs],
    }
