from sqlalchemy import Column, Integer, String, DateTime, JSON
from datetime import datetime, timezone
from app.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, nullable=True)
    org_id = Column(Integer, nullable=True)
    action = Column(String(10))  # create, update, delete
    table_name = Column(String(50))
    record_id = Column(Integer)
    old_values = Column(JSON, nullable=True)
    new_values = Column(JSON, nullable=True)
    ip_address = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
