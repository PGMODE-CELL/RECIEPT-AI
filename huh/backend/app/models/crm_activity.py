from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, Date
from datetime import datetime, timezone

from app.database import Base


class CrmActivity(Base):
    __tablename__ = "crm_activities"

    id = Column(Integer, primary_key=True)
    org_id = Column(Integer, ForeignKey("organizations.id"))
    lead_id = Column(Integer, ForeignKey("crm_leads.id"))
    type = Column(String(50))
    subject = Column(String(255))
    description = Column(Text)
    due_date = Column(Date)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
