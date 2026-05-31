from sqlalchemy import Column, Integer, String, ForeignKey, Numeric, DateTime
from datetime import datetime

from app.database import Base


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True)
    org_id = Column(Integer, ForeignKey("organizations.id"))
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=True)
    estimate_id = Column(Integer, ForeignKey("estimates.id"), nullable=True)
    amount = Column(Numeric(15, 2))
    currency = Column(String(3), default="USD")
    gateway = Column(String(50))  # stripe, razorpay, paypal
    gateway_payment_id = Column(String(255))
    gateway_status = Column(String(50))
    payer_email = Column(String(255))
    payer_name = Column(String(255))
    payment_method = Column(String(50))
    status = Column(String(20), default="pending")  # pending, completed, failed, refunded
    paid_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
