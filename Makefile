# ReceiptAI Development Makefile

.PHONY: help install dev-backend dev-frontend dev test-backend test-frontend test lint-backend lint-frontend lint typecheck format build-docker db-init db-migrate db-upgrade db-reset backup health clean

BACKEND_DIR := huh/backend
FRONTEND_DIR := app/app

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

install: ## Install all dependencies
	cd $(BACKEND_DIR) && pip install -r requirements.txt
	cd $(FRONTEND_DIR) && npm install

dev-backend: ## Start backend dev server
	cd $(BACKEND_DIR) && uvicorn main:app --reload --host 0.0.0.0 --port 5000

dev-frontend: ## Start frontend dev server
	cd $(FRONTEND_DIR) && npm run dev

dev: ## Start both backend and frontend
	@echo "Open two terminals and run 'make dev-backend' and 'make dev-frontend'"

test-backend: ## Run backend tests
	cd $(BACKEND_DIR) && pytest tests/ -v --timeout=30

test-frontend: ## Run frontend tests
	cd $(FRONTEND_DIR) && npx vitest run

test: test-backend test-frontend ## Run all tests

lint-backend: ## Lint Python code
	cd $(BACKEND_DIR) && ruff check app/ tests/

lint-frontend: ## Lint TypeScript code
	cd $(FRONTEND_DIR) && npx eslint src/

lint: lint-backend lint-frontend ## Lint all code

typecheck: ## TypeScript type check
	cd $(FRONTEND_DIR) && npx tsc --noEmit

format: ## Format all code
	cd $(BACKEND_DIR) && ruff format app/ tests/
	cd $(FRONTEND_DIR) && npx prettier --write src/

build-docker: ## Build Docker images
	docker compose build

db-init: ## Initialize database
	cd $(BACKEND_DIR) && python -m app.cli db init

db-migrate: ## Create new migration
	cd $(BACKEND_DIR) && python -m app.cli db migrate "$(msg)"

db-upgrade: ## Apply migrations
	cd $(BACKEND_DIR) && python -m app.cli db upgrade

db-reset: ## Reset database (dev only)
	cd $(BACKEND_DIR) && python -m app.cli db reset

backup: ## Create database backup
	cd $(BACKEND_DIR) && python -m app.cli backup create

health: ## Run health checks
	cd $(BACKEND_DIR) && python -m app.cli health

clean: ## Clean generated files
	cd $(BACKEND_DIR) && find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	cd $(FRONTEND_DIR) && rm -rf dist/ 2>/dev/null || true
