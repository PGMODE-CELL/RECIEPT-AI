from sqlalchemy import Column, Integer, String, ForeignKey, Numeric, DateTime, Text, Date
from datetime import datetime, timezone

from app.database import Base


class WorkOrder(Base):
    __tablename__ = "work_orders"

    id = Column(Integer, primary_key=True)
    org_id = Column(Integer, ForeignKey("organizations.id"))
    order_number = Column(String(100))
    bom_id = Column(Integer, ForeignKey("boms.id"))
    quantity = Column(Numeric(15, 2), default=0)
    status = Column(String(20), default="draft")
    start_date = Column(Date)
    end_date = Column(Date, nullable=True)
    actual_cost = Column(Numeric(15, 2), default=0)
    notes = Column(Text)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
