from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class Loan(Base):
    __tablename__ = "loans"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    contact_id = Column(Integer, ForeignKey("contacts.id"), nullable=True)
    type = Column(String, nullable=False)
    name = Column(String, nullable=False)
    lender_name = Column(String, nullable=True)
    principal = Column(Float, default=0.0)
    outstanding = Column(Float, default=0.0)
    interest_rate = Column(Float, default=0.0)
    interest_type = Column(String, default="simple")
    tenure_months = Column(Integer, default=0)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=True)
    status = Column(String, default="active")
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    organization = relationship("Organization")
    contact = relationship("Contact")
    account = relationship("Account")


class LoanRepayment(Base):
    __tablename__ = "loan_repayments"

    id = Column(Integer, primary_key=True, index=True)
    loan_id = Column(Integer, ForeignKey("loans.id"), nullable=False)
    date = Column(DateTime, nullable=False)
    amount = Column(Float, default=0.0)
    principal_part = Column(Float, default=0.0)
    interest_part = Column(Float, default=0.0)
    status = Column(String, default="scheduled")
    transaction_id = Column(Integer, ForeignKey("transactions.id"), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    loan = relationship("Loan")
    transaction = relationship("Transaction")
