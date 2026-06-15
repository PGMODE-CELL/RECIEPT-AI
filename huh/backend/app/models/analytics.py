from sqlalchemy import Column, Integer, String, DateTime, Text, Index
from sqlalchemy.dialects.postgresql import JSONB
from datetime import datetime, UTC

from app.database import Base


class AnalyticsEvent(Base):
    __tablename__ = "analytics_events"

    id = Column(Integer, primary_key=True)
    event = Column(String(100), nullable=False, index=True)
    user_id = Column(Integer, nullable=True, index=True)
    org_id = Column(Integer, nullable=True, index=True)
    session_id = Column(String(64), nullable=True, index=True)
    properties = Column(JSONB, nullable=True)
    user_agent = Column(Text, nullable=True)
    ip_hash = Column(String(64), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(UTC), index=True)

    __table_args__ = (
        Index("ix_analytics_event_created_at_event", "created_at", "event"),
        Index("ix_analytics_event_user_created", "user_id", "created_at"),
    )