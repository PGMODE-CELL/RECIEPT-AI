from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import date
from decimal import Decimal

from app.database_async import get_async_db as get_db
from app.models.user import User
from app.models.transaction import Transaction, TransactionLine
from app.models.account import Account
from app.services.bank_import import parse_csv
from app.services.categorizer import categorize
from app.services.ledger import update_account_balance
from app.auth import get_current_user

router = APIRouter(prefix="/api/imports", tags=["Imports"])


@router.post("/csv/{org_id}")
async def import_csv(
    org_id: int,
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not file.filename.endswith(".csv"):
        raise HTTPException(400, "Only CSV files are supported")

    content = (await file.read()).decode("utf-8-sig")
    rows = parse_csv(content)

    if not rows:
        raise HTTPException(400, "No transactions found in CSV")

    imported = 0
    errors = 0

    for row in rows:
        try:
            categorize(row.get("description", ""), row.get("amount", 0))
            tx_date = row.get("date", str(date.today()))

            trans = Transaction(
                org_id=org_id,
                description=row.get("description", "Imported transaction"),
                amount=row.get("amount", 0),
                type=row.get("type", "money_out"),
                reference=file.filename,
                date=tx_date,
            )
            db.add(trans)
            await db.flush()

            tx_type = row.get("type", "money_out")
            if tx_type == "money_in":
                debit_acc = (
                    await db.execute(select(Account).filter(Account.org_id == org_id, Account.type == "asset"))
                ).scalar_one_or_none()
                credit_acc = (
                    await db.execute(select(Account).filter(Account.org_id == org_id, Account.type == "income"))
                ).scalar_one_or_none()
            else:
                debit_acc = (
                    await db.execute(select(Account).filter(Account.org_id == org_id, Account.type == "expense"))
                ).scalar_one_or_none()
                credit_acc = (
                    await db.execute(select(Account).filter(Account.org_id == org_id, Account.type == "asset"))
                ).scalar_one_or_none()

            if debit_acc and credit_acc:
                db.add(
                    TransactionLine(
                        transaction_id=trans.id,
                        debit_account_id=debit_acc.id,
                        credit_account_id=credit_acc.id,
                        amount=row.get("amount", 0),
                    )
                )
                amount_dec = Decimal(str(row.get("amount", 0)))
                update_account_balance(db, debit_acc.id, amount_dec, is_debit=True)
                update_account_balance(db, credit_acc.id, amount_dec, is_debit=False)

            imported += 1
        except Exception:
            errors += 1

    await db.commit()

    return {
        "imported": imported,
        "errors": errors,
        "total": len(rows),
        "message": f"Imported {imported} of {len(rows)} transactions.",
    }
