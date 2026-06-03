from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean, JSON
from datetime import datetime, timezone

from app.database import Base


class Webhook(Base):
    __tablename__ = "webhooks"

    id = Column(Integer, primary_key=True)
    org_id = Column(Integer, ForeignKey("organizations.id"))
    name = Column(String(255))
    url = Column(String(500))
    events = Column(JSON)
    secret = Column(String(255))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
