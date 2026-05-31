from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, Form
from sqlalchemy.orm import Session
from sqlalchemy import func
from decimal import Decimal

from app.database import get_db
from app.models.user import User
from app.models.project import Project
from app.models.transaction import Transaction
from app.models.invoice import Invoice
from app.models.bill import Bill
from app.auth import get_current_user

router = APIRouter(prefix="/api/projects", tags=["Projects"])


@router.get("/{org_id}")
def list_projects(org_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    projects = db.query(Project).filter(Project.org_id == org_id).order_by(Project.name).all()
    return [{
        "id": p.id, "name": p.name, "description": p.description,
        "status": p.status, "budget": float(p.budget or 0),
        "start_date": p.start_date.isoformat() if p.start_date else "",
        "end_date": p.end_date.isoformat() if p.end_date else "",
    } for p in projects]


@router.post("/{org_id}")
def create_project(
    org_id: int,
    name: str = Form(...), description: str = Form(""),
    budget: float = Form(0), status: str = Form("active"),
    start_date: str = Form(""), end_date: str = Form(""),
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    p = Project(
        org_id=org_id, name=name, description=description,
        budget=Decimal(str(budget)), status=status,
        start_date=datetime.strptime(start_date, "%Y-%m-%d").date() if start_date else date.today(),
        end_date=datetime.strptime(end_date, "%Y-%m-%d").date() if end_date else None,
    )
    db.add(p)
    db.commit()
    return {"id": p.id, "name": p.name, "message": f"Project '{name}' created"}


@router.get("/{org_id}/{project_id}/pnl")
def project_pnl(org_id: int, project_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id, Project.org_id == org_id).first()
    if not project:
        raise HTTPException(404, "Project not found")

    income = db.query(func.sum(Transaction.amount)).filter(
        Transaction.org_id == org_id, Transaction.project_id == project_id,
        Transaction.type == "money_in"
    ).scalar() or 0

    expenses = db.query(func.sum(Transaction.amount)).filter(
        Transaction.org_id == org_id, Transaction.project_id == project_id,
        Transaction.type == "money_out"
    ).scalar() or 0

    invoiced = db.query(func.sum(Invoice.total)).filter(
        Invoice.org_id == org_id, Invoice.project_id == project_id
    ).scalar() or 0

    billed = db.query(func.sum(Bill.total)).filter(
        Bill.org_id == org_id, Bill.project_id == project_id
    ).scalar() or 0

    return {
        "project": project.name, "status": project.status,
        "budget": float(project.budget or 0),
        "income": float(income), "expenses": float(expenses),
        "profit_loss": float(income - expenses),
        "invoiced": float(invoiced), "billed": float(billed),
    }


@router.put("/{org_id}/{project_id}")
def update_project(
    org_id: int, project_id: int,
    name: str = Form(...), status: str = Form("active"),
    budget: float = Form(0), description: str = Form(""),
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    p = db.query(Project).filter(Project.id == project_id, Project.org_id == org_id).first()
    if not p:
        raise HTTPException(404, "Project not found")
    p.name = name
    p.status = status
    p.budget = Decimal(str(budget))
    p.description = description
    db.commit()
    return {"message": f"Project '{name}' updated"}
