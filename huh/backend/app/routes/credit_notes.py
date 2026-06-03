from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database_async import get_async_db as get_db
from app.models.credit_note import CreditNote, DebitNote
from app.models.invoice import Invoice
from app.models.bill import Bill
from app.auth import get_current_user

router = APIRouter(prefix="/api/credit-notes", tags=["Credit Notes"])


@router.post("/{org_id}")
async def create_credit_note(org_id: int, invoice_id: int = None, contact_id: int = None, total: float = 0, reason: str = "", items: str = "[]", db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    import json
    parsed_items = json.loads(items)
    count = (await db.execute(select(func.count()).select_from(CreditNote).filter(CreditNote.org_id == org_id))).scalar()
    cn = CreditNote(org_id=org_id, invoice_id=invoice_id, contact_id=contact_id, total=total, remaining=total, reason=reason, items=parsed_items, number=f"CN-{org_id}-{count+1}")
    db.add(cn)
    if invoice_id:
        inv_result = await db.execute(select(Invoice).filter(Invoice.id == invoice_id))
        inv = inv_result.scalar_one_or_none()
        if inv:
            inv.status = "credited"
    await db.commit()
    await db.refresh(cn)
    return {"success": True, "credit_note": {"id": cn.id, "number": cn.number, "total": cn.total, "remaining": cn.remaining, "status": cn.status}}


@router.get("/{org_id}")
async def list_credit_notes(org_id: int, db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    result = await db.execute(select(CreditNote).filter(CreditNote.org_id == org_id).order_by(CreditNote.created_at.desc()))
    notes = result.scalars().all()
    return {"credit_notes": [{"id": n.id, "number": n.number, "date": str(n.date), "total": n.total, "remaining": n.remaining, "reason": n.reason, "status": n.status} for n in notes]}


@router.get("/debit/{org_id}")
async def list_debit_notes(org_id: int, db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    result = await db.execute(select(DebitNote).filter(DebitNote.org_id == org_id).order_by(DebitNote.created_at.desc()))
    notes = result.scalars().all()
    return {"debit_notes": [{"id": n.id, "number": n.number, "date": str(n.date), "total": n.total, "remaining": n.remaining, "reason": n.reason, "status": n.status} for n in notes]}


@router.post("/debit/{org_id}")
async def create_debit_note(org_id: int, bill_id: int = None, contact_id: int = None, total: float = 0, reason: str = "", items: str = "[]", db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    import json
    parsed_items = json.loads(items)
    count = (await db.execute(select(func.count()).select_from(DebitNote).filter(DebitNote.org_id == org_id))).scalar()
    dn = DebitNote(org_id=org_id, bill_id=bill_id, contact_id=contact_id, total=total, remaining=total, reason=reason, items=parsed_items, number=f"DN-{org_id}-{count+1}")
    db.add(dn)
    if bill_id:
        bl_result = await db.execute(select(Bill).filter(Bill.id == bill_id))
        bl = bl_result.scalar_one_or_none()
        if bl:
            bl.status = "debited"
    await db.commit()
    await db.refresh(dn)
    return {"success": True, "debit_note": {"id": dn.id, "number": dn.number, "total": dn.total, "remaining": dn.remaining, "status": dn.status}}


@router.get("/{org_id}/{note_id}")
async def get_credit_note(
    org_id: int,
    note_id: int,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    note = (await db.execute(select(CreditNote).filter(CreditNote.id == note_id, CreditNote.org_id == org_id))).scalar_one_or_none()
    if not note:
        raise HTTPException(404, "Credit note not found")
    return {"id": note.id, "number": note.number, "date": str(note.date), "total": note.total, "remaining": note.remaining, "reason": note.reason, "status": note.status, "items": note.items}


@router.put("/{org_id}/{note_id}")
async def update_credit_note(
    org_id: int,
    note_id: int,
    total: float = None,
    reason: str = None,
    items: str = None,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    note = (await db.execute(select(CreditNote).filter(CreditNote.id == note_id, CreditNote.org_id == org_id))).scalar_one_or_none()
    if not note:
        raise HTTPException(404, "Credit note not found")
    if total is not None:
        note.total = total
        note.remaining = total
    if reason is not None:
        note.reason = reason
    if items is not None:
        import json
        note.items = json.loads(items)
    await db.commit()
    return {"message": "Credit note updated"}


@router.delete("/{org_id}/{note_id}")
async def delete_credit_note(
    org_id: int,
    note_id: int,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    note = (await db.execute(select(CreditNote).filter(CreditNote.id == note_id, CreditNote.org_id == org_id))).scalar_one_or_none()
    if not note:
        raise HTTPException(404, "Credit note not found")
    await db.delete(note)
    await db.commit()
    return {"message": "Credit note deleted"}
