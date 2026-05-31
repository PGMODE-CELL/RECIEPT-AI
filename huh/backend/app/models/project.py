from sqlalchemy import Column, Integer, String, ForeignKey, Numeric, Date, DateTime, Text
from datetime import datetime, timezone
from app.database import Base


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True)
    org_id = Column(Integer, ForeignKey("organizations.id"))
    name = Column(String(255))
    description = Column(Text)
    status = Column(String(20), default="active")  # active, completed, on_hold, cancelled
    budget = Column(Numeric(15, 2), default=0)
    start_date = Column(Date)
    end_date = Column(Date, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
