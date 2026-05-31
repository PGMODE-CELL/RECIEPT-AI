from datetime import date, timedelta
from fastapi import APIRouter, Depends, Form
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.bill import Bill
from app.auth import get_current_user

router = APIRouter(prefix="/api/bills", tags=["Bills"])


@router.post("/{org_id}")
def create_bill(
    org_id: int,
    contact_id: int = Form(...),
    amount: float = Form(...),
    description: str = Form(...),
    due_days: int = Form(30),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    count = db.query(Bill).filter(Bill.org_id == org_id).count()
    bill = Bill(
        org_id=org_id,
        contact_id=contact_id,
        number=f"BILL-{count+1:04d}",
        due_date=date.today() + timedelta(days=due_days),
        total=amount,
    )
    db.add(bill)
    db.commit()
    db.refresh(bill)
    return {
        "bill_id": bill.id,
        "number": bill.number,
        "message": f"Bill recorded: ${amount:.2f} for {description}",
    }


@router.get("/{org_id}")
def list_bills(
    org_id: int,
    page: int = 1,
    per_page: int = 25,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    offset = (page - 1) * per_page
    total = db.query(Bill).filter(Bill.org_id == org_id).count()
    bills = (
        db.query(Bill)
        .filter(Bill.org_id == org_id)
        .order_by(Bill.date.desc())
        .offset(offset)
        .limit(per_page)
        .all()
    )
    return {
        "total": total,
        "page": page,
        "per_page": per_page,
        "items": [{
            "id": b.id, "org_id": b.org_id, "contact_id": b.contact_id,
            "number": b.number, "date": b.date.isoformat(),
            "due_date": b.due_date.isoformat(), "total": float(b.total),
            "paid": float(b.paid), "status": b.status,
        } for b in bills],
    }
