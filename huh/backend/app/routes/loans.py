from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from app.database import get_db
from app.models.loan import Loan, LoanRepayment
from app.auth import get_current_user

router = APIRouter(prefix="/api/loans", tags=["Loans"])


@router.post("/{org_id}")
def create_loan(org_id: int, type: str = "borrowing", name: str = "", lender_name: str = "", principal: float = 0, interest_rate: float = 0, interest_type: str = "simple", tenure_months: int = 0, start_date: str = None, contact_id: int = None, account_id: int = None, notes: str = "", db: Session = Depends(get_db), user=Depends(get_current_user)):
    sd = datetime.strptime(start_date, "%Y-%m-%d") if start_date else datetime.now(timezone.utc)
    loan = Loan(org_id=org_id, type=type, name=name, lender_name=lender_name, principal=principal, outstanding=principal, interest_rate=interest_rate, interest_type=interest_type, tenure_months=tenure_months, start_date=sd, contact_id=contact_id, account_id=account_id, notes=notes)
    db.add(loan)
    db.commit()
    db.refresh(loan)
    return {"success": True, "loan": {"id": loan.id, "name": loan.name, "principal": loan.principal, "outstanding": loan.outstanding, "status": loan.status}}


@router.get("/{org_id}")
def list_loans(org_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    loans = db.query(Loan).filter(Loan.org_id == org_id).order_by(Loan.created_at.desc()).all()
    return {"loans": [{"id": l.id, "name": l.name, "type": l.type, "principal": l.principal, "outstanding": l.outstanding, "interest_rate": l.interest_rate, "status": l.status} for l in loans]}


@router.get("/{org_id}/{loan_id}")
def get_loan(org_id: int, loan_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    loan = db.query(Loan).filter(Loan.id == loan_id, Loan.org_id == org_id).first()
    if not loan:
        raise HTTPException(404, "Loan not found")
    repayments = db.query(LoanRepayment).filter(LoanRepayment.loan_id == loan_id).order_by(LoanRepayment.date).all()
    return {"loan": {"id": loan.id, "name": loan.name, "type": loan.type, "principal": loan.principal, "outstanding": loan.outstanding, "interest_rate": loan.interest_rate, "interest_type": loan.interest_type, "tenure_months": loan.tenure_months, "start_date": str(loan.start_date), "end_date": str(loan.end_date) if loan.end_date else None, "status": loan.status, "notes": loan.notes}, "repayments": [{"id": r.id, "date": str(r.date), "amount": r.amount, "principal_part": r.principal_part, "interest_part": r.interest_part, "status": r.status} for r in repayments]}


@router.post("/{org_id}/{loan_id}/repay")
def record_repayment(org_id: int, loan_id: int, date: str = None, amount: float = 0, principal_part: float = 0, interest_part: float = 0, notes: str = "", db: Session = Depends(get_db), user=Depends(get_current_user)):
    loan = db.query(Loan).filter(Loan.id == loan_id, Loan.org_id == org_id).first()
    if not loan:
        raise HTTPException(404, "Loan not found")
    rd = datetime.strptime(date, "%Y-%m-%d") if date else datetime.now(timezone.utc)
    repayment = LoanRepayment(loan_id=loan_id, date=rd, amount=amount, principal_part=principal_part, interest_part=interest_part, notes=notes, status="completed")
    db.add(repayment)
    loan.outstanding -= principal_part
    if loan.outstanding <= 0:
        loan.outstanding = 0
        loan.status = "closed"
    db.commit()
    return {"success": True, "repayment": {"id": repayment.id, "amount": amount, "principal_part": principal_part, "interest_part": interest_part}}


@router.post("/{org_id}/{loan_id}/schedule")
def generate_schedule(org_id: int, loan_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    from datetime import timedelta
    loan = db.query(Loan).filter(Loan.id == loan_id, Loan.org_id == org_id).first()
    if not loan:
        raise HTTPException(404, "Loan not found")
    existing = db.query(LoanRepayment).filter(LoanRepayment.loan_id == loan_id).count()
    if existing > 0:
        raise HTTPException(400, "Schedule already generated")
    monthly_rate = loan.interest_rate / 100 / 12
    n = loan.tenure_months
    if monthly_rate > 0:
        emi = loan.principal * monthly_rate * (1 + monthly_rate) ** n / ((1 + monthly_rate) ** n - 1)
    else:
        emi = loan.principal / n
    schedule = []
    balance = loan.principal
    for i in range(n):
        interest = balance * monthly_rate
        principal_part = emi - interest
        if principal_part < 0:
            principal_part = 0
        balance -= principal_part
        if balance < 0:
            balance = 0
        rd = loan.start_date + timedelta(days=30 * (i + 1))
        rep = LoanRepayment(loan_id=loan_id, date=rd, amount=round(emi, 2), principal_part=round(principal_part, 2), interest_part=round(interest, 2), status="scheduled")
        db.add(rep)
        schedule.append({"installment": i + 1, "date": str(rd.date()), "amount": round(emi, 2), "principal": round(principal_part, 2), "interest": round(interest, 2), "balance": round(balance, 2)})
    loan.end_date = loan.start_date + timedelta(days=30 * n)
    db.commit()
    return {"success": True, "schedule": schedule}
