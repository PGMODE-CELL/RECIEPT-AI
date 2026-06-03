from sqlalchemy import Column, Integer, String, ForeignKey, Numeric, DateTime, Text, Date
from datetime import datetime, timezone

from app.database import Base


class Lease(Base):
    __tablename__ = "leases"

    id = Column(Integer, primary_key=True)
    org_id = Column(Integer, ForeignKey("organizations.id"))
    name = Column(String(255))
    asset_description = Column(Text)
    start_date = Column(Date)
    end_date = Column(Date)
    monthly_payment = Column(Numeric(15, 2), default=0)
    interest_rate = Column(Numeric(5, 2), default=0)
    total_liability = Column(Numeric(15, 2), default=0)
    status = Column(String(20), default="active")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
