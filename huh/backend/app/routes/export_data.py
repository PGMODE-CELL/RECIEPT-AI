import csv
import io
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.transaction import Transaction
from app.models.invoice import Invoice
from app.models.bill import Bill
from app.auth import get_current_user

router = APIRouter(prefix="/api/export", tags=["Export"])


def csv_response(rows: list[dict], filename: str):
    output = io.StringIO()
    if rows:
        writer = csv.DictWriter(output, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/{org_id}/transactions")
def export_transactions(org_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    txs = db.query(Transaction).filter(Transaction.org_id == org_id).order_by(Transaction.date.desc()).all()
    rows = [{
        "Date": t.date.isoformat(), "Description": t.description,
        "Amount": float(t.amount), "Type": t.type,
        "Reference": t.reference or "", "Currency": t.currency or "",
    } for t in txs]
    return csv_response(rows, "transactions.csv")


@router.get("/{org_id}/invoices")
def export_invoices(org_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    invs = db.query(Invoice).filter(Invoice.org_id == org_id).order_by(Invoice.date.desc()).all()
    rows = [{
        "Number": i.number or f"INV-{i.id}", "Date": i.date.isoformat(),
        "Due Date": i.due_date.isoformat() if i.due_date else "",
        "Contact": i.contact.name if i.contact else "",
        "Total": float(i.total or 0), "Paid": float(i.paid or 0),
        "Balance": float((i.total or 0) - (i.paid or 0)),
        "Status": i.status,
    } for i in invs]
    return csv_response(rows, "invoices.csv")


@router.get("/{org_id}/bills")
def export_bills(org_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    bs = db.query(Bill).filter(Bill.org_id == org_id).order_by(Bill.date.desc()).all()
    rows = [{
        "Number": b.number or f"BILL-{b.id}", "Date": b.date.isoformat(),
        "Due Date": b.due_date.isoformat() if b.due_date else "",
        "Contact": b.contact.name if b.contact else "",
        "Total": float(b.total or 0), "Paid": float(b.paid or 0),
        "Balance": float((b.total or 0) - (b.paid or 0)),
        "Status": b.status,
    } for b in bs]
    return csv_response(rows, "bills.csv")
