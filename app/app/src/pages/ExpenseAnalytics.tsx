"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
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
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import {
  Receipt,
  TrendingDown,
  DollarSign,
  PiggyBank,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Target,
} from "lucide-react";

interface CategoryData {
  category: string;
  amount: number;
  budget: number;
  color: string;
}

const CATEGORY_COLORS = ["#6366f1", "#22c55e", "#f97316", "#eab308", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899"];

export default function ExpenseAnalytics() {
  const { data: billData, isLoading: loadingBills } = trpc.bill.list.useQuery({ limit: 1000 });
  const { data: transactions = [], isLoading: loadingTxns } = trpc.transaction.list.useQuery();
  const { data: contactsData = [] } = trpc.contact.list.useQuery();
  const { data: budgetData } = trpc.budget.list.useQuery();

  const bills = useMemo(() => billData?.bills ?? billData?.items ?? [], [billData]);
  const budgetByCategory = useMemo(() => {
    const m: Record<string, number> = {};
    for (const b of budgetData?.items ?? []) m[String(b.category)] = Number(b.budgeted) || 0;
    return m;
  }, [budgetData]);
  const vendorName = useMemo(() => {
    const m: Record<number, string> = {};
    for (const c of contactsData as any[]) m[c.id] = c.name;
    return (id: any) => m[id] ?? "Unknown vendor";
  }, [contactsData]);

  const SPENDING_BY_CATEGORY = useMemo(() => {
    const catMap: Record<string, number> = {};
    for (const txn of transactions) {
      if (txn.type === "expense") {
        const cat = txn.accountName || "Other";
        catMap[cat] = (catMap[cat] || 0) + (Number(txn.debit) || 0);
      }
    }
    for (const bill of bills) {
      const cat = vendorName(bill.contact_id);
      catMap[cat] = (catMap[cat] || 0) + (Number(bill.total) || 0);
    }

    const cats = Object.entries(catMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    if (cats.length === 0) {
      return [{ category: "No Expenses", amount: 0, budget: 0, color: "#94a3b8" }];
    }

    return cats.map(([category, amount], i) => ({
      category,
      amount: Math.round(amount),
      budget: Math.round(budgetByCategory[category] ?? 0),
      color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
    }));
  }, [transactions, bills, vendorName, budgetByCategory]);

  const VENDOR_SPENDING = useMemo(() => {
    const vendorMap: Record<string, { amount: number; count: number; monthly: Record<string, number> }> = {};
    for (const bill of bills) {
      const vendor = vendorName(bill.contact_id);
      if (!vendorMap[vendor]) vendorMap[vendor] = { amount: 0, count: 0, monthly: {} };
      const amt = Number(bill.total) || 0;
      vendorMap[vendor].amount += amt;
      vendorMap[vendor].count++;
      const mk = String(bill.date || "").slice(0, 7);
      if (mk) vendorMap[vendor].monthly[mk] = (vendorMap[vendor].monthly[mk] || 0) + amt;
    }
    return Object.entries(vendorMap)
      .sort((a, b) => b[1].amount - a[1].amount)
      .slice(0, 8)
      .map(([vendor, data]) => {
        const months = Object.keys(data.monthly).sort();
        const cur = months.length ? data.monthly[months[months.length - 1]] : 0;
        const prev = months.length > 1 ? data.monthly[months[months.length - 2]] : 0;
        const trend = prev > 0 ? Math.round(((cur - prev) / prev) * 100) : 0;
        return {
          vendor,
          amount: Math.round(data.amount),
          transactions: data.count,
          trend,
        };
      });
  }, [bills, vendorName]);

  const MONTHLY_EXPENSES = useMemo(() => {
    const monthly: Record<string, number> = {};
    for (const txn of transactions) {
      if (txn.type !== "expense") continue;
      const key = String(txn.date || "").slice(0, 7);
      if (!key) continue;
      monthly[key] = (monthly[key] || 0) + (Number(txn.debit) || 0);
    }
    for (const bill of bills) {
      const key = String(bill.date || "").slice(0, 7);
      if (!key) continue;
      monthly[key] = (monthly[key] || 0) + (Number(bill.total) || 0);
    }
    const keys = Object.keys(monthly).sort();
    return keys.map((key, i) => ({
      month: new Date(key + "-01").toLocaleString("en-US", { month: "short" }),
      current: Math.round(monthly[key]),
      previous: i > 0 ? Math.round(monthly[keys[i - 1]]) : 0,
    }));
  }, [transactions, bills]);

  const stats = useMemo(() => {
    const totalExpenses = SPENDING_BY_CATEGORY.reduce((acc, c) => acc + c.amount, 0);
    const totalBudget = SPENDING_BY_CATEGORY.reduce((acc, c) => acc + c.budget, 0);
    const burnRate = totalExpenses / 31 || 0;
    const overBudgetItems = SPENDING_BY_CATEGORY.filter(c => c.amount > c.budget).length;
    const savingsOpportunity = totalBudget - totalExpenses;
    return { totalExpenses, totalBudget, burnRate, overBudgetItems, savingsOpportunity };
  }, [SPENDING_BY_CATEGORY]);

  const getBurnRateDays = () => Math.floor(stats.totalBudget / stats.burnRate) || 0;

  const isLoading = loadingBills || loadingTxns;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Receipt className="h-8 w-8 text-orange-600" />
          Expense Analytics
        </h1>
        <p className="text-muted-foreground">Loading expense data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Receipt className="h-8 w-8 text-orange-600" />
          Expense Analytics
        </h1>
        <p className="text-muted-foreground mt-1">
          Comprehensive expense tracking, budget analysis, and savings opportunities
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Expenses</CardDescription>
            <CardTitle className="text-2xl">${stats.totalExpenses.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className="bg-orange-100 text-orange-800">
              <ArrowUpRight className="mr-1 h-3 w-3" /> Current period
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Monthly Budget</CardDescription>
            <CardTitle className="text-2xl">${stats.totalBudget.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={(stats.totalExpenses / stats.totalBudget) * 100} className="h-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Daily Burn Rate</CardDescription>
            <CardTitle className="text-2xl">${Math.round(stats.burnRate).toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline">{getBurnRateDays()} days until budget end</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Over Budget</CardDescription>
            <CardTitle className="text-2xl text-red-600">{stats.overBudgetItems}</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className="bg-red-100 text-red-800">
              <AlertTriangle className="mr-1 h-3 w-3" /> categories
            </Badge>
          </CardContent>
        </Card>
        <Card className="border-green-200">
          <CardHeader className="pb-2">
            <CardDescription>Savings Opportunity</CardDescription>
            <CardTitle className="text-2xl text-green-600">${stats.savingsOpportunity.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className="bg-green-100 text-green-800">
              <PiggyBank className="mr-1 h-3 w-3" /> Under budget
            </Badge>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="categories">
        <TabsList>
          <TabsTrigger value="categories">Spending by Category</TabsTrigger>
          <TabsTrigger value="vendors">Vendor Analysis</TabsTrigger>
          <TabsTrigger value="trends">Expense Trends</TabsTrigger>
          <TabsTrigger value="savings">Savings Opportunities</TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Budget vs Actual</CardTitle>
                <CardDescription>Spending by category compared to budget</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={SPENDING_BY_CATEGORY} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="category" type="category" width={140} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={value => [`$${Number(value).toLocaleString()}`, ""]} />
                    <Legend />
                    <Bar dataKey="budget" fill="#e5e7eb" name="Budget" />
                    <Bar dataKey="amount" name="Actual">
                      {SPENDING_BY_CATEGORY.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.amount > entry.budget ? "#ef4444" : entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Spending Distribution</CardTitle>
                <CardDescription>Proportion of expenses by category</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={SPENDING_BY_CATEGORY}
                      cx="50%"
                      cy="50%"
                      outerRadius={120}
                      dataKey="amount"
                      label={({ category, percent }) => `${category.split(" ")[0]} ${(percent * 100).toFixed(0)}%`}
                    >
                      {SPENDING_BY_CATEGORY.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={value => [`$${Number(value).toLocaleString()}`, "Amount"]} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Category Details</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Spent</TableHead>
                    <TableHead>Budget</TableHead>
                    <TableHead>Remaining</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Utilization</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {SPENDING_BY_CATEGORY.map(cat => {
                    const remaining = cat.budget - cat.amount;
                    const utilization = (cat.amount / cat.budget) * 100;
                    const overBudget = cat.amount > cat.budget;
                    return (
                      <TableRow key={cat.category}>
                        <TableCell className="font-medium">{cat.category}</TableCell>
                        <TableCell>${cat.amount.toLocaleString()}</TableCell>
                        <TableCell className="text-muted-foreground">${cat.budget.toLocaleString()}</TableCell>
                        <TableCell className={overBudget ? "text-red-600" : "text-green-600"}>
                          {overBudget ? "-" : ""}${Math.abs(remaining).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge className={overBudget ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}>
                            {overBudget ? "Over" : "Under"} budget
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Progress value={Math.min(utilization, 100)} className="h-2 w-20" />
                            <span className={`text-sm ${utilization > 100 ? "text-red-600 font-medium" : ""}`}>
                              {utilization.toFixed(0)}%
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vendors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Vendors by Spending</CardTitle>
              <CardDescription>Monthly vendor spending analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Monthly Spend</TableHead>
                    <TableHead>Transactions</TableHead>
                    <TableHead>Avg per Transaction</TableHead>
                    <TableHead>Trend</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {VENDOR_SPENDING.map(vendor => (
                    <TableRow key={vendor.vendor}>
                      <TableCell className="font-medium">{vendor.vendor}</TableCell>
                      <TableCell>${vendor.amount.toLocaleString()}</TableCell>
                      <TableCell>{vendor.transactions}</TableCell>
                      <TableCell>${(vendor.amount / vendor.transactions).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            vendor.trend > 0
                              ? "bg-red-100 text-red-800"
                              : vendor.trend < 0
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                          }
                        >
                          {vendor.trend > 0 ? (
                            <ArrowUpRight className="mr-1 h-3 w-3" />
                          ) : vendor.trend < 0 ? (
                            <ArrowDownRight className="mr-1 h-3 w-3" />
                          ) : null}
                          {vendor.trend > 0 ? "+" : ""}
                          {vendor.trend}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>MoM Expense Comparison</CardTitle>
                <CardDescription>Current vs previous month expenses</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={MONTHLY_EXPENSES}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={value => [`$${Number(value).toLocaleString()}`, ""]} />
                    <Legend />
                    <Line type="monotone" dataKey="current" stroke="#f97316" name="Current Year" strokeWidth={2} />
                    <Line
                      type="monotone"
                      dataKey="previous"
                      stroke="#94a3b8"
                      name="Previous Year"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Monthly Expenses: Current vs Previous</CardTitle>
                <CardDescription>Month-over-month total expenses</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={MONTHLY_EXPENSES}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={value => [`$${Number(value).toLocaleString()}`, ""]} />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="current"
                      stroke="#6366f1"
                      fill="#6366f1"
                      fillOpacity={0.3}
                      name="Current"
                    />
                    <Area
                      type="monotone"
                      dataKey="previous"
                      stroke="#94a3b8"
                      fill="#94a3b8"
                      fillOpacity={0.2}
                      name="Previous month"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="savings" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SPENDING_BY_CATEGORY.filter(c => c.amount > c.budget * 0.8).map((saving, i) => {
              const opportunity = Math.round(saving.amount - saving.budget * 0.85);
              const confidence = Math.min(95, Math.max(50, 100 - Math.round((saving.amount / saving.budget) * 10)));
              return (
                <Card key={i} className="border-green-200">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{saving.category}</CardTitle>
                      <Badge className="bg-green-100 text-green-800">
                        <PiggyBank className="mr-1 h-3 w-3" />${opportunity.toLocaleString()}/mo
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Spending is at ${saving.amount.toLocaleString()} vs budget of ${saving.budget.toLocaleString()}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Confidence</span>
                      <span className="text-xs font-medium">{confidence}%</span>
                    </div>
                    <Progress value={confidence} className="h-1.5" />
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={() => toast.success(`Savings action initiated for ${saving.category}`)}
                    >
                      <Target className="mr-2 h-3 w-3" />
                      Implement Savings
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
