import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router";
import AppLayout from "./components/AppLayout";
import Login from "./pages/Login";
import Landing from "./pages/Landing";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import OrgSetup from "./pages/OrgSetup";
import NotFound from "./pages/NotFound";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const CustomDashboard = lazy(() => import("./pages/CustomDashboard"));
const AIInsights = lazy(() => import("./pages/AIInsights"));
const CRM = lazy(() => import("./pages/CRM"));
const Invoices = lazy(() => import("./pages/Invoices"));
const InvoiceDetail = lazy(() => import("./pages/InvoiceDetail"));
const Bills = lazy(() => import("./pages/Bills"));
const BillDetail = lazy(() => import("./pages/BillDetail"));
const Banking = lazy(() => import("./pages/Banking"));
const BankFeedImport = lazy(() => import("./pages/BankFeedImport"));
const Contacts = lazy(() => import("./pages/Contacts"));
const ContactDetail = lazy(() => import("./pages/ContactDetail"));
const Products = lazy(() => import("./pages/Products"));
const Manufacturing = lazy(() => import("./pages/Manufacturing"));
const Projects = lazy(() => import("./pages/Projects"));
const Employees = lazy(() => import("./pages/Employees"));
const Payroll = lazy(() => import("./pages/Payroll"));
const Receipts = lazy(() => import("./pages/Receipts"));
const ChartOfAccounts = lazy(() => import("./pages/ChartOfAccounts"));
const JournalEntries = lazy(() => import("./pages/JournalEntries"));
const CostCenters = lazy(() => import("./pages/CostCenters"));
const Reports = lazy(() => import("./pages/Reports"));
const TrialBalance = lazy(() => import("./pages/TrialBalance"));
const GeneralLedger = lazy(() => import("./pages/GeneralLedger"));
const CashBook = lazy(() => import("./pages/CashBook"));
const ComplianceReports = lazy(() => import("./pages/ComplianceReports"));
const CustomReports = lazy(() => import("./pages/CustomReports"));
const Documents = lazy(() => import("./pages/Documents"));
const Settings = lazy(() => import("./pages/Settings"));
const Budgets = lazy(() => import("./pages/Budgets"));
const FixedAssets = lazy(() => import("./pages/FixedAssets"));
const Recurring = lazy(() => import("./pages/Recurring"));
const Reconciliation = lazy(() => import("./pages/Reconciliation"));
const AuditTrail = lazy(() => import("./pages/AuditTrail"));
const CreditNotes = lazy(() => import("./pages/CreditNotes"));
const PurchaseOrders = lazy(() => import("./pages/PurchaseOrders"));
const Quotations = lazy(() => import("./pages/Quotations"));
const TimeTracking = lazy(() => import("./pages/TimeTracking"));
const ExpenseClaims = lazy(() => import("./pages/ExpenseClaims"));
const NotificationCenter = lazy(() => import("./pages/NotificationCenter"));
const InvoiceTemplates = lazy(() => import("./pages/InvoiceTemplates"));
const EmailTemplates = lazy(() => import("./pages/EmailTemplates"));
const ExchangeRates = lazy(() => import("./pages/ExchangeRates"));
const DataImport = lazy(() => import("./pages/DataImport"));
const Automation = lazy(() => import("./pages/Automation"));
const PaymentGateway = lazy(() => import("./pages/PaymentGateway"));
const APIDocumentation = lazy(() => import("./pages/APIDocumentation"));
const SecurityCenter = lazy(() => import("./pages/SecurityCenter"));
const LanguageSettings = lazy(() => import("./pages/LanguageSettings"));
const MultiCompany = lazy(() => import("./pages/MultiCompany"));
const PeriodClose = lazy(() => import("./pages/PeriodClose"));
const RevenueRecognition = lazy(() => import("./pages/RevenueRecognition"));
const LeaseAccounting = lazy(() => import("./pages/LeaseAccounting"));
const InventoryLots = lazy(() => import("./pages/InventoryLots"));
const JobCosting = lazy(() => import("./pages/JobCosting"));
const ProjectBilling = lazy(() => import("./pages/ProjectBilling"));
const BankRules = lazy(() => import("./pages/BankRules"));
const InventoryValuation = lazy(() => import("./pages/InventoryValuation"));
const CashFlowForecast = lazy(() => import("./pages/CashFlowForecast"));
const FiscalYearSettings = lazy(() => import("./pages/FiscalYearSettings"));
const TaxRules = lazy(() => import("./pages/TaxRules"));
const Consolidation = lazy(() => import("./pages/Consolidation"));
const InterCompany = lazy(() => import("./pages/InterCompany"));
const Webhooks = lazy(() => import("./pages/Webhooks"));
const WebhookLogs = lazy(() => import("./pages/WebhookLogs"));
const EmailSender = lazy(() => import("./pages/EmailSender"));
const PDFGenerator = lazy(() => import("./pages/PDFGenerator"));
const DocumentVersions = lazy(() => import("./pages/DocumentVersions"));
const DarkMode = lazy(() => import("./pages/DarkMode"));
const SmartCategorization = lazy(() => import("./pages/SmartCategorization"));
const AnomalyDetection = lazy(() => import("./pages/AnomalyDetection"));
const CustomerAnalytics = lazy(() => import("./pages/CustomerAnalytics"));
const ExpenseAnalytics = lazy(() => import("./pages/ExpenseAnalytics"));
const WorkflowDesigner = lazy(() => import("./pages/WorkflowDesigner"));
const CollaborationHub = lazy(() => import("./pages/CollaborationHub"));
const ComplianceDashboard = lazy(() => import("./pages/ComplianceDashboard"));
const ProfitabilityAnalysis = lazy(() => import("./pages/ProfitabilityAnalysis"));
const InventoryAnalytics = lazy(() => import("./pages/InventoryAnalytics"));
const FinancialHealth = lazy(() => import("./pages/FinancialHealth"));
const InvoiceSplitter = lazy(() => import("./pages/InvoiceSplitter"));
const BulkActions = lazy(() => import("./pages/BulkActions"));
const SmartSearch = lazy(() => import("./pages/SmartSearch"));
const FinancialCalendar = lazy(() => import("./pages/FinancialCalendar"));
const VendorScorecard = lazy(() => import("./pages/VendorScorecard"));
const CustomerPortal = lazy(() => import("./pages/CustomerPortal"));
const TaxCalendar = lazy(() => import("./pages/TaxCalendar"));
const InventoryForecast = lazy(() => import("./pages/InventoryForecast"));
const KPIBuilder = lazy(() => import("./pages/KPIBuilder"));
const AuditWizard = lazy(() => import("./pages/AuditWizard"));
const CurrencyHedge = lazy(() => import("./pages/CurrencyHedge"));
const SupplierPortal = lazy(() => import("./pages/SupplierPortal"));
const DocumentAI = lazy(() => import("./pages/DocumentAI"));
const BudgetVariance = lazy(() => import("./pages/BudgetVariance"));
const MultiCurrencyInvoice = lazy(() => import("./pages/MultiCurrencyInvoice"));
const ExpensePolicy = lazy(() => import("./pages/ExpensePolicy"));
const ProjectGantt = lazy(() => import("./pages/ProjectGantt"));
const InvoiceReminder = lazy(() => import("./pages/InvoiceReminder"));
const CashPosition = lazy(() => import("./pages/CashPosition"));
const CreditManagement = lazy(() => import("./pages/CreditManagement"));
const SerialNumberTracker = lazy(() => import("./pages/SerialNumberTracker"));
const BatchProcessing = lazy(() => import("./pages/BatchProcessing"));
const DataBackup = lazy(() => import("./pages/DataBackup"));
const APIWebhooks = lazy(() => import("./pages/APIWebhooks"));
const SystemHealth = lazy(() => import("./pages/SystemHealth"));

function PageLoader() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/org-setup" element={<OrgSetup />} />
      <Route
        path="/*"
        element={
          <AppLayout>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/custom-dashboard" element={<CustomDashboard />} />
                <Route path="/ai-insights" element={<AIInsights />} />
                <Route path="/crm" element={<CRM />} />
                <Route path="/invoices" element={<Invoices />} />
                <Route path="/invoices/:id" element={<InvoiceDetail />} />
                <Route path="/credit-notes" element={<CreditNotes />} />
                <Route path="/bills" element={<Bills />} />
                <Route path="/bills/:id" element={<BillDetail />} />
                <Route path="/purchase-orders" element={<PurchaseOrders />} />
                <Route path="/quotations" element={<Quotations />} />
                <Route path="/banking" element={<Banking />} />
                <Route path="/bank-feed" element={<BankFeedImport />} />
                <Route path="/contacts" element={<Contacts />} />
                <Route path="/contacts/:id" element={<ContactDetail />} />
                <Route path="/products" element={<Products />} />
                <Route path="/manufacturing" element={<Manufacturing />} />
                <Route path="/projects" element={<Projects />} />
                <Route path="/time-tracking" element={<TimeTracking />} />
                <Route path="/expense-claims" element={<ExpenseClaims />} />
                <Route path="/employees" element={<Employees />} />
                <Route path="/payroll" element={<Payroll />} />
                <Route path="/receipts" element={<Receipts />} />
                <Route path="/accounts" element={<ChartOfAccounts />} />
                <Route path="/journal" element={<JournalEntries />} />
                <Route path="/cost-centers" element={<CostCenters />} />
                <Route path="/budgets" element={<Budgets />} />
                <Route path="/assets" element={<FixedAssets />} />
                <Route path="/recurring" element={<Recurring />} />
                <Route path="/reconciliation" element={<Reconciliation />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/trial-balance" element={<TrialBalance />} />
                <Route path="/general-ledger" element={<GeneralLedger />} />
                <Route path="/cash-book" element={<CashBook />} />
                <Route path="/compliance" element={<ComplianceReports />} />
                <Route path="/custom-reports" element={<CustomReports />} />
                <Route path="/documents" element={<Documents />} />
                <Route path="/email-templates" element={<EmailTemplates />} />
                <Route path="/invoice-templates" element={<InvoiceTemplates />} />
                <Route path="/exchange-rates" element={<ExchangeRates />} />
                <Route path="/data-import" element={<DataImport />} />
                <Route path="/automation" element={<Automation />} />
                <Route path="/payment-gateway" element={<PaymentGateway />} />
                <Route path="/api-docs" element={<APIDocumentation />} />
                <Route path="/audit" element={<AuditTrail />} />
                <Route path="/security" element={<SecurityCenter />} />
                <Route path="/language" element={<LanguageSettings />} />
                <Route path="/notifications" element={<NotificationCenter />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/multi-company" element={<MultiCompany />} />
                <Route path="/period-close" element={<PeriodClose />} />
                <Route path="/revenue-recognition" element={<RevenueRecognition />} />
                <Route path="/lease-accounting" element={<LeaseAccounting />} />
                <Route path="/inventory-lots" element={<InventoryLots />} />
                <Route path="/job-costing" element={<JobCosting />} />
                <Route path="/project-billing" element={<ProjectBilling />} />
                <Route path="/bank-rules" element={<BankRules />} />
                <Route path="/inventory-valuation" element={<InventoryValuation />} />
                <Route path="/cash-flow-forecast" element={<CashFlowForecast />} />
                <Route path="/fiscal-year" element={<FiscalYearSettings />} />
                <Route path="/tax-rules" element={<TaxRules />} />
                <Route path="/consolidation" element={<Consolidation />} />
                <Route path="/inter-company" element={<InterCompany />} />
                <Route path="/webhooks" element={<Webhooks />} />
                <Route path="/webhook-logs" element={<WebhookLogs />} />
                <Route path="/email-sender" element={<EmailSender />} />
                <Route path="/pdf-generator" element={<PDFGenerator />} />
                <Route path="/document-versions" element={<DocumentVersions />} />
                <Route path="/dark-mode" element={<DarkMode />} />
                <Route path="/smart-categorization" element={<SmartCategorization />} />
                <Route path="/anomaly-detection" element={<AnomalyDetection />} />
                <Route path="/customer-analytics" element={<CustomerAnalytics />} />
                <Route path="/expense-analytics" element={<ExpenseAnalytics />} />
                <Route path="/workflow-designer" element={<WorkflowDesigner />} />
                <Route path="/collaboration-hub" element={<CollaborationHub />} />
                <Route path="/compliance-dashboard" element={<ComplianceDashboard />} />
                <Route path="/profitability-analysis" element={<ProfitabilityAnalysis />} />
                <Route path="/inventory-analytics" element={<InventoryAnalytics />} />
                <Route path="/financial-health" element={<FinancialHealth />} />
                <Route path="/invoice-splitter" element={<InvoiceSplitter />} />
                <Route path="/bulk-actions" element={<BulkActions />} />
                <Route path="/smart-search" element={<SmartSearch />} />
                <Route path="/financial-calendar" element={<FinancialCalendar />} />
                <Route path="/vendor-scorecard" element={<VendorScorecard />} />
                <Route path="/customer-portal" element={<CustomerPortal />} />
                <Route path="/tax-calendar" element={<TaxCalendar />} />
                <Route path="/inventory-forecast" element={<InventoryForecast />} />
                <Route path="/kpi-builder" element={<KPIBuilder />} />
                <Route path="/audit-wizard" element={<AuditWizard />} />
                <Route path="/currency-hedge" element={<CurrencyHedge />} />
                <Route path="/supplier-portal" element={<SupplierPortal />} />
                <Route path="/document-ai" element={<DocumentAI />} />
                <Route path="/budget-variance" element={<BudgetVariance />} />
                <Route path="/multi-currency-invoice" element={<MultiCurrencyInvoice />} />
                <Route path="/expense-policy" element={<ExpensePolicy />} />
                <Route path="/project-gantt" element={<ProjectGantt />} />
                <Route path="/invoice-reminder" element={<InvoiceReminder />} />
                <Route path="/cash-position" element={<CashPosition />} />
                <Route path="/credit-management" element={<CreditManagement />} />
                <Route path="/serial-number-tracker" element={<SerialNumberTracker />} />
                <Route path="/batch-processing" element={<BatchProcessing />} />
                <Route path="/data-backup" element={<DataBackup />} />
                <Route path="/api-webhooks" element={<APIWebhooks />} />
                <Route path="/system-health" element={<SystemHealth />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </AppLayout>
        }
      />
    </Routes>
  );
}
