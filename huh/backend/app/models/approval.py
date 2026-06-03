from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Boolean, Text
from sqlalchemy.orm import relationship
from datetime import datetime, UTC
from app.database import Base


class ApprovalWorkflow(Base):
    __tablename__ = "approval_workflows"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    name = Column(String, nullable=False)
    entity_type = Column(String, nullable=False)
    trigger_condition = Column(String, nullable=True)
    approval_order = Column(String, default="parallel")
    require_all = Column(Boolean, default=True)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(UTC))

    organization = relationship("Organization")


class ApprovalStep(Base):
    __tablename__ = "approval_steps"

    id = Column(Integer, primary_key=True, index=True)
    workflow_id = Column(Integer, ForeignKey("approval_workflows.id"), nullable=False)
    step_order = Column(Integer, default=0)
    approver_role = Column(String, nullable=True)
    approver_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    min_amount = Column(Float, nullable=True)
    max_amount = Column(Float, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(UTC))

    workflow = relationship("ApprovalWorkflow")
    approver = relationship("User")


class ApprovalRequest(Base):
    __tablename__ = "approval_requests"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    workflow_id = Column(Integer, ForeignKey("approval_workflows.id"), nullable=True)
    entity_type = Column(String, nullable=False)
    entity_id = Column(Integer, nullable=False)
    requested_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    status = Column(String, default="pending")
    amount = Column(Float, default=0.0)
    notes = Column(Text, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    resolved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(UTC))

    organization = relationship("Organization")
    workflow = relationship("ApprovalWorkflow")
    requester = relationship("User", foreign_keys=[requested_by])
    resolver = relationship("User", foreign_keys=[resolved_by])


class ApprovalVote(Base):
    __tablename__ = "approval_votes"

    id = Column(Integer, primary_key=True, index=True)
    approval_request_id = Column(Integer, ForeignKey("approval_requests.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    step_id = Column(Integer, ForeignKey("approval_steps.id"), nullable=True)
    decision = Column(String, nullable=False)
    comment = Column(Text, nullable=True)
    decided_at = Column(DateTime, default=lambda: datetime.now(UTC))

    approval_request = relationship("ApprovalRequest")
    user = relationship("User")
    step = relationship("ApprovalStep")
