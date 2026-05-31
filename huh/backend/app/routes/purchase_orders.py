from fastapi import APIRouter, HTTPException, Depends, Form
from sqlalchemy.orm import Session
from datetime import date
import json

from app.database import get_db
from app.models.user import User
from app.models.purchase_order import PurchaseOrder
from app.models.bill import Bill
from app.models.inventory import InventoryItem, InventoryMovement
from app.auth import get_current_user

router = APIRouter(prefix="/api/purchase-orders", tags=["Purchase Orders"])


@router.post("/{org_id}")
def create_po(
    org_id: int, contact_id: int = Form(...),
    items: str = Form("[]"), total: float = Form(0),
    expected_date: str = Form(""), notes: str = Form(""),
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    count = db.query(PurchaseOrder).filter(PurchaseOrder.org_id == org_id).count()
    po = PurchaseOrder(
        org_id=org_id, contact_id=contact_id,
        number=f"PO-{org_id}-{count + 1}",
        total=total, items=json.loads(items),
        expected_date=date.fromisoformat(expected_date) if expected_date else None,
        notes=notes,
    )
    db.add(po)
    db.commit()
    return {"id": po.id, "number": po.number, "message": f"PO {po.number} created"}


@router.get("/{org_id}")
def list_pos(org_id: int, page: int = 1, per_page: int = 25,
             user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    q = db.query(PurchaseOrder).filter(PurchaseOrder.org_id == org_id).order_by(PurchaseOrder.created_at.desc())
    total = q.count()
    pos = q.offset((page - 1) * per_page).limit(per_page).all()
    return {"total": total, "page": page, "per_page": per_page, "items": [{
        "id": p.id, "number": p.number, "contact_id": p.contact_id,
        "date": str(p.date), "expected_date": str(p.expected_date) if p.expected_date else None,
        "total": float(p.total), "status": p.status,
    } for p in pos]}


@router.get("/{org_id}/{po_id}")
def get_po(org_id: int, po_id: int,
           user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id, PurchaseOrder.org_id == org_id).first()
    if not po:
        raise HTTPException(404, "PO not found")
    return {
        "id": po.id, "number": po.number, "contact_id": po.contact_id,
        "date": str(po.date), "expected_date": str(po.expected_date) if po.expected_date else None,
        "total": float(po.total), "status": po.status, "items": po.items,
        "notes": po.notes, "bill_id": po.bill_id,
    }


@router.post("/{org_id}/{po_id}/receive")
def receive_po(org_id: int, po_id: int,
               user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id, PurchaseOrder.org_id == org_id).first()
    if not po:
        raise HTTPException(404, "PO not found")
    po.status = "received"
    items = po.items or []
    for item in items:
        inv_item = db.query(InventoryItem).filter(
            InventoryItem.org_id == org_id, InventoryItem.name == item.get("name", ""),
        ).first()
        if inv_item:
            qty = float(item.get("quantity", 0))
            inv_item.quantity = float(inv_item.quantity) + qty
            mv = InventoryMovement(
                org_id=org_id, item_id=inv_item.id, type="in",
                quantity=qty, reference_type="purchase_order",
                reference_id=po.id, notes=f"Received from PO {po.number}",
            )
            db.add(mv)
    db.commit()
    return {"message": f"PO {po.number} marked as received"}


@router.post("/{org_id}/{po_id}/convert-to-bill")
def convert_po_to_bill(org_id: int, po_id: int,
                       user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id, PurchaseOrder.org_id == org_id).first()
    if not po:
        raise HTTPException(404, "PO not found")
    count = db.query(Bill).filter(Bill.org_id == org_id).count()
    bill = Bill(
        org_id=org_id, contact_id=po.contact_id,
        number=f"BILL-{org_id}-{count + 1}", date=date.today(),
        total=float(po.total), items=po.items, status="draft",
    )
    db.add(bill)
    po.bill_id = bill.id
    po.status = "received"
    db.commit()
    return {"bill_id": bill.id, "number": bill.number, "message": f"Bill {bill.number} created from PO"}
