from sqlalchemy import Column, Integer, String, ForeignKey, Numeric, DateTime, Text, Date
from datetime import datetime, timezone

from app.database import Base


class JobCost(Base):
    __tablename__ = "job_costs"

    id = Column(Integer, primary_key=True)
    org_id = Column(Integer, ForeignKey("organizations.id"))
    project_id = Column(Integer, ForeignKey("projects.id"))
    description = Column(Text)
    cost_type = Column(String(20))
    amount = Column(Numeric(15, 2), default=0)
    date = Column(Date)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
