from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import datetime, UTC
from app.database import Base


class DunningEntry(Base):
    __tablename__ = "dunning_entries"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False)
    contact_id = Column(Integer, ForeignKey("contacts.id"), nullable=True)
    level = Column(Integer, default=1)
    days_overdue = Column(Integer, default=0)
    amount_due = Column(Float, default=0.0)
    status = Column(String, default="pending")
    action_taken = Column(String, nullable=True)
    action_date = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(UTC))

    organization = relationship("Organization")
    invoice = relationship("Invoice")
    contact = relationship("Contact")
