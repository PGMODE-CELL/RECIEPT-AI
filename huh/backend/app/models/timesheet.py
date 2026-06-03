from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import datetime, UTC
from app.database import Base


class TimesheetEntry(Base):
    __tablename__ = "timesheet_entries"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    contact_id = Column(Integer, ForeignKey("contacts.id"), nullable=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=True)
    date = Column(DateTime, nullable=False)
    start_time = Column(DateTime, nullable=True)
    end_time = Column(DateTime, nullable=True)
    hours = Column(Float, default=0.0)
    description = Column(Text, nullable=True)
    billable = Column(String, default="yes")
    hourly_rate = Column(Float, default=0.0)
    status = Column(String, default="draft")
    created_at = Column(DateTime, default=lambda: datetime.now(UTC))

    organization = relationship("Organization")
    user = relationship("User")
    contact = relationship("Contact")
    project = relationship("Project")
    invoice = relationship("Invoice")
