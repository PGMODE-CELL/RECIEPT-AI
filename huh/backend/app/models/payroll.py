from sqlalchemy import Column, Integer, String, ForeignKey, Numeric, Date, DateTime, JSON
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database import Base


class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True)
    org_id = Column(Integer, ForeignKey("organizations.id"))
    employee_code = Column(String(50))
    name = Column(String(255))
    email = Column(String(255))
    phone = Column(String(50))
    department = Column(String(100))
    designation = Column(String(100))
    doj = Column(Date)  # date of joining
    dob = Column(Date)
    pan = Column(String(20))  # tax ID
    bank_account = Column(String(50))
    ifsc = Column(String(50))
    status = Column(String(20), default="active")  # active, resigned, terminated
    created_at = Column(DateTime, default=datetime.utcnow)

    org = relationship("Organization")
    salary_components = relationship("SalaryComponent", back_populates="employee", cascade="all, delete-orphan")
    payslips = relationship("Payslip", back_populates="employee", cascade="all, delete-orphan")


class SalaryComponent(Base):
    __tablename__ = "salary_components"

    id = Column(Integer, primary_key=True)
    employee_id = Column(Integer, ForeignKey("employees.id"))
    name = Column(String(100))  # Basic, HRA, DA, PF, ESI, PT, etc.
    type = Column(String(10))   # earning, deduction
    amount = Column(Numeric(15, 2))
    is_percentage = Column(String(10), nullable=True)  # null = fixed, or "basic"
    percentage = Column(Numeric(5, 2), nullable=True)

    employee = relationship("Employee", back_populates="salary_components")


class Payslip(Base):
    __tablename__ = "payslips"

    id = Column(Integer, primary_key=True)
    employee_id = Column(Integer, ForeignKey("employees.id"))
    org_id = Column(Integer, ForeignKey("organizations.id"))
    month = Column(String(7))  # "2024-01"
    gross_pay = Column(Numeric(15, 2))
    total_deductions = Column(Numeric(15, 2))
    net_pay = Column(Numeric(15, 2))
    earnings = Column(JSON, default=dict)    # {"Basic": 50000, "HRA": 25000}
    deductions = Column(JSON, default=dict)  # {"PF": 6000, "PT": 200}
    employer_contributions = Column(JSON, default=dict)  # {"PF": 6000, "ESI": 2000}
    status = Column(String(20), default="draft")  # draft, paid
    generated_at = Column(DateTime, default=datetime.utcnow)
    paid_at = Column(DateTime, nullable=True)

    employee = relationship("Employee", back_populates="payslips")
    org = relationship("Organization")
