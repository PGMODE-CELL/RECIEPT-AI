from sqlalchemy import Column, Integer, String, ForeignKey, Numeric, DateTime, Date
from datetime import datetime, timezone

from app.database import Base


class InventoryLot(Base):
    __tablename__ = "inventory_lots"

    id = Column(Integer, primary_key=True)
    org_id = Column(Integer, ForeignKey("organizations.id"))
    item_id = Column(Integer, ForeignKey("inventory_items.id"))
    lot_number = Column(String(100))
    quantity = Column(Numeric(15, 2), default=0)
    unit_cost = Column(Numeric(15, 2), default=0)
    expiry_date = Column(Date, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
