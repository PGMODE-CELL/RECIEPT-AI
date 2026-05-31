from sqlalchemy import Column, Integer, String, Numeric, ForeignKey, Date, Boolean
from sqlalchemy.orm import relationship
from datetime import date

from app.database import Base


class RecurringTransaction(Base):
    __tablename__ = "recurring_transactions"

    id = Column(Integer, primary_key=True)
    org_id = Column(Integer, ForeignKey("organizations.id"))
    description = Column(String(500), nullable=False)
    amount = Column(Numeric(15, 2), nullable=False)
    category = Column(String(100))
    frequency = Column(String(20), nullable=False)  # daily, weekly, monthly, yearly
    interval_days = Column(Integer)
    next_date = Column(Date, nullable=False)
    end_date = Column(Date)
    active = Column(Boolean, default=True)
    transaction_type = Column(String(20), default="money_out")

    org = relationship("Organization")
