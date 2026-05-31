from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from app.database import get_db
from app.models.activity_note import ActivityNote
from app.auth import get_current_user

router = APIRouter(prefix="/api/activity-notes", tags=["Activity Notes"])


@router.post("/{org_id}")
def add_note(org_id: int, entity_type: str = "", entity_id: int = 0, content: str = "", note_type: str = "note", db: Session = Depends(get_db), user=Depends(get_current_user)):
    note = ActivityNote(org_id=org_id, user_id=user.id, entity_type=entity_type, entity_id=entity_id, content=content, note_type=note_type)
    db.add(note)
    db.commit()
    db.refresh(note)
    return {"success": True, "note": {"id": note.id, "content": note.content, "note_type": note.note_type, "created_at": str(note.created_at)}}


@router.get("/{org_id}/{entity_type}/{entity_id}")
def get_notes(org_id: int, entity_type: str, entity_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    notes = db.query(ActivityNote).filter(ActivityNote.org_id == org_id, ActivityNote.entity_type == entity_type, ActivityNote.entity_id == entity_id).order_by(ActivityNote.created_at.desc()).all()
    return {"notes": [{"id": n.id, "content": n.content, "note_type": n.note_type, "user_id": n.user_id, "created_at": str(n.created_at)} for n in notes]}
