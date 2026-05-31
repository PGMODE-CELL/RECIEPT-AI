from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.credit_note import CreditNote, DebitNote
from app.models.invoice import Invoice
from app.models.bill import Bill
from app.auth import get_current_user

router = APIRouter(prefix="/api/credit-notes", tags=["Credit Notes"])


@router.post("/{org_id}")
def create_credit_note(org_id: int, invoice_id: int = None, contact_id: int = None, total: float = 0, reason: str = "", items: str = "[]", db: Session = Depends(get_db), user=Depends(get_current_user)):
    import json
    parsed_items = json.loads(items)
    count = db.query(CreditNote).filter(CreditNote.org_id == org_id).count()
    cn = CreditNote(org_id=org_id, invoice_id=invoice_id, contact_id=contact_id, total=total, remaining=total, reason=reason, items=parsed_items, number=f"CN-{org_id}-{count+1}")
    db.add(cn)
    if invoice_id:
        inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
        if inv:
            inv.status = "credited"
    db.commit()
    db.refresh(cn)
    return {"success": True, "credit_note": {"id": cn.id, "number": cn.number, "total": cn.total, "remaining": cn.remaining, "status": cn.status}}


@router.get("/{org_id}")
def list_credit_notes(org_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    notes = db.query(CreditNote).filter(CreditNote.org_id == org_id).order_by(CreditNote.created_at.desc()).all()
    return {"credit_notes": [{"id": n.id, "number": n.number, "date": str(n.date), "total": n.total, "remaining": n.remaining, "reason": n.reason, "status": n.status} for n in notes]}


@router.get("/debit/{org_id}")
def list_debit_notes(org_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    notes = db.query(DebitNote).filter(DebitNote.org_id == org_id).order_by(DebitNote.created_at.desc()).all()
    return {"debit_notes": [{"id": n.id, "number": n.number, "date": str(n.date), "total": n.total, "remaining": n.remaining, "reason": n.reason, "status": n.status} for n in notes]}


@router.post("/debit/{org_id}")
def create_debit_note(org_id: int, bill_id: int = None, contact_id: int = None, total: float = 0, reason: str = "", items: str = "[]", db: Session = Depends(get_db), user=Depends(get_current_user)):
    import json
    parsed_items = json.loads(items)
    count = db.query(DebitNote).filter(DebitNote.org_id == org_id).count()
    dn = DebitNote(org_id=org_id, bill_id=bill_id, contact_id=contact_id, total=total, remaining=total, reason=reason, items=parsed_items, number=f"DN-{org_id}-{count+1}")
    db.add(dn)
    if bill_id:
        bl = db.query(Bill).filter(Bill.id == bill_id).first()
        if bl:
            bl.status = "debited"
    db.commit()
    db.refresh(dn)
    return {"success": True, "debit_note": {"id": dn.id, "number": dn.number, "total": dn.total, "remaining": dn.remaining, "status": dn.status}}
