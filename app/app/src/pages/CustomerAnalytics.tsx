"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
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
} from "recharts";
import {
  Users,
  TrendingUp,
  AlertTriangle,
  Search,
  Star,
  ArrowUpRight,
  Crown,
} from "lucide-react";

interface Customer {
  id: string;
  name: string;
  email: string;
  totalRevenue: number;
  lifetimeValue: number;
  purchaseCount: number;
  avgPurchase: number;
  lastPurchase: string;
  paymentScore: number;
  churnRisk: "low" | "medium" | "high";
  joinDate: string;
  segment: "enterprise" | "smb" | "individual";
}

export default function CustomerAnalytics() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<keyof Customer>("totalRevenue");

  const { data: contacts = [], isLoading: loadingContacts } = trpc.contact.list.useQuery();
  const { data: invoiceData, isLoading: loadingInvoices } = trpc.invoice.list.useQuery();

  const invoices = useMemo(() => invoiceData?.invoices ?? [], [invoiceData]);

  const customers = useMemo(() => {
    const contactList = contacts.filter((c) => c.type === "customer");
    if (!contactList.length) return [];

    const invoiceByContact: Record<number, { total: number; count: number; dates: string[] }> = {};
    for (const inv of invoices) {
      const cid = inv.contactId;
      if (!invoiceByContact[cid]) invoiceByContact[cid] = { total: 0, count: 0, dates: [] };
      invoiceByContact[cid].total += Number(inv.total) || 0;
      invoiceByContact[cid].count++;
      if (inv.issueDate) invoiceByContact[cid].dates.push(String(inv.issueDate));
    }

    return contactList.map((c): Customer => {
      const invData = invoiceByContact[c.id] || { total: 0, count: 0, dates: [] };
      const totalRevenue = invData.total;
      const purchaseCount = invData.count;
      const avgPurchase = purchaseCount > 0 ? totalRevenue / purchaseCount : 0;
      const lastPurchase = invData.dates.sort().reverse()[0] || "";
      const ltv = totalRevenue * 1.3;
      const paymentScore = Math.min(100, Math.round(60 + (totalRevenue / 10000) * 5 + purchaseCount * 2));
      const churnRisk: "low" | "medium" | "high" =
        purchaseCount <= 1 && totalRevenue < 5000 ? "high" : purchaseCount <= 3 ? "medium" : "low";
      const daysSinceLast = lastPurchase
        ? Math.floor((Date.now() - new Date(lastPurchase).getTime()) / 86400000)
        : 999;
      const segment: "enterprise" | "smb" | "individual" =
        totalRevenue > 100000 ? "enterprise" : totalRevenue > 20000 ? "smb" : "individual";

      return {
        id: String(c.id),
        name: c.name,
        email: c.email || "",
        totalRevenue,
        lifetimeValue: ltv,
        purchaseCount,
        avgPurchase,
        lastPurchase,
        paymentScore,
        churnRisk,
        joinDate: String(c.createdAt),
        segment,
      };
    });
  }, [contacts, invoices]);

  const stats = useMemo(() => {
    const total = customers.length;
    if (total === 0) return { total: 0, totalRevenue: 0, avgLTV: 0, highChurn: 0, avgPaymentScore: 0 };
    const totalRevenue = customers.reduce((acc, c) => acc + c.totalRevenue, 0);
    const avgLTV = customers.reduce((acc, c) => acc + c.lifetimeValue, 0) / total;
    const highChurn = customers.filter((c) => c.churnRisk === "high").length;
    const avgPaymentScore = customers.reduce((acc, c) => acc + c.paymentScore, 0) / total;
    return { total, totalRevenue, avgLTV, highChurn, avgPaymentScore };
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    return customers
      .filter(
        (c) =>
          c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => (b[sortField] as number) - (a[sortField] as number));
  }, [customers, searchTerm, sortField]);

  const topCustomers = useMemo(() => {
    return [...customers].sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 5);
  }, [customers]);

  const REVENUE_BY_MONTH = useMemo(() => {
    const monthly: Record<string, { revenue: number; customerIds: Set<string> }> = {};
    for (const inv of invoices) {
      const d = new Date(inv.issueDate);
      const key = d.toLocaleString("en-US", { month: "short" });
      if (!monthly[key]) monthly[key] = { revenue: 0, customerIds: new Set() };
      monthly[key].revenue += Number(inv.total) || 0;
      monthly[key].customerIds.add(String(inv.contactId));
    }
    return Object.entries(monthly).map(([month, data]) => ({
      month,
      revenue: data.revenue,
      customers: data.customerIds.size,
    }));
  }, [invoices]);

  const SEGMENT_DATA = useMemo(() => {
    const seg: Record<string, number> = { Enterprise: 0, SMB: 0, Individual: 0 };
    for (const c of customers) {
      if (c.segment === "enterprise") seg.Enterprise += c.totalRevenue;
      else if (c.segment === "smb") seg.SMB += c.totalRevenue;
      else seg.Individual += c.totalRevenue;
    }
    return [
      { name: "Enterprise", value: seg.Enterprise, color: "#6366f1" },
      { name: "SMB", value: seg.SMB, color: "#22c55e" },
      { name: "Individual", value: seg.Individual, color: "#f97316" },
    ];
  }, [customers]);

  const getChurnBadge = (risk: string) => {
    switch (risk) {
      case "low": return "bg-green-100 text-green-800";
      case "medium": return "bg-yellow-100 text-yellow-800";
      case "high": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getSegmentBadge = (segment: string) => {
    switch (segment) {
      case "enterprise": return "bg-indigo-100 text-indigo-800";
      case "smb": return "bg-green-100 text-green-800";
      case "individual": return "bg-orange-100 text-orange-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const isLoading = loadingContacts || loadingInvoices;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Users className="h-8 w-8 text-indigo-600" />
          Customer Analytics
        </h1>
        <p className="text-muted-foreground">Loading customer data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Users className="h-8 w-8 text-indigo-600" />
          Customer Analytics
        </h1>
        <p className="text-muted-foreground mt-1">
          Deep insights into customer revenue, lifetime value, and engagement metrics
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Customers</CardDescription>
            <CardTitle className="text-2xl">{stats.total}</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className="bg-indigo-100 text-indigo-800">
              <TrendingUp className="mr-1 h-3 w-3" /> Active
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Revenue</CardDescription>
            <CardTitle className="text-2xl">${stats.totalRevenue.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className="bg-green-100 text-green-800">
              <ArrowUpRight className="mr-1 h-3 w-3" /> From invoices
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg Lifetime Value</CardDescription>
            <CardTitle className="text-2xl">${Math.round(stats.avgLTV).toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className="bg-green-100 text-green-800">
              <ArrowUpRight className="mr-1 h-3 w-3" /> Estimated
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>High Churn Risk</CardDescription>
            <CardTitle className="text-2xl text-red-600">{stats.highChurn}</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className="bg-red-100 text-red-800">
              <AlertTriangle className="mr-1 h-3 w-3" /> Needs attention
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg Payment Score</CardDescription>
            <CardTitle className="text-2xl">{stats.avgPaymentScore.toFixed(0)}</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={stats.avgPaymentScore} className="h-2" />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Customer List</TabsTrigger>
          <TabsTrigger value="charts">Revenue Charts</TabsTrigger>
          <TabsTrigger value="top">Top Customers</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>All Customers</CardTitle>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search customers..."
                    className="pl-8 w-64"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Segment</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>LTV</TableHead>
                    <TableHead>Purchases</TableHead>
                    <TableHead>Payment Score</TableHead>
                    <TableHead>Churn Risk</TableHead>
                    <TableHead>Last Purchase</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <div className="font-medium">{customer.name}</div>
                        <div className="text-xs text-muted-foreground">{customer.email}</div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getSegmentBadge(customer.segment)}>
                          {customer.segment}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        ${customer.totalRevenue.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        ${customer.lifetimeValue.toLocaleString()}
                      </TableCell>
                      <TableCell>{customer.purchaseCount}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={customer.paymentScore} className="h-1.5 w-16" />
                          <span className="text-sm">{customer.paymentScore}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getChurnBadge(customer.churnRisk)}>
                          {customer.churnRisk}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {customer.lastPurchase}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="charts" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trend</CardTitle>
                <CardDescription>Monthly revenue over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={REVENUE_BY_MONTH}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, "Revenue"]} />
                    <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Customer Growth</CardTitle>
                <CardDescription>Active customer count trend</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={REVENUE_BY_MONTH}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="customers" stroke="#22c55e" name="Customers" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue by Segment</CardTitle>
                <CardDescription>Revenue distribution by customer segment</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={SEGMENT_DATA}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {SEGMENT_DATA.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, "Revenue"]} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Avg Purchase Value</CardTitle>
                <CardDescription>Average purchase value by customer</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={[...customers].sort((a, b) => b.avgPurchase - a.avgPurchase)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, "Avg Purchase"]} />
                    <Bar dataKey="avgPurchase" fill="#f97316" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="top" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {topCustomers.map((customer, index) => (
              <Card key={customer.id} className={index === 0 ? "border-yellow-300 bg-yellow-50/50" : ""}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="w-6 h-6 justify-center rounded-full">
                      {index + 1}
                    </Badge>
                    {index === 0 && <Crown className="h-4 w-4 text-yellow-600" />}
                  </div>
                  <CardTitle className="text-base">{customer.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Revenue</span>
                    <span className="font-medium">${customer.totalRevenue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">LTV</span>
                    <span className="font-medium">${customer.lifetimeValue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Purchases</span>
                    <span className="font-medium">{customer.purchaseCount}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Payment Score</span>
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                      <span className="font-medium">{customer.paymentScore}</span>
                    </div>
                  </div>
                  <Badge className={`w-full justify-center ${getChurnBadge(customer.churnRisk)}`}>
                    {customer.churnRisk} churn risk
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
