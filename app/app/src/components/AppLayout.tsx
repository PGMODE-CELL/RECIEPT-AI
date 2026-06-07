import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { useApi } from "@/providers/ApiProvider";
import { getToken } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Receipt, FileText, Users, Package,
  FolderKanban, Users2, Wallet, BookOpen, Calculator,
  BarChart3, Settings, ChevronLeft, ChevronRight, LogOut,
  Landmark, FileSpreadsheet, ClipboardList, Briefcase,
  Target, Gem, Repeat, GitCompareArrows, Shield,
  CreditCard, ShoppingCart, FileSignature, Clock, DollarSign, Bell,
  Brain, Scale, Building, FileCode, Lock, Globe, Zap,
  Phone, Wrench, MessageSquare, Languages, FileInput, Percent, MapPin,
  Building2, Calendar, TrendingUp, Home, LineChart, Moon,
  ScrollText, Mail, GitCommit, Layers, GitBranch, Webhook,
  Cpu, AlertTriangle, UsersRound, Workflow, Handshake,
  ShieldCheck, TrendingDown, BarChart, HeartPulse
} from "lucide-react";

const navItems = [
  { path: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/custom-dashboard", icon: LayoutDashboard, label: "Custom Dashboard" },
  { path: "/ai-insights", icon: Brain, label: "AI Insights" },
  { path: "/crm", icon: Phone, label: "CRM" },
  { path: "/invoices", icon: FileText, label: "Invoices" },
  { path: "/credit-notes", icon: CreditCard, label: "Credit Notes" },
  { path: "/bills", icon: Receipt, label: "Bills" },
  { path: "/purchase-orders", icon: ShoppingCart, label: "Purchase Orders" },
  { path: "/quotations", icon: FileSignature, label: "Quotations" },
  { path: "/banking", icon: Landmark, label: "Banking" },
  { path: "/bank-feed", icon: FileSpreadsheet, label: "Bank Feed Import" },
  { path: "/contacts", icon: Users, label: "Contacts" },
  { path: "/products", icon: Package, label: "Products" },
  { path: "/manufacturing", icon: Wrench, label: "Manufacturing" },
  { path: "/projects", icon: FolderKanban, label: "Projects" },
  { path: "/time-tracking", icon: Clock, label: "Time Tracking" },
  { path: "/expense-claims", icon: DollarSign, label: "Expenses" },
  { path: "/employees", icon: Users2, label: "Employees" },
  { path: "/payroll", icon: Briefcase, label: "Payroll" },
  { path: "/receipts", icon: ClipboardList, label: "Receipts" },
  { path: "/accounts", icon: BookOpen, label: "Chart of Accounts" },
  { path: "/journal", icon: Calculator, label: "Journal Entries" },
  { path: "/cost-centers", icon: MapPin, label: "Cost Centers" },
  { path: "/budgets", icon: Target, label: "Budgets" },
  { path: "/assets", icon: Gem, label: "Fixed Assets" },
  { path: "/recurring", icon: Repeat, label: "Recurring" },
  { path: "/reconciliation", icon: GitCompareArrows, label: "Reconciliation" },
  { path: "/reports", icon: BarChart3, label: "Reports" },
  { path: "/trial-balance", icon: Scale, label: "Trial Balance" },
  { path: "/general-ledger", icon: BookOpen, label: "General Ledger" },
  { path: "/cash-book", icon: DollarSign, label: "Cash Book" },
  { path: "/compliance", icon: Percent, label: "Compliance Reports" },
  { path: "/custom-reports", icon: BarChart3, label: "Custom Reports" },
  { path: "/documents", icon: FileSpreadsheet, label: "Documents" },
  { path: "/email-templates", icon: MessageSquare, label: "Email Templates" },
  { path: "/invoice-templates", icon: FileCode, label: "Invoice Templates" },
  { path: "/exchange-rates", icon: Globe, label: "Exchange Rates" },
  { path: "/data-import", icon: FileInput, label: "Data Import" },
  { path: "/automation", icon: Zap, label: "Automation" },
  { path: "/payment-gateway", icon: DollarSign, label: "Payments" },
  { path: "/api-docs", icon: FileCode, label: "API Docs" },
  { path: "/audit", icon: Shield, label: "Audit Trail" },
  { path: "/security", icon: Lock, label: "Security" },
  { path: "/language", icon: Languages, label: "Language" },
  { path: "/notifications", icon: Bell, label: "Notifications" },
  { path: "/settings", icon: Settings, label: "Settings" },
  { path: "/multi-company", icon: Building2, label: "Multi-Company", group: "Advanced" },
  { path: "/period-close", icon: Calendar, label: "Period Close", group: "Advanced" },
  { path: "/revenue-recognition", icon: TrendingUp, label: "Revenue Recognition", group: "Advanced" },
  { path: "/lease-accounting", icon: Home, label: "Lease Accounting", group: "Advanced" },
  { path: "/inventory-lots", icon: Package, label: "Inventory Lots", group: "Advanced" },
  { path: "/job-costing", icon: Briefcase, label: "Job Costing", group: "Advanced" },
  { path: "/project-billing", icon: DollarSign, label: "Project Billing", group: "Advanced" },
  { path: "/bank-rules", icon: Zap, label: "Bank Rules", group: "Advanced" },
  { path: "/inventory-valuation", icon: BarChart3, label: "Inventory Valuation", group: "Advanced" },
  { path: "/cash-flow-forecast", icon: LineChart, label: "Cash Flow Forecast", group: "Advanced" },
  { path: "/fiscal-year", icon: Calendar, label: "Fiscal Year", group: "Advanced" },
  { path: "/tax-rules", icon: Percent, label: "Tax Rules", group: "Advanced" },
  { path: "/consolidation", icon: Layers, label: "Consolidation", group: "Advanced" },
  { path: "/inter-company", icon: GitBranch, label: "Inter-Company", group: "Advanced" },
  { path: "/webhooks", icon: Webhook, label: "Webhooks", group: "Advanced" },
  { path: "/webhook-logs", icon: ScrollText, label: "Webhook Logs", group: "Advanced" },
  { path: "/email-sender", icon: Mail, label: "Email Sender", group: "Advanced" },
  { path: "/pdf-generator", icon: FileText, label: "PDF Generator", group: "Advanced" },
  { path: "/document-versions", icon: GitCommit, label: "Document Versions", group: "Advanced" },
  { path: "/dark-mode", icon: Moon, label: "Dark Mode", group: "Settings" },
  { path: "/smart-categorization", icon: Cpu, label: "Smart Categorization", group: "Analytics" },
  { path: "/anomaly-detection", icon: AlertTriangle, label: "Anomaly Detection", group: "Analytics" },
  { path: "/customer-analytics", icon: UsersRound, label: "Customer Analytics", group: "Analytics" },
  { path: "/expense-analytics", icon: Receipt, label: "Expense Analytics", group: "Analytics" },
  { path: "/profitability-analysis", icon: TrendingDown, label: "Profitability Analysis", group: "Analytics" },
  { path: "/inventory-analytics", icon: BarChart, label: "Inventory Analytics", group: "Analytics" },
  { path: "/financial-health", icon: HeartPulse, label: "Financial Health", group: "Analytics" },
  { path: "/workflow-designer", icon: Workflow, label: "Workflow Designer", group: "Collaboration" },
  { path: "/collaboration-hub", icon: Handshake, label: "Collaboration Hub", group: "Collaboration" },
  { path: "/compliance-dashboard", icon: ShieldCheck, label: "Compliance Dashboard", group: "Collaboration" },
  { path: "/invoice-splitter", icon: FileText, label: "Invoice Splitter", group: "Operations" },
  { path: "/bulk-actions", icon: Zap, label: "Bulk Actions", group: "Operations" },
  { path: "/invoice-reminder", icon: Bell, label: "Invoice Reminder", group: "Operations" },
  { path: "/batch-processing", icon: Layers, label: "Batch Processing", group: "Operations" },
  { path: "/smart-search", icon: Brain, label: "Smart Search", group: "Intelligence" },
  { path: "/kpi-builder", icon: BarChart3, label: "KPI Builder", group: "Intelligence" },
  { path: "/document-ai", icon: FileCode, label: "Document AI", group: "Intelligence" },
  { path: "/inventory-forecast", icon: TrendingUp, label: "Inventory Forecast", group: "Intelligence" },
  { path: "/budget-variance", icon: Target, label: "Budget Variance", group: "Intelligence" },
  { path: "/customer-portal", icon: Users, label: "Customer Portal", group: "Portals" },
  { path: "/supplier-portal", icon: Briefcase, label: "Supplier Portal", group: "Portals" },
  { path: "/financial-calendar", icon: Calendar, label: "Financial Calendar", group: "Calendar" },
  { path: "/tax-calendar", icon: Calendar, label: "Tax Calendar", group: "Calendar" },
  { path: "/vendor-scorecard", icon: BarChart, label: "Vendor Scorecard", group: "Analytics" },
  { path: "/cash-position", icon: DollarSign, label: "Cash Position", group: "Analytics" },
  { path: "/credit-management", icon: CreditCard, label: "Credit Management", group: "Analytics" },
  { path: "/currency-hedge", icon: Globe, label: "Currency Hedge", group: "Analytics" },
  { path: "/multi-currency-invoice", icon: Globe, label: "Multi-Currency Invoice", group: "Analytics" },
  { path: "/expense-policy", icon: Receipt, label: "Expense Policy", group: "Advanced" },
  { path: "/project-gantt", icon: FolderKanban, label: "Project Gantt", group: "Advanced" },
  { path: "/serial-number-tracker", icon: ClipboardList, label: "Serial Number Tracker", group: "Advanced" },
  { path: "/audit-wizard", icon: Shield, label: "Audit Wizard", group: "Advanced" },
  { path: "/data-backup", icon: FileSpreadsheet, label: "Data Backup", group: "Advanced" },
  { path: "/api-webhooks", icon: Webhook, label: "API Webhooks", group: "System" },
  { path: "/system-health", icon: Cpu, label: "System Health", group: "System" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("theme") === "dark" ||
        (!localStorage.getItem("theme") && window.matchMedia("(prefers-color-scheme: dark)").matches);
    }
    return false;
  });
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading, logout } = useAuth({
    redirectOnUnauthenticated: true,
  });
  const { orgId } = useApi();

  useEffect(() => {
    if (!isLoading && isAuthenticated && !orgId && getToken()) {
      navigate("/org-setup");
    }
  }, [isLoading, isAuthenticated, orgId, navigate]);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const mainItems = navItems.filter((item) => !item.group);
  const operationsItems = navItems.filter((item) => item.group === "Operations");
  const intelligenceItems = navItems.filter((item) => item.group === "Intelligence");
  const portalsItems = navItems.filter((item) => item.group === "Portals");
  const calendarItems = navItems.filter((item) => item.group === "Calendar");
  const analyticsItems = navItems.filter((item) => item.group === "Analytics");
  const advancedItems = navItems.filter((item) => item.group === "Advanced");
  const collaborationItems = navItems.filter((item) => item.group === "Collaboration");
  const systemItems = navItems.filter((item) => item.group === "System");
  const settingsItems = navItems.filter((item) => item.group === "Settings");

  const renderNavItem = (item: typeof navItems[0]) => {
    const Icon = item.icon;
    const active = isActive(item.path);
    return (
      <Link
        key={item.path}
        to={item.path}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
          active
            ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
            : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
        } ${collapsed ? "justify-center" : ""}`}
        title={collapsed ? item.label : undefined}
      >
        <Icon className="w-5 h-5 flex-shrink-0" />
        {!collapsed && <span>{item.label}</span>}
      </Link>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <aside
        className={`bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-all duration-300 ${
          collapsed ? "w-16" : "w-64"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
          {!collapsed && (
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg text-gray-900 dark:text-white">ReceiptAI</span>
            </Link>
          )}
          {collapsed && (
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center mx-auto">
              <Wallet className="w-5 h-5 text-white" />
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="w-7 h-7"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {mainItems.map(renderNavItem)}

          {!collapsed && operationsItems.length > 0 && (
            <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="px-3 py-1 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                Operations
              </p>
            </div>
          )}
          {operationsItems.map(renderNavItem)}

          {!collapsed && intelligenceItems.length > 0 && (
            <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="px-3 py-1 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                Intelligence
              </p>
            </div>
          )}
          {intelligenceItems.map(renderNavItem)}

          {!collapsed && portalsItems.length > 0 && (
            <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="px-3 py-1 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                Portals
              </p>
            </div>
          )}
          {portalsItems.map(renderNavItem)}

          {!collapsed && calendarItems.length > 0 && (
            <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="px-3 py-1 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                Calendar
              </p>
            </div>
          )}
          {calendarItems.map(renderNavItem)}

          {!collapsed && analyticsItems.length > 0 && (
            <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="px-3 py-1 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                Analytics
              </p>
            </div>
          )}
          {analyticsItems.map(renderNavItem)}

          {!collapsed && collaborationItems.length > 0 && (
            <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="px-3 py-1 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                Collaboration
              </p>
            </div>
          )}
          {collaborationItems.map(renderNavItem)}

          {!collapsed && advancedItems.length > 0 && (
            <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="px-3 py-1 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                Advanced
              </p>
            </div>
          )}
          {advancedItems.map(renderNavItem)}

          {!collapsed && systemItems.length > 0 && (
            <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="px-3 py-1 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                System
              </p>
            </div>
          )}
          {systemItems.map(renderNavItem)}

          {!collapsed && settingsItems.length > 0 && (
            <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="px-3 py-1 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                Settings
              </p>
            </div>
          )}
          {settingsItems.map(renderNavItem)}
        </nav>

        {/* User */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-3">
          <div className={`flex items-center ${collapsed ? "justify-center" : "gap-3"}`}>
            {user?.avatar ? (
              <img src={user.avatar} alt="" className="w-8 h-8 rounded-full" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                  {user?.name?.[0] || "U"}
                </span>
              </div>
            )}
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user?.name || "User"}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email || ""}</p>
              </div>
            )}
            {!collapsed && (
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => setDarkMode(!darkMode)}>
                  <Moon className={`w-4 h-4 ${darkMode ? "text-indigo-400" : "text-gray-500"}`} />
                </Button>
                <Button variant="ghost" size="icon" className="w-7 h-7" onClick={logout}>
                  <LogOut className="w-4 h-4 text-gray-500" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
