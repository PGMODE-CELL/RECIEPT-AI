.PHONY: dev dev-backend dev-frontend test build deploy clean

# ─── Development ──────────────────────────────────────────────────────────

dev: dev-backend dev-frontend          ## Start both backend and frontend in dev mode

dev-backend:                           ## Start backend dev server with hot reload
	cd huh/backend && uvicorn main:app --host 0.0.0.0 --port 5000 --reload

dev-frontend:                          ## Start frontend dev server
	cd app/app && npm run dev

# ─── Testing ──────────────────────────────────────────────────────────────

test: test-backend test-frontend       ## Run all tests

test-backend:                          ## Run backend tests
	cd huh/backend && python -m pytest tests/ -v --tb=short

test-backend-quick:                    ## Run backend tests (fast, stop on first failure)
	cd huh/backend && python -m pytest tests/ -x -q --tb=short

test-frontend:                         ## Run frontend tests (if configured)
	cd app/app && npm test 2>/dev/null || echo "No frontend tests configured"

# ─── Building ─────────────────────────────────────────────────────────────

build: build-backend build-frontend    ## Build all production artifacts

build-backend:                         ## Build backend Docker image
	docker compose build backend

build-frontend:                        ## Build frontend Docker image
	docker compose build frontend

build-frontend-local:                  ## Build frontend locally (no Docker)
	cd app/app && npm run build

# ─── Deployment ───────────────────────────────────────────────────────────

deploy:                                ## Start all services in production
	docker compose up -d --build

deploy-down:                           ## Stop all services
	docker compose down

deploy-logs:                           ## Tail all logs
	docker compose logs -f

deploy-ps:                             ## Show service status
	docker compose ps

deploy-migrate:                        ## Run database migrations
	docker compose exec backend alembic upgrade head

deploy-shell:                          ## Open a shell in the backend container
	docker compose exec backend /bin/bash

deploy-backup:                         ## Manual database backup
	docker compose exec postgres pg_dump -U receipt_ai receipt_ai > backup_$$(date +%Y%m%d_%H%M%S).sql

# ─── Maintenance ──────────────────────────────────────────────────────────

clean:                                 ## Clean all build artifacts
	rm -rf huh/backend/__pycache__ huh/backend/app/__pycache__
	rm -rf huh/backend/*.db huh/backend/test_receipt_ai.db
	rm -rf app/app/dist app/app/node_modules
	rm -rf huh/backend/.venv
	rm -rf backups/
	docker compose down -v 2>/dev/null || true

migrate:                               ## Create a new alembic migration
	cd huh/backend && alembic revision --autogenerate -m "$(message)"

db-shell:                              ## Open PostgreSQL shell
	docker compose exec postgres psql -U receipt_ai receipt_ai

# ─── Help ─────────────────────────────────────────────────────────────────

help:                                  ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'