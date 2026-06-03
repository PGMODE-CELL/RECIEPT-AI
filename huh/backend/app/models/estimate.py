from sqlalchemy import Column, Integer, String, ForeignKey, Numeric, DateTime, Date, Text, JSON
from datetime import datetime, date, UTC

from app.database import Base


class Estimate(Base):
    __tablename__ = "estimates"

    id = Column(Integer, primary_key=True)
    org_id = Column(Integer, ForeignKey("organizations.id"))
    contact_id = Column(Integer, ForeignKey("contacts.id"))
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    number = Column(String(50))
    date = Column(Date, default=date.today)
    valid_until = Column(Date, nullable=True)
    total = Column(Numeric(15, 2), default=0)
    status = Column(String(20), default="draft")  # draft, sent, accepted, rejected, converted
    items = Column(JSON)
    notes = Column(Text)
    terms = Column(Text)
    created_at = Column(DateTime, default=lambda: datetime.now(UTC))
