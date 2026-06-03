from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.account import Account


async def update_account_balance(db: AsyncSession, account_id: int, amount: Decimal, is_debit: bool):
    account = (await db.execute(select(Account).filter(Account.id == account_id))).scalar_one_or_none()
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
    await db.flush()
