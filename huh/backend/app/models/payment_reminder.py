from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, JSON, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class PaymentReminder(Base):
    __tablename__ = "payment_reminders"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=True)
    contact_id = Column(Integer, ForeignKey("contacts.id"), nullable=True)
    days_before_due = Column(Integer, default=0)
    days_after_due = Column(Integer, default=0)
    schedule = Column(String, default="once")
    last_sent_at = Column(DateTime, nullable=True)
    next_send_at = Column(DateTime, nullable=True)
    sent_count = Column(Integer, default=0)
    max_reminders = Column(Integer, default=5)
    template_id = Column(Integer, ForeignKey("email_templates.id"), nullable=True)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    organization = relationship("Organization")
    invoice = relationship("Invoice")
    contact = relationship("Contact")
    email_template = relationship("EmailTemplate")


class ReminderLog(Base):
    __tablename__ = "reminder_logs"

    id = Column(Integer, primary_key=True, index=True)
    reminder_id = Column(Integer, ForeignKey("payment_reminders.id"), nullable=False)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=True)
    contact_id = Column(Integer, ForeignKey("contacts.id"), nullable=True)
    sent_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="sent")
    response = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    reminder = relationship("PaymentReminder")
    invoice = relationship("Invoice")
    contact = relationship("Contact")
