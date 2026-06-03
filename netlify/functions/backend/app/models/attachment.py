import os
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, BigInteger
from datetime import datetime, timezone
from app.database import Base


class Attachment(Base):
    __tablename__ = "attachments"

    id = Column(Integer, primary_key=True)
    org_id = Column(Integer, ForeignKey("organizations.id"))
    record_type = Column(String(50))  # transaction, invoice, bill, receipt
    record_id = Column(Integer)
    filename = Column(String(255))
    original_name = Column(String(255))
    content_type = Column(String(100))
    size = Column(BigInteger, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
