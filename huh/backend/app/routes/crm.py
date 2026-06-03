from fastapi import APIRouter, HTTPException, Depends, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import date

from app.database_async import get_async_db as get_db
from app.models.user import User
from app.models.crm_lead import CrmLead
from app.models.crm_activity import CrmActivity
from app.auth import get_current_user

router = APIRouter(prefix="/api/crm", tags=["CRM"])


@router.get("/{org_id}/leads")
async def list_leads(
    org_id: int,
    page: int = 1,
    per_page: int = 25,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    offset = (page - 1) * per_page
    total = (await db.execute(select(func.count()).select_from(CrmLead).filter(CrmLead.org_id == org_id))).scalar()
    result = await db.execute(
        select(CrmLead)
        .filter(CrmLead.org_id == org_id)
        .order_by(CrmLead.created_at.desc())
        .offset(offset)
        .limit(per_page)
    )
    leads = result.scalars().all()
    return {
        "total": total,
        "page": page,
        "per_page": per_page,
        "items": [{
            "id": l.id, "org_id": l.org_id, "name": l.name,
            "email": l.email, "phone": l.phone, "company": l.company,
            "source": l.source, "status": l.status, "value": float(l.value),
            "assignee": l.assignee, "notes": l.notes,
            "expected_close_date": l.expected_close_date.isoformat() if l.expected_close_date else None,
            "created_at": l.created_at.isoformat(),
        } for l in leads],
    }


@router.get("/{org_id}/leads/{lead_id}")
async def get_lead(
    org_id: int,
    lead_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    lead = (await db.execute(select(CrmLead).filter(CrmLead.id == lead_id, CrmLead.org_id == org_id))).scalar_one_or_none()
    if not lead:
        raise HTTPException(404, "Lead not found")
    return {
        "id": lead.id, "org_id": lead.org_id, "name": lead.name,
        "email": lead.email, "phone": lead.phone, "company": lead.company,
        "source": lead.source, "status": lead.status, "value": float(lead.value),
        "assignee": lead.assignee, "notes": lead.notes,
        "expected_close_date": lead.expected_close_date.isoformat() if lead.expected_close_date else None,
        "created_at": lead.created_at.isoformat(),
    }


@router.post("/{org_id}/leads")
async def create_lead(
    org_id: int,
    name: str = Form(...),
    email: str = Form(None),
    phone: str = Form(None),
    company: str = Form(None),
    source: str = Form(None),
    value: float = Form(0),
    assignee: str = Form(None),
    notes: str = Form(None),
    expected_close_date: str = Form(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    lead = CrmLead(
        org_id=org_id,
        name=name,
        email=email,
        phone=phone,
        company=company,
        source=source,
        value=value,
        assignee=assignee,
        notes=notes,
        expected_close_date=date.fromisoformat(expected_close_date) if expected_close_date else None,
    )
    db.add(lead)
    await db.commit()
    await db.refresh(lead)
    return {
        "id": lead.id, "org_id": lead.org_id, "name": lead.name,
        "message": "Lead created",
    }


@router.put("/{org_id}/leads/{lead_id}")
async def update_lead(
    org_id: int,
    lead_id: int,
    name: str = Form(None),
    email: str = Form(None),
    phone: str = Form(None),
    company: str = Form(None),
    source: str = Form(None),
    status: str = Form(None),
    value: float = Form(None),
    assignee: str = Form(None),
    notes: str = Form(None),
    expected_close_date: str = Form(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    lead = (await db.execute(select(CrmLead).filter(CrmLead.id == lead_id, CrmLead.org_id == org_id))).scalar_one_or_none()
    if not lead:
        raise HTTPException(404, "Lead not found")
    if name is not None: lead.name = name
    if email is not None: lead.email = email
    if phone is not None: lead.phone = phone
    if company is not None: lead.company = company
    if source is not None: lead.source = source
    if status is not None: lead.status = status
    if value is not None: lead.value = value
    if assignee is not None: lead.assignee = assignee
    if notes is not None: lead.notes = notes
    if expected_close_date is not None: lead.expected_close_date = date.fromisoformat(expected_close_date)
    await db.commit()
    return {"message": "Lead updated", "id": lead.id}


@router.delete("/{org_id}/leads/{lead_id}")
async def delete_lead(
    org_id: int,
    lead_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    lead = (await db.execute(select(CrmLead).filter(CrmLead.id == lead_id, CrmLead.org_id == org_id))).scalar_one_or_none()
    if not lead:
        raise HTTPException(404, "Lead not found")
    await db.delete(lead)
    await db.commit()
    return {"message": "Lead deleted"}


@router.get("/{org_id}/leads/{lead_id}/activities")
async def list_lead_activities(
    org_id: int,
    lead_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(CrmActivity)
        .filter(CrmActivity.lead_id == lead_id, CrmActivity.org_id == org_id)
        .order_by(CrmActivity.due_date.desc())
    )
    activities = result.scalars().all()
    return {
        "items": [{
            "id": a.id, "lead_id": a.lead_id, "type": a.type,
            "subject": a.subject, "description": a.description,
            "due_date": a.due_date.isoformat() if a.due_date else None,
            "created_at": a.created_at.isoformat(),
        } for a in activities],
    }


@router.post("/{org_id}/activities")
async def create_activity(
    org_id: int,
    lead_id: int = Form(...),
    type: str = Form(...),
    subject: str = Form(...),
    description: str = Form(None),
    due_date: str = Form(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    activity = CrmActivity(
        org_id=org_id,
        lead_id=lead_id,
        type=type,
        subject=subject,
        description=description,
        due_date=date.fromisoformat(due_date) if due_date else None,
    )
    db.add(activity)
    await db.commit()
    await db.refresh(activity)
    return {
        "id": activity.id, "lead_id": activity.lead_id,
        "subject": activity.subject, "message": "Activity created",
    }
