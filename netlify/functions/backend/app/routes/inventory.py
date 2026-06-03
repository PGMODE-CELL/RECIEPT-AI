from fastapi import APIRouter, HTTPException, Depends, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database_async import get_async_db as get_db
from app.models.user import User
from app.models.inventory import InventoryItem, InventoryMovement
from app.auth import get_current_user

router = APIRouter(prefix="/api/inventory", tags=["Inventory"])


@router.post("/{org_id}/items")
async def create_item(
    org_id: int, name: str = Form(...), sku: str = Form(""),
    description: str = Form(""), unit: str = Form("pcs"),
    quantity: float = Form(0), price: float = Form(0),
    cost_price: float = Form(0), reorder_level: float = Form(0),
    category: str = Form(""), tax_rate_id: int = Form(0),
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    item = InventoryItem(
        org_id=org_id, name=name, sku=sku, description=description,
        unit=unit, quantity=quantity, price=price, cost_price=cost_price,
        reorder_level=reorder_level, category=category,
        tax_rate_id=tax_rate_id if tax_rate_id else None,
    )
    db.add(item)
    await db.commit()
    return {"id": item.id, "name": item.name, "sku": item.sku, "message": "Item created"}


@router.get("/{org_id}/items")
async def list_items(org_id: int, page: int = 1, per_page: int = 50,
                     user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    base = select(InventoryItem).filter(InventoryItem.org_id == org_id, InventoryItem.active)
    total = (await db.execute(select(func.count()).select_from(InventoryItem).filter(InventoryItem.org_id == org_id, InventoryItem.active))).scalar()
    items = (await db.execute(base.offset((page - 1) * per_page).limit(per_page))).scalars().all()
    return {"total": total, "page": page, "per_page": per_page, "items": [{
        "id": i.id, "name": i.name, "sku": i.sku, "unit": i.unit,
        "quantity": float(i.quantity), "price": float(i.price),
        "cost_price": float(i.cost_price), "reorder_level": float(i.reorder_level),
        "category": i.category,
    } for i in items]}


@router.get("/{org_id}/items/low-stock")
async def low_stock(org_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    items = (await db.execute(select(InventoryItem).filter(
        InventoryItem.org_id == org_id,
        InventoryItem.quantity <= InventoryItem.reorder_level,
        InventoryItem.active,
    ))).scalars().all()
    return [{
        "id": i.id, "name": i.name, "sku": i.sku,
        "quantity": float(i.quantity), "reorder_level": float(i.reorder_level),
    } for i in items]


@router.put("/{org_id}/items/{item_id}")
async def update_item(org_id: int, item_id: int, quantity: float = Form(0), price: float = Form(0),
                      user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    item = (await db.execute(select(InventoryItem).filter(InventoryItem.id == item_id, InventoryItem.org_id == org_id))).scalar_one_or_none()
    if not item:
        raise HTTPException(404, "Item not found")
    old_qty = float(item.quantity)
    item.quantity = quantity
    item.price = price
    diff = quantity - old_qty
    if diff != 0:
        mv = InventoryMovement(
            org_id=org_id, item_id=item_id, type="adjustment",
            quantity=diff, notes="Manual adjustment",
        )
        db.add(mv)
    await db.commit()
    return {"message": "Item updated"}


@router.get("/{org_id}/movements")
async def list_movements(org_id: int, item_id: int = 0, page: int = 1, per_page: int = 50,
                         user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    stmt = select(InventoryMovement).filter(InventoryMovement.org_id == org_id)
    if item_id:
        stmt = stmt.filter(InventoryMovement.item_id == item_id)
    stmt = stmt.order_by(InventoryMovement.created_at.desc())
    total = (await db.execute(select(func.count()).select_from(InventoryMovement).filter(InventoryMovement.org_id == org_id))).scalar()
    mvs = (await db.execute(stmt.offset((page - 1) * per_page).limit(per_page))).scalars().all()
    return {"total": total, "page": page, "per_page": per_page, "items": [{
        "id": m.id, "item_id": m.item_id, "type": m.type,
        "quantity": float(m.quantity), "reference_type": m.reference_type,
        "reference_id": m.reference_id, "notes": m.notes,
        "created_at": m.created_at.isoformat(),
    } for m in mvs]}


@router.get("/{org_id}/items/{item_id}")
async def get_item(
    org_id: int,
    item_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    item = (await db.execute(select(InventoryItem).filter(InventoryItem.id == item_id, InventoryItem.org_id == org_id))).scalar_one_or_none()
    if not item:
        raise HTTPException(404, "Item not found")
    return {
        "id": item.id, "name": item.name, "sku": item.sku, "unit": item.unit,
        "quantity": float(item.quantity), "price": float(item.price),
        "cost_price": float(item.cost_price), "reorder_level": float(item.reorder_level),
        "category": item.category, "description": item.description,
    }


@router.delete("/{org_id}/items/{item_id}")
async def delete_item(
    org_id: int,
    item_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    item = (await db.execute(select(InventoryItem).filter(InventoryItem.id == item_id, InventoryItem.org_id == org_id))).scalar_one_or_none()
    if not item:
        raise HTTPException(404, "Item not found")
    await db.delete(item)
    await db.commit()
    return {"message": "Item deleted"}
