from sqlalchemy import Column, Integer, String, ForeignKey, Numeric, DateTime
from datetime import datetime, timezone

from app.database import Base


class InventoryValuation(Base):
    __tablename__ = "inventory_valuations"

    id = Column(Integer, primary_key=True)
    org_id = Column(Integer, ForeignKey("organizations.id"))
    item_id = Column(Integer, ForeignKey("inventory_items.id"))
    method = Column(String(20))
    unit_cost = Column(Numeric(15, 2), default=0)
    quantity = Column(Numeric(15, 2), default=0)
    total_value = Column(Numeric(15, 2), default=0)
    calculated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
