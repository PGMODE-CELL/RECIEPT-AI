from sqlalchemy import Column, Integer, String, ForeignKey, Numeric, DateTime, Text
from datetime import datetime, timezone

from app.database import Base


class Bom(Base):
    __tablename__ = "boms"

    id = Column(Integer, primary_key=True)
    org_id = Column(Integer, ForeignKey("organizations.id"))
    name = Column(String(255))
    product_id = Column(Integer, ForeignKey("inventory_items.id"))
    quantity = Column(Numeric(15, 2), default=0)
    description = Column(Text)
    status = Column(String(20), default="draft")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
