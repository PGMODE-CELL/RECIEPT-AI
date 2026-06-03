# ReceiptAI

**Open-source accounting & invoicing platform** — manage invoices, bills, expenses, payments, payroll, and banking in one place. Built with FastAPI + React.

![Python](https://img.shields.io/badge/python-3.12-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-green)
![React](https://img.shields.io/badge/react-19-61DAFB)
![TypeScript](https://img.shields.io/badge/typescript-5.7-3178C6)
![License](https://img.shields.io/badge/license-MIT-green)
[![CI](https://github.com/lokeshgoyal/receiptai/actions/workflows/ci.yml/badge.svg)](https://github.com/lokeshgoyal/receiptai/actions/workflows/ci.yml)
[![Docker](https://img.shields.io/badge/docker-ready-blue?logo=docker)](https://github.com/lokeshgoyal/receiptai/pkgs/container/receiptai)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

---

## Features

- **Invoicing** — Create, send, and track invoices with PDF generation
- **Bills & Expenses** — Record bills, scan receipts via OCR, track payables
- **Banking** — Connect bank feeds, reconcile transactions, manage accounts
- **Payroll** — Run payroll, calculate deductions, generate pay slips
- **Estimates** — Create quotes and convert to invoices
- **Contacts** — Manage customers, vendors, and employees
- **Payments** — Accept payments via Stripe, track payment history
- **Multi-currency** — Support for USD, EUR, INR, GBP, JPY
- **Audit Logging** — Every mutation is logged with user, IP, and timestamp
- **Field-level Encryption** — PII (email, phone, tax IDs, bank details) encrypted at rest
- **2FA** — Time-based one-time password (TOTP) authentication
- **Role-based Access** — Owner, admin, member roles per organization
- **Backup & Restore** — Automated database backups with retention policy
- **Vendor/Client Portals** — Self-service access for vendors and clients
- **100+ Reports** — P&L, balance sheet, trial balance, cash flow, aging, budgets, and more
- **Inventory Management** — Track stock, lots, serial numbers, valuations
- **Project Accounting** — Job costing, time tracking, project billing
- **Fixed Assets** — Depreciation schedules, asset lifecycle management
- **Multi-company** — Consolidated reporting across multiple entities
- **Tax Compliance** — TDS, GST/VAT, tax rules engine, tax calendar
- **CRM** — Contact management with activity notes and email integration
- **Document Management** — AI-powered OCR, version control, templates

## Why ReceiptAI?

| Feature | ReceiptAI | Invoice Ninja | Crater | Frappe Books |
|---|---|---|---|---|
| **Open source** | ✅ MIT | ✅ Elastic | ✅ MIT | ✅ GPL |
| **Self-hosted** | ✅ | ✅ | ✅ | ✅ |
| **FastAPI backend** | ✅ | ❌ (PHP/Laravel) | ❌ (PHP/Laravel) | ❌ (Python/ Flask) |
| **React frontend** | ✅ (shadcn/ui) | ❌ (Flutter) | ❌ (Vue) | ❌ (Electron) |
| **PII encryption** | ✅ (Fernet) | ❌ | ❌ | ❌ |
| **Audit logging** | ✅ (auto, per-model) | ❌ | ❌ | ❌ |
| **2FA** | ✅ (TOTP) | ✅ | ❌ | ❌ |
| **Multi-currency** | ✅ (5 currencies) | ✅ | ✅ | ❌ |
| **Payroll** | ✅ | ❌ | ❌ | ❌ |
| **Bank reconciliation** | ✅ | ✅ | ✅ | ❌ |
| **Field-level encryption** | ✅ | ❌ | ❌ | ❌ |
| **CI/CD pipeline** | ✅ (GitHub Actions) | ❌ | ❌ | ❌ |
| **Docker Compose** | ✅ (full stack) | ✅ | ✅ | ❌ |
| **Rate limiting** | ✅ | ✅ | ❌ | ❌ |
| **API docs (Swagger)** | ✅ (auto) | ✅ | ✅ | ❌ |
| **Backup automation** | ✅ | ❌ | ❌ | ❌ |
| **Stripe payments** | ✅ | ✅ | ✅ | ❌ |
| **Vendor/client portal** | ✅ | ✅ | ❌ | ❌ |

## Architecture

```
receiptai/
├── huh/backend/          # FastAPI Python backend
│   ├── app/
│   │   ├── models/       # SQLAlchemy ORM models
│   │   ├── routes/       # API route handlers
│   │   ├── schemas/      # Pydantic request/response schemas
│   │   ├── services/     # Business logic layer
│   │   └── ...           # Middleware, auth, encryption, audit
│   ├── alembic/          # Database migrations
│   └── tests/            # Pytest test suite
├── app/app/              # React + TypeScript frontend
│   ├── src/
│   │   ├── components/   # Reusable UI components (shadcn/ui)
│   │   ├── pages/        # Route page components
│   │   ├── lib/          # API client, utilities
│   │   └── providers/    # React context providers
│   └── ...
└── docs/                 # Documentation
```

## Quick Start

### Prerequisites

- Python 3.12+
- Node.js 20+
- npm 10+

### Backend

```bash
cd huh/backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
# source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env   # Edit .env with your settings
python -m uvicorn main:app --reload --port 5000
```

### Frontend

```bash
cd app/app
npm install
cp .env.example .env   # Edit .env if needed
npm run dev            # Starts on http://localhost:4200
```

### Database

The app uses SQLite by default for development. For production, set `DATABASE_URL` to your PostgreSQL connection string in `.env`.

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `SECRET_KEY` | Yes | — | JWT signing secret (generate with `openssl rand -hex 32`) |
| `ENCRYPTION_KEY` | Yes | — | Fernet key for PII encryption (generate with `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`) |
| `DATABASE_URL` | No | `sqlite:///./receipt_ai.db` | Database connection string |
| `CORS_ORIGINS` | No | `http://localhost:3000,...` | Comma-separated allowed origins |
| `STRIPE_API_KEY` | No | — | Stripe secret key for payment processing |
| `STRIPE_WEBHOOK_SECRET` | No | — | Stripe webhook signing secret |
| `ENVIRONMENT` | No | `development` | Set to `production` for production mode |
| `VITE_API_URL` | No | `http://localhost:5000` | Backend URL (frontend .env) |

## API Documentation

When the backend is running, interactive API docs are available at:

- **Swagger UI**: http://localhost:5000/docs
- **ReDoc**: http://localhost:5000/redoc

### Key Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/forgot-password` | Request password reset |
| POST | `/api/auth/reset-password` | Reset password with token |
| GET | `/api/setup/countries` | List supported countries |
| POST | `/api/setup/create` | Create an organization |
| GET | `/api/contacts` | List contacts |
| POST | `/api/contacts/create` | Create a contact |
| GET | `/api/invoices/list` | List invoices |
| POST | `/api/invoices/create` | Create an invoice |
| GET | `/api/reports/{org_id}/dashboard` | Dashboard stats |

## Security

- **No secrets in code** — All keys are loaded from environment variables
- **PII encryption** — Email, phone, tax IDs, bank details encrypted with Fernet
- **Password hashing** — bcrypt via `passlib`
- **JWT authentication** — HS256 tokens with configurable expiry
- **Rate limiting** — Auth endpoints limited to 10 req/min per IP
- **CORS** — Restricted to configured origins in production
- **Audit trail** — All create/update/delete operations logged
- **2FA** — Optional TOTP-based two-factor authentication

## Testing

```bash
# Backend
cd huh/backend
pytest tests/ -v

# Frontend (if tests configured)
cd app/app
npx vitest run
```

## Deployment

### One-Click Deploy

| Platform | Button |
|---|---|
| **Docker** (any VPS) | `docker compose up --build` |
| **Railway** | [![Deploy on Railway](https://img.shields.io/badge/Railway-Deploy-0B0D0E?logo=railway)](https://railway.com/template/receiptai) |
| **Render** | [![Deploy to Render](https://img.shields.io/badge/Render-Deploy-46E3B7?logo=render)](https://render.com/deploy?repo=https://github.com/lokeshgoyal/receiptai) |
| **Fly.io** | [![Deploy on Fly](https://img.shields.io/badge/Fly.io-Deploy-24175C?logo=fly)](https://fly.io/launch/github/lokeshgoyal/receiptai) |

### Docker (Production)

```bash
# Clone and deploy
git clone https://github.com/lokeshgoyal/receiptai.git
cd receiptai

# Set required secrets
export SECRET_KEY=$(openssl rand -hex 32)
export ENCRYPTION_KEY=$(python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")

# Launch full stack
docker compose up --build -d
```

### Manual (Production)

1. Set `ENVIRONMENT=production` in `.env`
2. Generate and set `SECRET_KEY` and `ENCRYPTION_KEY`
3. Configure `CORS_ORIGINS` with your domain
4. Start the backend: `uvicorn main:app --host 0.0.0.0 --port 5000 --workers 4`
5. Build the frontend: `cd app/app && npm run build`
6. Serve `dist/public/` via nginx or a CDN

## CI/CD

Every commit is automatically:

- ✅ **Linted** — Ruff (Python), ESLint (TypeScript)
- ✅ **Type-checked** — `tsc --noEmit`
- ✅ **Tested** — 52+ backend tests with pytest
- ✅ **Security-scanned** — Bandit (Python), Gitleaks (secrets)
- ✅ **Docker-built** — Compose build verified

Status: [![CI](https://github.com/lokeshgoyal/receiptai/actions/workflows/ci.yml/badge.svg)](https://github.com/lokeshgoyal/receiptai/actions/workflows/ci.yml)

## License

[MIT](LICENSE)

## Community

- [CONTRIBUTING.md](CONTRIBUTING.md) — How to contribute
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) — Community guidelines
- [SECURITY.md](SECURITY.md) — Reporting vulnerabilities
- [Issues](https://github.com/lokeshgoyal/receiptai/issues) — Bug reports & feature requests
