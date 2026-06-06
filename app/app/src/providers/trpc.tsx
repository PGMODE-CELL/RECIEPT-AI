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

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

function getDemoUser() {
  try { const stored = localStorage.getItem("receiptai_demo_user"); return stored ? JSON.parse(stored) : null; } catch { return null; }
}

function isDemoMode() { return !!getDemoUser(); }
function isRealMode() { return !!getToken(); }

// Maps tRPC procedure paths → FastAPI REST endpoints
// Every tRPC procedure must be listed here to avoid falling back to mock data.
// Procedures without a backend route will receive a 404 error (visible to user).
const ROUTE_MAP: Record<string, { method: string; path: string; needsOrg: boolean }> = {
  // Auth
  "auth.me": { method: "GET", path: "/api/auth/me", needsOrg: false },
  "auth.logout": { method: "POST", path: "/api/auth/logout", needsOrg: false },
  // Dashboard
  "dashboard.stats": { method: "GET", path: "/api/reports/{orgId}/dashboard", needsOrg: true },
  "dashboard.recentActivity": { method: "GET", path: "/api/transactions/{orgId}", needsOrg: true },
  // Invoice
  "invoice.list": { method: "GET", path: "/api/invoices/{orgId}", needsOrg: true },
  "invoice.getById": { method: "GET", path: "/api/invoices/{orgId}/{id}", needsOrg: true },
  "invoice.create": { method: "POST", path: "/api/invoices/{orgId}", needsOrg: true },
  "invoice.update": { method: "PUT", path: "/api/invoices/{orgId}/{id}", needsOrg: true },
  "invoice.updateStatus": { method: "PUT", path: "/api/invoices/{orgId}/{id}/status", needsOrg: true },
  "invoice.recordPayment": { method: "POST", path: "/api/invoices/{orgId}/{id}/pay", needsOrg: true },
  "invoice.delete": { method: "DELETE", path: "/api/invoices/{orgId}/{id}", needsOrg: true },
  "invoice.nextNumber": { method: "GET", path: "/api/invoices/{orgId}", needsOrg: true },
  "invoice.pay": { method: "POST", path: "/api/invoices/{orgId}/{id}/pay", needsOrg: true },
  "invoice.pdf": { method: "GET", path: "/api/invoices/{orgId}/{id}/pdf", needsOrg: true },
  // Bill
  "bill.list": { method: "GET", path: "/api/bills/{orgId}", needsOrg: true },
  "bill.getById": { method: "GET", path: "/api/bills/{orgId}/{id}", needsOrg: true },
  "bill.create": { method: "POST", path: "/api/bills/{orgId}", needsOrg: true },
  "bill.update": { method: "PUT", path: "/api/bills/{orgId}/{id}", needsOrg: true },
  "bill.updateStatus": { method: "PUT", path: "/api/bills/{orgId}/{id}/status", needsOrg: true },
  "bill.recordPayment": { method: "POST", path: "/api/bills/{orgId}/{id}/pay", needsOrg: true },
  "bill.delete": { method: "DELETE", path: "/api/bills/{orgId}/{id}", needsOrg: true },
  "bill.nextNumber": { method: "GET", path: "/api/bills/{orgId}", needsOrg: true },
  // Contact
  "contact.list": { method: "GET", path: "/api/contacts/{orgId}", needsOrg: true },
  "contact.search": { method: "GET", path: "/api/contacts/{orgId}", needsOrg: true },
  "contact.getById": { method: "GET", path: "/api/contacts/{orgId}/{id}", needsOrg: true },
  "contact.create": { method: "POST", path: "/api/contacts/{orgId}", needsOrg: true },
  "contact.update": { method: "PUT", path: "/api/contacts/{orgId}/{id}", needsOrg: true },
  "contact.delete": { method: "DELETE", path: "/api/contacts/{orgId}/{id}", needsOrg: true },
  "contact.statement": { method: "GET", path: "/api/contacts/{orgId}/{id}/statement", needsOrg: true },
  // Product / Inventory
  "product.list": { method: "GET", path: "/api/inventory/{orgId}/items", needsOrg: true },
  "product.search": { method: "GET", path: "/api/inventory/{orgId}/items", needsOrg: true },
  "product.getById": { method: "GET", path: "/api/inventory/{orgId}/items/{id}", needsOrg: true },
  "product.create": { method: "POST", path: "/api/inventory/{orgId}/items", needsOrg: true },
  "product.update": { method: "PUT", path: "/api/inventory/{orgId}/items/{id}", needsOrg: true },
  "product.delete": { method: "DELETE", path: "/api/inventory/{orgId}/items/{id}", needsOrg: true },
  // Transaction
  "transaction.list": { method: "GET", path: "/api/transactions/{orgId}", needsOrg: true },
  "transaction.create": { method: "POST", path: "/api/transactions/simple", needsOrg: false },
  "transaction.delete": { method: "DELETE", path: "/api/transactions/{orgId}/{id}", needsOrg: true },
  // Account
  "account.list": { method: "GET", path: "/api/financials/{orgId}/accounts", needsOrg: true },
  "account.getById": { method: "GET", path: "/api/financials/{orgId}/accounts/{id}", needsOrg: true },
  "account.create": { method: "POST", path: "/api/financials/{orgId}/accounts", needsOrg: true },
  "account.update": { method: "PUT", path: "/api/financials/{orgId}/accounts/{id}", needsOrg: true },
  "account.delete": { method: "DELETE", path: "/api/financials/{orgId}/accounts/{id}", needsOrg: true },
  "account.ledger": { method: "GET", path: "/api/financials/{orgId}/ledger/{accountId}", needsOrg: true },
  // Receipt
  "receipt.list": { method: "GET", path: "/api/receipts/{orgId}", needsOrg: true },
  "receipt.getById": { method: "GET", path: "/api/receipts/{orgId}/{id}", needsOrg: true },
  "receipt.create": { method: "POST", path: "/api/receipts/{orgId}/upload", needsOrg: true },
  "receipt.upload": { method: "POST", path: "/api/receipts/{orgId}/upload", needsOrg: true },
  "receipt.update": { method: "PUT", path: "/api/receipts/{orgId}/{id}", needsOrg: true },
  "receipt.delete": { method: "DELETE", path: "/api/receipts/{orgId}/{id}", needsOrg: true },
  // Reports
  "report.profitLoss": { method: "GET", path: "/api/reports/{orgId}/profit-loss", needsOrg: true },
  "report.balanceSheet": { method: "GET", path: "/api/financials/{orgId}/balance-sheet", needsOrg: true },
  "report.cashFlow": { method: "GET", path: "/api/financials/{orgId}/cash-flow", needsOrg: true },
  "report.trialBalance": { method: "GET", path: "/api/financials/{orgId}/trial-balance", needsOrg: true },
  "report.agedReceivables": { method: "GET", path: "/api/aging/{orgId}/receivables", needsOrg: true },
  "report.agedPayables": { method: "GET", path: "/api/aging/{orgId}/payables", needsOrg: true },
  "report.taxSummary": { method: "GET", path: "/api/tax/{orgId}/return", needsOrg: true },
  // Journal Entry
  "journalEntry.list": { method: "GET", path: "/api/financials/{orgId}/journal", needsOrg: true },
  "journalEntry.getById": { method: "GET", path: "/api/financials/{orgId}/journal/{id}", needsOrg: true },
  "journalEntry.create": { method: "POST", path: "/api/financials/journal", needsOrg: false },
  "journalEntry.delete": { method: "DELETE", path: "/api/financials/{orgId}/journal/{id}", needsOrg: true },
  "journalEntry.nextNumber": { method: "GET", path: "/api/financials/journal/count", needsOrg: false },
  "journal.create": { method: "POST", path: "/api/financials/journal", needsOrg: false },
  // Budget
  "budget.list": { method: "GET", path: "/api/budgets/{orgId}", needsOrg: true },
  "budget.getById": { method: "GET", path: "/api/budgets/{orgId}/{id}", needsOrg: true },
  "budget.create": { method: "POST", path: "/api/budgets/{orgId}", needsOrg: true },
  "budget.update": { method: "PUT", path: "/api/budgets/{orgId}/{id}", needsOrg: true },
  "budget.delete": { method: "DELETE", path: "/api/budgets/{orgId}/{id}", needsOrg: true },
  "budget.getSummary": { method: "GET", path: "/api/budgets/{orgId}/summary", needsOrg: true },
  // Project
  "project.list": { method: "GET", path: "/api/projects/{orgId}", needsOrg: true },
  "project.getById": { method: "GET", path: "/api/projects/{orgId}/{id}", needsOrg: true },
  "project.create": { method: "POST", path: "/api/projects/{orgId}", needsOrg: true },
  "project.update": { method: "PUT", path: "/api/projects/{orgId}/{id}", needsOrg: true },
  "project.delete": { method: "DELETE", path: "/api/projects/{orgId}/{id}", needsOrg: true },
  "project.createTask": { method: "POST", path: "/api/projects/{orgId}/{id}/tasks", needsOrg: true },
  "project.updateTask": { method: "PUT", path: "/api/projects/{orgId}/{id}/tasks/{taskId}", needsOrg: true },
  "project.deleteTask": { method: "DELETE", path: "/api/projects/{orgId}/{id}/tasks/{taskId}", needsOrg: true },
  // Estimate / Quotation
  "estimate.list": { method: "GET", path: "/api/estimates/{orgId}", needsOrg: true },
  "estimate.getById": { method: "GET", path: "/api/estimates/{orgId}/{id}", needsOrg: true },
  "estimate.create": { method: "POST", path: "/api/estimates/{orgId}", needsOrg: true },
  "estimate.convert": { method: "POST", path: "/api/estimates/{orgId}/{id}/convert", needsOrg: true },
  "quotation.list": { method: "GET", path: "/api/estimates/{orgId}", needsOrg: true },
  "quotation.getById": { method: "GET", path: "/api/estimates/{orgId}/{id}", needsOrg: true },
  "quotation.create": { method: "POST", path: "/api/estimates/{orgId}", needsOrg: true },
  "quotation.convertToInvoice": { method: "POST", path: "/api/estimates/{orgId}/{id}/convert", needsOrg: true },
  "quotation.nextNumber": { method: "GET", path: "/api/estimates/{orgId}?limit=1", needsOrg: true },
  // Purchase Order
  "purchaseOrder.list": { method: "GET", path: "/api/purchase-orders/{orgId}", needsOrg: true },
  "purchaseOrder.getById": { method: "GET", path: "/api/purchase-orders/{orgId}/{id}", needsOrg: true },
  "purchaseOrder.create": { method: "POST", path: "/api/purchase-orders/{orgId}", needsOrg: true },
  "purchaseOrder.update": { method: "PUT", path: "/api/purchase-orders/{orgId}/{id}", needsOrg: true },
  "purchaseOrder.updateStatus": { method: "PUT", path: "/api/purchase-orders/{orgId}/{id}/status", needsOrg: true },
  "purchaseOrder.delete": { method: "DELETE", path: "/api/purchase-orders/{orgId}/{id}", needsOrg: true },
  "purchaseOrder.nextNumber": { method: "GET", path: "/api/purchase-orders/{orgId}", needsOrg: true },
  // Credit Note
  "creditNote.list": { method: "GET", path: "/api/credit-notes/{orgId}", needsOrg: true },
  "creditNote.getById": { method: "GET", path: "/api/credit-notes/{orgId}/{id}", needsOrg: true },
  "creditNote.create": { method: "POST", path: "/api/credit-notes/{orgId}", needsOrg: true },
  "creditNote.update": { method: "PUT", path: "/api/credit-notes/{orgId}/{id}", needsOrg: true },
  "creditNote.delete": { method: "DELETE", path: "/api/credit-notes/{orgId}/{id}", needsOrg: true },
  "creditNote.nextNumber": { method: "GET", path: "/api/credit-notes/{orgId}", needsOrg: true },
  // Fixed Asset
  "fixedAsset.list": { method: "GET", path: "/api/depreciation/{orgId}/assets", needsOrg: true },
  "fixedAsset.getById": { method: "GET", path: "/api/depreciation/{orgId}/assets/{id}", needsOrg: true },
  "fixedAsset.create": { method: "POST", path: "/api/depreciation/{orgId}/assets", needsOrg: true },
  "fixedAsset.update": { method: "PUT", path: "/api/depreciation/{orgId}/assets/{id}", needsOrg: true },
  "fixedAsset.delete": { method: "DELETE", path: "/api/depreciation/{orgId}/assets/{id}", needsOrg: true },
  "fixedAsset.depreciate": { method: "POST", path: "/api/depreciation/{orgId}/assets/{id}/depreciate", needsOrg: true },
  "fixedAsset.getSummary": { method: "GET", path: "/api/depreciation/{orgId}/summary", needsOrg: true },
  // Employee
  "employee.list": { method: "GET", path: "/api/payroll/{orgId}/employees", needsOrg: true },
  "employee.getById": { method: "GET", path: "/api/payroll/{orgId}/employees/{id}", needsOrg: true },
  "employee.create": { method: "POST", path: "/api/payroll/{orgId}/employees", needsOrg: true },
  "employee.update": { method: "PUT", path: "/api/payroll/{orgId}/employees/{id}", needsOrg: true },
  "employee.delete": { method: "DELETE", path: "/api/payroll/{orgId}/employees/{id}", needsOrg: true },
  // Payroll
  "payroll.list": { method: "GET", path: "/api/payroll/{orgId}/payslips", needsOrg: true },
  "payroll.getById": { method: "GET", path: "/api/payroll/{orgId}/payslips/{id}", needsOrg: true },
  "payroll.getStats": { method: "GET", path: "/api/payroll/{orgId}/stats", needsOrg: true },
  "payroll.create": { method: "POST", path: "/api/payroll/{orgId}/payslips", needsOrg: true },
  "payroll.updateStatus": { method: "PUT", path: "/api/payroll/{orgId}/payslips/{id}/status", needsOrg: true },
  "payroll.delete": { method: "DELETE", path: "/api/payroll/{orgId}/payslips/{id}", needsOrg: true },
  "payroll.employee.list": { method: "GET", path: "/api/payroll/{orgId}/employees", needsOrg: true },
  "payroll.employee.create": { method: "POST", path: "/api/payroll/{orgId}/employees", needsOrg: true },
  "payroll.payslip.list": { method: "GET", path: "/api/payroll/{orgId}/payslips", needsOrg: true },
  "payroll.payslip.generate": { method: "POST", path: "/api/payroll/{orgId}/employees/{empId}/payslip", needsOrg: true },
  // Document
  "document.list": { method: "GET", path: "/api/attachments/{orgId}/list", needsOrg: true },
  "document.create": { method: "POST", path: "/api/attachments/{orgId}/upload", needsOrg: true },
  "document.delete": { method: "DELETE", path: "/api/attachments/{orgId}/{id}", needsOrg: true },
  // Settings
  "settings.getCompany": { method: "GET", path: "/api/orgs", needsOrg: false },
  "settings.saveCompany": { method: "PUT", path: "/api/orgs/{id}", needsOrg: false },
  "settings.listTaxRates": { method: "GET", path: "/api/tax/{orgId}/rates", needsOrg: true },
  "settings.createTaxRate": { method: "POST", path: "/api/tax/{orgId}/rates", needsOrg: true },
  "settings.deleteTaxRate": { method: "DELETE", path: "/api/tax/{orgId}/rates/{id}", needsOrg: true },
  "settings.listCurrencies": { method: "GET", path: "/api/forex/rates", needsOrg: false },
  "settings.updateCurrency": { method: "PUT", path: "/api/forex/rates/{id}", needsOrg: false },
  // Recurring
  "recurring.list": { method: "GET", path: "/api/recurring/{orgId}", needsOrg: true },
  "recurring.getById": { method: "GET", path: "/api/recurring/{orgId}/{id}", needsOrg: true },
  "recurring.create": { method: "POST", path: "/api/recurring/{orgId}", needsOrg: true },
  "recurring.update": { method: "PUT", path: "/api/recurring/{orgId}/{id}", needsOrg: true },
  "recurring.delete": { method: "DELETE", path: "/api/recurring/{orgId}/{id}", needsOrg: true },
  "recurring.getSummary": { method: "GET", path: "/api/recurring/{orgId}/summary", needsOrg: true },
  // Notification
  "notification.list": { method: "GET", path: "/api/notifications/{orgId}", needsOrg: true },
  "notification.markRead": { method: "PUT", path: "/api/notifications/{orgId}/read/{id}", needsOrg: true },
  "notification.markAllRead": { method: "PUT", path: "/api/notifications/{orgId}/read-all", needsOrg: true },
  "notification.getUnreadCount": { method: "GET", path: "/api/notifications/{orgId}/unread-count", needsOrg: true },
  // Audit
  "audit.list": { method: "GET", path: "/api/audit/{orgId}", needsOrg: true },
  "audit.log": { method: "POST", path: "/api/audit/{orgId}/log", needsOrg: true },
  "audit.getStats": { method: "GET", path: "/api/audit/{orgId}/stats", needsOrg: true },
  // Timesheet
  "timesheet.list": { method: "GET", path: "/api/timesheets/{orgId}", needsOrg: true },
  "timesheet.create": { method: "POST", path: "/api/timesheets/{orgId}", needsOrg: true },
  // Expense Report
  "expenseReport.list": { method: "GET", path: "/api/expense-reports/{orgId}", needsOrg: true },
  "expenseReport.create": { method: "POST", path: "/api/expense-reports/{orgId}", needsOrg: true },
  // Reconciliation
  "reconciliation.list": { method: "GET", path: "/api/financials/{orgId}/statement/reconciliation", needsOrg: true },
  "reconciliation.create": { method: "POST", path: "/api/financials/{orgId}/statement/reconciliation", needsOrg: true },
  "reconciliation.reconcile": { method: "POST", path: "/api/financials/{orgId}/statement/{id}/reconcile", needsOrg: true },
  "reconciliation.delete": { method: "DELETE", path: "/api/financials/{orgId}/statement/reconciliation/{id}", needsOrg: true },
  "reconciliation.getUnreconciled": { method: "GET", path: "/api/financials/{orgId}/statement/{importId}/suggestions", needsOrg: true },
  // Payment
  "payment.history": { method: "GET", path: "/api/payments/{orgId}/history", needsOrg: true },
  "payment.record": { method: "POST", path: "/api/payments/{orgId}/manual", needsOrg: true },
  // Multi-Company
  "multiCompany.list": { method: "GET", path: "/api/orgs", needsOrg: false },
  "multiCompany.getById": { method: "GET", path: "/api/orgs/{id}", needsOrg: false },
  "multiCompany.create": { method: "POST", path: "/api/setup/create", needsOrg: false },
  "multiCompany.update": { method: "PUT", path: "/api/orgs/{id}", needsOrg: false },
  "multiCompany.delete": { method: "DELETE", path: "/api/orgs/{id}", needsOrg: false },
  "multiCompany.switchActive": { method: "POST", path: "/api/orgs/{id}/switch", needsOrg: false },
  // Period Close
  "periodClose.list": { method: "GET", path: "/api/accounting-periods/{orgId}", needsOrg: true },
  "periodClose.getById": { method: "GET", path: "/api/accounting-periods/{orgId}/{id}", needsOrg: true },
  "periodClose.create": { method: "POST", path: "/api/accounting-periods/{orgId}", needsOrg: true },
  "periodClose.update": { method: "PUT", path: "/api/accounting-periods/{orgId}/{id}", needsOrg: true },
  "periodClose.delete": { method: "DELETE", path: "/api/accounting-periods/{orgId}/{id}", needsOrg: true },
  "periodClose.closePeriod": { method: "POST", path: "/api/accounting-periods/{orgId}/{id}/close", needsOrg: true },
  "periodClose.reopenPeriod": { method: "POST", path: "/api/accounting-periods/{orgId}/{id}/open", needsOrg: true },
  // Aging
  "aging.receivables": { method: "GET", path: "/api/aging/{orgId}/receivables", needsOrg: true },
  "aging.payables": { method: "GET", path: "/api/aging/{orgId}/payables", needsOrg: true },
  // Forex
  "forex.rates": { method: "GET", path: "/api/forex/rates", needsOrg: false },
  // Tax
  "tax.rates": { method: "GET", path: "/api/tax/{orgId}/rates", needsOrg: true },
  "tax.compute": { method: "POST", path: "/api/tax/{orgId}/compute-invoice", needsOrg: true },
  "tax.return.list": { method: "GET", path: "/api/tax/{orgId}/returns", needsOrg: true },
  // Accounting Period
  "accountingPeriod.list": { method: "GET", path: "/api/accounting-periods/{orgId}", needsOrg: true },
  "accountingPeriod.close": { method: "POST", path: "/api/accounting-periods/{orgId}/{id}/close", needsOrg: true },
  // Roles
  "role.members": { method: "GET", path: "/api/roles/{orgId}/members", needsOrg: true },
  // Consolidation
  "consolidation.summary": { method: "GET", path: "/api/consolidation/{orgId}/summary", needsOrg: true },
  // Search
  "search.all": { method: "GET", path: "/api/search/{orgId}", needsOrg: true },
  // Inventory extras
  "inventory.lowStock": { method: "GET", path: "/api/inventory/{orgId}/items/low-stock", needsOrg: true },
  "inventory.movements": { method: "GET", path: "/api/inventory/{orgId}/movements", needsOrg: true },
  // Email
  "email.sendInvoice": { method: "POST", path: "/api/email/invoice/{id}", needsOrg: false },
  "email.sendReminders": { method: "POST", path: "/api/email/reminders/{orgId}", needsOrg: true },
  // Export
  "export.transactions": { method: "GET", path: "/api/exports/{orgId}/transactions", needsOrg: true },
  "export.invoices": { method: "GET", path: "/api/exports/{orgId}/invoices", needsOrg: true },
  "export.bills": { method: "GET", path: "/api/exports/{orgId}/bills", needsOrg: true },
  // Company / Org
  "company.list": { method: "GET", path: "/api/orgs", needsOrg: false },
  "company.create": { method: "POST", path: "/api/setup/create", needsOrg: false },
  "company.getById": { method: "GET", path: "/api/orgs", needsOrg: false },
  // Wizard
  "wizard.countries": { method: "GET", path: "/api/setup/countries", needsOrg: false },
  "wizard.setup": { method: "POST", path: "/api/setup/create", needsOrg: false },
  // General Ledger
  "generalLedger.list": { method: "GET", path: "/api/financials/{orgId}/ledger/{accountId}", needsOrg: true },
  // Payment Gateway
  "paymentGateway.createIntent": { method: "POST", path: "/api/payments/{orgId}/stripe/create-payment-intent", needsOrg: true },
  "invoice.createFromTimeEntries": { method: "POST", path: "/api/projects/{orgId}/time-entries/invoice", needsOrg: true },
  // Attachment
  "attachment.list": { method: "GET", path: "/api/attachments/{orgId}/list", needsOrg: true },
  "attachment.upload": { method: "POST", path: "/api/attachments/{orgId}/upload", needsOrg: true },
  "attachment.delete": { method: "DELETE", path: "/api/attachments/{orgId}/{id}", needsOrg: true },
  // Time Tracking
  "timeTracking.list": { method: "GET", path: "/api/timesheets/{orgId}", needsOrg: true },
  "timeEntry.list": { method: "GET", path: "/api/timesheets/{orgId}", needsOrg: true },
  "timeTracking.getById": { method: "GET", path: "/api/timesheets/{orgId}/{id}", needsOrg: true },
  "timeTracking.create": { method: "POST", path: "/api/timesheets/{orgId}", needsOrg: true },
  "timeTracking.update": { method: "PUT", path: "/api/timesheets/{orgId}/{id}", needsOrg: true },
  "timeTracking.delete": { method: "DELETE", path: "/api/timesheets/{orgId}/{id}", needsOrg: true },
  "timeTracking.getSummary": { method: "GET", path: "/api/timesheets/{orgId}/summary", needsOrg: true },
  // Expense Claim
  "expenseClaim.list": { method: "GET", path: "/api/expense-reports/{orgId}", needsOrg: true },
  "expenseClaim.getById": { method: "GET", path: "/api/expense-reports/{orgId}/{id}", needsOrg: true },
  "expenseClaim.create": { method: "POST", path: "/api/expense-reports/{orgId}", needsOrg: true },
  "expenseClaim.update": { method: "PUT", path: "/api/expense-reports/{orgId}/{id}", needsOrg: true },
  "expenseClaim.updateStatus": { method: "PUT", path: "/api/expense-reports/{orgId}/{id}/status", needsOrg: true },
  "expenseClaim.delete": { method: "DELETE", path: "/api/expense-reports/{orgId}/{id}", needsOrg: true },
  "expenseClaim.nextNumber": { method: "GET", path: "/api/expense-reports/{orgId}", needsOrg: true },
  // Cash Flow Forecast
  "cashFlowForecast.list": { method: "GET", path: "/api/cash-flow-forecast/{orgId}", needsOrg: true },
  "cashFlowForecast.create": { method: "POST", path: "/api/cash-flow-forecast/{orgId}", needsOrg: true },
  "cashFlowForecast.delete": { method: "DELETE", path: "/api/cash-flow-forecast/{orgId}/{id}", needsOrg: true },
  // CRM
  "crm.listLeads": { method: "GET", path: "/api/crm/{orgId}/leads", needsOrg: true },
  "crm.getById": { method: "GET", path: "/api/crm/{orgId}/leads/{id}", needsOrg: true },
  "crm.createLead": { method: "POST", path: "/api/crm/{orgId}/leads", needsOrg: true },
  "crm.updateLead": { method: "PUT", path: "/api/crm/{orgId}/leads/{id}", needsOrg: true },
  "crm.deleteLead": { method: "DELETE", path: "/api/crm/{orgId}/leads/{id}", needsOrg: true },
  "crm.listActivities": { method: "GET", path: "/api/crm/{orgId}/leads/{id}/activities", needsOrg: true },
  "crm.createActivity": { method: "POST", path: "/api/crm/{orgId}/activities", needsOrg: true },
  // Manufacturing
  "manufacturing.listBoms": { method: "GET", path: "/api/manufacturing/{orgId}/boms", needsOrg: true },
  "manufacturing.createBom": { method: "POST", path: "/api/manufacturing/{orgId}/boms", needsOrg: true },
  "manufacturing.updateBom": { method: "PUT", path: "/api/manufacturing/{orgId}/boms/{id}", needsOrg: true },
  "manufacturing.deleteBom": { method: "DELETE", path: "/api/manufacturing/{orgId}/boms/{id}", needsOrg: true },
  "manufacturing.listBomItems": { method: "GET", path: "/api/manufacturing/{orgId}/boms/{id}/items", needsOrg: true },
  "manufacturing.addBomItem": { method: "POST", path: "/api/manufacturing/{orgId}/boms/{id}/items", needsOrg: true },
  "manufacturing.removeBomItem": { method: "DELETE", path: "/api/manufacturing/{orgId}/boms/{id}/items/{itemId}", needsOrg: true },
  "manufacturing.listWorkOrders": { method: "GET", path: "/api/manufacturing/{orgId}/work-orders", needsOrg: true },
  "manufacturing.createWorkOrder": { method: "POST", path: "/api/manufacturing/{orgId}/work-orders", needsOrg: true },
  "manufacturing.updateWorkOrder": { method: "PUT", path: "/api/manufacturing/{orgId}/work-orders/{id}", needsOrg: true },
  "manufacturing.deleteWorkOrder": { method: "DELETE", path: "/api/manufacturing/{orgId}/work-orders/{id}", needsOrg: true },
  // Revenue Recognition
  "revenueRecognition.list": { method: "GET", path: "/api/revenue-recognition/{orgId}", needsOrg: true },
  "revenueRecognition.getById": { method: "GET", path: "/api/revenue-recognition/{orgId}/{id}", needsOrg: true },
  "revenueRecognition.create": { method: "POST", path: "/api/revenue-recognition/{orgId}", needsOrg: true },
  "revenueRecognition.update": { method: "PUT", path: "/api/revenue-recognition/{orgId}/{id}", needsOrg: true },
  "revenueRecognition.delete": { method: "DELETE", path: "/api/revenue-recognition/{orgId}/{id}", needsOrg: true },
  "revenueRecognition.recognizeRevenue": { method: "POST", path: "/api/revenue-recognition/{orgId}/{id}/recognize", needsOrg: true },
  // Lease
  "lease.list": { method: "GET", path: "/api/leases/{orgId}", needsOrg: true },
  "lease.getById": { method: "GET", path: "/api/leases/{orgId}/{id}", needsOrg: true },
  "lease.create": { method: "POST", path: "/api/leases/{orgId}", needsOrg: true },
  "lease.update": { method: "PUT", path: "/api/leases/{orgId}/{id}", needsOrg: true },
  "lease.delete": { method: "DELETE", path: "/api/leases/{orgId}/{id}", needsOrg: true },
  "lease.calculateLiability": { method: "POST", path: "/api/leases/{orgId}/{id}/calculate-liability", needsOrg: true },
  // Inventory Lot
  "inventoryLot.list": { method: "GET", path: "/api/inventory-lots/{orgId}", needsOrg: true },
  "inventoryLot.getById": { method: "GET", path: "/api/inventory-lots/{orgId}/{id}", needsOrg: true },
  "inventoryLot.create": { method: "POST", path: "/api/inventory-lots/{orgId}", needsOrg: true },
  "inventoryLot.update": { method: "PUT", path: "/api/inventory-lots/{orgId}/{id}", needsOrg: true },
  "inventoryLot.delete": { method: "DELETE", path: "/api/inventory-lots/{orgId}/{id}", needsOrg: true },
  "inventoryLot.batchUpdate": { method: "PUT", path: "/api/inventory-lots/{orgId}/batch", needsOrg: true },
  // Job Costing
  "jobCosting.list": { method: "GET", path: "/api/job-costing/{orgId}", needsOrg: true },
  "jobCosting.getById": { method: "GET", path: "/api/job-costing/{orgId}/{id}", needsOrg: true },
  "jobCosting.create": { method: "POST", path: "/api/job-costing/{orgId}", needsOrg: true },
  "jobCosting.update": { method: "PUT", path: "/api/job-costing/{orgId}/{id}", needsOrg: true },
  "jobCosting.delete": { method: "DELETE", path: "/api/job-costing/{orgId}/{id}", needsOrg: true },
  "jobCosting.calculateWip": { method: "POST", path: "/api/job-costing/{orgId}/{id}/calculate-wip", needsOrg: true },
  "jobCosting.addCostEntry": { method: "POST", path: "/api/job-costing/{orgId}", needsOrg: true },
  // Bank Rule
  "bankRule.list": { method: "GET", path: "/api/bank-rules/{orgId}", needsOrg: true },
  "bankRule.getById": { method: "GET", path: "/api/bank-rules/{orgId}/{id}", needsOrg: true },
  "bankRule.create": { method: "POST", path: "/api/bank-rules/{orgId}", needsOrg: true },
  "bankRule.update": { method: "PUT", path: "/api/bank-rules/{orgId}/{id}", needsOrg: true },
  "bankRule.delete": { method: "DELETE", path: "/api/bank-rules/{orgId}/{id}", needsOrg: true },
  "bankRule.applyToTransactions": { method: "POST", path: "/api/bank-rules/{orgId}/apply", needsOrg: true },
  // Webhook
  "webhook.list": { method: "GET", path: "/api/webhooks/{orgId}", needsOrg: true },
  "webhook.getById": { method: "GET", path: "/api/webhooks/{orgId}/{id}", needsOrg: true },
  "webhook.create": { method: "POST", path: "/api/webhooks/{orgId}", needsOrg: true },
  "webhook.update": { method: "PUT", path: "/api/webhooks/{orgId}/{id}", needsOrg: true },
  "webhook.delete": { method: "DELETE", path: "/api/webhooks/{orgId}/{id}", needsOrg: true },
  "webhook.trigger": { method: "POST", path: "/api/webhooks/{orgId}/{id}/trigger", needsOrg: true },
  "webhook.getLogs": { method: "GET", path: "/api/webhooks/{orgId}/{id}/logs", needsOrg: true },
  // Document Version
  "documentVersion.list": { method: "GET", path: "/api/document-versions/{orgId}", needsOrg: true },
  "documentVersion.getById": { method: "GET", path: "/api/document-versions/{orgId}/{id}", needsOrg: true },
  "documentVersion.create": { method: "POST", path: "/api/document-versions/{orgId}", needsOrg: true },
  "documentVersion.update": { method: "PUT", path: "/api/document-versions/{orgId}/{id}", needsOrg: true },
  "documentVersion.delete": { method: "DELETE", path: "/api/document-versions/{orgId}/{id}", needsOrg: true },
  "documentVersion.getVersionHistory": { method: "GET", path: "/api/document-versions/{orgId}/{id}/history", needsOrg: true },
  // Inventory Valuation
  "inventoryValuation.list": { method: "GET", path: "/api/inventory-valuation/{orgId}", needsOrg: true },
  "inventoryValuation.getById": { method: "GET", path: "/api/inventory-valuation/{orgId}/{id}", needsOrg: true },
  "inventoryValuation.create": { method: "POST", path: "/api/inventory-valuation/{orgId}", needsOrg: true },
  "inventoryValuation.update": { method: "PUT", path: "/api/inventory-valuation/{orgId}/{id}", needsOrg: true },
  "inventoryValuation.delete": { method: "DELETE", path: "/api/inventory-valuation/{orgId}/{id}", needsOrg: true },
  "inventoryValuation.calculateValues": { method: "GET", path: "/api/inventory-valuation/{orgId}/calculate", needsOrg: true },
  "inventoryValuation.updateMethod": { method: "PUT", path: "/api/inventory-valuation/{orgId}/method", needsOrg: true },
  // Fiscal Period
  "fiscalPeriod.list": { method: "GET", path: "/api/accounting-periods/{orgId}", needsOrg: true },
  "fiscalPeriod.getById": { method: "GET", path: "/api/accounting-periods/{orgId}/{id}", needsOrg: true },
  "fiscalPeriod.create": { method: "POST", path: "/api/accounting-periods/{orgId}", needsOrg: true },
  "fiscalPeriod.update": { method: "PUT", path: "/api/accounting-periods/{orgId}/{id}", needsOrg: true },
  "fiscalPeriod.delete": { method: "DELETE", path: "/api/accounting-periods/{orgId}/{id}", needsOrg: true },
  "fiscalPeriod.closePeriod": { method: "POST", path: "/api/accounting-periods/{orgId}/{id}/close", needsOrg: true },
  "fiscalPeriod.get": { method: "GET", path: "/api/accounting-periods/{orgId}/current", needsOrg: true },
  "fiscalPeriod.yearEndClose": { method: "POST", path: "/api/accounting-periods/{orgId}/year-end-close", needsOrg: true },
  // Tax Rule
  "taxRule.list": { method: "GET", path: "/api/tax/{orgId}/rates", needsOrg: true },
  "taxRule.getById": { method: "GET", path: "/api/tax/{orgId}/rates/{id}", needsOrg: true },
  "taxRule.create": { method: "POST", path: "/api/tax/{orgId}/rates", needsOrg: true },
  "taxRule.update": { method: "PUT", path: "/api/tax/{orgId}/rates/{id}", needsOrg: true },
  "taxRule.delete": { method: "DELETE", path: "/api/tax/{orgId}/rates/{id}", needsOrg: true },
  "taxRule.applyToTransaction": { method: "POST", path: "/api/tax/{orgId}/compute-invoice", needsOrg: true },
};

function resolvePath(route: typeof ROUTE_MAP[string], input: any): { url: string; queryParams: Record<string, string> } {
  const orgId = getOrgId();
  let path = route.path;
  const pathParams: Record<string, string> = { orgId: String(orgId || ""), id: "", accountId: "", empId: "", itemId: "", importId: "" };

  // Extract IDs from input
  if (input?.id !== undefined) pathParams.id = String(input.id);
  if (input?.accountId !== undefined) pathParams.accountId = String(input.accountId);
  if (input?.empId !== undefined) pathParams.empId = String(input.empId);
  if (input?.itemId !== undefined) pathParams.itemId = String(input.itemId);
  if (input?.invoiceId !== undefined) pathParams.id = String(input.invoiceId);
  if (input?.budgetId !== undefined) pathParams.id = String(input.budgetId);
  if (input?.estimateId !== undefined) pathParams.id = String(input.estimateId);
  if (input?.poId !== undefined) pathParams.id = String(input.poId);
  if (input?.importId !== undefined) pathParams.importId = String(input.importId);

  // Replace path params
  Object.entries(pathParams).forEach(([k, v]) => {
    path = path.replace(`{${k}}`, v);
  });

  // Build query params from input (exclude known path params and special keys)
  const queryParams: Record<string, string> = {};
  if (input && typeof input === "object" && !Array.isArray(input)) {
    const skipKeys = new Set(["id", "accountId", "empId", "itemId", "invoiceId", "invoiceIds", "budgetId", "estimateId", "poId", "items"]);
    Object.entries(input).forEach(([k, v]) => {
      if (!skipKeys.has(k) && v !== undefined && v !== null && v !== "") {
        // Map period.from/.to → period_start/period_end for backend params
        if (k === "from") queryParams["period_start"] = String(v);
        else if (k === "to") queryParams["period_end"] = String(v);
        else if (k === "asOf") queryParams["as_of"] = String(v);
        else if (k === "limit") queryParams["per_page"] = String(v);
        else queryParams[k] = String(v);
      }
    });
  }

  // For nextNumber queries without input, add limit=1
  const procName = Object.entries(ROUTE_MAP).find(([, r]) => r === route)?.[0] || "";
  if (procName.includes("nextNumber") && (input === null || input === undefined)) {
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
  if (["contact.list", "product.list", "transaction.list", "receipt.list", "journalEntry.list"].includes(procedure)) {
    if (Array.isArray(data)) return data;
    if (data.items && Array.isArray(data.items)) return data.items;
    return [];
  }

  // Generic .list procedures: try to extract items array
  if (procedure.endsWith(".list") && data.items && Array.isArray(data.items)) {
    return data.items;
  }

  // Dashboard recent activity - backend returns { total, page, per_page, items: [...] }
  if (procedure === "dashboard.recentActivity") {
    if (Array.isArray(data)) return data;
    if (data.items && Array.isArray(data.items)) return data.items;
    return [];
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

  // Contact statement - backend returns { invoices: [], bills: [], ... }
  if (procedure === "contact.statement") {
    if (!data) return { invoices: [], bills: [] };
    if (!data.invoices) data.invoices = [];
    if (!data.bills) data.bills = [];
    return data;
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

// ===== Request data mapping: frontend → backend field names =====

function camelToSnake(s: string): string {
  return s.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
}

// Per-procedure input transforms: maps frontend data shape → backend-expected data shape.
// After each transform, remaining camelCase keys are auto-converted to snake_case.
// This handles: renames (contactId→contact_id), value generation (dueDate→due_days),
// items format (unitPrice→price), dropping fields, and expanding items into totals.
const INPUT_TRANSFORMS: Record<string, (data: Record<string, any>) => void> = {
  "invoice.create": (data) => {
    if (Array.isArray(data.items)) {
      data.items = data.items.map((item: any) => ({
        description: item.description,
        price: parseFloat(item.unitPrice || "0"),
        quantity: parseFloat(item.quantity || "0"),
      }));
    }
    data.contact_id = data.contactId;
    delete data.contactId;
    if (data.dueDate) {
      const due = new Date(data.dueDate as string);
      const issue = data.issueDate ? new Date(data.issueDate as string) : new Date();
      data.due_days = Math.max(1, Math.round((due.getTime() - issue.getTime()) / 86400000));
    } else { data.due_days = 30; }
    delete data.invoiceNumber;
    delete data.issueDate;
    delete data.dueDate;
    delete data.currency;
    delete data.notes;
  },

  "bill.create": (data) => {
    if (Array.isArray(data.items)) {
      const items = data.items as any[];
      data.amount = items.reduce((s: number, i: any) => s + parseFloat(i.amount || "0"), 0);
      data.description = items.filter((i: any) => i.description).map((i: any) => i.description).join("; ") || "Bill items";
    }
    delete data.items;
    data.contact_id = data.contactId;
    delete data.contactId;
    if (data.dueDate) {
      const due = new Date(data.dueDate as string);
      data.due_days = Math.max(1, Math.round((due.getTime() - Date.now()) / 86400000));
    } else { data.due_days = 30; }
    delete data.billNumber;
    delete data.billDate;
    delete data.dueDate;
    delete data.currency;
    delete data.notes;
  },

  "product.create": (data) => {
    data.price = data.salePrice;
    data.quantity = data.quantityOnHand;
    delete data.salePrice;
    delete data.quantityOnHand;
    delete data.type;
  },

  "journalEntry.create": (data) => {
    data.lines_json = data.lines;
    delete data.lines;
    delete data.entryNumber;
  },

  "transaction.create": (data) => {
    delete data.accountId;
    delete data.direction;
    delete data.reference;
  },

  "estimate.create": (data) => {
    data.contact_id = data.contactId;
    delete data.contactId;
    if (Array.isArray(data.items)) {
      data.items = data.items.map((item: any) => ({
        description: item.description,
        price: parseFloat(item.unitPrice || "0"),
        quantity: parseFloat(item.quantity || "0"),
      }));
    }
  },

  "purchaseOrder.create": (data) => {
    data.contact_id = data.contactId;
    delete data.contactId;
    delete data.orderNumber;
    delete data.orderDate;
    delete data.deliveryAddress;
    if (Array.isArray(data.items)) {
      data.items = data.items.map((item: any) => ({
        description: item.description,
        price: parseFloat(item.unitPrice || "0"),
        quantity: parseFloat(item.quantity || "0"),
      }));
    }
  },

  "creditNote.create": (data) => {
    delete data.creditNumber;
  },

  "project.create": (data) => {
    data.contact_id = data.contactId;
    delete data.contactId;
  },

  "budget.create": (data) => {
    delete data.accountId;
    delete data.startDate;
    delete data.endDate;
  },

  "recurring.create": (data) => {
    delete data.nextDate;
  },

  "invoice.recordPayment": (data) => {
    data.invoice_id = data.id;
    delete data.id;
    delete data.accountId;
  },

  "bill.recordPayment": (data) => {
    data.invoice_id = data.id;
    delete data.id;
    delete data.accountId;
  },

  "crm.createLead": (data) => {
    if (data.contactName) { data.name = data.contactName; delete data.contactName; }
  },
  "crm.updateLead": (data) => {
    if (data.contactName) { data.name = data.contactName; delete data.contactName; }
  },

  "revenueRecognition.create": (data) => {
    if (Array.isArray(data.schedule)) {
      data.schedule = JSON.stringify(data.schedule);
    }
    delete data.totalAmount;  // backend computes this
  },

  "webhook.create": (data) => {
    if (Array.isArray(data.events)) {
      data.events = JSON.stringify(data.events);
    }
  },
  "webhook.update": (data) => {
    if (Array.isArray(data.events)) {
      data.events = JSON.stringify(data.events);
    }
  },
};

// Procedures that use bare query params (no Form() / no JSON body)
const QUERY_PARAM_PROCEDURES = new Set([
  "budget.create", "budget.update",
  "creditNote.create",
  "recurring.create",
]);

// Handle tRPC fetch for real API mode
async function handleRealApiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : String(input);

  if (!url.includes("/api/trpc")) {
    const originalFetch = globalThis.__originalFetch || globalThis.fetch.bind(globalThis);
    return originalFetch(input, init);
  }

  const procedurePath = extractProcedurePath(url);
  const inputData = extractInput(url, init);

  const route = ROUTE_MAP[procedurePath];

  if (!route) {
    return Promise.resolve(new Response(JSON.stringify({ result: { data: mockResponse(procedurePath) } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
  }

  const { url: apiUrl, queryParams } = resolvePath(route, inputData);

  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const finalUrl = new URL(apiUrl);
  Object.entries(queryParams).forEach(([k, v]) => finalUrl.searchParams.set(k, v));

  // Handle POST/PUT body with field mapping
  let body: string | undefined;
  if (route.method === "POST" || route.method === "PUT") {
    const isJsonEndpoint = procedurePath.startsWith("auth.") || procedurePath === "ping" || procedurePath === "health" || procedurePath === "transaction.create" || procedurePath === "report.profitLoss";

    if (inputData && typeof inputData === "object" && !Array.isArray(inputData)) {
      const cleanData = { ...inputData };
      delete cleanData.id;
      delete cleanData.accountId;

      // Apply per-procedure input transform
      const transform = INPUT_TRANSFORMS[procedurePath];
      if (transform) transform(cleanData);

      // Auto-convert remaining camelCase keys to snake_case
      const converted: Record<string, any> = {};
      for (const [key, value] of Object.entries(cleanData)) {
        if (value !== undefined && value !== null) {
          converted[camelToSnake(key)] = value;
        }
      }

      if (isJsonEndpoint) {
        headers["Content-Type"] = "application/json";
        body = JSON.stringify(converted);
      } else if (QUERY_PARAM_PROCEDURES.has(procedurePath)) {
        Object.entries(converted).forEach(([k, v]) => {
          if (v !== undefined && v !== null && v !== "") {
            finalUrl.searchParams.set(k, String(v));
          }
        });
        body = undefined;
      } else {
        const formData = new URLSearchParams();
        const orgId = getOrgId();
        if (orgId && !converted.org_id && !converted.orgId) {
          formData.set("org_id", String(orgId));
        }
        Object.entries(converted).forEach(([k, v]) => {
          if (v !== undefined && v !== null) {
            formData.set(k, typeof v === "object" ? JSON.stringify(v) : String(v));
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
      const errorBody = await res.text().catch(() => "");
      let errorMessage = `Backend returned ${res.status}`;
      try {
        const parsed = JSON.parse(errorBody);
        errorMessage = parsed.detail || parsed.message || errorMessage;
      } catch { /* use default */ }
      return Promise.resolve(new Response(JSON.stringify({
        error: { message: errorMessage, code: "INTERNAL_SERVER_ERROR" }
      }), {
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
    return Promise.resolve(new Response(JSON.stringify({
      error: { message: "Network error - backend unreachable", code: "INTERNAL_SERVER_ERROR" }
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
  }
}

// Always install a dynamic fetch interceptor that checks credentials at request time
const originalFetch = globalThis.fetch.bind(globalThis);
globalThis.__originalFetch = originalFetch;
globalThis.fetch = function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : String(input);
  if (!url.includes("/api/trpc")) {
    return originalFetch(input, init);
  }
  if (isDemoMode()) {
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
  return handleRealApiFetch(input, init);
} as typeof globalThis.fetch;

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
