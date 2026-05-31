from decimal import Decimal
from sqlalchemy.orm import Session
from app.models.account import Account


def update_account_balance(db: Session, account_id: int, amount: Decimal, is_debit: bool):
    account = db.query(Account).filter(Account.id == account_id).first()
    if not account:
        return
    if is_debit:
        if account.type in ("asset", "expense"):
            account.balance = Decimal(str(account.balance or 0)) + amount
        else:
            account.balance = Decimal(str(account.balance or 0)) - amount
    else:
        if account.type in ("asset", "expense"):
            account.balance = Decimal(str(account.balance or 0)) - amount
        else:
            account.balance = Decimal(str(account.balance or 0)) + amount
    db.flush()
