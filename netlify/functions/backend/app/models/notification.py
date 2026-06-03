from sqlalchemy import Column, Integer, String, Boolean, DateTime, JSON
from datetime import datetime, timezone
from app.database import Base


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True)
    org_id = Column(Integer, nullable=False)
    type = Column(String(30))  # invoice_overdue, bill_due, budget_exceeded, payslip_ready, tds_deducted
    title = Column(String(200))
    message = Column(String(500), nullable=True)
    reference_type = Column(String(30), nullable=True)
    reference_id = Column(Integer, nullable=True)
    data = Column(JSON, nullable=True)
    read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
