from fastapi import APIRouter, HTTPException, Depends, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database_async import get_async_db as get_db
from app.models.user import User
from app.models.document_version import DocumentVersion
from app.auth import get_current_user

router = APIRouter(prefix="/api/document-versions", tags=["Document Versions"])


@router.get("/{org_id}")
async def list_document_versions(
    org_id: int,
    page: int = 1,
    per_page: int = 25,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    offset = (page - 1) * per_page
    total = (await db.execute(select(func.count()).select_from(DocumentVersion).filter(DocumentVersion.org_id == org_id))).scalar()
    result = await db.execute(
        select(DocumentVersion)
        .filter(DocumentVersion.org_id == org_id)
        .order_by(DocumentVersion.created_at.desc())
        .offset(offset)
        .limit(per_page)
    )
    versions = result.scalars().all()
    return {
        "total": total,
        "page": page,
        "per_page": per_page,
        "items": [{
            "id": v.id, "org_id": v.org_id, "document_name": v.document_name,
            "version_number": v.version_number, "file_url": v.file_url,
            "file_type": v.file_type, "file_size": v.file_size,
            "created_by": v.created_by, "created_at": v.created_at.isoformat(),
        } for v in versions],
    }


@router.get("/{org_id}/{version_id}")
async def get_document_version(
    org_id: int,
    version_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ver = (await db.execute(
        select(DocumentVersion)
        .filter(DocumentVersion.id == version_id, DocumentVersion.org_id == org_id)
    )).scalar_one_or_none()
    if not ver:
        raise HTTPException(404, "Document version not found")
    return {
        "id": ver.id, "org_id": ver.org_id, "document_name": ver.document_name,
        "version_number": ver.version_number, "file_url": ver.file_url,
        "file_type": ver.file_type, "file_size": ver.file_size,
        "created_by": ver.created_by, "created_at": ver.created_at.isoformat(),
    }


@router.post("/{org_id}")
async def create_document_version(
    org_id: int,
    document_name: str = Form(...),
    file_url: str = Form(...),
    file_type: str = Form(None),
    file_size: int = Form(0),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    latest = (await db.execute(
        select(DocumentVersion)
        .filter(DocumentVersion.org_id == org_id, DocumentVersion.document_name == document_name)
        .order_by(DocumentVersion.version_number.desc())
    )).scalar_one_or_none()
    version_number = (latest.version_number + 1) if latest else 1
    ver = DocumentVersion(
        org_id=org_id, document_name=document_name,
        version_number=version_number, file_url=file_url,
        file_type=file_type, file_size=file_size,
        created_by=user.email,
    )
    db.add(ver)
    await db.commit()
    await db.refresh(ver)
    return {"id": ver.id, "version_number": ver.version_number, "message": "Document version created"}


@router.put("/{org_id}/{version_id}")
async def update_document_version(
    org_id: int,
    version_id: int,
    document_name: str = Form(None),
    file_url: str = Form(None),
    file_type: str = Form(None),
    file_size: int = Form(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ver = (await db.execute(
        select(DocumentVersion)
        .filter(DocumentVersion.id == version_id, DocumentVersion.org_id == org_id)
    )).scalar_one_or_none()
    if not ver:
        raise HTTPException(404, "Document version not found")
    if document_name is not None: ver.document_name = document_name
    if file_url is not None: ver.file_url = file_url
    if file_type is not None: ver.file_type = file_type
    if file_size is not None: ver.file_size = file_size
    await db.commit()
    return {"message": "Document version updated", "id": ver.id}


@router.delete("/{org_id}/{version_id}")
async def delete_document_version(
    org_id: int,
    version_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ver = (await db.execute(
        select(DocumentVersion)
        .filter(DocumentVersion.id == version_id, DocumentVersion.org_id == org_id)
    )).scalar_one_or_none()
    if not ver:
        raise HTTPException(404, "Document version not found")
    await db.delete(ver)
    await db.commit()
    return {"message": "Document version deleted"}


@router.get("/{org_id}/{version_id}/history")
async def get_version_history(
    org_id: int,
    version_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ver = (await db.execute(
        select(DocumentVersion)
        .filter(DocumentVersion.id == version_id, DocumentVersion.org_id == org_id)
    )).scalar_one_or_none()
    if not ver:
        raise HTTPException(404, "Document version not found")
    result = await db.execute(
        select(DocumentVersion)
        .filter(
            DocumentVersion.org_id == org_id,
            DocumentVersion.document_name == ver.document_name,
        )
        .order_by(DocumentVersion.version_number.desc())
    )
    history = result.scalars().all()
    return {
        "document_name": ver.document_name,
        "history": [{
            "id": v.id, "version_number": v.version_number,
            "file_url": v.file_url, "file_type": v.file_type,
            "file_size": v.file_size, "created_by": v.created_by,
            "created_at": v.created_at.isoformat(),
        } for v in history],
    }
