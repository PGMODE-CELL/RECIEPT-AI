from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database_async import get_async_db as get_db
from app.models.activity_note import ActivityNote
from app.auth import get_current_user

router = APIRouter(prefix="/api/activity-notes", tags=["Activity Notes"])


@router.post("/{org_id}")
async def add_note(org_id: int, entity_type: str = "", entity_id: int = 0, content: str = "", note_type: str = "note", db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    note = ActivityNote(org_id=org_id, user_id=user.id, entity_type=entity_type, entity_id=entity_id, content=content, note_type=note_type)
    db.add(note)
    await db.commit()
    await db.refresh(note)
    return {"success": True, "note": {"id": note.id, "content": note.content, "note_type": note.note_type, "created_at": str(note.created_at)}}


@router.get("/{org_id}/{entity_type}/{entity_id}")
async def get_notes(org_id: int, entity_type: str, entity_id: int, db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    notes = (await db.execute(select(ActivityNote).filter(ActivityNote.org_id == org_id, ActivityNote.entity_type == entity_type, ActivityNote.entity_id == entity_id).order_by(ActivityNote.created_at.desc()))).scalars().all()
    return {"notes": [{"id": n.id, "content": n.content, "note_type": n.note_type, "user_id": n.user_id, "created_at": str(n.created_at)} for n in notes]}
