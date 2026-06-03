from sqlalchemy import Column, Integer, String, ForeignKey, Numeric, Date, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import datetime, UTC

from app.database import Base


class StatementImport(Base):
    __tablename__ = "statement_imports"

    id = Column(Integer, primary_key=True)
    org_id = Column(Integer, ForeignKey("organizations.id"))
    filename = Column(String(255))
    period_start = Column(Date)
    period_end = Column(Date)
    total_lines = Column(Integer, default=0)
    matched_lines = Column(Integer, default=0)
    status = Column(String(20), default="pending")  # pending, reconciling, done
    created_at = Column(DateTime, default=lambda: datetime.now(UTC))

    org = relationship("Organization", back_populates="statement_imports")
    lines = relationship("StatementLine", back_populates="import_", cascade="all, delete-orphan")


class StatementLine(Base):
    __tablename__ = "statement_lines"

    id = Column(Integer, primary_key=True)
    import_id = Column(Integer, ForeignKey("statement_imports.id"))
    date = Column(Date)
    description = Column(String(500))
    amount = Column(Numeric(15, 2))
    type = Column(String(10))  # debit, credit
    reference = Column(String(255))
    category = Column(String(100))
    status = Column(String(20), default="unmatched")  # unmatched, matched, reconciled
    matched_transaction_id = Column(Integer, ForeignKey("transactions.id"), nullable=True)
    notes = Column(Text)
    matched_at = Column(DateTime, nullable=True)

    import_ = relationship("StatementImport", back_populates="lines")
    matched_transaction = relationship("Transaction", back_populates="statement_lines")
