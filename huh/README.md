# ReceiptAI — Backend

FastAPI + SQLAlchemy + SQLite/PostgreSQL backend for the ReceiptAI accounting platform.

## Tech Stack

- **Runtime**: Python 3.12+
- **Framework**: FastAPI 0.115
- **ORM**: SQLAlchemy 2.0 (async)
- **Database**: SQLite (dev) / PostgreSQL (prod)
- **Auth**: JWT (HS256) + bcrypt + TOTP 2FA
- **Migrations**: Alembic
- **Tests**: pytest + anyio (async)
- **Security**: Fernet PII encryption, rate limiting, CORS, CSP, HSTS

## Getting Started

```bash
python -m venv .venv
# .venv\Scripts\activate (Windows) or source .venv/bin/activate (macOS/Linux)
pip install -r requirements.txt
cp .env.example .env
python -m uvicorn main:app --reload --port 5000
```

## Structure

```
app/
├── models/        # SQLAlchemy ORM models (57 models)
├── routes/        # API route handlers (65+ files)
├── schemas/       # Pydantic request/response schemas
├── services/      # Business logic layer
└── ...            # Middleware, auth, encryption, audit
```

## Tests

```bash
pytest tests/ -v    # 52 tests
```
