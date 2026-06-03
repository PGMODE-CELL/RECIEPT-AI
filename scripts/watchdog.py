import subprocess, time, re, json, urllib.request, urllib.error, sys, os, ssl, signal

PORT = 5000
WORK = r"C:\Users\lokeshgoyal\Desktop\123"
LOG = os.path.join(WORK, "tunnel_watchdog.log")

def log(m):
    msg = f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] {m}"
    print(msg, flush=True)
    with open(LOG, "a") as f: f.write(msg + "\n")

def wait_for_backend(port, timeout=20):
    for i in range(timeout):
        try:
            r = urllib.request.urlopen(f"http://127.0.0.1:{port}/api/health", timeout=2)
            return json.loads(r.read()).get("status") == "healthy"
        except: time.sleep(1)
    return False

def get_tunnel_url(port, timeout=30):
    tn = subprocess.Popen(["ssh", "-o", "StrictHostKeyChecking=no", "-o", "ServerAliveInterval=30",
        "-R", f"80:127.0.0.1:{port}", "nokey@localhost.run"],
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1)
    for i in range(timeout):
        l = tn.stdout.readline()
        m = re.search(r"(https://[a-z0-9]+\.lhr\.life)", l or "")
        if m:
            return tn, m.group(0)
        if i == timeout - 1: time.sleep(1)
    tn.kill()
    return None, None

os.chdir(WORK)
log("=== WATCHDOG STARTED ===")

while True:
    import urllib.error
    # Kill backend using netstat
    try:
        out = subprocess.run(["netstat", "-ano"], capture_output=True, text=True).stdout
        for line in out.split("\n"):
            if f":{PORT}" in line and "LISTENING" in line:
                pid = line.strip().split()[-1]
                subprocess.run(["taskkill", "/F", "/PID", pid], capture_output=True)
    except: pass
    time.sleep(1)
    
    # Start backend
    bk = subprocess.Popen([sys.executable, "-m", "uvicorn", "main:app", "--port", str(PORT), "--host", "0.0.0.0"],
        cwd=os.path.join(WORK, "huh", "backend"), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    
    if not wait_for_backend(PORT):
        log("Backend failed to start")
        bk.kill()
        time.sleep(5)
        continue
    log("Backend started")

    tn, url = get_tunnel_url(PORT)
    if not url:
        log("Tunnel failed")
        bk.kill()
        time.sleep(5)
        continue
    log(f"Tunnel: {url}")

    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    # Verify tunnel
    ok = False
    for i in range(5):
        try:
            r = urllib.request.urlopen(f"{url}/api/health", timeout=10, context=ctx)
            log(f"Tunnel test: {json.loads(r.read())}")
            ok = True; break
        except Exception as e:
            log(f"Tunnel retry {i}: {str(e)[:60]}")
            time.sleep(3)
    
    if not ok:
        log("Tunnel not forwarding")
        bk.kill(); tn.kill(); time.sleep(5); continue

    # Register/login
    data = json.dumps({"email":"admin@demo.com","password":"admin123","full_name":"Admin"}).encode()
    try:
        r = urllib.request.urlopen(urllib.request.Request(f"{url}/api/auth/register", data, {"Content-Type":"application/json"}), timeout=10, context=ctx)
        tok = json.loads(r.read())["token"]
    except urllib.error.HTTPError:
        data = json.dumps({"email":"admin@demo.com","password":"admin123"}).encode()
        r = urllib.request.urlopen(urllib.request.Request(f"{url}/api/auth/login", data, {"Content-Type":"application/json"}), timeout=10, context=ctx)
        tok = json.loads(r.read())["token"]
    log(f"Auth: {tok[:15]}...")

    # Update netlify.toml
    with open(os.path.join(WORK, "netlify.toml")) as f: c = f.read()
    c = re.sub(r"https://[a-z0-9]+\.lhr\.life", url, c)
    with open(os.path.join(WORK, "netlify.toml"), "w") as f: f.write(c)
    
    subprocess.run(["git", "add", "-A"], cwd=WORK, capture_output=True)
    subprocess.run(["git", "commit", "-m", f"tunnel: {url}"], cwd=WORK, capture_output=True)
    subprocess.run(["git", "push"], cwd=WORK, capture_output=True)
    log("Pushed to GitHub")

    log("=== LIVE ===")
    log(f"App: https://recieptsoftwareai.netlify.app")
    log(f"API: {url}")

    # Keep alive - restart on failure
    while True:
        time.sleep(30)
        try:
            urllib.request.urlopen(f"{url}/api/health", timeout=10, context=ctx)
        except:
            log("Tunnel down, restarting...")
            bk.kill(); tn.kill()
            break
        try:
            urllib.request.urlopen(f"http://127.0.0.1:{PORT}/api/health", timeout=5)
        except:
            log("Backend down, restarting...")
            bk.kill(); tn.kill()
            break
