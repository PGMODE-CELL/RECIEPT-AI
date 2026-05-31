const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = 4200;
const PUBLIC_DIR = path.join(__dirname, 'dist', 'public');
const SECRET = 'demo-secret-key-for-dev';

const MIME_TYPES = {
  '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2',
};

function signToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 365 * 24 * 3600 })).toString('base64url');
  const signature = crypto.createHmac('sha256', SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(';').forEach(c => {
    const [key, val] = c.trim().split('=');
    if (key && val) cookies[key] = decodeURIComponent(val);
  });
  return cookies;
}

function hasSession(req) {
  const cookies = parseCookies(req.headers.cookie);
  return !!cookies.kimi_sid;
}

const DEMO_USER = { id: 1, unionId: 'demo-user-001', name: 'Demo User', email: 'demo@ledgerai.app', avatar: null, role: 'admin' };

// Demo data for all tRPC endpoints
function getDemoData(path) {
  const empty = null;
  if (path.includes('auth.me')) return DEMO_USER;
  if (path.includes('auth.logout')) return { success: true };
  if (path.includes('dashboard.stats')) return { revenue: 0, outstanding: 0, overdue: 0, bankBalance: 0, totalBills: 0, billsDue: 0, invoiceCount: 0, billCount: 0, contactCount: 0, productCount: 0, pendingReceipts: 0, activeProjects: 0, employeeCount: 0, monthlyRevenue: [] };
  if (path.includes('dashboard.recentActivity')) return [];
  if (path.includes('ping')) return { ok: true, ts: Date.now() };
  // List endpoints return empty arrays
  if (path.includes('.list') || path.includes('.nextNumber')) {
    if (path.includes('invoice.nextNumber')) return 'INV-0001';
    if (path.includes('bill.nextNumber')) return 'BILL-0001';
    if (path.includes('journalEntry.nextNumber')) return 'JE-0001';
    return [];
  }
  return empty;
}

function readBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => resolve(body));
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // ── Demo Login ──
  if (url.pathname === '/api/demo-login') {
    const token = signToken({ unionId: DEMO_USER.unionId, clientId: 'demo-app' });
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Set-Cookie': `kimi_sid=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${365*24*3600}`,
    });
    res.end(JSON.stringify(DEMO_USER));
    return;
  }

  // ── OAuth Callback ──
  if (url.pathname === '/api/oauth/callback') {
    const token = signToken({ unionId: DEMO_USER.unionId, clientId: 'demo-app' });
    res.writeHead(302, {
      Location: '/',
      'Set-Cookie': `kimi_sid=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${365*24*3600}`,
    });
    res.end();
    return;
  }

  // ── tRPC Batch (POST to /api/trpc) ──
  if (url.pathname === '/api/trpc' && req.method === 'POST') {
    const body = await readBody(req);
    let batchData;
    try { batchData = JSON.parse(body); } catch { batchData = {}; }

    const isAuthed = hasSession(req);
    const results = [];

    // Parse batch - keys are "0", "1", etc.
    for (const [key, value] of Object.entries(batchData)) {
      const procPath = value?.path || value?.[0]?.path || '';
      if (procPath === 'auth.me') {
        results.push({ result: { data: isAuthed ? DEMO_USER : null } });
      } else if (procPath === 'auth.logout') {
        results.push({ result: { data: { success: true } } });
      } else if (procPath.includes('ping')) {
        results.push({ result: { data: { ok: true, ts: Date.now() } } });
      } else if (procPath.includes('.list')) {
        results.push({ result: { data: [] } });
      } else if (procPath.includes('.nextNumber')) {
        const num = procPath.includes('invoice') ? 'INV-0001' : procPath.includes('bill') ? 'BILL-0001' : procPath.includes('journal') ? 'JE-0001' : '0001';
        results.push({ result: { data: num } });
      } else if (procPath.includes('.stats')) {
        results.push({ result: { data: { revenue: 0, outstanding: 0, overdue: 0, bankBalance: 0, totalBills: 0, billsDue: 0, invoiceCount: 0, billCount: 0, contactCount: 0, productCount: 0, pendingReceipts: 0, activeProjects: 0, employeeCount: 0, monthlyRevenue: [] } } });
      } else if (procPath.includes('.recentActivity')) {
        results.push({ result: { data: [] } });
      } else if (procPath.includes('.getCompany')) {
        results.push({ result: { data: null } });
      } else if (procPath.includes('.listTaxRates') || procPath.includes('.listCurrencies')) {
        results.push({ result: { data: [] } });
      } else if (procPath.includes('.getById')) {
        results.push({ result: { data: null } });
      } else if (procPath.includes('.statement')) {
        results.push({ result: { data: { invoices: [], bills: [] } } });
      } else if (procPath.includes('.getStats')) {
        results.push({ result: { data: { activeEmployees: 0, totalMonthlySalary: 0, lastRunDate: null } } });
      } else if (procPath.includes('.profitLoss')) {
        results.push({ result: { data: { period: { from: '', to: '' }, income: 0, expenses: 0, netProfit: 0, incomeAccounts: [], expenseAccounts: [] } } });
      } else if (procPath.includes('.balanceSheet')) {
        results.push({ result: { data: { asOf: '', assets: [], liabilities: [], equity: [], totalAssets: 0, totalLiabilities: 0, totalEquity: 0 } } });
      } else if (procPath.includes('.cashFlow')) {
        results.push({ result: { data: { period: { from: '', to: '' }, inflows: [], outflows: [], totalIn: 0, totalOut: 0, netFlow: 0 } } });
      } else if (procPath.includes('.agedReceivables') || procPath.includes('.agedPayables')) {
        results.push({ result: { data: [] } });
      } else if (procPath.includes('.taxSummary')) {
        results.push({ result: { data: { period: { from: '', to: '' }, outputTax: 0, inputTax: 0, taxPayable: 0, totalRevenue: 0, totalPurchases: 0 } } });
      } else if (procPath.includes('.create') || procPath.includes('.update') || procPath.includes('.delete') || procPath.includes('.recordPayment') || procPath.includes('.updateStatus') || procPath.includes('.saveCompany') || procPath.includes('.createTaxRate') || procPath.includes('.deleteTaxRate') || procPath.includes('.updateCurrency')) {
        results.push({ result: { data: { success: true } } });
      } else {
        results.push({ result: { data: null } });
      }
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(results));
    return;
  }

  // ── tRPC Batch (GET) ──
  if (url.pathname.startsWith('/api/trpc/') && req.method === 'GET') {
    const procName = url.pathname.replace('/api/trpc/', '').split('?')[0];
    const isAuthed = hasSession(req);
    let data;

    if (procName === 'auth.me') data = isAuthed ? DEMO_USER : null;
    else if (procName === 'auth.logout') data = { success: true };
    else if (procName === 'ping') data = { ok: true, ts: Date.now() };
    else data = null;

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify([{ result: { data } }]));
    return;
  }

  // ── Static Files ──
  let filePath = path.join(PUBLIC_DIR, url.pathname === '/' ? 'index.html' : url.pathname);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(PUBLIC_DIR, 'index.html');
  }
  const ext = path.extname(filePath);
  try {
    const content = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`LedgerAI running at http://localhost:${PORT}`);
});
