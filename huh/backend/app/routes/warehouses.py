from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from app.database import get_db
from app.models.warehouse import Warehouse, WarehouseStock
from app.models.inventory import InventoryItem
from app.auth import get_current_user

router = APIRouter(prefix="/api/warehouses", tags=["Warehouses"])


@router.post("/{org_id}")
def create_warehouse(org_id: int, name: str = "", code: str = "", address: str = "", city: str = "", country: str = "", is_default: str = "no", db: Session = Depends(get_db), user=Depends(get_current_user)):
    wh = Warehouse(org_id=org_id, name=name, code=code, address=address, city=city, country=country, is_default=(is_default == "yes"), active=True)
    db.add(wh)
    db.commit()
    db.refresh(wh)
    return {"success": True, "warehouse": {"id": wh.id, "name": wh.name, "code": wh.code, "is_default": wh.is_default}}


@router.get("/{org_id}")
def list_warehouses(org_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    whs = db.query(Warehouse).filter(Warehouse.org_id == org_id, Warehouse.active == True).all()
    return {"warehouses": [{"id": w.id, "name": w.name, "code": w.code, "city": w.city, "is_default": w.is_default} for w in whs]}


@router.post("/{org_id}/{warehouse_id}/stock")
def update_stock(org_id: int, warehouse_id: int, item_id: int = None, quantity: float = 0, db: Session = Depends(get_db), user=Depends(get_current_user)):
    wh = db.query(Warehouse).filter(Warehouse.id == warehouse_id, Warehouse.org_id == org_id).first()
    if not wh:
        raise HTTPException(404, "Warehouse not found")
    stock = db.query(WarehouseStock).filter(WarehouseStock.warehouse_id == warehouse_id, WarehouseStock.item_id == item_id).first()
    if not stock:
        stock = WarehouseStock(warehouse_id=warehouse_id, item_id=item_id, quantity=0)
        db.add(stock)
    stock.quantity = quantity
    db.commit()
    return {"success": True, "stock": {"item_id": item_id, "warehouse_id": warehouse_id, "quantity": stock.quantity}}


@router.get("/{org_id}/{warehouse_id}/stock")
def get_stock(org_id: int, warehouse_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    stocks = db.query(WarehouseStock).filter(WarehouseStock.warehouse_id == warehouse_id).all()
    return {"stock": [{"item_id": s.item_id, "quantity": s.quantity} for s in stocks]}
