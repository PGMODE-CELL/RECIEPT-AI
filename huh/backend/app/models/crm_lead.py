from sqlalchemy import Column, Integer, String, ForeignKey, Numeric, DateTime, Text, Date
from datetime import datetime, timezone

from app.database import Base


class CrmLead(Base):
    __tablename__ = "crm_leads"

    id = Column(Integer, primary_key=True)
    org_id = Column(Integer, ForeignKey("organizations.id"))
    name = Column(String(255))
    email = Column(String(255))
    phone = Column(String(50))
    company = Column(String(255))
    source = Column(String(100))
    status = Column(String(50), default="new")
    value = Column(Numeric(15, 2), default=0)
    assignee = Column(String(255))
    notes = Column(Text)
    expected_close_date = Column(Date)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
