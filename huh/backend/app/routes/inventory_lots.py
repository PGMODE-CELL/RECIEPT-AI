import json
from fastapi import APIRouter, HTTPException, Depends, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import date

from app.database_async import get_async_db as get_db
from app.models.user import User
from app.models.inventory_lot import InventoryLot
from app.auth import get_current_user

router = APIRouter(prefix="/api/inventory-lots", tags=["Inventory Lots"])


@router.get("/{org_id}")
async def list_inventory_lots(
    org_id: int,
    page: int = 1,
    per_page: int = 25,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    offset = (page - 1) * per_page
    total = (await db.execute(select(func.count()).select_from(InventoryLot).filter(InventoryLot.org_id == org_id))).scalar()
    result = await db.execute(
        select(InventoryLot)
        .filter(InventoryLot.org_id == org_id)
        .order_by(InventoryLot.created_at.desc())
        .offset(offset)
        .limit(per_page)
    )
    lots = result.scalars().all()
    return {
        "total": total,
        "page": page,
        "per_page": per_page,
        "items": [{
            "id": l.id, "org_id": l.org_id, "item_id": l.item_id,
            "lot_number": l.lot_number, "quantity": float(l.quantity),
            "unit_cost": float(l.unit_cost),
            "expiry_date": l.expiry_date.isoformat() if l.expiry_date else None,
            "created_at": l.created_at.isoformat(),
        } for l in lots],
    }


@router.get("/{org_id}/{lot_id}")
async def get_inventory_lot(
    org_id: int,
    lot_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    lot = (await db.execute(select(InventoryLot).filter(InventoryLot.id == lot_id, InventoryLot.org_id == org_id))).scalar_one_or_none()
    if not lot:
        raise HTTPException(404, "Inventory lot not found")
    return {
        "id": lot.id, "org_id": lot.org_id, "item_id": lot.item_id,
        "lot_number": lot.lot_number, "quantity": float(lot.quantity),
        "unit_cost": float(lot.unit_cost),
        "expiry_date": lot.expiry_date.isoformat() if lot.expiry_date else None,
        "created_at": lot.created_at.isoformat(),
    }


@router.post("/{org_id}")
async def create_inventory_lot(
    org_id: int,
    item_id: int = Form(...),
    lot_number: str = Form(...),
    quantity: float = Form(0),
    unit_cost: float = Form(0),
    expiry_date: str = Form(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    lot = InventoryLot(
        org_id=org_id, item_id=item_id, lot_number=lot_number,
        quantity=quantity, unit_cost=unit_cost,
        expiry_date=date.fromisoformat(expiry_date) if expiry_date else None,
    )
    db.add(lot)
    await db.commit()
    await db.refresh(lot)
    return {"id": lot.id, "lot_number": lot.lot_number, "message": "Inventory lot created"}


@router.put("/{org_id}/{lot_id}")
async def update_inventory_lot(
    org_id: int,
    lot_id: int,
    item_id: int = Form(None),
    lot_number: str = Form(None),
    quantity: float = Form(None),
    unit_cost: float = Form(None),
    expiry_date: str = Form(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    lot = (await db.execute(select(InventoryLot).filter(InventoryLot.id == lot_id, InventoryLot.org_id == org_id))).scalar_one_or_none()
    if not lot:
        raise HTTPException(404, "Inventory lot not found")
    if item_id is not None: lot.item_id = item_id
    if lot_number is not None: lot.lot_number = lot_number
    if quantity is not None: lot.quantity = quantity
    if unit_cost is not None: lot.unit_cost = unit_cost
    if expiry_date is not None: lot.expiry_date = date.fromisoformat(expiry_date)
    await db.commit()
    return {"message": "Inventory lot updated", "id": lot.id}


@router.delete("/{org_id}/{lot_id}")
async def delete_inventory_lot(
    org_id: int,
    lot_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    lot = (await db.execute(select(InventoryLot).filter(InventoryLot.id == lot_id, InventoryLot.org_id == org_id))).scalar_one_or_none()
    if not lot:
        raise HTTPException(404, "Inventory lot not found")
    await db.delete(lot)
    await db.commit()
    return {"message": "Inventory lot deleted"}


@router.put("/{org_id}/batch")
async def batch_update_lots(
    org_id: int,
    updates: str = Form(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    updates_list = json.loads(updates)
    updated = 0
    for update in updates_list:
        lot = (await db.execute(
            select(InventoryLot)
            .filter(InventoryLot.id == update.get("id"), InventoryLot.org_id == org_id)
        )).scalar_one_or_none()
        if lot:
            if "quantity" in update: lot.quantity = update["quantity"]
            if "unit_cost" in update: lot.unit_cost = update["unit_cost"]
            updated += 1
    await db.commit()
    return {"message": f"Batch update completed", "updated": updated}
