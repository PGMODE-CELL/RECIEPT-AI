import { authRouter } from "./auth-router";
import { dashboardRouter } from "./dashboard-router";
import { accountRouter } from "./account-router";
import { contactRouter } from "./contact-router";
import { productRouter } from "./product-router";
import { invoiceRouter } from "./invoice-router";
import { billRouter } from "./bill-router";
import { transactionRouter } from "./transaction-router";
import { receiptRouter } from "./receipt-router";
import { projectRouter } from "./project-router";
import { employeeRouter } from "./employee-router";
import { payrollRouter } from "./payroll-router";
import { documentRouter } from "./document-router";
import { reportRouter } from "./report-router";
import { settingsRouter } from "./settings-router";
import { journalEntryRouter } from "./journal-entry-router";
import { budgetRouter } from "./budget-router";
import { fixedAssetRouter } from "./fixed-asset-router";
import { recurringRouter } from "./recurring-router";
import { reconciliationRouter } from "./reconciliation-router";
import { auditRouter } from "./audit-router";
import { creditNoteRouter } from "./credit-note-router";
import { purchaseOrderRouter } from "./purchase-order-router";
import { quotationRouter } from "./quotation-router";
import { timeTrackingRouter } from "./time-tracking-router";
import { expenseClaimRouter } from "./expense-claim-router";
import { notificationRouter } from "./notification-router";
import { multiCompanyRouter } from "./multi-company-router";
import { periodCloseRouter } from "./period-close-router";
import { revenueRecognitionRouter } from "./revenue-recognition-router";
import { leaseRouter } from "./lease-router";
import { inventoryLotRouter } from "./inventory-lot-router";
import { jobCostingRouter } from "./job-costing-router";
import { bankRuleRouter } from "./bank-rule-router";
import { webhookRouter } from "./webhook-router";
import { documentVersionRouter } from "./document-version-router";
import { inventoryValuationRouter } from "./inventory-valuation-router";
import { fiscalPeriodRouter } from "./fiscal-period-router";
import { taxRuleRouter } from "./tax-rule-router";
import { crmRouter } from "./crm-router";
import { manufacturingRouter } from "./manufacturing-router";
import { cashFlowForecastRouter } from "./cash-flow-forecast-router";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  dashboard: dashboardRouter,
  account: accountRouter,
  contact: contactRouter,
  product: productRouter,
  invoice: invoiceRouter,
  bill: billRouter,
  transaction: transactionRouter,
  receipt: receiptRouter,
  project: projectRouter,
  employee: employeeRouter,
  payroll: payrollRouter,
  document: documentRouter,
  report: reportRouter,
  settings: settingsRouter,
  journalEntry: journalEntryRouter,
  budget: budgetRouter,
  fixedAsset: fixedAssetRouter,
  recurring: recurringRouter,
  reconciliation: reconciliationRouter,
  audit: auditRouter,
  creditNote: creditNoteRouter,
  purchaseOrder: purchaseOrderRouter,
  quotation: quotationRouter,
  timeTracking: timeTrackingRouter,
  expenseClaim: expenseClaimRouter,
  notification: notificationRouter,
  multiCompany: multiCompanyRouter,
  periodClose: periodCloseRouter,
  revenueRecognition: revenueRecognitionRouter,
  lease: leaseRouter,
  inventoryLot: inventoryLotRouter,
  jobCosting: jobCostingRouter,
  bankRule: bankRuleRouter,
  webhook: webhookRouter,
  documentVersion: documentVersionRouter,
  inventoryValuation: inventoryValuationRouter,
  fiscalPeriod: fiscalPeriodRouter,
  taxRule: taxRuleRouter,
  crm: crmRouter,
  manufacturing: manufacturingRouter,
  cashFlowForecast: cashFlowForecastRouter,
});

export type AppRouter = typeof appRouter;
