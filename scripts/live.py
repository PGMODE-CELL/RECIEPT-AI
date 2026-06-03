import subprocess, time, re, json, urllib.request, urllib.error, sys, os, ssl

PORT = 5000
WORK = r"C:\Users\lokeshgoyal\Desktop\123"
LOG = os.path.join(WORK, "live.log")

os.chdir(WORK)

def log(m):
    msg = f"[{time.strftime('%H:%M:%S')}] {m}"
    print(msg, flush=True)
    with open(LOG, "a") as f: f.write(msg + "\n")

log("=== STARTING ===")

# Start backend fresh
bk = subprocess.Popen([sys.executable, "-m", "uvicorn", "main:app", "--port", str(PORT), "--host", "0.0.0.0"],
    cwd=os.path.join(WORK, "huh", "backend"), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

for i in range(20):
    try:
        r = urllib.request.urlopen(f"http://127.0.0.1:{PORT}/api/health", timeout=2)
        if json.loads(r.read()).get("status") == "healthy": break
    except: time.sleep(1)
log("Backend OK")

# Start tunnel
tn = subprocess.Popen(["ssh", "-o", "StrictHostKeyChecking=no", "-o", "ServerAliveInterval=30",
    "-R", f"80:127.0.0.1:{PORT}", "nokey@localhost.run"],
    stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1)

url = None
for i in range(30):
    l = tn.stdout.readline()
    m = re.search(r"(https://[a-z0-9]+\.lhr\.life)", l or "")
    if m: url = m.group(0); break
    if i == 29: time.sleep(1)

if not url:
    log("Tunnel FAIL"); sys.exit(1)
log(f"Tunnel: {url}")

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

# Test tunnel
for i in range(5):
    try:
        r = urllib.request.urlopen(f"{url}/api/health", timeout=10, context=ctx)
        log(f"Tunnel test: {json.loads(r.read())['status']}"); break
    except Exception as e:
        log(f"Retry {i}: {str(e)[:60]}"); time.sleep(3)

# Auth
data = json.dumps({"email":"admin@demo.com","password":"admin123","full_name":"Admin"}).encode()
try:
    r = urllib.request.urlopen(urllib.request.Request(f"{url}/api/auth/register", data, {"Content-Type":"application/json"}), timeout=10, context=ctx)
except urllib.error.HTTPError:
    data = json.dumps({"email":"admin@demo.com","password":"admin123"}).encode()
    r = urllib.request.urlopen(urllib.request.Request(f"{url}/api/auth/login", data, {"Content-Type":"application/json"}), timeout=10, context=ctx)
log(f"Auth: {json.loads(r.read())['token'][:15]}...")

# Update netlify.toml
with open(os.path.join(WORK, "netlify.toml")) as f: c = f.read()
c = re.sub(r"https://[a-z0-9]+\.lhr\.life", url, c)
with open(os.path.join(WORK, "netlify.toml"), "w") as f: f.write(c)

subprocess.run(["git", "add", "-A"])
subprocess.run(["git", "commit", "-m", f"live: {url}"])
subprocess.run(["git", "push"])
log("PUSHED")

log(f"LIVE: {url}")
log(f"APP: https://recieptsoftwareai.netlify.app")

# Keep alive
while True:
    time.sleep(30)
    try:
        urllib.request.urlopen(f"http://127.0.0.1:{PORT}/api/health", timeout=5)
        urllib.request.urlopen(f"{url}/api/health", timeout=10, context=ctx)
    except:
        log("DEAD, exiting for restart")
        break
