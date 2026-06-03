from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, UTC

from app.database import Base


class Organization(Base):
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id"))
    country = Column(String(2), default="US")
    currency = Column(String(3), default="USD")
    tax_id = Column(String(100))
    address = Column(Text)
    created_at = Column(DateTime, default=lambda: datetime.now(UTC))

    owner = relationship("User", back_populates="orgs")
    accounts = relationship("Account", back_populates="org", cascade="all, delete-orphan")
    contacts = relationship("Contact", back_populates="org", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="org", cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="org", cascade="all, delete-orphan")
    bills = relationship("Bill", back_populates="org", cascade="all, delete-orphan")
    receipts = relationship("Receipt", back_populates="org", cascade="all, delete-orphan")
    statement_imports = relationship("StatementImport", back_populates="org", cascade="all, delete-orphan")
