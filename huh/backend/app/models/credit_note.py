from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, JSON, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class CreditNote(Base):
    __tablename__ = "credit_notes"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=True)
    contact_id = Column(Integer, ForeignKey("contacts.id"), nullable=False)
    number = Column(String, nullable=False)
    date = Column(DateTime, default=datetime.utcnow)
    total = Column(Float, default=0.0)
    remaining = Column(Float, default=0.0)
    reason = Column(Text, nullable=True)
    status = Column(String, default="draft")
    items = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)

    organization = relationship("Organization")
    invoice = relationship("Invoice")
    contact = relationship("Contact")


class DebitNote(Base):
    __tablename__ = "debit_notes"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    bill_id = Column(Integer, ForeignKey("bills.id"), nullable=True)
    contact_id = Column(Integer, ForeignKey("contacts.id"), nullable=False)
    number = Column(String, nullable=False)
    date = Column(DateTime, default=datetime.utcnow)
    total = Column(Float, default=0.0)
    remaining = Column(Float, default=0.0)
    reason = Column(Text, nullable=True)
    status = Column(String, default="draft")
    items = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)

    organization = relationship("Organization")
    bill = relationship("Bill")
    contact = relationship("Contact")
