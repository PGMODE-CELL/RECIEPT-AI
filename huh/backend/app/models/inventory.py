from sqlalchemy import Column, Integer, String, ForeignKey, Numeric, DateTime, Text, Boolean
from datetime import datetime

from app.database import Base


class InventoryItem(Base):
    __tablename__ = "inventory_items"

    id = Column(Integer, primary_key=True)
    org_id = Column(Integer, ForeignKey("organizations.id"))
    name = Column(String(255))
    sku = Column(String(100))
    description = Column(Text)
    unit = Column(String(50), default="pcs")  # pcs, kg, m, l, box
    quantity = Column(Numeric(15, 2), default=0)
    price = Column(Numeric(15, 2), default=0)
    cost_price = Column(Numeric(15, 2), default=0)
    reorder_level = Column(Numeric(15, 2), default=0)
    category = Column(String(100))
    tax_rate_id = Column(Integer, ForeignKey("tax_rates.id"), nullable=True)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=True)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class InventoryMovement(Base):
    __tablename__ = "inventory_movements"

    id = Column(Integer, primary_key=True)
    org_id = Column(Integer, ForeignKey("organizations.id"))
    item_id = Column(Integer, ForeignKey("inventory_items.id"))
    type = Column(String(20))  # in, out, adjustment
    quantity = Column(Numeric(15, 2))
    reference_type = Column(String(50), nullable=True)  # purchase_order, invoice, adjustment
    reference_id = Column(Integer, nullable=True)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
