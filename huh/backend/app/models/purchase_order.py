from sqlalchemy import Column, Integer, String, ForeignKey, Numeric, DateTime, Date, Text, JSON
from datetime import datetime, date

from app.database import Base


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id = Column(Integer, primary_key=True)
    org_id = Column(Integer, ForeignKey("organizations.id"))
    contact_id = Column(Integer, ForeignKey("contacts.id"))
    number = Column(String(50))
    date = Column(Date, default=date.today)
    expected_date = Column(Date, nullable=True)
    total = Column(Numeric(15, 2), default=0)
    status = Column(String(20), default="draft")  # draft, sent, approved, received, cancelled
    items = Column(JSON)
    notes = Column(Text)
    bill_id = Column(Integer, ForeignKey("bills.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
