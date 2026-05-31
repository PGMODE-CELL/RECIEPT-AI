import { createTRPCReact, httpBatchLink } from "@trpc/react-query";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import superjson from "superjson";
import type { AppRouter } from "../../api/router";
import type { ReactNode } from "react";
import { Toaster } from "sonner";
import { getToken, getOrgId } from "@/lib/api";

export const trpc = createTRPCReact<AppRouter>();

declare global {
  var __originalFetch: typeof fetch | undefined;
}

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

function getDemoUser() {
  try { const stored = localStorage.getItem("ledgerai_demo_user"); return stored ? JSON.parse(stored) : null; } catch { return null; }
}

function isDemoMode() { return !!getDemoUser(); }
function isRealMode() { return !!getToken(); }

// Maps tRPC procedure paths → FastAPI REST endpoints
// Procedures not listed here fall back to mock data.
const ROUTE_MAP: Record<string, { method: string; path: string; needsOrg: boolean }> = {
  "auth.me": { method: "GET", path: "/api/auth/me", needsOrg: false },
  "auth.logout": { method: "POST", path: "/api/auth/logout", needsOrg: false },
  "dashboard.stats": { method: "GET", path: "/api/reports/{orgId}/dashboard", needsOrg: true },
  "dashboard.recentActivity": { method: "GET", path: "/api/transactions/{orgId}", needsOrg: true },
  "invoice.list": { method: "GET", path: "/api/invoices/{orgId}", needsOrg: true },
  "invoice.create": { method: "POST", path: "/api/invoices/{orgId}", needsOrg: true },
  "invoice.delete": { method: "DELETE", path: "/api/invoices/{orgId}/{id}", needsOrg: true },
  "invoice.getById": { method: "GET", path: "/api/invoices/{orgId}/{id}", needsOrg: true },
  "invoice.nextNumber": { method: "GET", path: "/api/invoices/{orgId}", needsOrg: true },
  "invoice.pay": { method: "POST", path: "/api/invoices/{orgId}/{id}/pay", needsOrg: true },
  "invoice.pdf": { method: "GET", path: "/api/invoices/{orgId}/{id}/pdf", needsOrg: true },
  "bill.list": { method: "GET", path: "/api/bills/{orgId}", needsOrg: true },
  "bill.create": { method: "POST", path: "/api/bills/{orgId}", needsOrg: true },
  "bill.getById": { method: "GET", path: "/api/bills/{orgId}/{id}", needsOrg: true },
  "bill.nextNumber": { method: "GET", path: "/api/bills/{orgId}", needsOrg: true },
  "contact.list": { method: "GET", path: "/api/contacts/{orgId}", needsOrg: true },
  "contact.create": { method: "POST", path: "/api/contacts/{orgId}", needsOrg: true },
  "contact.getById": { method: "GET", path: "/api/contacts/{orgId}/{id}", needsOrg: true },
  "product.list": { method: "GET", path: "/api/inventory/{orgId}/items", needsOrg: true },
  "product.create": { method: "POST", path: "/api/inventory/{orgId}/items", needsOrg: true },
  "transaction.list": { method: "GET", path: "/api/transactions/{orgId}", needsOrg: true },
  "transaction.create": { method: "POST", path: "/api/transactions/simple", needsOrg: false },
  "receipt.list": { method: "GET", path: "/api/receipts/{orgId}", needsOrg: true },
  "receipt.upload": { method: "POST", path: "/api/receipts/{orgId}/upload", needsOrg: true },
  "report.profitLoss": { method: "GET", path: "/api/reports/{orgId}/profit-loss", needsOrg: true },
  "report.balanceSheet": { method: "GET", path: "/api/financials/{orgId}/balance-sheet", needsOrg: true },
  "report.cashFlow": { method: "GET", path: "/api/financials/{orgId}/cash-flow", needsOrg: true },
  "report.trialBalance": { method: "GET", path: "/api/financials/{orgId}/trial-balance", needsOrg: true },
  "report.agedReceivables": { method: "GET", path: "/api/aging/{orgId}/receivables", needsOrg: true },
  "report.agedPayables": { method: "GET", path: "/api/aging/{orgId}/payables", needsOrg: true },
  "report.taxSummary": { method: "GET", path: "/api/tax/{orgId}/return", needsOrg: true },
  "account.list": { method: "GET", path: "/api/financials/{orgId}/accounts", needsOrg: true },
  "journal.create": { method: "POST", path: "/api/financials/journal", needsOrg: false },
  "journalEntry.create": { method: "POST", path: "/api/financials/journal", needsOrg: false },
  "budget.list": { method: "GET", path: "/api/budgets/{orgId}", needsOrg: true },
  "budget.create": { method: "POST", path: "/api/budgets/{orgId}", needsOrg: true },
  "budget.update": { method: "PUT", path: "/api/budgets/{orgId}/{id}", needsOrg: true },
  "budget.delete": { method: "DELETE", path: "/api/budgets/{orgId}/{id}", needsOrg: true },
  "recurring.list": { method: "GET", path: "/api/recurring/{orgId}", needsOrg: true },
  "recurring.create": { method: "POST", path: "/api/recurring/{orgId}", needsOrg: true },
  "project.list": { method: "GET", path: "/api/projects/{orgId}", needsOrg: true },
  "project.create": { method: "POST", path: "/api/projects/{orgId}", needsOrg: true },
  "audit.list": { method: "GET", path: "/api/audit/{orgId}", needsOrg: true },
  "notification.list": { method: "GET", path: "/api/notifications/{orgId}", needsOrg: true },
  "notification.markRead": { method: "PUT", path: "/api/notifications/{orgId}/read/{id}", needsOrg: true },
  "notification.markAllRead": { method: "PUT", path: "/api/notifications/{orgId}/read-all", needsOrg: true },
  "payment.history": { method: "GET", path: "/api/payments/{orgId}/history", needsOrg: true },
  "payment.record": { method: "POST", path: "/api/payments/{orgId}/manual", needsOrg: true },
  "estimate.list": { method: "GET", path: "/api/estimates/{orgId}", needsOrg: true },
  "estimate.create": { method: "POST", path: "/api/estimates/{orgId}", needsOrg: true },
  "estimate.convert": { method: "POST", path: "/api/estimates/{orgId}/{id}/convert", needsOrg: true },
  "purchaseOrder.list": { method: "GET", path: "/api/purchase-orders/{orgId}", needsOrg: true },
  "purchaseOrder.create": { method: "POST", path: "/api/purchase-orders/{orgId}", needsOrg: true },
  "creditNote.list": { method: "GET", path: "/api/credit-notes/{orgId}", needsOrg: true },
  "creditNote.create": { method: "POST", path: "/api/credit-notes/{orgId}", needsOrg: true },
  "fixedAsset.list": { method: "GET", path: "/api/depreciation/{orgId}/assets", needsOrg: true },
  "fixedAsset.create": { method: "POST", path: "/api/depreciation/{orgId}/assets", needsOrg: true },
  "payroll.employee.list": { method: "GET", path: "/api/payroll/{orgId}/employees", needsOrg: true },
  "payroll.employee.create": { method: "POST", path: "/api/payroll/{orgId}/employees", needsOrg: true },
  "payroll.payslip.list": { method: "GET", path: "/api/payroll/{orgId}/payslips", needsOrg: true },
  "payroll.payslip.generate": { method: "POST", path: "/api/payroll/{orgId}/employees/{empId}/payslip", needsOrg: true },
  "timesheet.list": { method: "GET", path: "/api/timesheets/{orgId}", needsOrg: true },
  "timesheet.create": { method: "POST", path: "/api/timesheets/{orgId}", needsOrg: true },
  "expenseReport.list": { method: "GET", path: "/api/expense-reports/{orgId}", needsOrg: true },
  "expenseReport.create": { method: "POST", path: "/api/expense-reports/{orgId}", needsOrg: true },
  "aging.receivables": { method: "GET", path: "/api/aging/{orgId}/receivables", needsOrg: true },
  "aging.payables": { method: "GET", path: "/api/aging/{orgId}/payables", needsOrg: true },
  "forex.rates": { method: "GET", path: "/api/forex/rates", needsOrg: false },
  "tax.rates": { method: "GET", path: "/api/tax/{orgId}/rates", needsOrg: true },
  "tax.compute": { method: "POST", path: "/api/tax/{orgId}/compute-invoice", needsOrg: true },
  "tax.return.list": { method: "GET", path: "/api/tax/{orgId}/returns", needsOrg: true },
  "accountingPeriod.list": { method: "GET", path: "/api/accounting-periods/{orgId}", needsOrg: true },
  "accountingPeriod.close": { method: "POST", path: "/api/accounting-periods/{orgId}/{id}/close", needsOrg: true },
  "role.members": { method: "GET", path: "/api/roles/{orgId}/members", needsOrg: true },
  "consolidation.summary": { method: "GET", path: "/api/consolidation/{orgId}/summary", needsOrg: true },
  "search.all": { method: "GET", path: "/api/search/{orgId}", needsOrg: true },
  "inventory.lowStock": { method: "GET", path: "/api/inventory/{orgId}/items/low-stock", needsOrg: true },
  "inventory.movements": { method: "GET", path: "/api/inventory/{orgId}/movements", needsOrg: true },
  "email.sendInvoice": { method: "POST", path: "/api/email/invoice/{id}", needsOrg: false },
  "email.sendReminders": { method: "POST", path: "/api/email/reminders/{orgId}", needsOrg: true },
  "export.transactions": { method: "GET", path: "/api/export/{orgId}/transactions", needsOrg: true },
  "export.invoices": { method: "GET", path: "/api/export/{orgId}/invoices", needsOrg: true },
  "company.list": { method: "GET", path: "/api/orgs", needsOrg: false },
  "company.create": { method: "POST", path: "/api/setup/create", needsOrg: false },
  "company.getById": { method: "GET", path: "/api/orgs", needsOrg: false },
  "wizard.countries": { method: "GET", path: "/api/setup/countries", needsOrg: false },
  "wizard.setup": { method: "POST", path: "/api/setup/create", needsOrg: false },
  "generalLedger.list": { method: "GET", path: "/api/financials/{orgId}/ledger/{accountId}", needsOrg: true },
  "paymentGateway.createIntent": { method: "POST", path: "/api/payments/{orgId}/stripe/create-payment-intent", needsOrg: true },
  "attachment.list": { method: "GET", path: "/api/attachments/{orgId}/list", needsOrg: true },
  "attachment.upload": { method: "POST", path: "/api/attachments/{orgId}/upload", needsOrg: true },
  "attachment.delete": { method: "DELETE", path: "/api/attachments/{orgId}/{id}", needsOrg: true },
};

function resolvePath(route: typeof ROUTE_MAP[string], input: any): { url: string; queryParams: Record<string, string> } {
  const orgId = getOrgId();
  let path = route.path;
  const pathParams: Record<string, string> = { orgId: String(orgId || ""), id: "", accountId: "", empId: "" };

  // Extract IDs from input
  if (input?.id !== undefined) pathParams.id = String(input.id);
  if (input?.accountId !== undefined) pathParams.accountId = String(input.accountId);
  if (input?.empId !== undefined) pathParams.empId = String(input.empId);
  if (input?.invoiceId !== undefined) pathParams.id = String(input.invoiceId);
  if (input?.budgetId !== undefined) pathParams.id = String(input.budgetId);
  if (input?.estimateId !== undefined) pathParams.id = String(input.estimateId);
  if (input?.poId !== undefined) pathParams.id = String(input.poId);

  // Replace path params
  Object.entries(pathParams).forEach(([k, v]) => {
    path = path.replace(`{${k}}`, v);
  });

  // Build query params from input (exclude known path params and special keys)
  const queryParams: Record<string, string> = {};
  if (input && typeof input === "object" && !Array.isArray(input)) {
    const skipKeys = new Set(["id", "accountId", "empId", "invoiceId", "invoiceIds", "budgetId", "estimateId", "poId", "items"]);
    Object.entries(input).forEach(([k, v]) => {
      if (!skipKeys.has(k) && v !== undefined && v !== null && v !== "") {
        // Map period.from/.to → period_start/period_end for backend params
        if (k === "from") queryParams["period_start"] = String(v);
        else if (k === "to") queryParams["period_end"] = String(v);
        else if (k === "asOf") queryParams["as_of"] = String(v);
        else queryParams[k] = String(v);
      }
    });
  }

  // For nextNumber queries without input, add limit=1
  if ((input === null || input === undefined) && route.path.endsWith("/{orgId}")) {
    queryParams.limit = "1";
  }

  return { url: `${API_BASE}${path}`, queryParams };
}

function mockResponse(path: string): any {
  const demo = getDemoUser();
  if (path === "auth.me") return demo;
  if (path === "auth.logout") return { success: true };
  if (path === "ping") return { ok: true, ts: Date.now() };
  if (path === "dashboard.stats") return { revenue: 0, outstanding: 0, overdue: 0, bankBalance: 0, totalBills: 0, billsDue: 0, invoiceCount: 0, billCount: 0, contactCount: 0, productCount: 0, pendingReceipts: 0, activeProjects: 0, employeeCount: 0, monthlyRevenue: [] };
  if (path === "dashboard.recentActivity") return [];
  if (path.includes("nextNumber")) {
    if (path.includes("invoice")) return "INV-0001";
    if (path.includes("bill")) return "BILL-0001";
    if (path.includes("journal")) return "JE-0001";
    return "0001";
  }
  if (path.includes("getCompany") || path.includes("getById")) return null;
  if (path.includes("listTaxRates") || path.includes("listCurrencies")) return [];
  if (path.includes("statement")) return { invoices: [], bills: [] };
  if (path.includes("getStats")) return { activeEmployees: 0, totalMonthlySalary: 0, lastRunDate: null, total: 0, todayCount: 0 };
  if (path.includes("getSummary")) return { totalBudget: 0, totalSpent: 0, count: 0, activeCount: 0, totalCost: 0, totalAccumulated: 0, totalCurrentValue: 0 };
  if (path.includes("getUnreconciled")) return [];
  if (path.includes("profitLoss")) return { period: { from: "", to: "" }, income: 0, expenses: 0, netProfit: 0, incomeAccounts: [], expenseAccounts: [] };
  if (path.includes("balanceSheet")) return { asOf: "", assets: [], liabilities: [], equity: [], totalAssets: 0, totalLiabilities: 0, totalEquity: 0 };
  if (path.includes("cashFlow")) return { period: { from: "", to: "" }, inflows: [], outflows: [], totalIn: 0, totalOut: 0, netFlow: 0 };
  if (path.includes("agedReceivables") || path.includes("agedPayables")) return [];
  if (path.includes("taxSummary")) return { period: { from: "", to: "" }, outputTax: 0, inputTax: 0, taxPayable: 0, totalRevenue: 0, totalPurchases: 0 };
  if (path.endsWith(".list") || path.endsWith(".all") || path.includes("getAll") || path.includes("list")) return [];
  if (path.includes("depreciate")) return { depreciation: "0.00" };
  if (path.includes("getUnreadCount")) return 0;
  if (path.includes("markRead") || path.includes("markAllRead")) return { success: true };
  if (path.includes("convertToInvoice")) return { success: true, id: Math.floor(Math.random() * 10000) };
  return { success: true, id: Math.floor(Math.random() * 10000) };
}

// Extract input from tRPC URL
function extractInput(url: string, init?: RequestInit): any {
  try {
    const urlObj = new URL(url, window.location.origin);
    const inputStr = urlObj.searchParams.get("input");
    if (inputStr) {
      const parsed = JSON.parse(inputStr);
      return parsed?.["0"] ?? parsed?.["1"] ?? null;
    }
    if (init?.body) {
      const body = JSON.parse(String(init.body));
      return body?.["0"] ?? body?.["1"] ?? null;
    }
  } catch { }
  return null;
}

function extractProcedurePath(url: string): string {
  try {
    const urlObj = new URL(url, window.location.origin);
    return urlObj.pathname.replace("/api/trpc/", "").split("?")[0];
  } catch { return ""; }
}

// Normalize FastAPI responses to match frontend expectations
function normalizeResponse(procedure: string, data: any): any {
  if (!data || typeof data !== "object") return data;

  // Pages that expect { invoices: [...] } or { bills: [...] } from data
  if (procedure === "invoice.list" || procedure === "bill.list") {
    const key = procedure === "invoice.list" ? "invoices" : "bills";
    if (data.items && !data[key]) {
      return { ...data, [key]: data.items };
    }
    return data;
  }

  // Pages that expect the items array directly (contact.list, product.list, transaction.list, receipt.list, journalEntry.list)
  // These pages do: const { data: items } = proc.useQuery() and use items as array
  if (["contact.list", "product.list", "transaction.list", "receipt.list"].includes(procedure)) {
    if (Array.isArray(data)) return data;
    if (data.items && Array.isArray(data.items)) return data.items;
    return [];
  }

  // Generic .list procedures: try to extract items array
  if (procedure.endsWith(".list") && data.items && Array.isArray(data.items)) {
    return data.items;
  }

  // Dashboard stats - FastAPI returns { plain_english, numbers: { total_income, ... }, recent_transactions }
  if (procedure === "dashboard.stats") {
    if (data.numbers) {
      const n = data.numbers;
      return {
        revenue: n.total_income || 0,
        outstanding: n.outstanding_invoices || 0,
        overdue: n.overdue_invoices || 0,
        bankBalance: n.cash_balance || 0,
        totalBills: n.outstanding_bills || 0,
        billsDue: n.bills_due_today || 0,
        invoiceCount: 0,
        billCount: 0,
        contactCount: 0,
        productCount: 0,
        pendingReceipts: 0,
        activeProjects: 0,
        employeeCount: 0,
        monthlyRevenue: [],
      };
    }
    if (!("revenue" in data)) {
      return {
        revenue: 0, outstanding: 0, overdue: 0, bankBalance: 0,
        totalBills: 0, billsDue: 0, invoiceCount: 0, billCount: 0,
        contactCount: 0, productCount: 0, pendingReceipts: 0,
        activeProjects: 0, employeeCount: 0, monthlyRevenue: [],
      };
    }
  }

  // Report: balance sheet - FastAPI returns { assets, liabilities, equity, total_assets, total_liabilities, total_equity }
  if (procedure === "report.balanceSheet") {
    if (data.assets && !data.totalAssets) {
      return {
        asOf: "",
        assets: data.assets || [],
        liabilities: data.liabilities || [],
        equity: data.equity || [],
        totalAssets: data.total_assets || 0,
        totalLiabilities: data.total_liabilities || 0,
        totalEquity: data.total_equity || 0,
      };
    }
  }

  // Report: cash flow - FastAPI returns { operating, investing, financing, operating_total, net_cash_flow }
  if (procedure === "report.cashFlow") {
    if (data.operating && !data.inflows) {
      return {
        period: { from: "", to: "" },
        inflows: data.operating?.filter((i: any) => (i.amount || 0) > 0) || [],
        outflows: data.operating?.filter((i: any) => (i.amount || 0) < 0) || [],
        totalIn: data.operating_total || 0,
        totalOut: -(data.operating?.filter((i: any) => (i.amount || 0) < 0).reduce((s: number, i: any) => s + Math.abs(i.amount), 0) || 0),
        netFlow: data.net_cash_flow || 0,
      };
    }
  }

  // Report: aged receivables/payables - FastAPI returns array directly
  if (procedure === "report.agedReceivables" || procedure === "report.agedPayables") {
    if (!Array.isArray(data)) return [];
  }

  // Report: tax summary - FastAPI returns { total_sales, total_purchases, output_tax, input_tax, net_payable, ... }
  if (procedure === "report.taxSummary") {
    if (data.total_sales !== undefined) {
      return {
        period: { from: "", to: "" },
        outputTax: data.output_tax || 0,
        inputTax: data.input_tax || 0,
        taxPayable: data.net_payable || 0,
        totalRevenue: data.total_sales || 0,
        totalPurchases: data.total_purchases || 0,
      };
    }
  }

  // Next number queries
  if (procedure.includes("nextNumber")) {
    if (typeof data === "object" && !Array.isArray(data) && data.total !== undefined) {
      const n = (data.total || 0) + 1;
      const prefix = procedure.includes("invoice") ? "INV-" : procedure.includes("bill") ? "BILL-" : "";
      return `${prefix}${String(n).padStart(4, "0")}`;
    }
  }

  return data;
}

// Handle tRPC fetch for real API mode
async function handleRealApiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : String(input);

  if (!url.includes("/api/trpc")) {
    // Pass through non-tRPC requests (for our API client)
    const originalFetch = globalThis.__originalFetch || globalThis.fetch.bind(globalThis);
    return originalFetch(input, init);
  }

  const procedurePath = extractProcedurePath(url);
  const inputData = extractInput(url, init);

  const route = ROUTE_MAP[procedurePath];

  if (!route) {
    // Unknown procedure - return empty mock
    return Promise.resolve(new Response(JSON.stringify({ result: { data: mockResponse(procedurePath) } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
  }

  const { url: apiUrl, queryParams } = resolvePath(route, inputData);

  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  // Build URL with query params
  const finalUrl = new URL(apiUrl);
  Object.entries(queryParams).forEach(([k, v]) => finalUrl.searchParams.set(k, v));

  // Handle POST/PUT body - FastAPI uses Form for most endpoints, JSON for auth
  let body: string | undefined;
  if (route.method === "POST" || route.method === "PUT") {
    const isJsonEndpoint = procedurePath.startsWith("auth.") || procedurePath === "ping" || procedurePath === "health" || procedurePath === "transaction.create" || procedurePath === "report.profitLoss";
    if (inputData && typeof inputData === "object" && !Array.isArray(inputData)) {
      const cleanData = { ...inputData };
      delete cleanData.id;
      delete cleanData.accountId;
      if (isJsonEndpoint) {
        headers["Content-Type"] = "application/json";
        body = JSON.stringify(cleanData);
      } else {
        const formData = new URLSearchParams();
        // Add org_id when needed (it's required by backend for Form endpoints)
        const orgId = getOrgId();
        if (orgId && !cleanData.org_id && !cleanData.orgId) {
          formData.set("org_id", String(orgId));
        }
        Object.entries(cleanData).forEach(([k, v]) => {
          if (v !== undefined && v !== null) {
            // Map lines → lines_json for journal entry creation
            const key = k === "lines" ? "lines_json" : k;
            formData.set(key, typeof v === "object" ? JSON.stringify(v) : String(v));
          }
        });
        headers["Content-Type"] = "application/x-www-form-urlencoded";
        body = formData.toString();
      }
    } else if (inputData !== null) {
      headers["Content-Type"] = isJsonEndpoint ? "application/json" : "application/x-www-form-urlencoded";
      body = isJsonEndpoint ? JSON.stringify(inputData) : new URLSearchParams({ value: String(inputData) }).toString();
    }
  }

  const apiFetch = globalThis.__originalFetch || globalThis.fetch.bind(globalThis);
  try {
    const res = await apiFetch(finalUrl.toString(), {
      method: route.method,
      headers,
      body,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      // Return empty data on error so pages don't crash
      return Promise.resolve(new Response(JSON.stringify({ result: { data: null } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }));
    }

    const data = normalizeResponse(procedurePath, await res.json());
    return Promise.resolve(new Response(JSON.stringify({ result: { data } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
  } catch {
    return Promise.resolve(new Response(JSON.stringify({ result: { data: mockResponse(procedurePath) } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
  }
}

// Setup fetch interceptor based on mode
if (isDemoMode()) {
  const originalFetch = globalThis.fetch.bind(globalThis);
  globalThis.__originalFetch = originalFetch;
  globalThis.fetch = function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : String(input);
    if (url.includes("/api/trpc")) {
      let procs: string[] = [];
      const urlObj = new URL(url, window.location.origin);
      const pathPart = urlObj.pathname.replace("/api/trpc/", "");
      if (pathPart) procs = pathPart.split(",");
      if (procs.length === 0) {
        try { const body = init?.body ? JSON.parse(String(init.body)) : {}; procs = Object.keys(body).map((_, i) => String(i)); } catch { }
      }
      const results = procs.map(proc => ({ result: { data: mockResponse(proc) } }));
      if (procs.length === 0) results.push({ result: { data: null } });
      return Promise.resolve(new Response(JSON.stringify(results.length === 1 ? results[0] : results), {
        status: 200, headers: { "Content-Type": "application/json" },
      }));
    }
    return (globalThis.__originalFetch || originalFetch)(input, init);
  } as typeof globalThis.fetch;
} else if (isRealMode()) {
  const originalFetch = globalThis.fetch.bind(globalThis);
  globalThis.__originalFetch = originalFetch;
  globalThis.fetch = function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    return handleRealApiFetch(input, init);
  } as typeof globalThis.fetch;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 0, refetchOnWindowFocus: false, staleTime: Infinity },
    mutations: { retry: 0 },
  },
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch(input, init) {
        return globalThis.fetch(input, { ...(init ?? {}), credentials: "include" });
      },
    }),
  ],
});

export function TRPCProvider({ children }: { children: ReactNode }) {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster position="top-right" richColors closeButton />
      </QueryClientProvider>
    </trpc.Provider>
  );
}
