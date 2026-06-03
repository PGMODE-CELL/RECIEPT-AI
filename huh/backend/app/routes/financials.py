from datetime import datetime, date, timezone
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from decimal import Decimal

from app.database_async import get_async_db as get_db
from app.models.user import User
from app.models.account import Account
from app.models.transaction import Transaction, TransactionLine
from app.models.statement import StatementImport, StatementLine
from app.auth import get_current_user

router = APIRouter(prefix="/api/financials", tags=["Financials"])


@router.get("/{org_id}/trial-balance")
async def trial_balance(org_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Account).filter(Account.org_id == org_id).order_by(Account.code))
    accts = result.scalars().all()
    rows = []
    total_dr = 0
    total_cr = 0
    for a in accts:
        dr = (await db.execute(
            select(func.coalesce(func.sum(TransactionLine.amount), 0))
            .filter(TransactionLine.debit_account_id == a.id)
        )).scalar()
        cr = (await db.execute(
            select(func.coalesce(func.sum(TransactionLine.amount), 0))
            .filter(TransactionLine.credit_account_id == a.id)
        )).scalar()
        bal = float(dr - cr) if a.type in ("asset", "expense") else float(cr - dr)
        r_dr = bal if bal > 0 else 0
        r_cr = -bal if bal < 0 else 0
        total_dr += r_dr
        total_cr += r_cr
        rows.append({
            "code": a.code or "",
            "name": a.name,
            "type": a.type,
            "debit": round(r_dr, 2),
            "credit": round(r_cr, 2),
            "balance": round(bal, 2),
        })
    return {"rows": rows, "total_debit": round(total_dr, 2), "total_credit": round(total_cr, 2)}


@router.get("/{org_id}/balance-sheet")
async def balance_sheet(org_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Account).filter(Account.org_id == org_id))
    accts = result.scalars().all()
    assets = []
    liabilities = []
    equity = []
    for a in accts:
        dr = (await db.execute(
            select(func.coalesce(func.sum(TransactionLine.amount), 0))
            .filter(TransactionLine.debit_account_id == a.id)
        )).scalar() or 0
        cr = (await db.execute(
            select(func.coalesce(func.sum(TransactionLine.amount), 0))
            .filter(TransactionLine.credit_account_id == a.id)
        )).scalar() or 0
        bal = float(dr - cr) if a.type == "asset" else float(cr - dr)
        entry = {"code": a.code or "", "name": a.name, "balance": round(bal, 2)}
        if a.type == "asset":
            assets.append(entry)
        elif a.type == "liability":
            liabilities.append(entry)
        elif a.type == "equity":
            equity.append(entry)
    return {
        "assets": assets,
        "liabilities": liabilities,
        "equity": equity,
        "total_assets": round(sum(a["balance"] for a in assets), 2),
        "total_liabilities": round(sum(item["balance"] for item in liabilities), 2),
        "total_equity": round(sum(e["balance"] for e in equity), 2),
    }


@router.get("/{org_id}/cash-flow")
async def cash_flow(org_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result_income = await db.execute(select(Account).filter(Account.org_id == org_id, Account.type == "income"))
    income_accts = result_income.scalars().all()
    result_expense = await db.execute(select(Account).filter(Account.org_id == org_id, Account.type == "expense"))
    expense_accts = result_expense.scalars().all()

    operating = []
    op_total = 0
    for a in income_accts:
        cr = (await db.execute(
            select(func.coalesce(func.sum(TransactionLine.amount), 0))
            .filter(TransactionLine.credit_account_id == a.id)
        )).scalar() or 0
        operating.append({"category": a.name, "amount": round(float(cr), 2), "description": "Income"})
        op_total += float(cr)
    for a in expense_accts:
        dr = (await db.execute(
            select(func.coalesce(func.sum(TransactionLine.amount), 0))
            .filter(TransactionLine.debit_account_id == a.id)
        )).scalar() or 0
        operating.append({"category": a.name, "amount": round(-float(dr), 2), "description": "Expense"})
        op_total -= float(dr)

    return {
        "operating": operating,
        "operating_total": round(op_total, 2),
        "investing": [],
        "investing_total": 0,
        "financing": [],
        "financing_total": 0,
        "net_cash_flow": round(op_total, 2),
    }


@router.get("/{org_id}/ledger/{account_id}")
async def ledger(org_id: int, account_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    acct = (await db.execute(select(Account).filter(Account.id == account_id, Account.org_id == org_id))).scalar_one_or_none()
    if not acct:
        raise HTTPException(404, "Account not found")

    dr_txns_result = await db.execute(
        select(Transaction)
        .join(TransactionLine, TransactionLine.transaction_id == Transaction.id)
        .filter(TransactionLine.debit_account_id == account_id, Transaction.org_id == org_id)
    )
    dr_txns = dr_txns_result.scalars().all()
    cr_txns_result = await db.execute(
        select(Transaction)
        .join(TransactionLine, TransactionLine.transaction_id == Transaction.id)
        .filter(TransactionLine.credit_account_id == account_id, Transaction.org_id == org_id)
    )
    cr_txns = cr_txns_result.scalars().all()

    txn_ids = set()
    entries = []
    for t in list(dr_txns) + list(cr_txns):
        if t.id in txn_ids:
            continue
        txn_ids.add(t.id)
        dr_amt = (await db.execute(
            select(func.coalesce(func.sum(TransactionLine.amount), 0))
            .filter(TransactionLine.transaction_id == t.id, TransactionLine.debit_account_id == account_id)
        )).scalar() or 0
        cr_amt = (await db.execute(
            select(func.coalesce(func.sum(TransactionLine.amount), 0))
            .filter(TransactionLine.transaction_id == t.id, TransactionLine.credit_account_id == account_id)
        )).scalar() or 0
        entries.append({
            "id": t.id,
            "date": t.date.isoformat(),
            "description": t.description,
            "debit": round(float(dr_amt), 2),
            "credit": round(float(cr_amt), 2),
            "balance": 0,
        })

    entries.sort(key=lambda e: e["date"])
    bal = 0
    is_positive = acct.type in ("asset", "expense")
    for e in entries:
        bal += (e["debit"] - e["credit"]) if is_positive else (e["credit"] - e["debit"])
        e["balance"] = round(bal, 2)

    return {
        "account_code": acct.code or "",
        "account_name": acct.name,
        "entries": entries,
        "closing_balance": round(bal, 2),
    }


@router.post("/journal")
async def create_journal(
    org_id: int = Form(...),
    date: str = Form(...),
    description: str = Form(...),
    lines_json: str = Form(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    import json
    lines = json.loads(lines_json)
    if not lines:
        raise HTTPException(400, "At least one line required")
    total_dr = sum(line.get("debit", 0) for line in lines)
    total_cr = sum(line.get("credit", 0) for line in lines)
    if abs(total_dr - total_cr) > 0.01:
        raise HTTPException(400, f"Debits ({total_dr}) must equal Credits ({total_cr})")

    txn = Transaction(
        org_id=org_id,
        description=description,
        amount=Decimal(str(total_dr)),
        type="journal",
        date=datetime.strptime(date, "%Y-%m-%d").date() if date else date.today(),
    )
    db.add(txn)
    await db.flush()

    for line in lines:
        if line.get("debit", 0) > 0:
            db.add(TransactionLine(
                transaction_id=txn.id,
                debit_account_id=line["account_id"],
                credit_account_id=line.get("contra_account_id"),
                amount=Decimal(str(line["debit"])),
            ))
        if line.get("credit", 0) > 0:
            db.add(TransactionLine(
                transaction_id=txn.id,
                debit_account_id=line.get("contra_account_id"),
                credit_account_id=line["account_id"],
                amount=Decimal(str(line["credit"])),
            ))
        from app.services.ledger import update_account_balance
        if line.get("debit", 0) > 0:
            await update_account_balance(db, line["account_id"], Decimal(str(line["debit"])), is_debit=True)
        if line.get("credit", 0) > 0:
            await update_account_balance(db, line["account_id"], Decimal(str(line["credit"])), is_debit=False)

    await db.commit()
    return {"message": "Journal entry created", "transaction_id": txn.id}


# --- Bank Reconciliation ---

@router.post("/{org_id}/statement/upload")
async def upload_statement(
    org_id: int,
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    import csv
    import io
    content = file.file.read().decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(content))
    stmt = StatementImport(org_id=org_id, filename=file.filename, status="pending")
    db.add(stmt)
    await db.flush()

    count = 0
    for row in reader:
        date_str = row.get("Date", "").strip()
        desc = row.get("Description", row.get("Narration", row.get("Particulars", ""))).strip()
        amt_str = row.get("Amount", row.get("Debit", row.get("Credit", "0"))).strip()
        dr = row.get("Debit", "0").strip()
        cr = row.get("Credit", "0").strip()

        try:
            amt = abs(float(amt_str.replace(",", "")))
        except ValueError:
            continue
        if dr and float(dr.replace(",", "")) > 0:
            txn_type = "debit"
        elif cr and float(cr.replace(",", "")) > 0:
            txn_type = "credit"
        elif amt > 0:
            txn_type = "debit"
        else:
            continue

        try:
            parsed_date = datetime.strptime(date_str, "%m/%d/%Y").date()
        except ValueError:
            try:
                parsed_date = datetime.strptime(date_str, "%Y-%m-%d").date()
            except ValueError:
                parsed_date = date.today()

        db.add(StatementLine(
            import_id=stmt.id, date=parsed_date, description=desc[:500],
            amount=Decimal(str(amt)), type=txn_type, reference=row.get("Reference", row.get("Cheque", "")),
            category=row.get("Category", ""),
        ))
        count += 1

    stmt.total_lines = count
    await db.commit()
    return {"import_id": stmt.id, "total_lines": count, "message": f"Imported {count} lines"}


@router.get("/{org_id}/statement/{import_id}")
async def get_statement(org_id: int, import_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    stmt = (await db.execute(select(StatementImport).filter(StatementImport.id == import_id, StatementImport.org_id == org_id))).scalar_one_or_none()
    if not stmt:
        raise HTTPException(404, "Statement not found")
    lines_result = await db.execute(select(StatementLine).filter(StatementLine.import_id == import_id).order_by(StatementLine.date))
    lines = lines_result.scalars().all()
    return {
        "import": {"id": stmt.id, "filename": stmt.filename, "total_lines": stmt.total_lines, "matched_lines": stmt.matched_lines, "status": stmt.status},
        "lines": [{
            "id": line.id, "date": line.date.isoformat(), "description": line.description,
            "amount": float(line.amount), "type": line.type, "status": line.status,
            "matched_transaction_id": line.matched_transaction_id,
        } for line in lines],
    }


@router.post("/{org_id}/statement/{line_id}/match")
async def match_line(org_id: int, line_id: int, transaction_id: int = Form(...), user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    line = (await db.execute(select(StatementLine).filter(StatementLine.id == line_id))).scalar_one_or_none()
    if not line:
        raise HTTPException(404, "Statement line not found")
    txn = (await db.execute(select(Transaction).filter(Transaction.id == transaction_id, Transaction.org_id == org_id))).scalar_one_or_none()
    if not txn:
        raise HTTPException(404, "Transaction not found")

    line.status = "matched"
    line.matched_transaction_id = txn.id
    line.matched_at = datetime.now(timezone.utc)

    stmt = (await db.execute(select(StatementImport).filter(StatementImport.id == line.import_id))).scalar_one_or_none()
    matched = (await db.execute(
        select(func.count(StatementLine.id))
        .filter(StatementLine.import_id == line.import_id, StatementLine.status == "matched")
    )).scalar() or 0
    stmt.matched_lines = matched
    if matched == stmt.total_lines:
        stmt.status = "done"
    await db.commit()
    return {"message": "Line matched", "line_id": line_id, "transaction_id": transaction_id}


@router.get("/{org_id}/statement/{import_id}/suggestions")
async def get_suggestions(org_id: int, import_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    lines_result = await db.execute(select(StatementLine).filter(
        StatementLine.import_id == import_id, StatementLine.status == "unmatched"
    ))
    lines = lines_result.scalars().all()
    txns_result = await db.execute(
        select(Transaction).filter(Transaction.org_id == org_id)
        .order_by(Transaction.date.desc()).limit(50)
    )
    txns = txns_result.scalars().all()

    suggestions = []
    for line in lines:
        best = None
        best_score = 0
        for txn in txns:
            score = 0
            if abs(float(line.amount) - float(txn.amount)) < 0.01:
                score += 50
            if line.date == txn.date:
                score += 30
            if line.description.lower() in txn.description.lower() or txn.description.lower() in line.description.lower():
                score += 20
            if score > best_score:
                best_score = score
                best = txn
        if best and best_score >= 50:
            suggestions.append({
                "line_id": line.id,
                "line_date": line.date.isoformat(),
                "line_description": line.description,
                "line_amount": float(line.amount),
                "transaction_id": best.id,
                "transaction_date": best.date.isoformat(),
                "transaction_description": best.description,
                "transaction_amount": float(best.amount),
                "score": best_score,
            })
    return suggestions


@router.get("/{org_id}/accounts")
async def list_accounts(org_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Account).filter(Account.org_id == org_id).order_by(Account.code))
    accts = result.scalars().all()
    return [{"id": a.id, "code": a.code or "", "name": a.name, "type": a.type, "balance": float(a.balance)} for a in accts]


@router.post("/{org_id}/accounts")
async def create_account(
    org_id: int,
    name: str = Form(...),
    type: str = Form(...),
    code: str = Form(""),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    acct = Account(org_id=org_id, name=name, type=type, code=code)
    db.add(acct)
    await db.commit()
    await db.refresh(acct)
    return {"id": acct.id, "name": acct.name, "type": acct.type, "message": f"Account '{name}' created"}


@router.get("/{org_id}/accounts/{account_id}")
async def get_account(
    org_id: int,
    account_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    acct = (await db.execute(select(Account).filter(Account.id == account_id, Account.org_id == org_id))).scalar_one_or_none()
    if not acct:
        raise HTTPException(404, "Account not found")
    return {"id": acct.id, "code": acct.code or "", "name": acct.name, "type": acct.type, "balance": float(acct.balance)}


@router.put("/{org_id}/accounts/{account_id}")
async def update_account(
    org_id: int,
    account_id: int,
    name: str = Form(None),
    type: str = Form(None),
    code: str = Form(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    acct = (await db.execute(select(Account).filter(Account.id == account_id, Account.org_id == org_id))).scalar_one_or_none()
    if not acct:
        raise HTTPException(404, "Account not found")
    if name is not None:
        acct.name = name
    if type is not None:
        acct.type = type
    if code is not None:
        acct.code = code
    await db.commit()
    return {"message": "Account updated"}


@router.delete("/{org_id}/accounts/{account_id}")
async def delete_account(
    org_id: int,
    account_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    acct = (await db.execute(select(Account).filter(Account.id == account_id, Account.org_id == org_id))).scalar_one_or_none()
    if not acct:
        raise HTTPException(404, "Account not found")
    await db.delete(acct)
    await db.commit()
    return {"message": "Account deleted"}


@router.get("/{org_id}/journal")
async def list_journal(
    org_id: int,
    page: int = 1,
    per_page: int = 50,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    total = (await db.execute(
        select(func.count()).select_from(Transaction)
        .filter(Transaction.org_id == org_id, Transaction.type == "journal")
    )).scalar()
    result = await db.execute(
        select(Transaction)
        .filter(Transaction.org_id == org_id, Transaction.type == "journal")
        .order_by(Transaction.date.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    txns = result.scalars().all()
    return {
        "total": total,
        "page": page,
        "per_page": per_page,
        "items": [{
            "id": t.id, "date": t.date.isoformat(), "description": t.description,
            "amount": float(t.amount),
        } for t in txns],
    }


@router.get("/{org_id}/journal/{entry_id}")
async def get_journal_entry(
    org_id: int,
    entry_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    txn = (await db.execute(select(Transaction).filter(Transaction.id == entry_id, Transaction.org_id == org_id, Transaction.type == "journal"))).scalar_one_or_none()
    if not txn:
        raise HTTPException(404, "Journal entry not found")
    lines_result = await db.execute(select(TransactionLine).filter(TransactionLine.transaction_id == txn.id))
    lines = lines_result.scalars().all()
    return {
        "id": txn.id, "date": txn.date.isoformat(), "description": txn.description,
        "amount": float(txn.amount),
        "lines": [{
            "id": l.id, "debit_account_id": l.debit_account_id,
            "credit_account_id": l.credit_account_id, "amount": float(l.amount),
        } for l in lines],
    }


@router.delete("/{org_id}/journal/{entry_id}")
async def delete_journal_entry(
    org_id: int,
    entry_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import delete
    txn = (await db.execute(select(Transaction).filter(Transaction.id == entry_id, Transaction.org_id == org_id, Transaction.type == "journal"))).scalar_one_or_none()
    if not txn:
        raise HTTPException(404, "Journal entry not found")
    await db.execute(delete(TransactionLine).where(TransactionLine.transaction_id == txn.id))
    await db.delete(txn)
    await db.commit()
    return {"message": "Journal entry deleted"}
