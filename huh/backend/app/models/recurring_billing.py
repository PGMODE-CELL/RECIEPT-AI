from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, JSON, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class RecurringBillingPlan(Base):
    __tablename__ = "recurring_billing_plans"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    contact_id = Column(Integer, ForeignKey("contacts.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    frequency = Column(String, nullable=False)
    interval_count = Column(Integer, default=1)
    total_amount = Column(Float, default=0.0)
    items = Column(JSON, default=list)
    tax_rate_id = Column(Integer, ForeignKey("tax_rates.id"), nullable=True)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=True)
    max_cycles = Column(Integer, nullable=True)
    current_cycle = Column(Integer, default=0)
    next_billing_date = Column(DateTime, nullable=True)
    status = Column(String, default="active")
    auto_send = Column(Boolean, default=True)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    organization = relationship("Organization")
    contact = relationship("Contact")
    tax_rate = relationship("TaxRate")
