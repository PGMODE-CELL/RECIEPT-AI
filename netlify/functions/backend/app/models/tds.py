from sqlalchemy import Column, Integer, String, ForeignKey, Numeric, Date, DateTime, Boolean, Text
from datetime import datetime, timezone
from app.database import Base


class TdsRate(Base):
    __tablename__ = "tds_rates"

    id = Column(Integer, primary_key=True)
    org_id = Column(Integer, ForeignKey("organizations.id"))
    section = Column(String(10))       # 192, 194A, 194C, 194H, 194I, 194J
    name = Column(String(100))         # Salary, Interest, Contract, Commission, Rent, Professional Fees
    rate = Column(Numeric(5, 2))       # 10.00
    threshold = Column(Numeric(15, 2), default=0)
    threshold_alt = Column(Numeric(15, 2), nullable=True)  # for senior citizens etc
    applicable_to = Column(String(20), default="all")  # all, individual, company
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class TdsDeduction(Base):
    __tablename__ = "tds_deductions"

    id = Column(Integer, primary_key=True)
    org_id = Column(Integer, ForeignKey("organizations.id"))
    section = Column(String(10))
    deductee_name = Column(String(255))
    deductee_pan = Column(String(20))
    amount = Column(Numeric(15, 2))        # total invoice/payment amount
    tds_amount = Column(Numeric(15, 2))    # tax deducted
    rate = Column(Numeric(5, 2))
    date = Column(Date)
    invoice_id = Column(Integer, ForeignKey("bills.id"), nullable=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    is_salary = Column(Boolean, default=False)
    remarks = Column(Text)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class TdsCertificate(Base):
    __tablename__ = "tds_certificates"

    id = Column(Integer, primary_key=True)
    org_id = Column(Integer, ForeignKey("organizations.id"))
    financial_year = Column(String(10))  # "2025-26"
    quarter = Column(String(5))          # "Q1", "Q2", "Q3", "Q4"
    section = Column(String(10))
    total_deductions = Column(Numeric(15, 2))
    total_tds = Column(Numeric(15, 2))
    deductee_count = Column(Integer)
    generated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
