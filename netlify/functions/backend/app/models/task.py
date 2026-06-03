from sqlalchemy import Column, Integer, String, ForeignKey, Text, DateTime
from datetime import datetime, timezone
from app.database import Base


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True)
    org_id = Column(Integer, ForeignKey("organizations.id"))
    project_id = Column(Integer, ForeignKey("projects.id"))
    title = Column(String(255))
    description = Column(Text, nullable=True)
    priority = Column(String(20), default="medium")
    status = Column(String(20), default="pending")
    due_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
