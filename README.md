# ReceiptAI

**Open-source accounting & invoicing platform** — manage invoices, bills, expenses, payments, payroll, and banking in one place. Built with FastAPI + React.

![Python](https://img.shields.io/badge/python-3.12-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-green)
![React](https://img.shields.io/badge/react-19-61DAFB)
![TypeScript](https://img.shields.io/badge/typescript-5.7-3178C6)
![License](https://img.shields.io/badge/license-MIT-green)

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

### Docker

```bash
# Build and run with Docker Compose
docker-compose up --build
```

### Manual

1. Set `ENVIRONMENT=production` in `.env`
2. Set `SECRET_KEY`, `ENCRYPTION_KEY`, and `CORS_ORIGINS`
3. Use a production ASGI server: `uvicorn main:app --host 0.0.0.0 --port 5000 --workers 4`
4. Serve the frontend build from `app/app/dist/public/` or via a CDN

## License

[MIT](LICENSE)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Security

Report vulnerabilities to security@receiptai.dev — see [SECURITY.md](SECURITY.md).
