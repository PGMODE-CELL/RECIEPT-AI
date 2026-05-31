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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import {
  AlertTriangle,
  Shield,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertOctagon,
  Eye,
  Bell,
} from "lucide-react";

interface Anomaly {
  id: string;
  transactionId: string;
  date: string;
  description: string;
  amount: number;
  expectedAmount: number;
  deviation: number;
  type: "amount_spike" | "odd_timing" | "duplicate" | "frequency" | "new_vendor";
  riskScore: number;
  status: "flagged" | "reviewed" | "dismissed";
  reason: string;
}

const ANOMALY_TYPES = {
  amount_spike: { label: "Amount Spike", icon: TrendingUp, color: "bg-red-100 text-red-800" },
  odd_timing: { label: "Odd Timing", icon: Clock, color: "bg-orange-100 text-orange-800" },
  duplicate: { label: "Duplicate Amount", icon: AlertOctagon, color: "bg-yellow-100 text-yellow-800" },
  frequency: { label: "Unusual Frequency", icon: TrendingDown, color: "bg-purple-100 text-purple-800" },
  new_vendor: { label: "New Vendor", icon: Eye, color: "bg-blue-100 text-blue-800" },
};

export default function AnomalyDetection() {
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [anomalyStatuses, setAnomalyStatuses] = useState<Record<string, "flagged" | "reviewed" | "dismissed">>({});

  const { data: transactions = [], isLoading } = trpc.transaction.list.useQuery();

  const anomalies = useMemo(() => {
    if (!transactions.length) return [];

    const amounts = transactions.map((t) => Math.abs(Number(t.debit) || Number(t.credit) || 0)).filter((a) => a > 0);
    if (!amounts.length) return [];

    const mean = amounts.reduce((s, a) => s + a, 0) / amounts.length;
    const stdDev = Math.sqrt(amounts.reduce((s, a) => s + (a - mean) ** 2, 0) / amounts.length) || 1;
    const threshold = mean + 2 * stdDev;

    const vendorTxns: Record<string, { count: number; amounts: number[]; dates: string[] }> = {};
    const seenAmounts: Record<string, string[]> = {};

    const result: Anomaly[] = [];

    for (const t of transactions) {
      const amt = Math.abs(Number(t.debit) || Number(t.credit) || 0);
      if (amt === 0) continue;

      const vendor = t.accountName || "Unknown";
      if (!vendorTxns[vendor]) vendorTxns[vendor] = { count: 0, amounts: [], dates: [] };
      vendorTxns[vendor].count++;
      vendorTxns[vendor].amounts.push(amt);
      vendorTxns[vendor].dates.push(t.date);

      const amtKey = amt.toFixed(2);
      if (!seenAmounts[amtKey]) seenAmounts[amtKey] = [];
      seenAmounts[amtKey].push(t.description);

      const dateObj = new Date(t.date);
      const hour = dateObj.getHours();
      const dayOfWeek = dateObj.getDay();
      const isOddHour = hour < 6 || hour > 22;
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      if (amt > threshold) {
        const deviation = ((amt - mean) / mean) * 100;
        const riskScore = Math.min(99, Math.round(50 + (deviation / 100) * 30 + (isOddHour ? 15 : 0)));
        result.push({
          id: `anomaly-${t.id}`,
          transactionId: String(t.id),
          date: t.date,
          description: t.description,
          amount: amt,
          expectedAmount: Math.round(mean),
          deviation: Math.round(deviation),
          type: "amount_spike",
          riskScore,
          status: anomalyStatuses[`anomaly-${t.id}`] || "flagged",
          reason: `Amount is ${(amt / mean).toFixed(1)}x the average for this account`,
        });
      } else if (isOddHour && amt > 0) {
        const riskScore = Math.min(99, Math.round(60 + (amt / mean) * 10));
        result.push({
          id: `anomaly-${t.id}`,
          transactionId: String(t.id),
          date: t.date,
          description: t.description,
          amount: amt,
          expectedAmount: amt,
          deviation: 0,
          type: "odd_timing",
          riskScore,
          status: anomalyStatuses[`anomaly-${t.id}`] || "flagged",
          reason: `Transaction at ${hour}:${String(dateObj.getMinutes()).padStart(2, "0")} outside business hours`,
        });
      }
    }

    for (const [amtKey, descs] of Object.entries(seenAmounts)) {
      if (descs.length > 1) {
        const amt = parseFloat(amtKey);
        const riskScore = 65;
        const existing = result.find((r) => r.amount === amt);
        if (!existing) {
          result.push({
            id: `dup-${amtKey}`,
            transactionId: "",
            date: "",
            description: descs[0],
            amount: amt,
            expectedAmount: amt,
            deviation: 0,
            type: "duplicate",
            riskScore,
            status: anomalyStatuses[`dup-${amtKey}`] || "reviewed",
            reason: `Identical amount (${amt}) found ${descs.length} times`,
          });
        }
      }
    }

    return result.sort((a, b) => b.riskScore - a.riskScore);
  }, [transactions, anomalyStatuses]);

  const [anomaliesState, setAnomaliesState] = useState<Anomaly[]>([]);

  const displayAnomalies = anomalies.length > 0 ? anomalies : anomaliesState;

  const stats = useMemo(() => {
    const total = displayAnomalies.length;
    if (total === 0) return { total: 0, flagged: 0, avgRisk: 0, highRisk: 0, totalExposure: 0 };
    const flagged = displayAnomalies.filter((a) => a.status === "flagged").length;
    const avgRisk = displayAnomalies.reduce((acc, a) => acc + a.riskScore, 0) / total;
    const highRisk = displayAnomalies.filter((a) => a.riskScore >= 75).length;
    const totalExposure = displayAnomalies
      .filter((a) => a.status === "flagged")
      .reduce((acc, a) => acc + (a.amount - a.expectedAmount), 0);
    return { total, flagged, avgRisk, highRisk, totalExposure };
  }, [displayAnomalies]);

  const filteredAnomalies = useMemo(() => {
    return displayAnomalies.filter((a) => {
      const matchesType = filterType === "all" || a.type === filterType;
      const matchesStatus = filterStatus === "all" || a.status === filterStatus;
      return matchesType && matchesStatus;
    });
  }, [displayAnomalies, filterType, filterStatus]);

  const handleReview = (id: string) => {
    setAnomalyStatuses((prev) => ({ ...prev, [id]: "reviewed" }));
    toast.success("Anomaly reviewed");
  };

  const handleDismiss = (id: string) => {
    setAnomalyStatuses((prev) => ({ ...prev, [id]: "dismissed" }));
    toast.info("Anomaly dismissed");
  };

  const TREND_DATA = useMemo(() => {
    const monthly: Record<string, { transactions: number; anomalies: number; totalRisk: number }> = {};
    for (const t of transactions) {
      const d = new Date(t.date);
      const key = d.toLocaleString("en-US", { month: "short" });
      if (!monthly[key]) monthly[key] = { transactions: 0, anomalies: 0, totalRisk: 0 };
      monthly[key].transactions++;
    }
    for (const a of displayAnomalies) {
      if (!a.date) continue;
      const d = new Date(a.date);
      const key = d.toLocaleString("en-US", { month: "short" });
      if (monthly[key]) {
        monthly[key].anomalies++;
        monthly[key].totalRisk += a.riskScore;
      }
    }
    return Object.entries(monthly).map(([month, data]) => ({
      month,
      transactions: data.transactions,
      anomalies: data.anomalies,
      avgRisk: data.anomalies > 0 ? Math.round(data.totalRisk / data.anomalies) : 0,
    }));
  }, [transactions, displayAnomalies]);

  const ANOMALY_DISTRIBUTION = useMemo(() => {
    const counts: Record<string, number> = { amount_spike: 0, odd_timing: 0, duplicate: 0, frequency: 0, new_vendor: 0 };
    for (const a of displayAnomalies) counts[a.type]++;
    return [
      { type: "Amount Spike", count: counts.amount_spike, color: "#ef4444" },
      { type: "Odd Timing", count: counts.odd_timing, color: "#f97316" },
      { type: "Duplicate", count: counts.duplicate, color: "#eab308" },
      { type: "Frequency", count: counts.frequency, color: "#a855f7" },
      { type: "New Vendor", count: counts.new_vendor, color: "#3b82f6" },
    ];
  }, [displayAnomalies]);

  const SCATTER_DATA = displayAnomalies.map((a) => ({
    x: a.amount,
    y: a.riskScore,
    name: a.description,
  }));

  const getRiskBadge = (score: number) => {
    if (score >= 75) return "bg-red-100 text-red-800 border-red-200";
    if (score >= 50) return "bg-orange-100 text-orange-800 border-orange-200";
    return "bg-green-100 text-green-800 border-green-200";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "flagged": return "bg-red-100 text-red-800";
      case "reviewed": return "bg-blue-100 text-blue-800";
      case "dismissed": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Shield className="h-8 w-8 text-red-600" />
          Anomaly Detection
        </h1>
        <p className="text-muted-foreground">Loading transactions...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-8 w-8 text-red-600" />
            Anomaly Detection
          </h1>
          <p className="text-muted-foreground mt-1">
            AI-powered detection of unusual financial patterns and suspicious transactions
          </p>
        </div>
        <Button variant="outline">
          <Bell className="mr-2 h-4 w-4" />
          Configure Alerts
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Anomalies</CardDescription>
            <CardTitle className="text-2xl">{stats.total}</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline">This month</Badge>
          </CardContent>
        </Card>
        <Card className="border-red-200">
          <CardHeader className="pb-2">
            <CardDescription>Active Flags</CardDescription>
            <CardTitle className="text-2xl text-red-600">{stats.flagged}</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className="bg-red-100 text-red-800">
              <AlertTriangle className="mr-1 h-3 w-3" /> Needs review
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>High Risk</CardDescription>
            <CardTitle className="text-2xl text-orange-600">{stats.highRisk}</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className="bg-orange-100 text-orange-800">Score {'>='} 75</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg Risk Score</CardDescription>
            <CardTitle className="text-2xl">{stats.avgRisk.toFixed(0)}</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={stats.avgRisk} className="h-2" />
          </CardContent>
        </Card>
        <Card className="border-red-200">
          <CardHeader className="pb-2">
            <CardDescription>Total Exposure</CardDescription>
            <CardTitle className="text-2xl text-red-600">
              ${stats.totalExposure.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className="bg-red-100 text-red-800">Potential loss</Badge>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="anomalies">
        <TabsList>
          <TabsTrigger value="anomalies">Flagged Anomalies</TabsTrigger>
          <TabsTrigger value="charts">Trend Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="anomalies" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Anomaly List</CardTitle>
                <div className="flex gap-2">
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder="Anomaly type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {Object.entries(ANOMALY_TYPES).map(([key, val]) => (
                        <SelectItem key={key} value={key}>
                          {val.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-36">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="flagged">Flagged</SelectItem>
                      <SelectItem value="reviewed">Reviewed</SelectItem>
                      <SelectItem value="dismissed">Dismissed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Expected</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Risk Score</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAnomalies.map((anomaly) => {
                    const typeInfo = ANOMALY_TYPES[anomaly.type];
                    const TypeIcon = typeInfo.icon;
                    return (
                      <TableRow key={anomaly.id}>
                        <TableCell className="text-muted-foreground">{anomaly.date}</TableCell>
                        <TableCell>
                          <div className="font-medium">{anomaly.description}</div>
                          <div className="text-xs text-muted-foreground">{anomaly.reason}</div>
                        </TableCell>
                        <TableCell className="font-mono font-medium text-red-600">
                          ${anomaly.amount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          ${anomaly.expectedAmount.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge className={typeInfo.color}>
                            <TypeIcon className="mr-1 h-3 w-3" />
                            {typeInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getRiskBadge(anomaly.riskScore)}>
                            {anomaly.riskScore}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusBadge(anomaly.status)}>
                            {anomaly.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {anomaly.status === "flagged" && (
                            <div className="flex gap-1 justify-end">
                              <Button size="sm" className="h-8" onClick={() => handleReview(anomaly.id)}>
                                Review
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8"
                                onClick={() => handleDismiss(anomaly.id)}
                              >
                                Dismiss
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="charts" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Anomaly Trend</CardTitle>
                <CardDescription>Monthly anomalies vs total transactions</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={TREND_DATA}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Line yAxisId="left" type="monotone" dataKey="transactions" stroke="#8884d8" name="Transactions" />
                    <Line yAxisId="right" type="monotone" dataKey="anomalies" stroke="#ef4444" name="Anomalies" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Anomaly Distribution</CardTitle>
                <CardDescription>Breakdown by anomaly type</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={ANOMALY_DISTRIBUTION}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="type" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" name="Count">
                      {ANOMALY_DISTRIBUTION.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Risk Score Distribution</CardTitle>
                <CardDescription>Amount vs Risk Score scatter plot</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" dataKey="x" name="Amount" unit="$" />
                    <YAxis type="number" dataKey="y" name="Risk" />
                    <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                    <Scatter name="Anomalies" data={SCATTER_DATA} fill="#ef4444" />
                  </ScatterChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Average Risk Trend</CardTitle>
                <CardDescription>Monthly average risk score</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={TREND_DATA}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="avgRisk" stroke="#8884d8" fill="#8884d8" name="Avg Risk Score" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
