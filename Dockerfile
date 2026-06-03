FROM python:3.12-slim

WORKDIR /app

COPY render_requirements.txt .
RUN pip install --no-cache-dir -r render_requirements.txt

COPY huh/backend/ .

ENV PYTHONPATH=/app
EXPOSE 5000

CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-5000}
