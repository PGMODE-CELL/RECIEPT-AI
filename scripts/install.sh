#!/usr/bin/env bash
set -euo pipefail

REPO="https://github.com/PGMODE-CELL/RECIEPT-AI.git"
DIR="receiptai"

echo "⚡ ReceiptAI — One-Click Install"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check deps
command -v git >/dev/null 2>&1 || { echo "❌ git required"; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo "❌ python3 required"; exit 1; }
command -v node >/dev/null 2>&1 || { echo "❌ node required (v20+)"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ npm required"; exit 1; }

echo "✓ Dependencies found"

# Clone
if [ -d "$DIR" ]; then
  echo "📂 Directory $DIR exists — pulling latest..."
  cd "$DIR" && git pull
else
  echo "📦 Cloning ReceiptAI..."
  git clone --depth=1 "$REPO" && cd "$DIR"
fi

# Backend setup
echo "🔄 Setting up backend..."
cd huh/backend
python3 -m venv .venv 2>/dev/null || python -m venv .venv
source .venv/bin/activate 2>/dev/null || source .venv/Scripts/activate
pip install -q -r requirements.txt
cp -n .env.example .env 2>/dev/null || true
echo "✓ Backend ready"

# Frontend setup
echo "🔄 Setting up frontend..."
cd ../../app/app
npm install --silent
cp -n .env.example .env 2>/dev/null || true
echo "✓ Frontend ready"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ ReceiptAI installed!"
echo ""
echo "Start backend:  cd $(pwd)/../../huh/backend && source .venv/bin/activate && uvicorn main:app --reload --port 5000"
echo "Start frontend: cd $(pwd) && npm run dev"
echo ""
echo "Or use Docker:  docker compose up --build"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
