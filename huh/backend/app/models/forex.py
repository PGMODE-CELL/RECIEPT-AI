from sqlalchemy import Column, Integer, String, Numeric, Date, DateTime
from datetime import datetime, date

from app.database import Base


class ForexRate(Base):
    __tablename__ = "forex_rates"

    id = Column(Integer, primary_key=True)
    from_currency = Column(String(3))  # e.g., USD
    to_currency = Column(String(3))   # e.g., INR
    rate = Column(Numeric(15, 6))     # 1 USD = 83.50 INR
    date = Column(Date, default=date.today)
    source = Column(String(50), default="manual")
    created_at = Column(DateTime, default=datetime.utcnow)
