param([switch]$Dev)

$Repo = "https://github.com/PGMODE-CELL/RECIEPT-AI.git"
$Dir = "receiptai"

Write-Host "⚡ ReceiptAI — One-Click Install" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

# Check deps
$missing = @()
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { $missing += "git" }
if (-not (Get-Command python -ErrorAction SilentlyContinue)) { $missing += "python" }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { $missing += "node (v20+)" }
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { $missing += "npm" }
if ($missing.Count -gt 0) { Write-Host "❌ Missing: $($missing -join ', ')"; exit 1 }

Write-Host "✓ Dependencies found" -ForegroundColor Green

# Clone
if (Test-Path $Dir) {
  Write-Host "📂 Directory $Dir exists — pulling latest..."
  Push-Location $Dir; git pull; Pop-Location
} else {
  Write-Host "📦 Cloning ReceiptAI..."
  git clone --depth=1 $Repo
}

Set-Location $Dir

# Backend
Write-Host "🔄 Setting up backend..."
Push-Location huh\backend
python -m venv .venv
& ".\.venv\Scripts\pip.exe" install -q -r requirements.txt
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
Pop-Location
Write-Host "✓ Backend ready" -ForegroundColor Green

# Frontend
Write-Host "🔄 Setting up frontend..."
Push-Location app\app
npm install --silent
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
Pop-Location
Write-Host "✓ Frontend ready" -ForegroundColor Green

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "✅ ReceiptAI installed!" -ForegroundColor Green
Write-Host ""
Write-Host "Start backend:  cd $Dir\huh\backend && .\.venv\Scripts\activate && uvicorn main:app --reload --port 5000"
Write-Host "Start frontend: cd $Dir\app\app && npm run dev"
Write-Host ""
Write-Host "Or use Docker:  docker compose up --build"
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
