FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev libffi-dev && \
    rm -rf /var/lib/apt/lists/*

COPY requirements-render.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
COPY huh/backend/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENV PYTHONPATH=/app/huh/backend
ENV ENVIRONMENT=production

EXPOSE 5000

ENTRYPOINT ["/entrypoint.sh"]
