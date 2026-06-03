from sqlalchemy import Column, Integer, String, ForeignKey, Numeric, DateTime, JSON
from datetime import datetime, timezone

from app.database import Base


class RevenueRecognition(Base):
    __tablename__ = "revenue_recognition"

    id = Column(Integer, primary_key=True)
    org_id = Column(Integer, ForeignKey("organizations.id"))
    invoice_id = Column(Integer, ForeignKey("invoices.id"))
    total_amount = Column(Numeric(15, 2), default=0)
    recognized_amount = Column(Numeric(15, 2), default=0)
    schedule = Column(JSON)
    status = Column(String(20), default="pending")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
