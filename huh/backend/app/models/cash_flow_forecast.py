from sqlalchemy import Column, Integer, String, ForeignKey, Numeric, DateTime, Date
from datetime import datetime, timezone

from app.database import Base


class CashFlowForecast(Base):
    __tablename__ = "cash_flow_forecasts"

    id = Column(Integer, primary_key=True)
    org_id = Column(Integer, ForeignKey("organizations.id"))
    type = Column(String(20))
    category = Column(String(100))
    description = Column(String(255))
    amount = Column(Numeric(15, 2), default=0)
    frequency = Column(String(20), default="one-time")
    start_date = Column(Date)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
