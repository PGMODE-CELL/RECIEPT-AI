from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timezone
from app.database_async import get_async_db as get_db
from app.models.timesheet import TimesheetEntry
from app.auth import get_current_user

router = APIRouter(prefix="/api/timesheets", tags=["Timesheets"])


@router.post("/{org_id}")
async def create_entry(org_id: int, date: str = None, hours: float = 0, description: str = "", project_id: int = None, contact_id: int = None, billable: str = "yes", hourly_rate: float = 0, db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    td = datetime.strptime(date, "%Y-%m-%d") if date else datetime.now(timezone.utc)
    entry = TimesheetEntry(org_id=org_id, user_id=user.id, date=td, hours=hours, description=description, project_id=project_id, contact_id=contact_id, billable=billable, hourly_rate=hourly_rate, status="approved")
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return {"success": True, "entry": {"id": entry.id, "date": str(entry.date.date()), "hours": entry.hours, "description": entry.description, "billable": entry.billable}}


@router.get("/{org_id}")
async def list_entries(org_id: int, project_id: int = None, contact_id: int = None, from_date: str = None, to_date: str = None, db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    q = select(TimesheetEntry).filter(TimesheetEntry.org_id == org_id)
    if project_id:
        q = q.filter(TimesheetEntry.project_id == project_id)
    if contact_id:
        q = q.filter(TimesheetEntry.contact_id == contact_id)
    if from_date:
        q = q.filter(TimesheetEntry.date >= datetime.strptime(from_date, "%Y-%m-%d"))
    if to_date:
        q = q.filter(TimesheetEntry.date <= datetime.strptime(to_date, "%Y-%m-%d"))
    q = q.order_by(TimesheetEntry.date.desc())
    result = await db.execute(q)
    entries = result.scalars().all()
    return {"entries": [{"id": e.id, "date": str(e.date.date()), "hours": e.hours, "description": e.description, "project_id": e.project_id, "contact_id": e.contact_id, "billable": e.billable, "hourly_rate": e.hourly_rate, "status": e.status} for e in entries]}


@router.get("/{org_id}/{entry_id}")
async def get_entry(org_id: int, entry_id: int, db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    entry = (await db.execute(select(TimesheetEntry).filter(TimesheetEntry.id == entry_id, TimesheetEntry.org_id == org_id))).scalar_one_or_none()
    if not entry:
        raise HTTPException(404, "Entry not found")
    return {"id": entry.id, "date": str(entry.date.date()), "hours": entry.hours, "description": entry.description, "project_id": entry.project_id, "contact_id": entry.contact_id, "billable": entry.billable, "hourly_rate": entry.hourly_rate, "status": entry.status}


@router.put("/{org_id}/{entry_id}")
async def update_entry(org_id: int, entry_id: int, hours: float = None, description: str = None, billable: str = None, db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    entry = (await db.execute(select(TimesheetEntry).filter(TimesheetEntry.id == entry_id, TimesheetEntry.org_id == org_id))).scalar_one_or_none()
    if not entry:
        raise HTTPException(404, "Entry not found")
    if hours is not None:
        entry.hours = hours
    if description is not None:
        entry.description = description
    if billable is not None:
        entry.billable = billable
    await db.commit()
    return {"success": True, "entry": {"id": entry.id, "hours": entry.hours, "description": entry.description}}


@router.delete("/{org_id}/{entry_id}")
async def delete_entry(org_id: int, entry_id: int, db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    entry = (await db.execute(select(TimesheetEntry).filter(TimesheetEntry.id == entry_id, TimesheetEntry.org_id == org_id))).scalar_one_or_none()
    if not entry:
        raise HTTPException(404, "Entry not found")
    await db.delete(entry)
    await db.commit()
    return {"success": True}
