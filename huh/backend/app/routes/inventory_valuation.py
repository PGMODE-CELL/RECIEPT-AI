from fastapi import APIRouter, HTTPException, Depends, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database_async import get_async_db as get_db
from app.models.user import User
from app.models.inventory_valuation import InventoryValuation
from app.models.inventory import InventoryItem
from app.auth import get_current_user

router = APIRouter(prefix="/api/inventory-valuation", tags=["Inventory Valuation"])


@router.get("/{org_id}")
async def list_valuations(
    org_id: int,
    page: int = 1,
    per_page: int = 25,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    offset = (page - 1) * per_page
    total = (await db.execute(select(func.count()).select_from(InventoryValuation).filter(InventoryValuation.org_id == org_id))).scalar()
    result = await db.execute(
        select(InventoryValuation)
        .filter(InventoryValuation.org_id == org_id)
        .order_by(InventoryValuation.calculated_at.desc())
        .offset(offset)
        .limit(per_page)
    )
    vals = result.scalars().all()
    return {
        "total": total,
        "page": page,
        "per_page": per_page,
        "items": [{
            "id": v.id, "org_id": v.org_id, "item_id": v.item_id,
            "method": v.method, "unit_cost": float(v.unit_cost),
            "quantity": float(v.quantity), "total_value": float(v.total_value),
            "calculated_at": v.calculated_at.isoformat(),
        } for v in vals],
    }


@router.get("/{org_id}/{valuation_id}")
async def get_valuation(
    org_id: int,
    valuation_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    val = (await db.execute(
        select(InventoryValuation)
        .filter(InventoryValuation.id == valuation_id, InventoryValuation.org_id == org_id)
    )).scalar_one_or_none()
    if not val:
        raise HTTPException(404, "Inventory valuation not found")
    return {
        "id": val.id, "org_id": val.org_id, "item_id": val.item_id,
        "method": val.method, "unit_cost": float(val.unit_cost),
        "quantity": float(val.quantity), "total_value": float(val.total_value),
        "calculated_at": val.calculated_at.isoformat(),
    }


@router.post("/{org_id}")
async def create_valuation(
    org_id: int,
    item_id: int = Form(...),
    method: str = Form(...),
    unit_cost: float = Form(0),
    quantity: float = Form(0),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    total_value = unit_cost * quantity
    val = InventoryValuation(
        org_id=org_id, item_id=item_id, method=method,
        unit_cost=unit_cost, quantity=quantity, total_value=total_value,
    )
    db.add(val)
    await db.commit()
    await db.refresh(val)
    return {"id": val.id, "total_value": float(val.total_value), "message": "Inventory valuation created"}


@router.put("/{org_id}/{valuation_id}")
async def update_valuation(
    org_id: int,
    valuation_id: int,
    item_id: int = Form(None),
    method: str = Form(None),
    unit_cost: float = Form(None),
    quantity: float = Form(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    val = (await db.execute(
        select(InventoryValuation)
        .filter(InventoryValuation.id == valuation_id, InventoryValuation.org_id == org_id)
    )).scalar_one_or_none()
    if not val:
        raise HTTPException(404, "Inventory valuation not found")
    if item_id is not None: val.item_id = item_id
    if method is not None: val.method = method
    if unit_cost is not None: val.unit_cost = unit_cost
    if quantity is not None: val.quantity = quantity
    val.total_value = float(val.unit_cost) * float(val.quantity)
    await db.commit()
    return {"message": "Inventory valuation updated", "id": val.id}


@router.delete("/{org_id}/{valuation_id}")
async def delete_valuation(
    org_id: int,
    valuation_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    val = (await db.execute(
        select(InventoryValuation)
        .filter(InventoryValuation.id == valuation_id, InventoryValuation.org_id == org_id)
    )).scalar_one_or_none()
    if not val:
        raise HTTPException(404, "Inventory valuation not found")
    await db.delete(val)
    await db.commit()
    return {"message": "Inventory valuation deleted"}


@router.get("/{org_id}/calculate")
async def calculate_valuations(
    org_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(InventoryItem).filter(InventoryItem.org_id == org_id))
    items = result.scalars().all()
    calculated = []
    for item in items:
        cost = float(item.cost_price or 0)
        qty = float(item.quantity or 0)
        total = cost * qty
        val = InventoryValuation(
            org_id=org_id, item_id=item.id, method="weighted_average",
            unit_cost=cost, quantity=qty, total_value=total,
        )
        db.add(val)
        calculated.append({"item_id": item.id, "total_value": total})
    await db.commit()
    return {"message": "Valuations calculated", "items": calculated}
