param($Port=5001)
$Log = "$PSScriptRoot\tunnel_live.log"
$pid > "$PSScriptRoot\tunnel.pid"

function Log { param($m) "$(Get-Date -Format 'HH:mm:ss') $m" | Out-File $Log -Append }

Log "Starting backend on port $Port..."

# Remove old DB
Remove-Item -Force "$PSScriptRoot\..\receipt_ai.db" -ErrorAction SilentlyContinue

# Start uvicorn
$bk = Start-Process -NoNewWindow -FilePath python -ArgumentList "-m uvicorn main:app --port $Port --host 0.0.0.0" -WorkingDirectory "$PSScriptRoot\..\huh\backend" -PassThru
Log "Backend PID: $($bk.Id)"

Start-Sleep -Seconds 5

# Start SSH tunnel
Log "Starting tunnel..."
$tn = Start-Process -NoNewWindow -FilePath ssh -ArgumentList "-o StrictHostKeyChecking=no -o ServerAliveInterval=30 -R 80:127.0.0.1:$Port nokey@localhost.run" -PassThru
Log "Tunnel PID: $($tn.Id)"

# Keep alive
while ($true) {
    Start-Sleep -Seconds 60
    try {
        $r = Invoke-RestMethod -Uri "http://localhost:$Port/api/health" -ErrorAction Stop
        Log "Health: $($r.status)"
    } catch {
        Log "Backend dead. Exiting."
        $bk.Kill(); $tn.Kill(); exit 1
    }
}
