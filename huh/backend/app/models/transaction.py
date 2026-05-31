from sqlalchemy import Column, Integer, String, ForeignKey, Numeric, DateTime, Date
from sqlalchemy.orm import relationship
from datetime import datetime, date

from app.database import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True)
    org_id = Column(Integer, ForeignKey("organizations.id"))
    date = Column(Date, default=date.today)
    description = Column(String(500))
    amount = Column(Numeric(15, 2))
    type = Column(String(50))  # income, expense, transfer, journal
    reference = Column(String(255))
    currency = Column(String(3), default="")
    exchange_rate = Column(Numeric(15, 6), nullable=True)
    original_amount = Column(Numeric(15, 2), nullable=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    org = relationship("Organization", back_populates="transactions")
    lines = relationship("TransactionLine", back_populates="transaction", cascade="all, delete-orphan")
    statement_lines = relationship("StatementLine", back_populates="matched_transaction")


class TransactionLine(Base):
    __tablename__ = "transaction_lines"

    id = Column(Integer, primary_key=True)
    transaction_id = Column(Integer, ForeignKey("transactions.id"))
    debit_account_id = Column(Integer, ForeignKey("accounts.id"))
    credit_account_id = Column(Integer, ForeignKey("accounts.id"))
    amount = Column(Numeric(15, 2))

    transaction = relationship("Transaction", back_populates="lines")
    debit_account = relationship(
        "Account", foreign_keys=[debit_account_id], back_populates="debits"
    )
    credit_account = relationship(
        "Account", foreign_keys=[credit_account_id], back_populates="credits"
    )
