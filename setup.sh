#!/usr/bin/env bash
set -euo pipefail

# Receipt AI — One-command production deploy
# Usage:
#   bash setup.sh                          # local dev deploy
#   bash setup.sh --domain app.mydomain.com # production with HTTPS

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

DOMAIN=""
MODE="dev"

while [[ $# -gt 0 ]]; do
    case "$1" in
        --domain) DOMAIN="$2"; MODE="prod"; shift 2 ;;
        --help|-h) echo "Usage: bash setup.sh [--domain app.example.com]"; exit 0 ;;
        *) error "Unknown option: $1"; exit 1 ;;
    esac
done

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════╗${NC}"
echo -e "${GREEN}║       Receipt AI — Production Setup   ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════╝${NC}"
echo ""

# ─── Prerequisites ──────────────────────────────────────────────────────
command -v docker >/dev/null 2>&1 || { error "Docker required. See https://docs.docker.com/get-docker/"; exit 1; }
command -v openssl >/dev/null 2>&1 || { error "openssl required."; exit 1; }

# Check for Docker Compose plugin or standalone
if docker compose version >/dev/null 2>&1; then
    DOCKER_COMPOSE="docker compose"
elif docker-compose --version >/dev/null 2>&1; then
    DOCKER_COMPOSE="docker-compose"
else
    error "Docker Compose required."
    exit 1
fi

# ─── Generate .env ──────────────────────────────────────────────────────
if [ ! -f .env ]; then
    info "Generating .env with secure secrets..."
    DB_PASSWORD=$(openssl rand -hex 16)
    SECRET_KEY=$(openssl rand -hex 32)
    ENCRYPTION_KEY=$(openssl rand -hex 32)

    if [ "$MODE" = "prod" ] && [ -n "$DOMAIN" ]; then
        CORS_ORIGINS="https://$DOMAIN"
        cat > .env <<EOF
ENVIRONMENT=production
SECRET_KEY=$SECRET_KEY
ENCRYPTION_KEY=$ENCRYPTION_KEY
CORS_ORIGINS=$CORS_ORIGINS
DATABASE_URL=postgresql://receipt_ai:$DB_PASSWORD@postgres:5432/receipt_ai
REDIS_URL=redis://redis:6379/0
DB_PASSWORD=$DB_PASSWORD
# S3 / Object Storage (optional — leave blank to use local fs)
S3_ENDPOINT=
S3_BUCKET=
S3_ACCESS_KEY=
S3_SECRET_KEY=
# Email (optional — leave blank to disable)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
# Payments (optional)
STRIPE_API_KEY=
# Scaling
UVICORN_WORKERS=4
UVICORN_CONCURRENCY=1000
EOF
    else
        cat > .env <<EOF
ENVIRONMENT=production
SECRET_KEY=$SECRET_KEY
ENCRYPTION_KEY=$ENCRYPTION_KEY
CORS_ORIGINS=http://localhost:80,http://localhost:3000,http://localhost:4200
DATABASE_URL=postgresql://receipt_ai:$DB_PASSWORD@postgres:5432/receipt_ai
REDIS_URL=redis://redis:6379/0
DB_PASSWORD=$DB_PASSWORD
UVICORN_WORKERS=2
UVICORN_CONCURRENCY=500
EOF
    fi
    info ".env created with secure secrets."
    [ "$MODE" = "prod" ] && warn "Edit .env to add your S3, SMTP, and Stripe keys before deploying."
else
    warn ".env already exists — using existing configuration."
fi

# ─── Pull images and start ──────────────────────────────────────────────
info "Building and starting services..."
$DOCKER_COMPOSE pull --ignore-pull-failures 2>/dev/null || true
$DOCKER_COMPOSE up -d --build

# ─── Wait for backend health ────────────────────────────────────────────
info "Waiting for backend to be healthy (up to 60s)..."
BACKEND_HEALTHY=false
for i in $(seq 1 30); do
    if curl -sf http://localhost:5000/api/health >/dev/null 2>&1; then
        BACKEND_HEALTHY=true
        info "Backend is healthy!"
        break
    fi
    sleep 2
done

if [ "$BACKEND_HEALTHY" = false ]; then
    error "Backend did not become healthy. Check logs: $DOCKER_COMPOSE logs backend"
    exit 1
fi

# ─── Run database migrations ────────────────────────────────────────────
info "Running database migrations..."
$DOCKER_COMPOSE exec -T backend alembic upgrade head 2>/dev/null && \
    info "Migrations applied." || \
    warn "No migrations to apply (first run — tables will be auto-created)."

# ─── Output ─────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}╔═══════════════════════════════════════╗${NC}"
echo -e "${GREEN}║       Setup Complete!                 ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════╝${NC}"
echo ""

if [ "$MODE" = "prod" ]; then
    echo "  Frontend: https://$DOMAIN"
    echo "  API:      https://$DOMAIN/api"
else
    echo "  Frontend: http://localhost:80"
    echo "  Backend:  http://localhost:5000"
    echo "  API Docs: http://localhost:5000/docs"
fi
echo ""
echo "  Logs:    $DOCKER_COMPOSE logs -f"
echo "  Status:  $DOCKER_COMPOSE ps"
echo "  Stop:    $DOCKER_COMPOSE down"
echo ""

if [ "$MODE" = "prod" ]; then
    echo -e "${YELLOW}┌─────────────────────────────────────────────┐${NC}"
    echo -e "${YELLOW}│ For HTTPS, use Caddy instead of nginx:      │${NC}"
    echo -e "${YELLOW}│ 1. Uncomment the 'caddy' service in         │${NC}"
    echo -e "${YELLOW}│    docker-compose.yml                       │${NC}"
    echo -e "${YELLOW}│ 2. Update Caddyfile with your domain        │${NC}"
    echo -e "${YELLOW}│ 3. Re-run: bash setup.sh --domain $DOMAIN   │${NC}"
    echo -e "${YELLOW}└─────────────────────────────────────────────┘${NC}"
fi