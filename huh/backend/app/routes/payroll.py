from datetime import date, datetime
from fastapi import APIRouter, HTTPException, Depends, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete as sql_delete
from sqlalchemy.orm import selectinload
from decimal import Decimal, ROUND_HALF_UP

from app.database_async import get_async_db as get_db
from app.models.user import User
from app.models.payroll import Employee, SalaryComponent, Payslip
from app.auth import get_current_user
from app.encryption import encrypt_dict, decrypt_dict

router = APIRouter(prefix="/api/payroll", tags=["Payroll"])

PF_RATE = Decimal("12")
ESI_RATE = Decimal("0.75")
PT_SLABS = [
    (15000, 0), (25000, 100), (45000, 200), (float("inf"), 300),
]


def calc_pf(basic: Decimal) -> tuple:
    pf = (basic * PF_RATE / Decimal("100")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    employer_pf = pf
    return float(pf), float(employer_pf)


def calc_esi(gross: Decimal) -> tuple:
    if gross <= Decimal("21000"):
        return 0, 0
    esi = (gross * ESI_RATE / Decimal("100")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    employer_esi = esi * Decimal("3.25")
    return float(esi), float(employer_esi)


def calc_pt(gross: Decimal) -> float:
    for slab, pt in PT_SLABS:
        if gross <= Decimal(str(slab)):
            return pt
    return PT_SLABS[-1][1]


# --- Employee CRUD ---

@router.post("/{org_id}/employees")
async def create_employee(
    org_id: int, name: str = Form(...), email: str = Form(""), phone: str = Form(""),
    department: str = Form(""), designation: str = Form(""), doj: str = Form(""),
    pan: str = Form(""), bank_account: str = Form(""), ifsc: str = Form(""),
    employee_code: str = Form(""),
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    encrypted = encrypt_dict({"email": email, "phone": phone, "pan": pan, "bank_account": bank_account, "ifsc": ifsc},
                              ["email", "phone", "pan", "bank_account", "ifsc"])
    emp = Employee(
        org_id=org_id, name=name, email=encrypted["email"], phone=encrypted["phone"], department=department,
        designation=designation, pan=encrypted["pan"], bank_account=encrypted["bank_account"], ifsc=encrypted["ifsc"],
        employee_code=employee_code,
        doj=datetime.strptime(doj, "%Y-%m-%d").date() if doj else date.today(),
    )
    db.add(emp)
    await db.commit()
    return {"id": emp.id, "name": emp.name, "employee_code": emp.employee_code, "message": f"Employee {name} added"}


@router.get("/{org_id}/employees")
async def list_employees(org_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Employee).filter(Employee.org_id == org_id).order_by(Employee.name))
    emps = result.scalars().all()
    return [decrypt_dict({
        "id": e.id, "employee_code": e.employee_code, "name": e.name, "email": e.email,
        "department": e.department, "designation": e.designation, "pan": e.pan,
        "status": e.status,
    }, ["email", "pan"]) for e in emps]


@router.get("/{org_id}/employees/{emp_id}")
async def get_employee(
    org_id: int,
    emp_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    emp = (await db.execute(select(Employee).filter(Employee.id == emp_id, Employee.org_id == org_id))).scalar_one_or_none()
    if not emp:
        raise HTTPException(404, "Employee not found")
    return decrypt_dict({
        "id": emp.id, "employee_code": emp.employee_code, "name": emp.name,
        "email": emp.email, "phone": emp.phone, "department": emp.department,
        "designation": emp.designation, "pan": emp.pan, "status": emp.status,
    }, ["email", "phone", "pan"])


@router.put("/{org_id}/employees/{emp_id}")
async def update_employee(
    org_id: int,
    emp_id: int,
    name: str = Form(None),
    department: str = Form(None),
    designation: str = Form(None),
    status: str = Form(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    emp = (await db.execute(select(Employee).filter(Employee.id == emp_id, Employee.org_id == org_id))).scalar_one_or_none()
    if not emp:
        raise HTTPException(404, "Employee not found")
    if name is not None:
        emp.name = name
    if department is not None:
        emp.department = department
    if designation is not None:
        emp.designation = designation
    if status is not None:
        emp.status = status
    await db.commit()
    return {"message": "Employee updated"}


@router.delete("/{org_id}/employees/{emp_id}")
async def delete_employee(
    org_id: int,
    emp_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    emp = (await db.execute(select(Employee).filter(Employee.id == emp_id, Employee.org_id == org_id))).scalar_one_or_none()
    if not emp:
        raise HTTPException(404, "Employee not found")
    await db.delete(emp)
    await db.commit()
    return {"message": "Employee deleted"}


# --- Salary Components ---

@router.post("/{org_id}/employees/{emp_id}/components")
async def set_components(
    org_id: int, emp_id: int,
    basic: float = Form(...), hra: float = Form(0), da: float = Form(0),
    conveyance: float = Form(0), medical: float = Form(0), special: float = Form(0),
    other_earnings: float = Form(0),
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    emp = (await db.execute(select(Employee).filter(Employee.id == emp_id, Employee.org_id == org_id))).scalar_one_or_none()
    if not emp:
        raise HTTPException(404, "Employee not found")

    await db.execute(sql_delete(SalaryComponent).where(SalaryComponent.employee_id == emp_id))
    components = [
        ("Basic", basic, "earning"),
        ("HRA", hra, "earning"),
        ("DA", da, "earning"),
        ("Conveyance", conveyance, "earning"),
        ("Medical", medical, "earning"),
        ("Special", special, "earning"),
        ("Other", other_earnings, "earning"),
    ]
    for name, amt, typ in components:
        if amt > 0:
            db.add(SalaryComponent(employee_id=emp_id, name=name, type=typ, amount=Decimal(str(amt))))
    await db.commit()
    return {"message": "Salary structure saved", "total_gross": basic + hra + da + conveyance + medical + special + other_earnings}


# --- Payslip Generation ---

@router.post("/{org_id}/employees/{emp_id}/payslip")
async def generate_payslip(
    org_id: int, emp_id: int, month: str = Form(...),
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),
):
    emp = (await db.execute(select(Employee).filter(Employee.id == emp_id, Employee.org_id == org_id))).scalar_one_or_none()
    if not emp:
        raise HTTPException(404, "Employee not found")

    comps_result = await db.execute(select(SalaryComponent).filter(SalaryComponent.employee_id == emp_id))
    comps = comps_result.scalars().all()
    earnings = {c.name: float(c.amount) for c in comps if c.type == "earning"}
    gross = sum(Decimal(str(v)) for v in earnings.values())
    basic = Decimal(str(earnings.get("Basic", 0)))

    pf_emp, pf_empyr = calc_pf(basic)
    esi_emp, esi_empyr = calc_esi(gross)
    pt = calc_pt(gross)
    deductions = {"PF": pf_emp, "ESI": esi_emp, "PT": pt}
    total_ded = Decimal(str(sum(deductions.values())))
    net = gross - total_ded
    employer_contributions = {"PF": pf_empyr, "ESI": esi_empyr}

    payslip = Payslip(
        employee_id=emp_id, org_id=org_id, month=month,
        gross_pay=gross, total_deductions=total_ded, net_pay=net,
        earnings=earnings, deductions=deductions,
        employer_contributions=employer_contributions,
    )
    db.add(payslip)
    await db.commit()

    return {
        "id": payslip.id, "employee": emp.name, "month": month,
        "gross": float(gross), "deductions": deductions,
        "net_pay": float(net), "employer_contributions": employer_contributions,
        "message": f"Payslip for {emp.name} - {month}: Net ${float(net):.2f}",
    }


@router.get("/{org_id}/payslips")
async def list_payslips(org_id: int, month: str = "", user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    q = select(Payslip).filter(Payslip.org_id == org_id).options(selectinload(Payslip.employee))
    if month:
        q = q.filter(Payslip.month == month)
    q = q.order_by(Payslip.month.desc(), Payslip.generated_at.desc())
    result = await db.execute(q)
    slips = result.scalars().all()
    return [{
        "id": s.id, "employee_name": s.employee.name,
        "month": s.month, "gross": float(s.gross_pay),
        "deductions": float(s.total_deductions), "net": float(s.net_pay),
        "status": s.status,
    } for s in slips]


@router.get("/{org_id}/payslips/{payslip_id}")
async def get_payslip(org_id: int, payslip_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    slip = (await db.execute(select(Payslip).filter(Payslip.id == payslip_id, Payslip.org_id == org_id).options(selectinload(Payslip.employee)))).scalar_one_or_none()
    if not slip:
        raise HTTPException(404, "Payslip not found")
    return {
        "id": slip.id, "employee": slip.employee.name, "employee_code": slip.employee.employee_code,
        "month": slip.month, "gross": float(slip.gross_pay),
        "earnings": slip.earnings, "deductions": slip.deductions,
        "employer_contributions": slip.employer_contributions,
        "total_deductions": float(slip.total_deductions), "net": float(slip.net_pay),
        "status": slip.status,
    }


@router.put("/{org_id}/payslips/{payslip_id}/status")
async def update_payslip_status(
    org_id: int,
    payslip_id: int,
    status: str = Form(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    slip = (await db.execute(select(Payslip).filter(Payslip.id == payslip_id, Payslip.org_id == org_id))).scalar_one_or_none()
    if not slip:
        raise HTTPException(404, "Payslip not found")
    slip.status = status
    await db.commit()
    return {"message": f"Payslip status updated to {status}"}


@router.delete("/{org_id}/payslips/{payslip_id}")
async def delete_payslip(
    org_id: int,
    payslip_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    slip = (await db.execute(select(Payslip).filter(Payslip.id == payslip_id, Payslip.org_id == org_id))).scalar_one_or_none()
    if not slip:
        raise HTTPException(404, "Payslip not found")
    await db.delete(slip)
    await db.commit()
    return {"message": "Payslip deleted"}
