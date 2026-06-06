import { useState, useEffect, useMemo } from "react";
import { useApi } from "@/providers/ApiProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  TrendingUp, TrendingDown, Wallet, AlertCircle,
  Receipt, FileText, Users, FolderKanban,
  ArrowUp, ArrowDown, Plus, X, GripVertical,
  DollarSign, BarChart3, Activity
} from "lucide-react";
import { trpc } from "@/providers/trpc";

type WidgetId = "revenue" | "expenses" | "cashflow" | "profitmargin" | "invoices" | "bills" | "customers" | "projects";

interface WidgetDef {
  id: WidgetId;
  label: string;
  icon: typeof TrendingUp;
  color: string;
  bg: string;
  value: string;
  sub: string;
}

const WIDGET_IDS: WidgetId[] = ["revenue", "expenses", "cashflow", "profitmargin", "invoices", "bills", "customers", "projects"];

interface WidgetMeta {
  label: string;
  icon: typeof TrendingUp;
  color: string;
  bg: string;
}

const WIDGET_META: Record<WidgetId, WidgetMeta> = {
  revenue: { label: "Revenue", icon: TrendingUp, color: "text-green-600", bg: "bg-green-50" },
  expenses: { label: "Expenses", icon: TrendingDown, color: "text-red-600", bg: "bg-red-50" },
  cashflow: { label: "Cash Flow", icon: Wallet, color: "text-blue-600", bg: "bg-blue-50" },
  profitmargin: { label: "Profit Margin", icon: BarChart3, color: "text-purple-600", bg: "bg-purple-50" },
  invoices: { label: "Invoices", icon: FileText, color: "text-indigo-600", bg: "bg-indigo-50" },
  bills: { label: "Bills", icon: Receipt, color: "text-amber-600", bg: "bg-amber-50" },
  customers: { label: "Customers", icon: Users, color: "text-cyan-600", bg: "bg-cyan-50" },
  projects: { label: "Projects", icon: FolderKanban, color: "text-pink-600", bg: "bg-pink-50" },
};

function getLayoutKey() {
  try {
    const raw = localStorage.getItem("receiptai_org");
    if (raw) {
      const parsed = JSON.parse(raw);
      return `custom-dashboard-layout-${parsed}`;
    }
  } catch {}
  return "custom-dashboard-layout";
}

function loadLayout(): WidgetId[] {
  try {
    const stored = localStorage.getItem(getLayoutKey());
    if (stored) {
      const parsed = JSON.parse(stored) as WidgetId[];
      const valid = parsed.filter((id) => WIDGET_IDS.includes(id));
      if (valid.length === WIDGET_IDS.length) return valid;
    }
  } catch {}
  return [...WIDGET_IDS];
}

function saveLayout(ids: WidgetId[]) {
  localStorage.setItem(getLayoutKey(), JSON.stringify(ids));
}

export default function CustomDashboard() {
  const { orgId, isAuthenticated } = useApi();
  const [layout, setLayout] = useState<WidgetId[]>(loadLayout);
  const [adding, setAdding] = useState(false);
  const dashboardEnabled = isAuthenticated && !!orgId;

  const { data: stats } = trpc.dashboard.stats.useQuery(undefined, { enabled: dashboardEnabled,
    placeholderData: {
      revenue: 0, outstanding: 0, overdue: 0, bankBalance: 0,
      totalBills: 0, billsDue: 0, invoiceCount: 0, billCount: 0,
      contactCount: 0, productCount: 0, pendingReceipts: 0,
      activeProjects: 0, employeeCount: 0, monthlyRevenue: [],
    },
  });

  const ALL_WIDGETS: WidgetDef[] = useMemo(() => {
    const s = stats || {
      revenue: 0, outstanding: 0, overdue: 0, bankBalance: 0,
      totalBills: 0, billsDue: 0, invoiceCount: 0, billCount: 0,
      contactCount: 0, productCount: 0, pendingReceipts: 0,
      activeProjects: 0, employeeCount: 0, monthlyRevenue: [],
    };
    const fmt = (n: number) => `$${n.toLocaleString()}`;
    return [
      { id: "revenue", label: "Revenue", icon: TrendingUp, color: "text-green-600", bg: "bg-green-50", value: fmt(s.revenue || 0), sub: "Total income" },
      { id: "expenses", label: "Expenses", icon: TrendingDown, color: "text-red-600", bg: "bg-red-50", value: fmt(s.totalBills || 0), sub: "Outstanding bills" },
      { id: "cashflow", label: "Cash Flow", icon: Wallet, color: "text-blue-600", bg: "bg-blue-50", value: fmt(s.bankBalance || 0), sub: "Bank balance" },
      { id: "profitmargin", label: "Profit Margin", icon: BarChart3, color: "text-purple-600", bg: "bg-purple-50", value: s.revenue ? `${((s.revenue - (s.totalBills || 0)) / s.revenue * 100).toFixed(1)}%` : "—", sub: "Income vs bills" },
      { id: "invoices", label: "Invoices", icon: FileText, color: "text-indigo-600", bg: "bg-indigo-50", value: `${s.invoiceCount || 0}`, sub: `${s.outstanding || 0} outstanding, ${s.overdue || 0} overdue` },
      { id: "bills", label: "Bills", icon: Receipt, color: "text-amber-600", bg: "bg-amber-50", value: `${s.billCount || 0}`, sub: `${s.billsDue || 0} due` },
      { id: "customers", label: "Customers", icon: Users, color: "text-cyan-600", bg: "bg-cyan-50", value: `${s.contactCount || 0}`, sub: `${s.productCount || 0} products` },
      { id: "projects", label: "Projects", icon: FolderKanban, color: "text-pink-600", bg: "bg-pink-50", value: `${s.activeProjects || 0}`, sub: `${s.pendingReceipts || 0} pending receipts` },
    ];
  }, [stats]);

  useEffect(() => {
    saveLayout(layout);
  }, [layout]);

  const visible = layout.map((id) => ALL_WIDGETS.find((w) => w.id === id)!).filter(Boolean);
  const hidden = ALL_WIDGETS.filter((w) => !layout.includes(w.id));

  const addWidget = (id: WidgetId) => {
    setLayout((prev) => [...prev, id]);
    setAdding(false);
  };

  const removeWidget = (id: WidgetId) => {
    setLayout((prev) => prev.filter((w) => w !== id));
  };

  const moveWidget = (id: WidgetId, dir: -1 | 1) => {
    setLayout((prev) => {
      const idx = prev.indexOf(id);
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      return next;
    });
  };

  const resetLayout = () => {
    const defaultLayout = ALL_WIDGETS.map((w) => w.id);
    setLayout(defaultLayout);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Custom Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Drag, add, remove, and reorder widgets</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetLayout}>Reset Layout</Button>
          <Button onClick={() => setAdding(true)} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-4 h-4 mr-2" /> Add Widget
          </Button>
        </div>
      </div>

      {/* Add Widget Modal */}
      {adding && (
        <Card className="border-indigo-200 dark:border-indigo-800">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Add Widget</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setAdding(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {hidden.length === 0 ? (
              <p className="text-sm text-gray-500">All widgets are already on the dashboard.</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {hidden.map((w) => {
                  const Icon = w.icon;
                  return (
                    <button
                      key={w.id}
                      onClick={() => addWidget(w.id)}
                      className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all"
                    >
                      <div className={`w-10 h-10 rounded-lg ${w.bg} flex items-center justify-center`}>
                        <Icon className={`w-5 h-5 ${w.color}`} />
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{w.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Widget Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {visible.map((w) => {
          const Icon = w.icon;
          return (
            <Card key={w.id} className="hover:shadow-md transition-shadow relative group">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg ${w.bg} flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${w.color}`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{w.label}</p>
                      <p className={`text-xl font-bold ${w.color}`}>{w.value}</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => moveWidget(w.id, -1)}
                      disabled={layout.indexOf(w.id) === 0}
                    >
                      <ArrowUp className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => moveWidget(w.id, 1)}
                      disabled={layout.indexOf(w.id) === layout.length - 1}
                    >
                      <ArrowDown className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                      onClick={() => removeWidget(w.id)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 ml-13">{w.sub}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {visible.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No widgets on the dashboard. Click "Add Widget" to get started.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
