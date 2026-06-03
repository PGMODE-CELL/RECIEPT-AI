FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev curl && \
    rm -rf /var/lib/apt/lists/*

COPY huh/backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY huh/backend/ .
COPY huh/backend/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENV PYTHONPATH=/app
ENV ENVIRONMENT=production

EXPOSE 5000

ENTRYPOINT ["/entrypoint.sh"]
