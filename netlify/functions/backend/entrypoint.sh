#!/bin/bash
set -euo pipefail

# Receipt AI — Production entrypoint
# Runs database migrations, then starts uvicorn

echo "=== Receipt AI Entrypoint ==="
echo "Environment: ${ENVIRONMENT:-development}"

# Run database migrations
echo "Running database migrations..."
if alembic upgrade head 2>/dev/null; then
    echo "Migrations applied successfully."
else
    echo "Warning: Migrations failed (possibly first run or no migrations yet)."
    echo "Attempting auto-create tables via init_db..."
    python -c "
import asyncio
from app.database_async import init_db
asyncio.run(init_db())
print('Tables created successfully.')
" || echo "Warning: Table creation skipped (may already exist)."
fi

# Start the application
echo "Starting uvicorn on 0.0.0.0:${PORT:-5000}..."
exec uvicorn main:app \
    --host 0.0.0.0 \
    --port "${PORT:-5000}" \
    --workers "${UVICORN_WORKERS:-4}" \
    --proxy-headers \
    --forwarded-allow-ips "*" \
    --limit-concurrency "${UVICORN_CONCURRENCY:-1000}" \
    --backlog "${UVICORN_BACKLOG:-2048}" \
    --timeout-keep-alive 30