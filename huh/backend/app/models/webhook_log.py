from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text
from datetime import datetime, timezone

from app.database import Base


class WebhookLog(Base):
    __tablename__ = "webhook_logs"

    id = Column(Integer, primary_key=True)
    webhook_id = Column(Integer, ForeignKey("webhooks.id"))
    event = Column(String(100))
    status = Column(String(20))
    response_code = Column(Integer)
    response_body = Column(Text)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
