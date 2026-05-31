# Contributing

Thank you for considering contributing to ReceiptAI!

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/receiptai.git`
3. Set up the development environment (see README.md)
4. Create a feature branch: `git checkout -b feat/my-feature`

## Development Workflow

### Backend

```bash
cd huh/backend
python -m venv .venv && .venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 5000
```

### Frontend

```bash
cd app/app
npm install
npm run dev
```

### Code Style

- **Python**: Follow PEP 8. Run `ruff check .` before committing.
- **TypeScript**: Run `npx tsc --noEmit` to type-check. Follow the existing patterns.
- **No commented-out code** — delete it.
- **No hardcoded secrets** — use environment variables.

### Testing

```bash
# Backend tests
cd huh/backend
pytest tests/ -v

# Frontend tests
cd app/app
npx vitest run
```

### Commit Messages

Use conventional commits:

```
feat: add bank reconciliation module
fix: resolve invoice PDF generation crash
docs: update API endpoint examples
refactor: extract payment gateway logic
```

## Pull Request Process

1. Ensure all tests pass
2. Update documentation if needed
3. Add a changeset if your change is user-facing
4. Request review from a maintainer

## Code of Conduct

Be respectful, inclusive, and constructive. We welcome contributors of all backgrounds.
