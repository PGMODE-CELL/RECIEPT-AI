from sqlalchemy import Column, Integer, String, ForeignKey, Numeric, Boolean, DateTime, Date
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database import Base


class TaxRate(Base):
    __tablename__ = "tax_rates"

    id = Column(Integer, primary_key=True)
    org_id = Column(Integer, ForeignKey("organizations.id"))
    name = Column(String(100))  # e.g., CGST 9%, SGST 9%, VAT 20%
    rate = Column(Numeric(5, 2))  # percentage
    type = Column(String(20))  # gst, vat, sales_tax, service_tax
    category = Column(String(20), default="standard")  # standard, reduced, zero, exempt
    is_active = Column(Boolean, default=True)
    applies_to = Column(String(20), default="both")  # sale, purchase, both
    created_at = Column(DateTime, default=datetime.utcnow)

    org = relationship("Organization")


class TaxReturn(Base):
    __tablename__ = "tax_returns"

    id = Column(Integer, primary_key=True)
    org_id = Column(Integer, ForeignKey("organizations.id"))
    period_start = Column(Date)
    period_end = Column(Date)
    return_type = Column(String(20))  # gstr1, gstr3b, vat, monthly, quarterly
    status = Column(String(20), default="draft")  # draft, filed, error
    total_taxable = Column(Numeric(15, 2), default=0)
    total_tax = Column(Numeric(15, 2), default=0)
    total_credit = Column(Numeric(15, 2), default=0)
    total_payable = Column(Numeric(15, 2), default=0)
    data = Column(String, default="{}")  # JSON breakdown
    created_at = Column(DateTime, default=datetime.utcnow)
    filed_at = Column(DateTime, nullable=True)

    org = relationship("Organization")
