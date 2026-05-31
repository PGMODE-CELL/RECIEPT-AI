# Changelog

All notable changes to ReceiptAI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [1.0.0] - 2026-05-31

### Added

- **Invoicing** — Create, send, and track invoices with PDF generation
- **Bills & Expenses** — Record bills, scan receipts via OCR, track payables
- **Banking** — Connect bank feeds, reconcile transactions, manage accounts
- **Payroll** — Run payroll, calculate deductions, generate pay slips
- **Estimates** — Create quotes and convert to invoices
- **Contacts** — Manage customers, vendors, and employees
- **Payments** — Accept payments via Stripe, track payment history
- **Multi-currency** — Support for USD, EUR, INR, GBP, JPY
- **Audit Logging** — Every mutation is logged with user, IP, and timestamp
- **Field-level Encryption** — PII encrypted at rest with Fernet
- **2FA** — TOTP-based two-factor authentication
- **Role-based Access** — Owner, admin, member roles
- **Backup & Restore** — Automated database backups with retention policy
- **Vendor/Client Portals** — Self-service access for vendors and clients
- **Inventory Management** — Stock, lots, serial numbers, valuations
- **Project Accounting** — Job costing, time tracking, project billing
- **Fixed Assets** — Depreciation schedules, asset lifecycle
- **Multi-company** — Consolidated reporting across entities
- **Tax Compliance** — TDS, GST/VAT, tax rules engine, tax calendar
- **CRM** — Contact management with activity notes and email integration
- **Document Management** — AI-powered OCR, version control, templates

### Security

- All secrets loaded from environment variables — never hardcoded
- bcrypt password hashing via passlib
- HS256 JWT tokens with configurable expiry
- Rate limiting on auth endpoints (10 req/min)
- CORS restricted in production
- Field-level Fernet encryption for PII
- Automated audit logging on all model mutations
- TOTP 2FA support

### Infrastructure

- Full Docker Compose stack (PostgreSQL + FastAPI + React/nginx)
- GitHub Actions CI (lint, test, typecheck, build, security scan)
- Gitleaks secret scanning
- Bandit Python security scanning
- Dependabot for automated dependency updates
- Pre-commit hooks for code quality
- Production CLI (`receiptai`) with admin commands

[1.0.0]: https://github.com/lokeshgoyal/receiptai/releases/tag/v1.0.0
