const ANALYTICS_ENDPOINT = "/api/analytics";
const SESSION_ID_KEY = "analytics_session_id";
const OPT_OUT_KEY = "analytics_opt_out";

function getSessionId(): string {
  let sessionId = sessionStorage.getItem(SESSION_ID_KEY);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem(SESSION_ID_KEY, sessionId);
  }
  return sessionId;
}

function isOptedOut(): boolean {
  return localStorage.getItem(OPT_OUT_KEY) === "true";
}

function setOptOut(optOut: boolean): void {
  localStorage.setItem(OPT_OUT_KEY, optOut.toString());
}

async function sendEvent(event: string, properties?: Record<string, any>): Promise<boolean> {
  if (isOptedOut()) return false;
  if (!import.meta.env.PROD) return false;

  try {
    const response = await fetch(ANALYTICS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event,
        properties,
        session_id: getSessionId(),
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function sendBatch(events: Array<{ event: string; properties?: Record<string, any> }>): Promise<boolean> {
  if (isOptedOut()) return false;
  if (!import.meta.env.PROD) return false;

  try {
    const response = await fetch(`${ANALYTICS_ENDPOINT}/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(events.map((e) => ({ ...e, session_id: getSessionId() }))),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export const analytics = {
  track: sendEvent,
  trackBatch: sendBatch,
  optOut: () => setOptOut(true),
  optIn: () => setOptOut(false),
  isOptedOut,
  getSessionId,
};

export function track(event: string, properties?: Record<string, any>): void {
  sendEvent(event, properties).catch(() => {});
}

export function trackSignup(method: "email" | "oauth", orgCreated: boolean): void {
  track("signup", { method, org_created: orgCreated });
}

export function trackLogin(method: "email" | "oauth"): void {
  track("login", { method });
}

export function trackOrgCreated(): void {
  track("org_created");
}

export function trackFeature(feature: string, action: "view" | "create" | "update" | "delete"): void {
  track("feature_used", { feature, action });
}

export function trackDashboardViewed(): void {
  track("dashboard_viewed");
}

export function trackInvoiceCreated(invoiceId: number, amount: number): void {
  track("invoice_created", { invoice_id: invoiceId, amount });
}

export function trackTransactionCreated(transactionId: number, amount: number): void {
  track("transaction_created", { transaction_id: transactionId, amount });
}

export function trackContactCreated(contactId: number): void {
  track("contact_created", { contact_id: contactId });
}

export function trackReportGenerated(reportType: string): void {
  track("report_generated", { report_type: reportType });
}

export function trackSettingsChanged(setting: string): void {
  track("settings_changed", { setting });
}

export function trackError(error: string, context?: string): void {
  track("error", { error, context });
}