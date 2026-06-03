from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timezone
from app.database_async import get_async_db as get_db
from app.models.approval import ApprovalWorkflow, ApprovalStep, ApprovalRequest, ApprovalVote
from app.auth import get_current_user

router = APIRouter(prefix="/api/approvals", tags=["Approvals"])


@router.post("/workflows/{org_id}")
async def create_workflow(org_id: int, name: str = "", entity_type: str = "", trigger_condition: str = "", approval_order: str = "parallel", require_all: str = "yes", db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    wf = ApprovalWorkflow(org_id=org_id, name=name, entity_type=entity_type, trigger_condition=trigger_condition, approval_order=approval_order, require_all=(require_all == "yes"), active=True)
    db.add(wf)
    await db.commit()
    await db.refresh(wf)
    return {"success": True, "workflow": {"id": wf.id, "name": wf.name, "entity_type": wf.entity_type}}


@router.get("/workflows/{org_id}")
async def list_workflows(org_id: int, db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    wfs = (await db.execute(select(ApprovalWorkflow).filter(ApprovalWorkflow.org_id == org_id))).scalars().all()
    return {"workflows": [{"id": w.id, "name": w.name, "entity_type": w.entity_type, "approval_order": w.approval_order, "active": w.active} for w in wfs]}


@router.post("/workflows/{org_id}/{workflow_id}/steps")
async def add_step(org_id: int, workflow_id: int, step_order: int = 0, approver_role: str = "", approver_user_id: int = None, min_amount: float = None, max_amount: float = None, db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    wf = (await db.execute(select(ApprovalWorkflow).filter(ApprovalWorkflow.id == workflow_id, ApprovalWorkflow.org_id == org_id))).scalar_one_or_none()
    if not wf:
        raise HTTPException(404, "Workflow not found")
    step = ApprovalStep(workflow_id=workflow_id, step_order=step_order, approver_role=approver_role, approver_user_id=approver_user_id, min_amount=min_amount, max_amount=max_amount)
    db.add(step)
    await db.commit()
    return {"success": True, "step": {"id": step.id, "step_order": step.step_order, "approver_role": step.approver_role}}


@router.post("/requests/{org_id}")
async def create_request(org_id: int, entity_type: str = "", entity_id: int = 0, amount: float = 0, notes: str = "", db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    req = ApprovalRequest(org_id=org_id, entity_type=entity_type, entity_id=entity_id, requested_by=user.id, amount=amount, notes=notes, status="pending")
    db.add(req)
    await db.commit()
    await db.refresh(req)
    return {"success": True, "request": {"id": req.id, "entity_type": req.entity_type, "status": req.status}}


@router.get("/requests/{org_id}")
async def list_requests(org_id: int, status: str = None, db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    q = select(ApprovalRequest).filter(ApprovalRequest.org_id == org_id)
    if status:
        q = q.filter(ApprovalRequest.status == status)
    requests = (await db.execute(q.order_by(ApprovalRequest.created_at.desc()))).scalars().all()
    return {"requests": [{"id": r.id, "entity_type": r.entity_type, "entity_id": r.entity_id, "amount": r.amount, "status": r.status, "requested_by": r.requested_by, "created_at": str(r.created_at.date())} for r in requests]}


@router.post("/requests/{org_id}/{request_id}/approve")
async def approve_request(org_id: int, request_id: int, comment: str = "", db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    req = (await db.execute(select(ApprovalRequest).filter(ApprovalRequest.id == request_id, ApprovalRequest.org_id == org_id))).scalar_one_or_none()
    if not req:
        raise HTTPException(404, "Request not found")
    if req.status != "pending":
        raise HTTPException(400, "Request already resolved")
    vote = ApprovalVote(approval_request_id=request_id, user_id=user.id, decision="approved", comment=comment)
    db.add(vote)
    req.status = "approved"
    req.resolved_at = datetime.now(timezone.utc)
    req.resolved_by = user.id
    await db.commit()
    return {"success": True, "status": "approved"}


@router.post("/requests/{org_id}/{request_id}/reject")
async def reject_request(org_id: int, request_id: int, comment: str = "", db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    req = (await db.execute(select(ApprovalRequest).filter(ApprovalRequest.id == request_id, ApprovalRequest.org_id == org_id))).scalar_one_or_none()
    if not req:
        raise HTTPException(404, "Request not found")
    if req.status != "pending":
        raise HTTPException(400, "Request already resolved")
    vote = ApprovalVote(approval_request_id=request_id, user_id=user.id, decision="rejected", comment=comment)
    db.add(vote)
    req.status = "rejected"
    req.resolved_at = datetime.now(timezone.utc)
    req.resolved_by = user.id
    await db.commit()
    return {"success": True, "status": "rejected"}
