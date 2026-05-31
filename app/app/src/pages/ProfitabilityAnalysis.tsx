"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  ComposedChart,
  ReferenceLine,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
  Activity,
  Zap,
} from "lucide-react";

const PROFIT_BY_CUSTOMER = [
  { customer: "Acme Corp", revenue: 245800, cost: 184350, profit: 61450, margin: 25.0 },
  { customer: "Nexus Industries", revenue: 312400, cost: 218680, profit: 93720, margin: 30.0 },
  { customer: "DataDriven Corp", revenue: 156000, cost: 117000, profit: 39000, margin: 25.0 },
  { customer: "TechStart Inc", revenue: 89400, cost: 71520, profit: 17880, margin: 20.0 },
  { customer: "Global Solutions", revenue: 178900, cost: 143120, profit: 35780, margin: 20.0 },
  { customer: "Creative Studio", revenue: 34200, cost: 27360, profit: 6840, margin: 20.0 },
  { customer: "GreenLeaf Mktg", revenue: 45600, cost: 36480, profit: 9120, margin: 20.0 },
];

const PROFIT_BY_PRODUCT = [
  { product: "Enterprise Suite", revenue: 425000, cost: 255000, profit: 170000, margin: 40.0 },
  { product: "Professional Plan", revenue: 289000, cost: 202300, profit: 86700, margin: 30.0 },
  { product: "Starter Plan", revenue: 142000, cost: 113600, profit: 28400, margin: 20.0 },
  { product: "Consulting Services", revenue: 198000, cost: 138600, profit: 59400, margin: 30.0 },
  { product: "Training & Support", revenue: 67000, cost: 46900, profit: 20100, margin: 30.0 },
  { product: "Custom Development", revenue: 112000, cost: 89600, profit: 22400, margin: 20.0 },
];

const PROFIT_BY_PROJECT = [
  { project: "Website Redesign", budget: 85000, spent: 72000, profit: 13000, margin: 15.3 },
  { project: "Mobile App v2", budget: 120000, spent: 95000, profit: 25000, margin: 20.8 },
  { project: "Data Migration", budget: 45000, spent: 48000, profit: -3000, margin: -6.7 },
  { project: "Cloud Infrastructure", budget: 200000, spent: 165000, profit: 35000, margin: 17.5 },
  { project: "AI Integration", budget: 150000, spent: 110000, profit: 40000, margin: 26.7 },
  { project: "Security Audit", budget: 35000, spent: 28000, profit: 7000, margin: 20.0 },
];

const MARGIN_TRENDS = [
  { month: "Aug", gross: 42.5, operating: 18.2, net: 12.8 },
  { month: "Sep", gross: 43.1, operating: 19.5, net: 13.5 },
  { month: "Oct", gross: 41.8, operating: 17.8, net: 12.1 },
  { month: "Nov", gross: 44.2, operating: 20.1, net: 14.2 },
  { month: "Dec", gross: 43.8, operating: 19.8, net: 13.9 },
  { month: "Jan", gross: 45.2, operating: 21.3, net: 15.1 },
];

const BREAK_EVEN_DATA = [
  { revenue: 0, fixedCosts: 180000, variableCosts: 0, totalCosts: 180000, profit: -180000 },
  { revenue: 100000, fixedCosts: 180000, variableCosts: 42000, totalCosts: 222000, profit: -122000 },
  { revenue: 200000, fixedCosts: 180000, variableCosts: 84000, totalCosts: 264000, profit: -64000 },
  { revenue: 300000, fixedCosts: 180000, variableCosts: 126000, totalCosts: 306000, profit: -6000 },
  { revenue: 310000, fixedCosts: 180000, variableCosts: 130200, totalCosts: 310200, profit: -200 },
  { revenue: 320000, fixedCosts: 180000, variableCosts: 134400, totalCosts: 314400, profit: 5600 },
  { revenue: 400000, fixedCosts: 180000, variableCosts: 168000, totalCosts: 348000, profit: 52000 },
  { revenue: 500000, fixedCosts: 180000, variableCosts: 210000, totalCosts: 390000, profit: 110000 },
  { revenue: 600000, fixedCosts: 180000, variableCosts: 252000, totalCosts: 432000, profit: 168000 },
  { revenue: 700000, fixedCosts: 180000, variableCosts: 294000, totalCosts: 474000, profit: 226000 },
];

const CONTRIBUTION_MARGIN = [
  { product: "Enterprise Suite", sales: 425000, variableCosts: 127500, contributionMargin: 297500, cmPercent: 70.0 },
  { product: "Professional Plan", sales: 289000, variableCosts: 115600, contributionMargin: 173400, cmPercent: 60.0 },
  { product: "Consulting Services", sales: 198000, variableCosts: 79200, contributionMargin: 118800, cmPercent: 60.0 },
  { product: "Custom Development", sales: 112000, variableCosts: 56000, contributionMargin: 56000, cmPercent: 50.0 },
  { product: "Training & Support", sales: 67000, variableCosts: 33500, contributionMargin: 33500, cmPercent: 50.0 },
  { product: "Starter Plan", sales: 142000, variableCosts: 99400, contributionMargin: 42600, cmPercent: 30.0 },
];

export default function ProfitabilityAnalysis() {
  const stats = useMemo(() => {
    const totalRevenue = PROFIT_BY_CUSTOMER.reduce((acc, c) => acc + c.revenue, 0);
    const totalProfit = PROFIT_BY_CUSTOMER.reduce((acc, c) => acc + c.profit, 0);
    const overallMargin = (totalProfit / totalRevenue) * 100;
    const bestMargin = Math.max(...PROFIT_BY_CUSTOMER.map((c) => c.margin));
    return { totalRevenue, totalProfit, overallMargin, bestMargin };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <BarChart3 className="h-8 w-8 text-emerald-600" />
          Profitability Analysis
        </h1>
        <p className="text-muted-foreground mt-1">
          Deep profitability insights across customers, products, and projects
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Revenue</CardDescription>
            <CardTitle className="text-2xl">${stats.totalRevenue.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className="bg-green-100 text-green-800">
              <ArrowUpRight className="mr-1 h-3 w-3" /> +12.4% YoY
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Profit</CardDescription>
            <CardTitle className="text-2xl text-green-600">${stats.totalProfit.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className="bg-green-100 text-green-800">
              <TrendingUp className="mr-1 h-3 w-3" /> Healthy
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Overall Margin</CardDescription>
            <CardTitle className="text-2xl">{stats.overallMargin.toFixed(1)}%</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={stats.overallMargin} className="h-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Best Margin</CardDescription>
            <CardTitle className="text-2xl text-emerald-600">{stats.bestMargin}%</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className="bg-emerald-100 text-emerald-800">Enterprise Suite</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Break-Even Point</CardDescription>
            <CardTitle className="text-2xl">$315K</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline">Monthly revenue target</Badge>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="customers">
        <TabsList>
          <TabsTrigger value="customers">By Customer</TabsTrigger>
          <TabsTrigger value="products">By Product</TabsTrigger>
          <TabsTrigger value="projects">By Project</TabsTrigger>
          <TabsTrigger value="margins">Margin Trends</TabsTrigger>
          <TabsTrigger value="breakeven">Break-Even</TabsTrigger>
          <TabsTrigger value="contribution">Contribution Margin</TabsTrigger>
        </TabsList>

        <TabsContent value="customers" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Profit by Customer</CardTitle>
                <CardDescription>Revenue vs profit comparison</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={PROFIT_BY_CUSTOMER}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="customer" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, ""]} />
                    <Legend />
                    <Bar dataKey="revenue" fill="#6366f1" name="Revenue" />
                    <Bar dataKey="profit" fill="#22c55e" name="Profit" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Margin by Customer</CardTitle>
                <CardDescription>Profit margin percentages</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={PROFIT_BY_CUSTOMER} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 40]} />
                    <YAxis dataKey="customer" type="category" width={120} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value) => [`${value}%`, "Margin"]} />
                    <Bar dataKey="margin" name="Margin %">
                      {PROFIT_BY_CUSTOMER.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.margin >= 25 ? "#22c55e" : entry.margin >= 20 ? "#eab308" : "#f97316"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Customer Profitability Details</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Profit</TableHead>
                    <TableHead>Margin</TableHead>
                    <TableHead className="text-right">Rating</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {PROFIT_BY_CUSTOMER.sort((a, b) => b.profit - a.profit).map((c) => (
                    <TableRow key={c.customer}>
                      <TableCell className="font-medium">{c.customer}</TableCell>
                      <TableCell>${c.revenue.toLocaleString()}</TableCell>
                      <TableCell className="text-muted-foreground">${c.cost.toLocaleString()}</TableCell>
                      <TableCell className="text-green-600 font-medium">${c.profit.toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={c.margin} className="h-1.5 w-16" />
                          <span className="text-sm">{c.margin}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge className={c.margin >= 30 ? "bg-green-100 text-green-800" : c.margin >= 20 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}>
                          {c.margin >= 30 ? "Highly Profitable" : c.margin >= 20 ? "Profitable" : "Low Margin"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Profit by Product/Service</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={PROFIT_BY_PRODUCT}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="profit"
                      label={({ product, percent }) => `${product.split(" ")[0]} ${(percent * 100).toFixed(0)}%`}
                    >
                      {PROFIT_BY_PRODUCT.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={["#6366f1", "#22c55e", "#f97316", "#eab308", "#ef4444", "#8b5cf6"][index]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, "Profit"]} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue vs Cost by Product</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={PROFIT_BY_PRODUCT}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="product" tick={{ fontSize: 10 }} />
                    <YAxis />
                    <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, ""]} />
                    <Legend />
                    <Bar dataKey="revenue" fill="#6366f1" name="Revenue" />
                    <Bar dataKey="cost" fill="#ef4444" name="Cost" />
                    <Bar dataKey="profit" fill="#22c55e" name="Profit" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="projects" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Project Profitability</CardTitle>
              <CardDescription>Budget vs actual spending and profit per project</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Budget</TableHead>
                    <TableHead>Spent</TableHead>
                    <TableHead>Profit</TableHead>
                    <TableHead>Margin</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {PROFIT_BY_PROJECT.sort((a, b) => b.profit - a.profit).map((p) => (
                    <TableRow key={p.project}>
                      <TableCell className="font-medium">{p.project}</TableCell>
                      <TableCell>${p.budget.toLocaleString()}</TableCell>
                      <TableCell>${p.spent.toLocaleString()}</TableCell>
                      <TableCell className={p.profit >= 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                        {p.profit >= 0 ? "+" : ""}${p.profit.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={Math.abs(p.margin)} className="h-1.5 w-16" />
                          <span className={`text-sm ${p.margin < 0 ? "text-red-600" : ""}`}>{p.margin}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={p.profit >= 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                          {p.profit >= 0 ? "Profitable" : "Over Budget"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="margins" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Margin Trends Over Time</CardTitle>
              <CardDescription>Gross, operating, and net margin trends</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={MARGIN_TRENDS}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis domain={[0, 50]} />
                  <Tooltip formatter={(value) => [`${value}%`, ""]} />
                  <Legend />
                  <Area type="monotone" dataKey="gross" stackId="1" stroke="#6366f1" fill="#6366f1" fillOpacity={0.1} name="Gross Margin" />
                  <Area type="monotone" dataKey="operating" stackId="2" stroke="#22c55e" fill="#22c55e" fillOpacity={0.1} name="Operating Margin" />
                  <Area type="monotone" dataKey="net" stackId="3" stroke="#f97316" fill="#f97316" fillOpacity={0.1} name="Net Margin" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="breakeven" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Break-Even Analysis</CardTitle>
              <CardDescription>Revenue vs total costs to identify break-even point</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={BREAK_EVEN_DATA}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="revenue" tickFormatter={(v) => `$${v / 1000}K`} />
                  <YAxis tickFormatter={(v) => `$${v / 1000}K`} />
                  <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, ""]} />
                  <Legend />
                  <ReferenceLine y={0} stroke="#000" />
                  <Area type="monotone" dataKey="profit" fill="#22c55e" fillOpacity={0.2} stroke="#22c55e" name="Profit/Loss" />
                  <Line type="monotone" dataKey="totalCosts" stroke="#ef4444" name="Total Costs" strokeWidth={2} />
                  <Line type="monotone" dataKey="revenue" stroke="#6366f1" name="Revenue" strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
              <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-5 w-5 text-emerald-600" />
                  <span className="font-medium">Break-Even Insight</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Your break-even point is approximately <strong>$315,000/month</strong> in revenue.
                  Currently generating $342,000/month, which is <strong>$27,000 (8.6%) above break-even</strong>.
                  Fixed costs are $180,000/month with a variable cost ratio of 42%.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contribution" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Contribution Margin Analysis</CardTitle>
              <CardDescription>Sales minus variable costs per product</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={CONTRIBUTION_MARGIN}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="product" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, ""]} />
                  <Legend />
                  <Bar dataKey="sales" fill="#6366f1" name="Sales" />
                  <Bar dataKey="variableCosts" fill="#ef4444" name="Variable Costs" />
                  <Bar dataKey="contributionMargin" fill="#22c55e" name="Contribution Margin" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contribution Margin Details</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Sales</TableHead>
                    <TableHead>Variable Costs</TableHead>
                    <TableHead>Contribution Margin</TableHead>
                    <TableHead>CM %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {CONTRIBUTION_MARGIN.sort((a, b) => b.cmPercent - a.cmPercent).map((c) => (
                    <TableRow key={c.product}>
                      <TableCell className="font-medium">{c.product}</TableCell>
                      <TableCell>${c.sales.toLocaleString()}</TableCell>
                      <TableCell className="text-red-600">${c.variableCosts.toLocaleString()}</TableCell>
                      <TableCell className="text-green-600 font-medium">${c.contributionMargin.toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={c.cmPercent} className="h-1.5 w-16" />
                          <span className="text-sm font-medium">{c.cmPercent}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
