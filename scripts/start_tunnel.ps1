$url = ""
ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=30 -R 80:localhost:5000 nokey@localhost.run 2>&1 | ForEach-Object {
    if ($_ -match "https://([a-z0-9]+)\.lhr\.life") {
        $url = "https://" + $matches[0]
        $url | Out-File "tunnel_url.txt"
    }
    Write-Host $_
}
