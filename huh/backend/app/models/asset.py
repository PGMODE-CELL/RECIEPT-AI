from sqlalchemy import Column, Integer, String, ForeignKey, Numeric, Date, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import datetime, UTC

from app.database import Base


class Asset(Base):
    __tablename__ = "assets"

    id = Column(Integer, primary_key=True)
    org_id = Column(Integer, ForeignKey("organizations.id"))
    name = Column(String(255))
    purchase_date = Column(Date)
    purchase_cost = Column(Numeric(15, 2))
    useful_life_years = Column(Integer, default=5)
    salvage_value = Column(Numeric(15, 2), default=0)
    method = Column(String(10), default="straight_line")  # straight_line, wdv
    rate = Column(Numeric(5, 2))  # depreciation rate %
    current_book_value = Column(Numeric(15, 2))
    accumulated_dep = Column(Numeric(15, 2), default=0)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=True)
    status = Column(String(20), default="active")  # active, disposed, sold
    notes = Column(Text)
    created_at = Column(DateTime, default=lambda: datetime.now(UTC))

    org = relationship("Organization")
    account = relationship("Account")


class DepreciationEntry(Base):
    __tablename__ = "depreciation_entries"

    id = Column(Integer, primary_key=True)
    asset_id = Column(Integer, ForeignKey("assets.id"))
    org_id = Column(Integer, ForeignKey("organizations.id"))
    date = Column(Date)
    amount = Column(Numeric(15, 2))
    period = Column(String(20))  # e.g., "2024-01", "FY2024"
    transaction_id = Column(Integer, ForeignKey("transactions.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(UTC))

    asset = relationship("Asset")
    transaction = relationship("Transaction")
