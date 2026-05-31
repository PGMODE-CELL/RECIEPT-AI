import { useMemo } from "react";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, AreaChart, Area,
} from "recharts";
import {
  Brain, TrendingUp, TrendingDown, AlertTriangle, Lightbulb,
  DollarSign, PieChart as PieChartIcon, BarChart3, Activity, Sparkles,
} from "lucide-react";

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899"];

export default function AIInsights() {
  const { data: stats } = trpc.dashboard.stats.useQuery();
  const { data: pl } = trpc.report.profitLoss.useQuery({
    from: new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0],
    to: new Date().toISOString().split("T")[0],
  });

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

  const insights = useMemo(() => {
    const monthlyRevenue = stats?.monthlyRevenue ?? [];
    const amounts = monthlyRevenue.map((m: any) => m.amount);
    const labels = monthlyRevenue.map((m: any) => m.month);

    // --- Revenue Trend Prediction (Linear Regression) ---
    const n = amounts.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    for (let i = 0; i < n; i++) {
      sumX += i; sumY += amounts[i]; sumXY += i * amounts[i]; sumXX += i * i;
    }
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX || 1);
    const intercept = (sumY - slope * sumX) / (n || 1);
    const predicted = amounts.length > 0 ? slope * n + intercept : 0;
    const trend = slope > 0 ? "up" : slope < 0 ? "down" : "flat";

    const revenueTrendData = [
      ...monthlyRevenue.map((m: any) => ({ name: m.month, revenue: m.amount })),
      { name: "Forecast", revenue: Math.max(0, Math.round(predicted)) },
    ];

    // --- Expense Anomaly Detection ---
    const expenseAccounts = pl?.expenseAccounts ?? [];
    const totalExpenses = pl?.expenses || 1;
    const categoryData = expenseAccounts.map((a: any) => ({
      name: a.name,
      amount: Math.abs(Number(a.amount)),
      percent: (Math.abs(Number(a.amount)) / totalExpenses) * 100,
    })).sort((a: any, b: any) => b.amount - a.amount);

    const avgExpense = totalExpenses / (categoryData.length || 1);
    const anomalies = categoryData.filter((c: any) => c.amount > avgExpense * 1.5);

    // --- Cash Flow Forecast ---
    const avgIncome = amounts.length > 0 ? amounts.reduce((a: number, b: number) => a + b, 0) / amounts.length : 0;
    const avgExpenseMonthly = totalExpenses / Math.max(n, 1);
    const currentBalance = stats?.bankBalance ?? 0;

    const cashFlowForecast = [];
    let balance = currentBalance;
    for (let i = 1; i <= 3; i++) {
      const monthName = new Date(new Date().getFullYear(), new Date().getMonth() + i).toLocaleString("default", { month: "short" });
      const inflow = Math.round(avgIncome * (1 + slope / (avgIncome || 1)));
      const outflow = Math.round(avgExpenseMonthly);
      balance += inflow - outflow;
      cashFlowForecast.push({ month: monthName, inflow, outflow, balance: Math.max(0, Math.round(balance)) });
    }

    // --- Top Spending ---
    const topSpending = categoryData.slice(0, 5);

    // --- Profit Margin ---
    const income = pl?.income || 0;
    const netProfit = pl?.netProfit || 0;
    const profitMargin = income > 0 ? (netProfit / income) * 100 : 0;

    const marginData = [
      { name: "Revenue", value: income },
      { name: "Expenses", value: Math.abs(totalExpenses) },
      { name: "Net Profit", value: Math.max(0, netProfit) },
    ];

    // --- Smart Recommendations ---
    const recs: { text: string; type: "warning" | "success" | "info"; icon: string }[] = [];

    if (profitMargin < 20) {
      recs.push({ text: "Profit margin is below 20%. Consider raising prices or cutting costs.", type: "warning", icon: "💰" });
    } else {
      recs.push({ text: "Healthy profit margin. Maintain current pricing strategy.", type: "success", icon: "✅" });
    }

    if (anomalies.length > 0) {
      recs.push({ text: `Unusually high spending in "${anomalies[0].name}". Review for possible savings.`, type: "warning", icon: "⚠️" });
    }

    if (trend === "up") {
      recs.push({ text: "Revenue is trending upward. Consider reinvesting in growth.", type: "success", icon: "📈" });
    } else if (trend === "down") {
      recs.push({ text: "Revenue is declining. Focus on customer retention and new sales.", type: "warning", icon: "📉" });
    }

    const cashRunway = avgIncome > 0 ? Math.round(currentBalance / avgIncome) : 0;
    if (cashRunway < 3 && cashRunway > 0) {
      recs.push({ text: `Cash runway is ~${cashRunway} months. Accelerate receivables collection.`, type: "warning", icon: "🚨" });
    } else {
      recs.push({ text: `Cash runway is approximately ${cashRunway || "∞"} months. Financially stable.`, type: "info", icon: "🏦" });
    }

    return {
      revenueTrendData, trend, predicted, slope,
      categoryData, anomalies, totalExpenses,
      cashFlowForecast, currentBalance,
      topSpending, profitMargin, marginData,
      recs, income,
    };
  }, [stats, pl]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Brain className="w-6 h-6 text-indigo-600" /> AI Insights
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Smart analysis and predictions for your business</p>
        </div>
        <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 px-3 py-1">
          <Sparkles className="w-3 h-3 mr-1" /> Powered by AI
        </Badge>
      </div>

      {/* Revenue Trend & Prediction */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" /> Revenue Trend & Prediction
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={insights.revenueTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Area type="monotone" dataKey="revenue" stroke="#6366f1" fill="#818cf8" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Trend Summary</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
              <p className="text-sm text-gray-500">Current Trend</p>
              <div className="flex items-center gap-2 mt-1">
                {insights.trend === "up" ? (
                  <TrendingUp className="w-5 h-5 text-green-600" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-red-600" />
                )}
                <span className={`text-lg font-bold ${insights.trend === "up" ? "text-green-600" : "text-red-600"}`}>
                  {insights.trend === "up" ? "Growing" : "Declining"}
                </span>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-indigo-50 dark:bg-indigo-900/20">
              <p className="text-sm text-gray-500">Forecasted Next Month</p>
              <p className="text-xl font-bold text-indigo-700">{formatCurrency(Math.max(0, Math.round(insights.predicted)))}</p>
            </div>
            <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
              <p className="text-sm text-gray-500">Monthly Growth Rate</p>
              <p className={`text-lg font-bold ${insights.slope >= 0 ? "text-green-600" : "text-red-600"}`}>
                {insights.slope >= 0 ? "+" : ""}{formatCurrency(Math.round(insights.slope))}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Expense Anomaly Detection */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" /> Expense Anomaly Detection
            </CardTitle>
          </CardHeader>
          <CardContent>
            {insights.anomalies.length > 0 ? (
              <div className="space-y-3">
                {insights.anomalies.map((a: any) => (
                  <div key={a.name} className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200">
                    <div>
                      <p className="font-medium text-sm">{a.name}</p>
                      <p className="text-xs text-gray-500">{a.percent.toFixed(1)}% of total expenses</p>
                    </div>
                    <Badge className="bg-amber-100 text-amber-700">{formatCurrency(a.amount)}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p>No unusual expenses detected</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Expense Breakdown</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={insights.categoryData.slice(0, 6)} dataKey="amount" nameKey="name"
                  cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {insights.categoryData.slice(0, 6).map((_: any, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Cash Flow Forecast */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" /> Cash Flow Forecast (Next 3 Months)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-sm text-gray-500">Current Balance</p>
              <p className="text-xl font-bold">{formatCurrency(insights.currentBalance)}</p>
            </div>
            {insights.cashFlowForecast.map((cf) => (
              <div key={cf.month} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-sm text-gray-500">{cf.month} Forecast</p>
                <p className="text-xl font-bold">{formatCurrency(cf.balance)}</p>
                <p className="text-xs text-gray-400">In: {formatCurrency(cf.inflow)} | Out: {formatCurrency(cf.outflow)}</p>
              </div>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={insights.cashFlowForecast}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Legend />
              <Bar dataKey="inflow" fill="#22c55e" name="Inflow" radius={[4, 4, 0, 0]} />
              <Bar dataKey="outflow" fill="#ef4444" name="Outflow" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top Spending & Profit Margin */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5 text-purple-600" /> Top Spending Categories</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {insights.topSpending.map((cat: any, i: number) => (
              <div key={cat.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{cat.name}</span>
                  <span className="text-gray-500">{formatCurrency(cat.amount)}</span>
                </div>
                <Progress value={cat.percent} className="h-2" />
              </div>
            ))}
            {insights.topSpending.length === 0 && (
              <p className="text-center text-gray-500 py-4">No expense data available</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><PieChartIcon className="w-5 h-5 text-cyan-600" /> Profit Margin Analysis</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center justify-center mb-4">
              <div className="relative w-32 h-32">
                <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="54" fill="none" stroke="#e5e7eb" strokeWidth="12" />
                  <circle cx="60" cy="60" r="54" fill="none"
                    stroke={insights.profitMargin >= 20 ? "#22c55e" : insights.profitMargin >= 10 ? "#f59e0b" : "#ef4444"}
                    strokeWidth="12" strokeDasharray={`${Math.max(0, Math.min(insights.profitMargin, 100)) * 3.39} 339`} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold">{insights.profitMargin.toFixed(1)}%</span>
                  <span className="text-xs text-gray-500">Margin</span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm"><span>Revenue</span><span className="font-medium">{formatCurrency(insights.income)}</span></div>
              <div className="flex justify-between text-sm"><span>Expenses</span><span className="font-medium text-red-600">{formatCurrency(insights.totalExpenses)}</span></div>
              <div className="flex justify-between text-sm border-t pt-2"><span>Net Profit</span><span className="font-bold">{formatCurrency(insights.income - insights.totalExpenses)}</span></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Smart Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-500" /> Smart Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.recs.map((rec, i) => (
              <div key={i} className={`flex items-start gap-3 p-4 rounded-lg border ${
                rec.type === "warning" ? "bg-amber-50 border-amber-200 dark:bg-amber-900/20" :
                rec.type === "success" ? "bg-green-50 border-green-200 dark:bg-green-900/20" :
                "bg-blue-50 border-blue-200 dark:bg-blue-900/20"
              }`}>
                <span className="text-xl">{rec.icon}</span>
                <p className="text-sm text-gray-700 dark:text-gray-300">{rec.text}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
