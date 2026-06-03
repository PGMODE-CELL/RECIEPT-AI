param([switch]$Dev)

$Repo = "https://github.com/PGMODE-CELL/RECIEPT-AI.git"
$Dir = "receiptai"

Write-Host "⚡ ReceiptAI — One-Click Install" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

$missing = @()
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { $missing += "git" }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { $missing += "node (v20+)" }
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { $missing += "npm" }
if ($missing.Count -gt 0) { Write-Host "❌ Missing: $($missing -join ', ')"; exit 1 }

Write-Host "✓ Dependencies found" -ForegroundColor Green

if (Test-Path $Dir) {
  Write-Host "📂 Directory $Dir exists — pulling latest..."
  Push-Location $Dir; git pull; Pop-Location
} else {
  Write-Host "📦 Cloning ReceiptAI..."
  git clone --depth=1 $Repo
}

Set-Location $Dir

Write-Host "🔄 Setting up..."
Push-Location app\app
npm install
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
Pop-Location

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "✅ ReceiptAI installed!" -ForegroundColor Green
Write-Host ""
Write-Host "Start dev server:  cd $Dir\app\app && npm run dev"
Write-Host "Build for production: cd $Dir\app\app && npm run build && npm start"
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
