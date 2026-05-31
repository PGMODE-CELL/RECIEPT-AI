import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router";
import {
  TrendingUp, TrendingDown, Wallet, AlertCircle,
  Receipt, FileText, Users, Package, ClipboardList,
  FolderKanban, Users2, ArrowUpRight, ArrowDownRight,
  Clock, DollarSign, Activity
} from "lucide-react";
import { useApi } from "@/providers/ApiProvider";
import { api } from "@/lib/api";
import { useApiQuery } from "@/hooks/useApiQuery";

export default function Dashboard() {
  const navigate = useNavigate();
  const { orgId, isAuthenticated } = useApi();
  const isReal = isAuthenticated && !!orgId;

  const { data: stats, isLoading } = isReal
    ? useApiQuery<any>(["dashboard", "stats"], () => api.dashboard.stats(orgId!))
    : trpc.dashboard.stats.useQuery();
  const { data: recent } = isReal
    ? useApiQuery<any[]>(["dashboard", "recent"], () =>
        api.transactions.list(orgId!).then(txs => (txs || []).slice(0, 10))
      )
    : trpc.dashboard.recentActivity.useQuery();

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

  const cards = [
    { label: "Total Revenue", value: stats?.revenue ?? 0, icon: TrendingUp, color: "text-green-600", bg: "bg-green-50", change: "+12%" },
    { label: "Outstanding", value: stats?.outstanding ?? 0, icon: AlertCircle, color: "text-amber-600", bg: "bg-amber-50", change: "-5%" },
    { label: "Overdue", value: stats?.overdue ?? 0, icon: TrendingDown, color: "text-red-600", bg: "bg-red-50", change: "+2%" },
    { label: "Bank Balance", value: stats?.bankBalance ?? 0, icon: Wallet, color: "text-blue-600", bg: "bg-blue-50", change: "+8%" },
  ];

  const quickStats = [
    { label: "Invoices", count: stats?.invoiceCount ?? 0, icon: FileText, path: "/invoices", color: "text-blue-600" },
    { label: "Bills", count: stats?.billCount ?? 0, icon: Receipt, path: "/bills", color: "text-amber-600" },
    { label: "Contacts", count: stats?.contactCount ?? 0, icon: Users, path: "/contacts", color: "text-purple-600" },
    { label: "Products", count: stats?.productCount ?? 0, icon: Package, path: "/products", color: "text-green-600" },
    { label: "Receipts", count: stats?.pendingReceipts ?? 0, icon: ClipboardList, path: "/receipts", color: "text-pink-600" },
    { label: "Projects", count: stats?.activeProjects ?? 0, icon: FolderKanban, path: "/projects", color: "text-indigo-600" },
    { label: "Employees", count: stats?.employeeCount ?? 0, icon: Users2, path: "/employees", color: "text-cyan-600" },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Overview of your business</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate("/invoices")} className="bg-indigo-600 hover:bg-indigo-700">
            <FileText className="w-4 h-4 mr-2" /> New Invoice
          </Button>
          <Button variant="outline" onClick={() => navigate("/bills")}>
            <Receipt className="w-4 h-4 mr-2" /> New Bill
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}><CardContent className="p-6"><Skeleton className="h-20" /></CardContent></Card>
            ))
          : cards.map((card) => {
              const Icon = card.icon;
              return (
                <Card key={card.label} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{card.label}</p>
                        <p className={`text-2xl font-bold mt-1 ${card.color}`}>{formatCurrency(card.value)}</p>
                        <div className="flex items-center gap-1 mt-1">
                          {card.change.startsWith("+") ? (
                            <ArrowUpRight className="w-3 h-3 text-green-500" />
                          ) : (
                            <ArrowDownRight className="w-3 h-3 text-red-500" />
                          )}
                          <span className={`text-xs ${card.change.startsWith("+") ? "text-green-600" : "text-red-600"}`}>{card.change}</span>
                          <span className="text-xs text-gray-400">vs last month</span>
                        </div>
                      </div>
                      <div className={`w-12 h-12 rounded-lg ${card.bg} flex items-center justify-center`}>
                        <Icon className={`w-6 h-6 ${card.color}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Stats */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Quick Access</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {quickStats.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    onClick={() => navigate(item.path)}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center group-hover:bg-indigo-100">
                      <Icon className={`w-5 h-5 ${item.color}`} />
                    </div>
                    <span className="text-lg font-semibold text-gray-900 dark:text-white">{item.count}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recent?.length === 0 && (
              <div className="text-center py-8">
                <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No recent activity</p>
              </div>
            )}
            {recent?.map((item: any) => (
              <div
                key={`${item.type}-${item.id}`}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                onClick={() => navigate(`/${item.type}s/${item.id}`)}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    item.type === "invoice" ? "bg-green-100" : "bg-amber-100"
                  }`}>
                    {item.type === "invoice" ? (
                      <FileText className="w-4 h-4 text-green-600" />
                    ) : (
                      <Receipt className="w-4 h-4 text-amber-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{item.number}</p>
                    <p className="text-xs text-gray-500">{item.person || "No contact"}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(Number(item.amount))}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    item.status === "paid" ? "bg-green-100 text-green-700" :
                    item.status === "overdue" ? "bg-red-100 text-red-700" :
                    "bg-gray-100 text-gray-600"
                  }`}>{item.status}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Monthly Revenue Trend</CardTitle>
        </CardHeader>
        <CardContent>
          {stats?.monthlyRevenue && stats.monthlyRevenue.length > 0 ? (
            <div className="flex items-end gap-2 h-48">
              {stats.monthlyRevenue.map((m: any) => {
                const maxVal = Math.max(...stats.monthlyRevenue.map((x: any) => x.amount), 1);
                const height = (m.amount / maxVal) * 100;
                return (
                  <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs text-gray-500">{formatCurrency(m.amount)}</span>
                    <div
                      className="w-full bg-indigo-500 rounded-t-lg min-h-[4px] transition-all hover:bg-indigo-600"
                      style={{ height: `${height}%` }}
                    />
                    <span className="text-xs text-gray-500">{m.month}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No revenue data yet. Create your first invoice to see trends.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bills Due & Overdue Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              Outstanding Bills
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <p className="text-3xl font-bold text-amber-600">{formatCurrency(stats?.billsDue ?? 0)}</p>
              <p className="text-sm text-gray-500 mt-1">{stats?.billCount ?? 0} bills total</p>
            </div>
            <Button variant="outline" className="w-full" onClick={() => navigate("/bills")}>
              View Bills
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" />
              Pending Receipts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <p className="text-3xl font-bold text-blue-600">{stats?.pendingReceipts ?? 0}</p>
              <p className="text-sm text-gray-500 mt-1">receipts to process</p>
            </div>
            <Button variant="outline" className="w-full" onClick={() => navigate("/receipts")}>
              View Receipts
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
