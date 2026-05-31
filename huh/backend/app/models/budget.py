from sqlalchemy import Column, Integer, String, Numeric, ForeignKey, Date
from sqlalchemy.orm import relationship
from datetime import date

from app.database import Base


class Budget(Base):
    __tablename__ = "budgets"

    id = Column(Integer, primary_key=True)
    org_id = Column(Integer, ForeignKey("organizations.id"))
    category = Column(String(100), nullable=False)
    amount = Column(Numeric(15, 2), nullable=False)
    spent = Column(Numeric(15, 2), default=0)
    period = Column(String(20), default="monthly")  # weekly, monthly, yearly
    start_date = Column(Date, default=date.today)
    alert_at = Column(Numeric(5, 2), default=80.0)  # alert at % spent

    org = relationship("Organization")
