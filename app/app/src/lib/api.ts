const envUrl = import.meta.env.VITE_API_URL;
const API_BASE = envUrl || envUrl === "" ? envUrl : "http://localhost:5000";

const TOKEN_KEY = "receiptai_jwt_token";
const ORG_KEY = "receiptai_active_org";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function getOrgId(): number | null {
  const v = localStorage.getItem(ORG_KEY);
  return v ? Number(v) : null;
}

export function setOrgId(id: number) {
  localStorage.setItem(ORG_KEY, String(id));
}

export function clearOrgId() {
  localStorage.removeItem(ORG_KEY);
}

async function request<T>(
  method: string,
  path: string,
  body?: any,
  params?: Record<string, string>,
  isForm = false,
): Promise<T> {
  const base = API_BASE || "";
  const isRelative = base.startsWith("/") || base === "";

  let url: URL | string;
  if (isRelative) {
    let urlStr = `${base}${path}`;
    if (params) {
      const qs = new URLSearchParams(
        Object.fromEntries(Object.entries(params).filter(([_, v]) => v != null)),
      ).toString();
      if (qs) urlStr += `?${qs}`;
    }
    url = urlStr;
  } else {
    url = new URL(`${base}${path}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) url.searchParams.set(k, v);
      });
    }
  }

  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let fetchBody: string | FormData | undefined;

  if (body && isForm) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    fetchBody = new URLSearchParams(
      Object.entries(body).reduce((acc, [k, v]) => {
        if (v !== undefined && v !== null) {
          acc[k] = typeof v === "object" ? JSON.stringify(v) : String(v);
        }
        return acc;
      }, {} as Record<string, string>),
    ).toString();
  } else if (body) {
    headers["Content-Type"] = "application/json";
    fetchBody = JSON.stringify(body);
  }

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: fetchBody,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(res.status, err.detail || "Request failed");
  }

  return res.json();
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export const api = {
  // Auth
  auth: {
    login: (email: string, password: string) =>
      request<{ token: string; user: { id: number; email: string; name: string } }>(
        "POST", "/api/auth/login", { email, password },
      ),
    register: (email: string, password: string, fullName: string) =>
      request<{ token: string; user: { id: number; email: string; name: string } }>(
        "POST", "/api/auth/register", { email, password, full_name: fullName },
      ),
    me: () =>
      request<{ id: number; email: string; name: string }>("GET", "/api/auth/me"),
    forgotPassword: (email: string) =>
      request<{ message: string; reset_token?: string }>("POST", "/api/auth/forgot-password", { email }),
    resetPassword: (token: string, password: string) =>
      request<{ message: string }>("POST", "/api/auth/reset-password", { token, password }),
  },

  // Organizations
  orgs: {
    list: () => request<any[]>("GET", "/api/orgs"),
  },

  // Setup
  setup: {
    countries: () => request<any[]>("GET", "/api/setup/countries"),
    create: (data: { name: string; country: string; tax_id?: string }) =>
      request<{ org_id: number; name: string; message: string }>("POST", "/api/setup/create", data),
  },

  // Dashboard / Reports
  dashboard: {
    stats: (orgId: number) =>
      request<any>("GET", `/api/reports/${orgId}/dashboard`),
    profitLoss: (orgId: number) =>
      request<any>("GET", `/api/reports/${orgId}/profit-loss`),
  },

  // Transactions
  transactions: {
    list: (orgId: number) =>
      request<any[]>("GET", `/api/transactions/${orgId}`),
    create: (orgId: number, data: any) =>
      request<any>("POST", `/api/transactions/simple`, data),
  },

  // Contacts
  contacts: {
    list: (orgId: number) =>
      request<any[]>("GET", `/api/contacts/${orgId}`),
    create: (orgId: number, data: any) =>
      request<any>("POST", `/api/contacts/${orgId}`, data, undefined, true),
  },

  // Invoices
  invoices: {
    list: (orgId: number, params?: { status?: string; search?: string; page?: number; limit?: number }) =>
      request<{ invoices: any[]; total: number }>(
        "GET", `/api/invoices/${orgId}`,
        undefined,
        params as Record<string, string>,
      ),
    create: (orgId: number, data: any) =>
      request<any>("POST", `/api/invoices/${orgId}`, data, undefined, true),
    pay: (orgId: number, invoiceId: number, data: any) =>
      request<any>("POST", `/api/invoices/${orgId}/${invoiceId}/pay`, data),
    pdf: (orgId: number, invoiceId: number) =>
      request<{ url?: string; base64?: string }>("GET", `/api/invoices/${orgId}/${invoiceId}/pdf`),
  },

  // Bills
  bills: {
    list: (orgId: number) =>
      request<any[]>("GET", `/api/bills/${orgId}`),
    create: (orgId: number, data: any) =>
      request<any>("POST", `/api/bills/${orgId}`, data, undefined, true),
  },

  // Receipts
  receipts: {
    list: (orgId: number) =>
      request<any[]>("GET", `/api/receipts/${orgId}`),
    upload: (orgId: number, data: any) =>
      request<any>("POST", `/api/receipts/${orgId}/upload`, data),
  },

  // Financials
  financials: {
    trialBalance: (orgId: number) =>
      request<any>("GET", `/api/financials/${orgId}/trial-balance`),
    balanceSheet: (orgId: number) =>
      request<any>("GET", `/api/financials/${orgId}/balance-sheet`),
    cashFlow: (orgId: number) =>
      request<any>("GET", `/api/financials/${orgId}/cash-flow`),
    ledger: (orgId: number, accountId: number) =>
      request<any>("GET", `/api/financials/${orgId}/ledger/${accountId}`),
    accounts: (orgId: number) =>
      request<any[]>("GET", `/api/financials/${orgId}/accounts`),
    createJournal: (data: any) =>
      request<any>("POST", "/api/financials/journal", data, undefined, true),
  },

  // Tax
  tax: {
    rates: (orgId: number) =>
      request<any[]>("GET", `/api/tax/${orgId}/rates`),
    createRate: (orgId: number, data: any) =>
      request<any>("POST", `/api/tax/${orgId}/rates`, data),
    compute: (orgId: number, data: any) =>
      request<any>("POST", `/api/tax/${orgId}/compute-invoice`, data),
    returns: (orgId: number) =>
      request<any[]>("GET", `/api/tax/${orgId}/returns`),
  },

  // Budgets
  budgets: {
    list: (orgId: number) =>
      request<any[]>("GET", `/api/budgets/${orgId}`),
    create: (orgId: number, data: any) =>
      request<any>("POST", `/api/budgets/${orgId}`, data),
    update: (orgId: number, budgetId: number, data: any) =>
      request<any>("PUT", `/api/budgets/${orgId}/${budgetId}`, data),
    delete: (orgId: number, budgetId: number) =>
      request<any>("DELETE", `/api/budgets/${orgId}/${budgetId}`),
  },

  // Recurring
  recurring: {
    list: (orgId: number) =>
      request<any[]>("GET", `/api/recurring/${orgId}`),
    create: (orgId: number, data: any) =>
      request<any>("POST", `/api/recurring/${orgId}`, data),
    toggle: (orgId: number, recurringId: number) =>
      request<any>("PUT", `/api/recurring/${orgId}/${recurringId}/toggle`),
  },

  // Projects
  projects: {
    list: (orgId: number) =>
      request<any[]>("GET", `/api/projects/${orgId}`),
    create: (orgId: number, data: any) =>
      request<any>("POST", `/api/projects/${orgId}`, data),
    pnl: (orgId: number, projectId: number) =>
      request<any>("GET", `/api/projects/${orgId}/${projectId}/pnl`),
  },

  // Audit
  audit: {
    list: (orgId: number) =>
      request<any[]>("GET", `/api/audit/${orgId}`),
  },

  // Notifications
  notifications: {
    list: (orgId: number) =>
      request<any[]>("GET", `/api/notifications/${orgId}`),
    markRead: (orgId: number, notificationId: number) =>
      request<any>("PUT", `/api/notifications/${orgId}/read/${notificationId}`),
    markAllRead: (orgId: number) =>
      request<any>("PUT", `/api/notifications/${orgId}/read-all`),
  },

  // Aging
  aging: {
    receivables: (orgId: number) =>
      request<any[]>("GET", `/api/aging/${orgId}/receivables`),
    payables: (orgId: number) =>
      request<any[]>("GET", `/api/aging/${orgId}/payables`),
  },

  // Payments
  payments: {
    history: (orgId: number) =>
      request<any[]>("GET", `/api/payments/${orgId}/history`),
    manual: (orgId: number, data: any) =>
      request<any>("POST", `/api/payments/${orgId}/manual`, data),
  },

  // Purchase Orders
  purchaseOrders: {
    list: (orgId: number) =>
      request<any[]>("GET", `/api/purchase-orders/${orgId}`),
    create: (orgId: number, data: any) =>
      request<any>("POST", `/api/purchase-orders/${orgId}`, data, undefined, true),
    get: (orgId: number, poId: number) =>
      request<any>("GET", `/api/purchase-orders/${orgId}/${poId}`),
  },

  // Inventory
  inventory: {
    items: (orgId: number) =>
      request<any[]>("GET", `/api/inventory/${orgId}/items`),
    createItem: (orgId: number, data: any) =>
      request<any>("POST", `/api/inventory/${orgId}/items`, data, undefined, true),
    lowStock: (orgId: number) =>
      request<any[]>("GET", `/api/inventory/${orgId}/items/low-stock`),
    movements: (orgId: number) =>
      request<any[]>("GET", `/api/inventory/${orgId}/movements`),
  },

  // Credit Notes
  creditNotes: {
    list: (orgId: number) =>
      request<any[]>("GET", `/api/credit-notes/${orgId}`),
    create: (orgId: number, data: any) =>
      request<any>("POST", `/api/credit-notes/${orgId}`, data),
  },

  // Estimates / Quotations
  estimates: {
    list: (orgId: number) =>
      request<any[]>("GET", `/api/estimates/${orgId}`),
    create: (orgId: number, data: any) =>
      request<any>("POST", `/api/estimates/${orgId}`, data, undefined, true),
    convert: (orgId: number, estimateId: number) =>
      request<any>("POST", `/api/estimates/${orgId}/${estimateId}/convert`, undefined, undefined, true),
  },

  // Fixed Assets / Depreciation
  depreciation: {
    assets: (orgId: number) =>
      request<any[]>("GET", `/api/depreciation/${orgId}/assets`),
    createAsset: (orgId: number, data: any) =>
      request<any>("POST", `/api/depreciation/${orgId}/assets`, data),
    schedule: (orgId: number, assetId: number) =>
      request<any>("GET", `/api/depreciation/${orgId}/assets/${assetId}/schedule`),
    postDepreciation: (orgId: number, assetId: number) =>
      request<any>("POST", `/api/depreciation/${orgId}/assets/${assetId}/depreciate`),
  },

  // Payroll
  payroll: {
    employees: (orgId: number) =>
      request<any[]>("GET", `/api/payroll/${orgId}/employees`),
    createEmployee: (orgId: number, data: any) =>
      request<any>("POST", `/api/payroll/${orgId}/employees`, data),
    payslips: (orgId: number) =>
      request<any[]>("GET", `/api/payroll/${orgId}/payslips`),
    generatePayslip: (orgId: number, empId: number) =>
      request<any>("POST", `/api/payroll/${orgId}/employees/${empId}/payslip`),
  },

  // Search
  search: {
    all: (orgId: number, q: string) =>
      request<any>("GET", `/api/search/${orgId}`, undefined, { q }),
  },

  // Forex
  forex: {
    rates: () => request<any[]>("GET", "/api/forex/rates"),
    convert: (from: string, to: string, amount: number) =>
      request<any>("GET", "/api/forex/convert", undefined, { from, to, amount: String(amount) }),
  },

  // Email
  email: {
    sendInvoice: (invoiceId: number) =>
      request<any>("POST", `/api/email/invoice/${invoiceId}`),
    sendReminders: (orgId: number) =>
      request<any>("POST", `/api/email/reminders/${orgId}`),
  },

  // Export
  export: {
    transactions: (orgId: number) =>
      request<any>("GET", `/api/export/${orgId}/transactions`),
    invoices: (orgId: number) =>
      request<any>("GET", `/api/export/${orgId}/invoices`),
    bills: (orgId: number) =>
      request<any>("GET", `/api/export/${orgId}/bills`),
  },

  // Roles / Members
  roles: {
    members: (orgId: number) =>
      request<any[]>("GET", `/api/roles/${orgId}/members`),
    addMember: (orgId: number, data: any) =>
      request<any>("POST", `/api/roles/${orgId}/members`, data),
  },

  // Timesheets
  timesheets: {
    list: (orgId: number) =>
      request<any[]>("GET", `/api/timesheets/${orgId}`),
    create: (orgId: number, data: any) =>
      request<any>("POST", `/api/timesheets/${orgId}`, data),
  },

  // Expense Reports
  expenseReports: {
    list: (orgId: number) =>
      request<any[]>("GET", `/api/expense-reports/${orgId}`),
    create: (orgId: number, data: any) =>
      request<any>("POST", `/api/expense-reports/${orgId}`, data),
  },

  // Accounting Periods
  accountingPeriods: {
    list: (orgId: number) =>
      request<any[]>("GET", `/api/accounting-periods/${orgId}`),
    close: (orgId: number, periodId: number) =>
      request<any>("POST", `/api/accounting-periods/${orgId}/${periodId}/close`),
  },

  // Consolidation
  consolidation: {
    summary: (orgId: number) =>
      request<any>("GET", `/api/consolidation/${orgId}/summary`),
  },

  // Health
  health: () => request<any>("GET", "/api/health"),

  // Generic for un-mapped endpoints
  get: <T = any>(path: string) => request<T>("GET", path),
  post: <T = any>(path: string, body?: any) => request<T>("POST", path, body),
  put: <T = any>(path: string, body?: any) => request<T>("PUT", path, body),
  delete: <T = any>(path: string) => request<T>("DELETE", path),
};

export type ApiClient = typeof api;
