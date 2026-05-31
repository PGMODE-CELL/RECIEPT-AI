import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.user import User
from app.models.attachment import Attachment, UPLOAD_DIR
from app.auth import get_current_user

router = APIRouter(prefix="/api/attachments", tags=["Attachments"])

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/gif", "application/pdf",
                 "text/csv", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                 "application/vnd.ms-excel"}


@router.post("/{org_id}/upload")
def upload_file(
    org_id: int,
    record_type: str = Form(...),
    record_id: int = Form(...),
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ext = os.path.splitext(file.filename or "file")[1]
    stored_name = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(UPLOAD_DIR, stored_name)

    content = file.file.read()
    if len(content) > 20 * 1024 * 1024:
        raise HTTPException(400, "File too large (max 20MB)")

    with open(filepath, "wb") as f:
        f.write(content)

    att = Attachment(
        org_id=org_id, record_type=record_type, record_id=record_id,
        filename=stored_name, original_name=file.filename or "file",
        content_type=file.content_type or "application/octet-stream",
        size=len(content),
    )
    db.add(att)
    db.commit()

    return {"id": att.id, "original_name": file.filename, "size": len(content), "message": "File uploaded"}


@router.get("/{org_id}/list")
def list_attachments(
    org_id: int, record_type: str = "", record_id: int = 0,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    q = db.query(Attachment).filter(Attachment.org_id == org_id)
    if record_type:
        q = q.filter(Attachment.record_type == record_type)
    if record_id:
        q = q.filter(Attachment.record_id == record_id)
    atts = q.order_by(Attachment.created_at.desc()).all()
    return [{
        "id": a.id, "record_type": a.record_type, "record_id": a.record_id,
        "original_name": a.original_name, "size": a.size,
        "content_type": a.content_type, "created_at": a.created_at.isoformat(),
    } for a in atts]


@router.get("/{org_id}/download/{attachment_id}")
def download_file(org_id: int, attachment_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    att = db.query(Attachment).filter(Attachment.id == attachment_id, Attachment.org_id == org_id).first()
    if not att:
        raise HTTPException(404, "Attachment not found")
    filepath = os.path.join(UPLOAD_DIR, att.filename)
    if not os.path.exists(filepath):
        raise HTTPException(404, "File not found on disk")
    return FileResponse(filepath, media_type=att.content_type, filename=att.original_name)


@router.delete("/{org_id}/{attachment_id}")
def delete_attachment(org_id: int, attachment_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    att = db.query(Attachment).filter(Attachment.id == attachment_id, Attachment.org_id == org_id).first()
    if not att:
        raise HTTPException(404, "Attachment not found")
    filepath = os.path.join(UPLOAD_DIR, att.filename)
    if os.path.exists(filepath):
        os.remove(filepath)
    db.delete(att)
    db.commit()
    return {"message": "Attachment deleted"}
