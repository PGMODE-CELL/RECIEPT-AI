from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from app.database import get_db
from app.models.timesheet import TimesheetEntry
from app.auth import get_current_user

router = APIRouter(prefix="/api/timesheets", tags=["Timesheets"])


@router.post("/{org_id}")
def create_entry(org_id: int, date: str = None, hours: float = 0, description: str = "", project_id: int = None, contact_id: int = None, billable: str = "yes", hourly_rate: float = 0, db: Session = Depends(get_db), user=Depends(get_current_user)):
    td = datetime.strptime(date, "%Y-%m-%d") if date else datetime.now(timezone.utc)
    entry = TimesheetEntry(org_id=org_id, user_id=user.id, date=td, hours=hours, description=description, project_id=project_id, contact_id=contact_id, billable=billable, hourly_rate=hourly_rate, status="approved")
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return {"success": True, "entry": {"id": entry.id, "date": str(entry.date.date()), "hours": entry.hours, "description": entry.description, "billable": entry.billable}}


@router.get("/{org_id}")
def list_entries(org_id: int, project_id: int = None, contact_id: int = None, from_date: str = None, to_date: str = None, db: Session = Depends(get_db), user=Depends(get_current_user)):
    q = db.query(TimesheetEntry).filter(TimesheetEntry.org_id == org_id)
    if project_id:
        q = q.filter(TimesheetEntry.project_id == project_id)
    if contact_id:
        q = q.filter(TimesheetEntry.contact_id == contact_id)
    if from_date:
        q = q.filter(TimesheetEntry.date >= datetime.strptime(from_date, "%Y-%m-%d"))
    if to_date:
        q = q.filter(TimesheetEntry.date <= datetime.strptime(to_date, "%Y-%m-%d"))
    entries = q.order_by(TimesheetEntry.date.desc()).all()
    return {"entries": [{"id": e.id, "date": str(e.date.date()), "hours": e.hours, "description": e.description, "project_id": e.project_id, "contact_id": e.contact_id, "billable": e.billable, "hourly_rate": e.hourly_rate, "status": e.status} for e in entries]}


@router.put("/{org_id}/{entry_id}")
def update_entry(org_id: int, entry_id: int, hours: float = None, description: str = None, billable: str = None, db: Session = Depends(get_db), user=Depends(get_current_user)):
    entry = db.query(TimesheetEntry).filter(TimesheetEntry.id == entry_id, TimesheetEntry.org_id == org_id).first()
    if not entry:
        raise HTTPException(404, "Entry not found")
    if hours is not None:
        entry.hours = hours
    if description is not None:
        entry.description = description
    if billable is not None:
        entry.billable = billable
    db.commit()
    return {"success": True, "entry": {"id": entry.id, "hours": entry.hours, "description": entry.description}}


@router.delete("/{org_id}/{entry_id}")
def delete_entry(org_id: int, entry_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    entry = db.query(TimesheetEntry).filter(TimesheetEntry.id == entry_id, TimesheetEntry.org_id == org_id).first()
    if not entry:
        raise HTTPException(404, "Entry not found")
    db.delete(entry)
    db.commit()
    return {"success": True}
