from datetime import datetime, date, timezone
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from sqlalchemy.orm import Session, aliased
from sqlalchemy import func
from decimal import Decimal

from app.database import get_db
from app.models.user import User
from app.models.account import Account
from app.models.transaction import Transaction, TransactionLine
from app.models.statement import StatementImport, StatementLine
from app.auth import get_current_user

router = APIRouter(prefix="/api/financials", tags=["Financials"])


@router.get("/{org_id}/trial-balance")
def trial_balance(org_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    accts = db.query(Account).filter(Account.org_id == org_id).order_by(Account.code).all()
    rows = []
    total_dr = 0
    total_cr = 0
    for a in accts:
        dr = db.query(func.coalesce(func.sum(TransactionLine.amount), 0)).filter(
            TransactionLine.debit_account_id == a.id
        ).scalar()
        cr = db.query(func.coalesce(func.sum(TransactionLine.amount), 0)).filter(
            TransactionLine.credit_account_id == a.id
        ).scalar()
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
def balance_sheet(org_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    accts = db.query(Account).filter(Account.org_id == org_id).all()
    assets = []
    liabilities = []
    equity = []
    for a in accts:
        dr = db.query(func.coalesce(func.sum(TransactionLine.amount), 0)).filter(
            TransactionLine.debit_account_id == a.id
        ).scalar() or 0
        cr = db.query(func.coalesce(func.sum(TransactionLine.amount), 0)).filter(
            TransactionLine.credit_account_id == a.id
        ).scalar() or 0
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
def cash_flow(org_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    income_accts = db.query(Account).filter(Account.org_id == org_id, Account.type == "income").all()
    expense_accts = db.query(Account).filter(Account.org_id == org_id, Account.type == "expense").all()

    operating = []
    op_total = 0
    for a in income_accts:
        cr = db.query(func.coalesce(func.sum(TransactionLine.amount), 0)).filter(
            TransactionLine.credit_account_id == a.id
        ).scalar() or 0
        operating.append({"category": a.name, "amount": round(float(cr), 2), "description": "Income"})
        op_total += float(cr)
    for a in expense_accts:
        dr = db.query(func.coalesce(func.sum(TransactionLine.amount), 0)).filter(
            TransactionLine.debit_account_id == a.id
        ).scalar() or 0
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
def ledger(org_id: int, account_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    acct = db.query(Account).filter(Account.id == account_id, Account.org_id == org_id).first()
    if not acct:
        raise HTTPException(404, "Account not found")

    DrLine = aliased(TransactionLine)
    CrLine = aliased(TransactionLine)

    dr_txns = db.query(Transaction).join(DrLine, DrLine.transaction_id == Transaction.id).filter(
        DrLine.debit_account_id == account_id, Transaction.org_id == org_id
    ).all()
    cr_txns = db.query(Transaction).join(CrLine, CrLine.transaction_id == Transaction.id).filter(
        CrLine.credit_account_id == account_id, Transaction.org_id == org_id
    ).all()

    txn_ids = set()
    entries = []
    for t in dr_txns + cr_txns:
        if t.id in txn_ids:
            continue
        txn_ids.add(t.id)
        dr_amt = db.query(func.coalesce(func.sum(TransactionLine.amount), 0)).filter(
            TransactionLine.transaction_id == t.id, TransactionLine.debit_account_id == account_id
        ).scalar() or 0
        cr_amt = db.query(func.coalesce(func.sum(TransactionLine.amount), 0)).filter(
            TransactionLine.transaction_id == t.id, TransactionLine.credit_account_id == account_id
        ).scalar() or 0
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
def create_journal(
    org_id: int = Form(...),
    date: str = Form(...),
    description: str = Form(...),
    lines_json: str = Form(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
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
    db.flush()

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
            update_account_balance(db, line["account_id"], Decimal(str(line["debit"])), is_debit=True)
        if line.get("credit", 0) > 0:
            update_account_balance(db, line["account_id"], Decimal(str(line["credit"])), is_debit=False)

    db.commit()
    return {"message": "Journal entry created", "transaction_id": txn.id}


# --- Bank Reconciliation ---

@router.post("/{org_id}/statement/upload")
def upload_statement(
    org_id: int,
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    import csv
    import io
    content = file.file.read().decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(content))
    stmt = StatementImport(org_id=org_id, filename=file.filename, status="pending")
    db.add(stmt)
    db.flush()

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
    db.commit()
    return {"import_id": stmt.id, "total_lines": count, "message": f"Imported {count} lines"}


@router.get("/{org_id}/statement/{import_id}")
def get_statement(org_id: int, import_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    stmt = db.query(StatementImport).filter(StatementImport.id == import_id, StatementImport.org_id == org_id).first()
    if not stmt:
        raise HTTPException(404, "Statement not found")
    lines = db.query(StatementLine).filter(StatementLine.import_id == import_id).order_by(StatementLine.date).all()
    return {
        "import": {"id": stmt.id, "filename": stmt.filename, "total_lines": stmt.total_lines, "matched_lines": stmt.matched_lines, "status": stmt.status},
        "lines": [{
            "id": line.id, "date": line.date.isoformat(), "description": line.description,
            "amount": float(line.amount), "type": line.type, "status": line.status,
            "matched_transaction_id": line.matched_transaction_id,
        } for line in lines],
    }


@router.post("/{org_id}/statement/{line_id}/match")
def match_line(org_id: int, line_id: int, transaction_id: int = Form(...), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    line = db.query(StatementLine).filter(StatementLine.id == line_id).first()
    if not line:
        raise HTTPException(404, "Statement line not found")
    txn = db.query(Transaction).filter(Transaction.id == transaction_id, Transaction.org_id == org_id).first()
    if not txn:
        raise HTTPException(404, "Transaction not found")

    line.status = "matched"
    line.matched_transaction_id = txn.id
    line.matched_at = datetime.now(timezone.utc)

    stmt = db.query(StatementImport).filter(StatementImport.id == line.import_id).first()
    matched = db.query(func.count(StatementLine.id)).filter(
        StatementLine.import_id == line.import_id, StatementLine.status == "matched"
    ).scalar() or 0
    stmt.matched_lines = matched
    if matched == stmt.total_lines:
        stmt.status = "done"
    db.commit()
    return {"message": "Line matched", "line_id": line_id, "transaction_id": transaction_id}


@router.get("/{org_id}/statement/{import_id}/suggestions")
def get_suggestions(org_id: int, import_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    lines = db.query(StatementLine).filter(
        StatementLine.import_id == import_id, StatementLine.status == "unmatched"
    ).all()
    txns = db.query(Transaction).filter(
        Transaction.org_id == org_id
    ).order_by(Transaction.date.desc()).limit(50).all()

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
def list_accounts(org_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    accts = db.query(Account).filter(Account.org_id == org_id).order_by(Account.code).all()
    return [{"id": a.id, "code": a.code or "", "name": a.name, "type": a.type, "balance": float(a.balance)} for a in accts]
