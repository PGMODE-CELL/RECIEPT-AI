"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  ReferenceLine,
  ComposedChart,
  Area,
} from "recharts";
import { TrendingUp, TrendingDown, AlertTriangle, Target, ArrowUp, ArrowDown, Minus } from "lucide-react";

interface BudgetLine {
  id: string;
  accountCode: string;
  accountName: string;
  category: string;
  annualBudget: number;
  periods: { month: string; budget: number; actual: number; forecast: number }[];
}

interface Period {
  label: string;
  year: number;
  m: number;
}

function lastMonths(n: number): Period[] {
  const out: Period[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const dt = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({ label: dt.toLocaleString("en", { month: "short" }), year: dt.getFullYear(), m: dt.getMonth() });
  }
  return out;
}

const PERIODS = lastMonths(5);
const MONTHS = PERIODS.map(p => p.label);

// Real monthly actuals are derived from money-out transactions whose description
// matches the budget category (mirroring the backend's "spent" calculation).
function computeBudgets(budgets: any[], transactions: any[]): BudgetLine[] {
  return budgets.map((b: any) => {
    const period = String(b.period || "").toLowerCase();
    const budgeted = Number(b.budgeted) || 0;
    const monthlyBudget = period === "monthly" ? budgeted : budgeted / 12;
    const annualBudget = period === "monthly" ? budgeted * 12 : budgeted;
    const cat = String(b.category || "Budget");
    return {
      id: String(b.id),
      accountCode: cat.slice(0, 4).toUpperCase(),
      accountName: cat,
      category: "Expense",
      annualBudget,
      periods: PERIODS.map(p => {
        const actual = transactions
          .filter((t: any) => {
            if (t.type !== "money_out") return false;
            if (
              !String(t.description || "")
                .toLowerCase()
                .includes(cat.toLowerCase())
            )
              return false;
            const dt = new Date(t.date);
            return dt.getFullYear() === p.year && dt.getMonth() === p.m;
          })
          .reduce((s: number, t: any) => s + (Number(t.amount) || 0), 0);
        return {
          month: p.label,
          budget: Math.round(monthlyBudget),
          actual: Math.round(actual),
          forecast: Math.round(monthlyBudget),
        };
      }),
    };
  });
}

export default function BudgetVariance() {
  const { data: budgetsData = [] } = trpc.budget.list.useQuery();
  const { data: txData = [] } = trpc.transaction.list.useQuery();
  const budgets = useMemo(() => computeBudgets(budgetsData as any[], txData as any[]), [budgetsData, txData]);
  const [selectedPeriod, setSelectedPeriod] = useState(MONTHS[MONTHS.length - 1]);
  const [selectedCategory, setSelectedCategory] = useState("all");

  const filtered = selectedCategory === "all" ? budgets : budgets.filter(b => b.category === selectedCategory);

  const currentPeriodData = filtered.map(b => {
    const p = b.periods.find(pp => pp.month === selectedPeriod) || b.periods[0];
    const variance = p.actual - p.budget;
    const variancePct = p.budget !== 0 ? (variance / p.budget) * 100 : 0;
    const remainingBudget = b.annualBudget - b.periods.reduce((s, pp) => s + pp.budget, 0);
    const forecastRemaining = b.annualBudget - b.periods.reduce((s, pp) => s + (pp.actual || pp.forecast), 0);
    return { ...b, ...p, variance, variancePct, remainingBudget, forecastRemaining };
  });

  const totalBudget = currentPeriodData.reduce((s, d) => s + d.budget, 0);
  const totalActual = currentPeriodData.reduce((s, d) => s + d.actual, 0);
  const totalVariance = totalActual - totalBudget;
  const totalVariancePct = totalBudget !== 0 ? (totalVariance / totalBudget) * 100 : 0;

  const overBudgetCount = currentPeriodData.filter(d => {
    if (d.category === "Revenue") return d.actual < d.budget;
    return d.actual > d.budget;
  }).length;

  const chartData = filtered.map(b => {
    const p = b.periods.find(pp => pp.month === selectedPeriod) || b.periods[0];
    return {
      name: b.accountName.length > 15 ? b.accountName.slice(0, 15) + "..." : b.accountName,
      budget: p.budget,
      actual: p.actual,
      variance: p.actual - p.budget,
    };
  });

  const trendData = MONTHS.map(month => {
    const data: Record<string, any> = { month };
    filtered.forEach(b => {
      const p = b.periods.find(pp => pp.month === month);
      if (p) data[b.accountName] = p.actual - p.budget;
    });
    return data;
  });

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);

  const varianceIcon = (variance: number, category: string) => {
    const isPositive = category === "Revenue" ? variance > 0 : variance < 0;
    if (Math.abs(variance) < 100) return <Minus className="w-4 h-4 text-gray-400" />;
    if (isPositive) return <ArrowUp className="w-4 h-4 text-green-500" />;
    return <ArrowDown className="w-4 h-4 text-red-500" />;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Budget Variance Analysis</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Compare budget vs actual with trend analysis and forecasting
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIODS.map(p => (
                <SelectItem key={p.label} value={p.label}>
                  {p.label} {p.year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="Revenue">Revenue</SelectItem>
              <SelectItem value="Expense">Expenses</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Target className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Period Budget</p>
              <p className="text-xl font-bold">{formatCurrency(totalBudget)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Period Actual</p>
              <p className="text-xl font-bold">{formatCurrency(totalActual)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div
              className={`p-2 rounded-lg ${
                totalVariance >= 0 ? "bg-green-100 dark:bg-green-900" : "bg-red-100 dark:bg-red-900"
              }`}
            >
              {totalVariance >= 0 ? (
                <TrendingUp className="w-5 h-5 text-green-600" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-600" />
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500">Variance</p>
              <p className={`text-xl font-bold ${totalVariance >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(totalVariance)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Over Budget</p>
              <p className="text-2xl font-bold text-red-600">{overBudgetCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Budget vs Actual - {selectedPeriod}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend />
                <Bar dataKey="budget" fill="#3b82f6" name="Budget" />
                <Bar dataKey="actual" fill="#22c55e" name="Actual" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Variance Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend />
                <ReferenceLine y={0} stroke="#000" />
                {filtered.slice(0, 3).map((b, idx) => (
                  <Line
                    key={b.id}
                    type="monotone"
                    dataKey={b.accountName}
                    stroke={["#3b82f6", "#f97316", "#22c55e"][idx]}
                    strokeWidth={2}
                  />
                ))}
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Variance Details</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Annual Budget</TableHead>
                <TableHead className="text-right">Period Budget</TableHead>
                <TableHead className="text-right">Period Actual</TableHead>
                <TableHead className="text-right">Variance</TableHead>
                <TableHead className="text-right">Variance %</TableHead>
                <TableHead className="text-right">Forecast Remaining</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentPeriodData.map(d => {
                const isOverBudget = d.category === "Revenue" ? d.variance < 0 : d.variance > 0;
                return (
                  <TableRow key={d.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{d.accountName}</p>
                        <p className="text-xs text-gray-500 font-mono">{d.accountCode}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{d.category}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(d.annualBudget)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(d.budget)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(d.actual)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {varianceIcon(d.variance, d.category)}
                        <span className={d.variance >= 0 ? "text-green-600" : "text-red-600"}>
                          {formatCurrency(d.variance)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={Math.abs(d.variancePct) > 10 ? "text-red-600 font-semibold" : "text-gray-500"}>
                        {d.variancePct > 0 ? "+" : ""}
                        {d.variancePct.toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(d.forecastRemaining)}</TableCell>
                    <TableCell>
                      <Badge className={isOverBudget ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}>
                        {isOverBudget ? "Over" : "Under"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
