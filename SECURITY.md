# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability, please do **not** open a public issue.

Instead, send a report to **[security@receiptai.dev](mailto:security@receiptai.dev)** with:

- A description of the vulnerability
- Steps to reproduce
- Potential impact

You should receive a response within 48 hours. If the issue is confirmed, we will release a patch as soon as possible.

## Security Practices

- All secrets and keys are loaded from environment variables — never hardcoded
- PII fields (email, phone, tax ID, bank details) are encrypted at rest using Fernet
- Passwords are hashed with bcrypt
- JWT tokens use HS256 with a server-side secret
- Rate limiting is enforced on auth endpoints
- CORS is restricted in production
- SQL injection is prevented via SQLAlchemy ORM parameterized queries
- Audit logging captures all model mutations for traceability
