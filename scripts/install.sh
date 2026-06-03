#!/usr/bin/env bash
set -euo pipefail

REPO="https://github.com/PGMODE-CELL/RECIEPT-AI.git"
DIR="receiptai"

echo "⚡ ReceiptAI — One-Click Install"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

command -v git >/dev/null 2>&1 || { echo "❌ git required"; exit 1; }
command -v node >/dev/null 2>&1 || { echo "❌ node required (v20+)"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ npm required"; exit 1; }

echo "✓ Dependencies found"

if [ -d "$DIR" ]; then
  echo "📂 Directory $DIR exists — pulling latest..."
  cd "$DIR" && git pull
else
  echo "📦 Cloning ReceiptAI..."
  git clone --depth=1 "$REPO" && cd "$DIR"
fi

echo "🔄 Setting up..."
cd app/app
npm install
cp -n .env.example .env 2>/dev/null || true

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ ReceiptAI installed!"
echo ""
echo "Start dev server:  cd $DIR/app/app && npm run dev"
echo "Build for production: cd $DIR/app/app && npm run build && npm start"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
