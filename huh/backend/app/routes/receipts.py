import uuid
from datetime import date
from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.receipt import Receipt
from app.auth import get_current_user

router = APIRouter(prefix="/api/receipts", tags=["Receipts"])


@router.post("/{org_id}/upload")
async def upload_receipt(
    org_id: int,
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    await file.read()

    extracted = {
        "vendor": "Unknown Store",
        "date": str(date.today()),
        "total": 0.0,
        "tax": 0.0,
        "category": "other",
        "confidence": 0.0,
    }

    receipt = Receipt(
        org_id=org_id,
        file_name=file.filename,
        vendor=extracted["vendor"],
        date=date.today(),
        total=0,
        category="other",
        extracted_data=extracted,
    )
    db.add(receipt)
    db.commit()
    db.refresh(receipt)
    return {
        "receipt_id": receipt.id,
        "message": "Receipt uploaded! AI will extract details shortly.",
        "extracted": extracted,
    }


@router.get("/{org_id}")
def list_receipts(
    org_id: int,
    page: int = 1,
    per_page: int = 25,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    offset = (page - 1) * per_page
    total = db.query(Receipt).filter(Receipt.org_id == org_id).count()
    receipts = (
        db.query(Receipt)
        .filter(Receipt.org_id == org_id)
        .order_by(Receipt.date.desc())
        .offset(offset)
        .limit(per_page)
        .all()
    )
    return {
        "total": total,
        "page": page,
        "per_page": per_page,
        "items": [{
            "id": r.id, "file_name": r.file_name, "vendor": r.vendor,
            "date": r.date.isoformat(), "total": float(r.total),
            "category": r.category, "extracted_data": r.extracted_data,
        } for r in receipts],
    }
