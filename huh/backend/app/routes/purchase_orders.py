from fastapi import APIRouter, HTTPException, Depends, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import date
import json

from app.database_async import get_async_db as get_db
from app.models.user import User
from app.models.purchase_order import PurchaseOrder
from app.models.bill import Bill
from app.models.inventory import InventoryItem, InventoryMovement
from app.auth import get_current_user

router = APIRouter(prefix="/api/purchase-orders", tags=["Purchase Orders"])


@router.post("/{org_id}")
async def create_po(
    org_id: int, contact_id: int = Form(...),
    items: str = Form("[]"), total: float = Form(0),
    expected_date: str = Form(""), notes: str = Form(""),
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    count = (await db.execute(select(func.count()).select_from(PurchaseOrder).filter(PurchaseOrder.org_id == org_id))).scalar()
    po = PurchaseOrder(
        org_id=org_id, contact_id=contact_id,
        number=f"PO-{org_id}-{count + 1}",
        total=total, items=json.loads(items),
        expected_date=date.fromisoformat(expected_date) if expected_date else None,
        notes=notes,
    )
    db.add(po)
    await db.commit()
    return {"id": po.id, "number": po.number, "message": f"PO {po.number} created"}


@router.get("/{org_id}")
async def list_pos(org_id: int, page: int = 1, per_page: int = 25,
                   user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    total = (await db.execute(select(func.count()).select_from(PurchaseOrder).filter(PurchaseOrder.org_id == org_id))).scalar()
    result = await db.execute(
        select(PurchaseOrder).filter(PurchaseOrder.org_id == org_id).order_by(PurchaseOrder.created_at.desc()).offset((page - 1) * per_page).limit(per_page)
    )
    pos = result.scalars().all()
    return {"total": total, "page": page, "per_page": per_page, "items": [{
        "id": p.id, "number": p.number, "contact_id": p.contact_id,
        "date": str(p.date), "expected_date": str(p.expected_date) if p.expected_date else None,
        "total": float(p.total), "status": p.status,
    } for p in pos]}


@router.get("/{org_id}/{po_id}")
async def get_po(org_id: int, po_id: int,
                 user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    po = (await db.execute(select(PurchaseOrder).filter(PurchaseOrder.id == po_id, PurchaseOrder.org_id == org_id))).scalar_one_or_none()
    if not po:
        raise HTTPException(404, "PO not found")
    return {
        "id": po.id, "number": po.number, "contact_id": po.contact_id,
        "date": str(po.date), "expected_date": str(po.expected_date) if po.expected_date else None,
        "total": float(po.total), "status": po.status, "items": po.items,
        "notes": po.notes, "bill_id": po.bill_id,
    }


@router.post("/{org_id}/{po_id}/receive")
async def receive_po(org_id: int, po_id: int,
                     user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    po = (await db.execute(select(PurchaseOrder).filter(PurchaseOrder.id == po_id, PurchaseOrder.org_id == org_id))).scalar_one_or_none()
    if not po:
        raise HTTPException(404, "PO not found")
    po.status = "received"
    items = po.items or []
    for item in items:
        inv_item_result = await db.execute(
            select(InventoryItem).filter(
                InventoryItem.org_id == org_id, InventoryItem.name == item.get("name", ""),
            )
        )
        inv_item = inv_item_result.scalar_one_or_none()
        if inv_item:
            qty = float(item.get("quantity", 0))
            inv_item.quantity = float(inv_item.quantity) + qty
            mv = InventoryMovement(
                org_id=org_id, item_id=inv_item.id, type="in",
                quantity=qty, reference_type="purchase_order",
                reference_id=po.id, notes=f"Received from PO {po.number}",
            )
            db.add(mv)
    await db.commit()
    return {"message": f"PO {po.number} marked as received"}


@router.post("/{org_id}/{po_id}/convert-to-bill")
async def convert_po_to_bill(org_id: int, po_id: int,
                             user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    po = (await db.execute(select(PurchaseOrder).filter(PurchaseOrder.id == po_id, PurchaseOrder.org_id == org_id))).scalar_one_or_none()
    if not po:
        raise HTTPException(404, "PO not found")
    count = (await db.execute(select(func.count()).select_from(Bill).filter(Bill.org_id == org_id))).scalar()
    bill = Bill(
        org_id=org_id, contact_id=po.contact_id,
        number=f"BILL-{org_id}-{count + 1}", date=date.today(),
        total=float(po.total), items=po.items, status="draft",
    )
    db.add(bill)
    po.bill_id = bill.id
    po.status = "received"
    await db.commit()
    return {"bill_id": bill.id, "number": bill.number, "message": f"Bill {bill.number} created from PO"}


@router.put("/{org_id}/{po_id}")
async def update_po(
    org_id: int,
    po_id: int,
    contact_id: int = Form(None),
    items: str = Form(None),
    total: float = Form(None),
    expected_date: str = Form(None),
    notes: str = Form(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    po = (await db.execute(select(PurchaseOrder).filter(PurchaseOrder.id == po_id, PurchaseOrder.org_id == org_id))).scalar_one_or_none()
    if not po:
        raise HTTPException(404, "PO not found")
    if contact_id is not None:
        po.contact_id = contact_id
    if items is not None:
        po.items = json.loads(items)
    if total is not None:
        po.total = total
    if expected_date is not None:
        po.expected_date = date.fromisoformat(expected_date) if expected_date else None
    if notes is not None:
        po.notes = notes
    await db.commit()
    return {"message": "PO updated"}


@router.delete("/{org_id}/{po_id}")
async def delete_po(
    org_id: int,
    po_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    po = (await db.execute(select(PurchaseOrder).filter(PurchaseOrder.id == po_id, PurchaseOrder.org_id == org_id))).scalar_one_or_none()
    if not po:
        raise HTTPException(404, "PO not found")
    await db.delete(po)
    await db.commit()
    return {"message": "PO deleted"}
