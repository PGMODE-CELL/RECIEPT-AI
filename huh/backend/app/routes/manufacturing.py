from fastapi import APIRouter, HTTPException, Depends, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import date

from app.database_async import get_async_db as get_db
from app.models.user import User
from app.models.bom import Bom
from app.models.bom_item import BomItem
from app.models.work_order import WorkOrder
from app.auth import get_current_user

router = APIRouter(prefix="/api/manufacturing", tags=["Manufacturing"])


# ---- BOMs ----

@router.get("/{org_id}/boms")
async def list_boms(
    org_id: int,
    page: int = 1,
    per_page: int = 25,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    offset = (page - 1) * per_page
    total = (await db.execute(select(func.count()).select_from(Bom).filter(Bom.org_id == org_id))).scalar()
    result = await db.execute(
        select(Bom)
        .filter(Bom.org_id == org_id)
        .order_by(Bom.created_at.desc())
        .offset(offset)
        .limit(per_page)
    )
    boms = result.scalars().all()
    return {
        "total": total,
        "page": page,
        "per_page": per_page,
        "items": [{
            "id": b.id, "org_id": b.org_id, "name": b.name,
            "product_id": b.product_id, "quantity": float(b.quantity),
            "description": b.description, "status": b.status,
            "created_at": b.created_at.isoformat(),
        } for b in boms],
    }


@router.get("/{org_id}/boms/{bom_id}")
async def get_bom(
    org_id: int,
    bom_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    bom = (await db.execute(select(Bom).filter(Bom.id == bom_id, Bom.org_id == org_id))).scalar_one_or_none()
    if not bom:
        raise HTTPException(404, "BOM not found")
    return {
        "id": bom.id, "org_id": bom.org_id, "name": bom.name,
        "product_id": bom.product_id, "quantity": float(bom.quantity),
        "description": bom.description, "status": bom.status,
        "created_at": bom.created_at.isoformat(),
    }


@router.post("/{org_id}/boms")
async def create_bom(
    org_id: int,
    name: str = Form(...),
    product_id: int = Form(...),
    quantity: float = Form(1),
    description: str = Form(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    bom = Bom(
        org_id=org_id, name=name, product_id=product_id,
        quantity=quantity, description=description,
    )
    db.add(bom)
    await db.commit()
    await db.refresh(bom)
    return {"id": bom.id, "name": bom.name, "message": "BOM created"}


@router.put("/{org_id}/boms/{bom_id}")
async def update_bom(
    org_id: int,
    bom_id: int,
    name: str = Form(None),
    product_id: int = Form(None),
    quantity: float = Form(None),
    description: str = Form(None),
    status: str = Form(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    bom = (await db.execute(select(Bom).filter(Bom.id == bom_id, Bom.org_id == org_id))).scalar_one_or_none()
    if not bom:
        raise HTTPException(404, "BOM not found")
    if name is not None: bom.name = name
    if product_id is not None: bom.product_id = product_id
    if quantity is not None: bom.quantity = quantity
    if description is not None: bom.description = description
    if status is not None: bom.status = status
    await db.commit()
    return {"message": "BOM updated", "id": bom.id}


@router.delete("/{org_id}/boms/{bom_id}")
async def delete_bom(
    org_id: int,
    bom_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    bom = (await db.execute(select(Bom).filter(Bom.id == bom_id, Bom.org_id == org_id))).scalar_one_or_none()
    if not bom:
        raise HTTPException(404, "BOM not found")
    await db.delete(bom)
    await db.commit()
    return {"message": "BOM deleted"}


# ---- BOM Items ----

@router.get("/{org_id}/boms/{bom_id}/items")
async def list_bom_items(
    org_id: int,
    bom_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(BomItem)
        .filter(BomItem.bom_id == bom_id, BomItem.org_id == org_id)
    )
    items = result.scalars().all()
    return {
        "items": [{
            "id": i.id, "bom_id": i.bom_id, "product_id": i.product_id,
            "quantity": float(i.quantity), "unit_cost": float(i.unit_cost),
        } for i in items],
    }


@router.post("/{org_id}/boms/{bom_id}/items")
async def add_bom_item(
    org_id: int,
    bom_id: int,
    product_id: int = Form(...),
    quantity: float = Form(...),
    unit_cost: float = Form(0),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    bom = (await db.execute(select(Bom).filter(Bom.id == bom_id, Bom.org_id == org_id))).scalar_one_or_none()
    if not bom:
        raise HTTPException(404, "BOM not found")
    item = BomItem(
        org_id=org_id, bom_id=bom_id,
        product_id=product_id, quantity=quantity, unit_cost=unit_cost,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return {"id": item.id, "message": "BOM item added"}


@router.delete("/{org_id}/boms/{bom_id}/items/{item_id}")
async def remove_bom_item(
    org_id: int,
    bom_id: int,
    item_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    item = (await db.execute(
        select(BomItem)
        .filter(BomItem.id == item_id, BomItem.bom_id == bom_id, BomItem.org_id == org_id)
    )).scalar_one_or_none()
    if not item:
        raise HTTPException(404, "BOM item not found")
    await db.delete(item)
    await db.commit()
    return {"message": "BOM item removed"}


# ---- Work Orders ----

@router.get("/{org_id}/work-orders")
async def list_work_orders(
    org_id: int,
    page: int = 1,
    per_page: int = 25,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    offset = (page - 1) * per_page
    total = (await db.execute(select(func.count()).select_from(WorkOrder).filter(WorkOrder.org_id == org_id))).scalar()
    result = await db.execute(
        select(WorkOrder)
        .filter(WorkOrder.org_id == org_id)
        .order_by(WorkOrder.created_at.desc())
        .offset(offset)
        .limit(per_page)
    )
    orders = result.scalars().all()
    return {
        "total": total,
        "page": page,
        "per_page": per_page,
        "items": [{
            "id": o.id, "org_id": o.org_id, "order_number": o.order_number,
            "bom_id": o.bom_id, "quantity": float(o.quantity),
            "status": o.status,
            "start_date": o.start_date.isoformat() if o.start_date else None,
            "end_date": o.end_date.isoformat() if o.end_date else None,
            "actual_cost": float(o.actual_cost), "notes": o.notes,
            "created_at": o.created_at.isoformat(),
        } for o in orders],
    }


@router.get("/{org_id}/work-orders/{wo_id}")
async def get_work_order(
    org_id: int,
    wo_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    wo = (await db.execute(select(WorkOrder).filter(WorkOrder.id == wo_id, WorkOrder.org_id == org_id))).scalar_one_or_none()
    if not wo:
        raise HTTPException(404, "Work order not found")
    return {
        "id": wo.id, "org_id": wo.org_id, "order_number": wo.order_number,
        "bom_id": wo.bom_id, "quantity": float(wo.quantity),
        "status": wo.status,
        "start_date": wo.start_date.isoformat() if wo.start_date else None,
        "end_date": wo.end_date.isoformat() if wo.end_date else None,
        "actual_cost": float(wo.actual_cost), "notes": wo.notes,
        "created_at": wo.created_at.isoformat(),
    }


@router.post("/{org_id}/work-orders")
async def create_work_order(
    org_id: int,
    order_number: str = Form(...),
    bom_id: int = Form(...),
    quantity: float = Form(1),
    start_date: str = Form(None),
    end_date: str = Form(None),
    notes: str = Form(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    wo = WorkOrder(
        org_id=org_id, order_number=order_number, bom_id=bom_id,
        quantity=quantity,
        start_date=date.fromisoformat(start_date) if start_date else None,
        end_date=date.fromisoformat(end_date) if end_date else None,
        notes=notes,
    )
    db.add(wo)
    await db.commit()
    await db.refresh(wo)
    return {"id": wo.id, "order_number": wo.order_number, "message": "Work order created"}


@router.put("/{org_id}/work-orders/{wo_id}")
async def update_work_order(
    org_id: int,
    wo_id: int,
    order_number: str = Form(None),
    bom_id: int = Form(None),
    quantity: float = Form(None),
    status: str = Form(None),
    start_date: str = Form(None),
    end_date: str = Form(None),
    notes: str = Form(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    wo = (await db.execute(select(WorkOrder).filter(WorkOrder.id == wo_id, WorkOrder.org_id == org_id))).scalar_one_or_none()
    if not wo:
        raise HTTPException(404, "Work order not found")
    if order_number is not None: wo.order_number = order_number
    if bom_id is not None: wo.bom_id = bom_id
    if quantity is not None: wo.quantity = quantity
    if status is not None: wo.status = status
    if start_date is not None: wo.start_date = date.fromisoformat(start_date)
    if end_date is not None: wo.end_date = date.fromisoformat(end_date)
    if notes is not None: wo.notes = notes
    await db.commit()
    return {"message": "Work order updated", "id": wo.id}


@router.delete("/{org_id}/work-orders/{wo_id}")
async def delete_work_order(
    org_id: int,
    wo_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    wo = (await db.execute(select(WorkOrder).filter(WorkOrder.id == wo_id, WorkOrder.org_id == org_id))).scalar_one_or_none()
    if not wo:
        raise HTTPException(404, "Work order not found")
    await db.delete(wo)
    await db.commit()
    return {"message": "Work order deleted"}
