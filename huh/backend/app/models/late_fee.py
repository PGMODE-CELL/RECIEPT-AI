from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, JSON, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class LateFeeRule(Base):
    __tablename__ = "late_fee_rules"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    name = Column(String, nullable=False)
    fee_type = Column(String, default="percentage")
    fee_value = Column(Float, default=0.0)
    grace_period_days = Column(Integer, default=0)
    max_fee = Column(Float, nullable=True)
    recurring = Column(String, default="once")
    applies_to = Column(String, default="all")
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    organization = relationship("Organization")


class LateFeeApplied(Base):
    __tablename__ = "late_fees_applied"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False)
    rule_id = Column(Integer, ForeignKey("late_fee_rules.id"), nullable=True)
    amount = Column(Float, default=0.0)
    days_overdue = Column(Integer, default=0)
    applied_at = Column(DateTime, default=datetime.utcnow)
    invoice_line_item_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    organization = relationship("Organization")
    invoice = relationship("Invoice")
    rule = relationship("LateFeeRule")
