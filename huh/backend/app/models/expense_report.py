from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, JSON, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class ExpenseReport(Base):
    __tablename__ = "expense_reports"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    total = Column(Float, default=0.0)
    status = Column(String, default="draft")
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    reimbursed_at = Column(DateTime, nullable=True)
    transaction_id = Column(Integer, ForeignKey("transactions.id"), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    organization = relationship("Organization")
    user = relationship("User", foreign_keys=[user_id])
    approver = relationship("User", foreign_keys=[approved_by])
    transaction = relationship("Transaction")


class ExpenseLine(Base):
    __tablename__ = "expense_lines"

    id = Column(Integer, primary_key=True, index=True)
    expense_report_id = Column(Integer, ForeignKey("expense_reports.id"), nullable=False)
    date = Column(DateTime, nullable=False)
    category = Column(String, nullable=True)
    amount = Column(Float, default=0.0)
    description = Column(Text, nullable=True)
    receipt_attachment_id = Column(Integer, ForeignKey("attachments.id"), nullable=True)
    billable = Column(String, default="no")
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    tax_amount = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    expense_report = relationship("ExpenseReport")
    attachment = relationship("Attachment")
    project = relationship("Project")
