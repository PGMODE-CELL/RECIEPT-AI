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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, ReferenceLine
} from "recharts";
import { Target, Plus, Trash, TrendingUp, TrendingDown, AlertTriangle, Bell, Edit2, BarChart3 } from "lucide-react";

interface KPI {
  id: string;
  name: string;
  formula: string;
  value: number;
  target: number;
  unit: "currency" | "percentage" | "number";
  trend: "up" | "down" | "stable";
  alertThreshold: number;
  history: { month: string; value: number; target: number }[];
}

function computeKPIs(stats: any, pl: any): KPI[] {
  const revenue = stats?.totalRevenue || 0;
  const outstanding = stats?.outstanding || 0;
  const totalBills = stats?.totalBills || 0;
  const income = pl?.totalIncome || revenue;
  const expenses = pl?.totalExpenses || totalBills;
  const netIncome = income - expenses;
  const grossMargin = income > 0 ? ((income - expenses) / income) * 100 : 0;
  const netMargin = income > 0 ? (netIncome / income) * 100 : 0;

  const months = ["Sep", "Oct", "Nov", "Dec", "Jan"];

  return [
    {
      id: "1", name: "Gross Margin", formula: "(Revenue - COGS) / Revenue * 100", value: Math.round(grossMargin * 10) / 10,
      target: 40, unit: "percentage", trend: grossMargin > 40 ? "up" : "down", alertThreshold: 35,
      history: months.map((m, i) => ({ month: m, value: Math.round(grossMargin * (0.9 + i * 0.02) * 10) / 10, target: 40 })),
    },
    {
      id: "2", name: "Net Profit Margin", formula: "Net Income / Revenue * 100", value: Math.round(netMargin * 10) / 10,
      target: 20, unit: "percentage", trend: netMargin > 20 ? "up" : "down", alertThreshold: 15,
      history: months.map((m, i) => ({ month: m, value: Math.round(netMargin * (0.95 + i * 0.01) * 10) / 10, target: 20 })),
    },
    {
      id: "3", name: "Revenue", formula: "Total Revenue", value: Math.round(income),
      target: Math.round(income * 1.2) || 150000, unit: "currency", trend: "up", alertThreshold: Math.round(income * 0.5),
      history: months.map((m, i) => ({ month: m, value: Math.round(income * (0.8 + i * 0.05)), target: Math.round(income * 1.2) || 150000 })),
    },
    {
      id: "4", name: "Outstanding AR", formula: "Total Outstanding Receivables", value: Math.round(outstanding),
      target: 0, unit: "currency", trend: outstanding > 0 ? "down" : "stable", alertThreshold: Math.round(income * 0.3),
      history: months.map((m, i) => ({ month: m, value: Math.round(outstanding * (1.2 - i * 0.1)), target: 0 })),
    },
    {
      id: "5", name: "Total Expenses", formula: "Total Expenses", value: Math.round(expenses),
      target: Math.round(income * 0.8) || 100000, unit: "currency", trend: expenses > income * 0.8 ? "up" : "down", alertThreshold: Math.round(income * 0.9),
      history: months.map((m, i) => ({ month: m, value: Math.round(expenses * (0.85 + i * 0.04)), target: Math.round(income * 0.8) || 100000 })),
    },
  ];
}

export default function KPIBuilder() {
  const { data: stats } = trpc.dashboard.stats.useQuery(undefined, { enabled: false });
  const { data: pl } = trpc.report.profitLoss.useQuery({ from: "2026-01-01", to: "2026-12-31" }, { enabled: false });
  const [localKPIs, setLocalKPIs] = useState<KPI[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedKPI, setSelectedKPI] = useState<KPI | null>(null);
  const [newKPI, setNewKPI] = useState({ name: "", formula: "", target: "", unit: "number" as const });

  const computedKPIs = useMemo(() => computeKPIs(stats, pl), [stats, pl]);
  const kpis = localKPIs.length > 0 ? localKPIs : computedKPIs;

  const alertsTriggered = kpis.filter((k) => {
    if (k.unit === "percentage") return k.value < k.alertThreshold;
    return k.value < k.alertThreshold;
  });

  const formatValue = (value: number, unit: string) => {
    if (unit === "currency") return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
    if (unit === "percentage") return `${value.toFixed(1)}%`;
    return value.toLocaleString();
  };

  const getStatus = (kpi: KPI) => {
    const diff = ((kpi.value - kpi.target) / kpi.target) * 100;
    if (kpi.unit === "percentage") {
      if (kpi.value >= kpi.target) return { text: "On Track", color: "bg-green-100 text-green-800" };
      if (kpi.value >= kpi.target * 0.9) return { text: "Warning", color: "bg-yellow-100 text-yellow-800" };
      return { text: "Behind", color: "bg-red-100 text-red-800" };
    }
    if (diff >= 0) return { text: "On Track", color: "bg-green-100 text-green-800" };
    if (diff >= -10) return { text: "Warning", color: "bg-yellow-100 text-yellow-800" };
    return { text: "Behind", color: "bg-red-100 text-red-800" };
  };

  const createKPI = () => {
    if (!newKPI.name || !newKPI.formula) { toast.error("Name and formula are required"); return; }
    const kpi: KPI = {
      id: String(Date.now()),
      name: newKPI.name,
      formula: newKPI.formula,
      value: 0,
      target: Number(newKPI.target) || 0,
      unit: newKPI.unit as any,
      trend: "stable",
      alertThreshold: 0,
      history: [],
    };
    setLocalKPIs((prev) => [...prev.length > 0 ? prev : computedKPIs, kpi]);
    setCreateOpen(false);
    setNewKPI({ name: "", formula: "", target: "", unit: "number" });
    toast.success("KPI created");
  };

  const deleteKPI = (id: string) => {
    setLocalKPIs((prev) => (prev.length > 0 ? prev : computedKPIs).filter((k) => k.id !== id));
    setSelectedKPI(null);
    toast.success("KPI deleted");
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">KPI Builder</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Create and track custom key performance indicators</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Create KPI
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg"><Target className="w-5 h-5 text-blue-600" /></div>
            <div><p className="text-xs text-gray-500">Total KPIs</p><p className="text-2xl font-bold">{kpis.length}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg"><TrendingUp className="w-5 h-5 text-green-600" /></div>
            <div><p className="text-xs text-gray-500">On Track</p><p className="text-2xl font-bold text-green-600">{kpis.filter((k) => getStatus(k).text === "On Track").length}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg"><AlertTriangle className="w-5 h-5 text-yellow-600" /></div>
            <div><p className="text-xs text-gray-500">Warnings</p><p className="text-2xl font-bold text-yellow-600">{kpis.filter((k) => getStatus(k).text === "Warning").length}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg"><Bell className="w-5 h-5 text-red-600" /></div>
            <div><p className="text-xs text-gray-500">Alerts</p><p className="text-2xl font-bold text-red-600">{alertsTriggered.length}</p></div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((kpi) => {
          const status = getStatus(kpi);
          const isAlert = kpi.unit === "percentage"
            ? kpi.value < kpi.alertThreshold
            : kpi.value < kpi.alertThreshold;
          return (
            <Card key={kpi.id} className={`cursor-pointer hover:shadow-md transition-shadow ${isAlert ? "border-red-300 dark:border-red-700" : ""}`} onClick={() => setSelectedKPI(kpi)}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{kpi.name}</h3>
                  <Badge className={status.color}>{status.text}</Badge>
                </div>
                <p className="text-xs text-gray-500 font-mono">{kpi.formula}</p>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-2xl font-bold">{formatValue(kpi.value, kpi.unit)}</p>
                    <p className="text-xs text-gray-500">Target: {formatValue(kpi.target, kpi.unit)}</p>
                  </div>
                  {kpi.trend === "up" && <TrendingUp className="w-5 h-5 text-green-500" />}
                  {kpi.trend === "down" && <TrendingDown className="w-5 h-5 text-red-500" />}
                  {kpi.trend === "stable" && <BarChart3 className="w-5 h-5 text-gray-400" />}
                </div>
                {kpi.history.length > 0 && (
                  <div className="h-16">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={kpi.history}>
                        <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="target" stroke="#e5e7eb" strokeWidth={1} strokeDasharray="3 3" dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Custom KPI</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>KPI Name *</Label>
              <Input value={newKPI.name} onChange={(e) => setNewKPI((p) => ({ ...p, name: e.target.value }))} placeholder="e.g., Gross Margin" />
            </div>
            <div className="space-y-2">
              <Label>Formula *</Label>
              <Input value={newKPI.formula} onChange={(e) => setNewKPI((p) => ({ ...p, formula: e.target.value }))} placeholder="e.g., (Revenue - COGS) / Revenue * 100" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Target Value</Label>
                <Input type="number" value={newKPI.target} onChange={(e) => setNewKPI((p) => ({ ...p, target: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Select value={newKPI.unit} onValueChange={(v) => setNewKPI((p) => ({ ...p, unit: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="currency">Currency</SelectItem>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={createKPI}>Create KPI</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={selectedKPI !== null} onOpenChange={() => setSelectedKPI(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedKPI?.name}</DialogTitle>
          </DialogHeader>
          {selectedKPI && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-xs text-gray-500">Current Value</p>
                  <p className="text-xl font-bold">{formatValue(selectedKPI.value, selectedKPI.unit)}</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-xs text-gray-500">Target</p>
                  <p className="text-xl font-bold">{formatValue(selectedKPI.target, selectedKPI.unit)}</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-xs text-gray-500">Variance</p>
                  <p className={`text-xl font-bold ${selectedKPI.value >= selectedKPI.target ? "text-green-600" : "text-red-600"}`}>
                    {selectedKPI.unit === "percentage"
                      ? `${(selectedKPI.value - selectedKPI.target).toFixed(1)}%`
                      : formatValue(selectedKPI.value - selectedKPI.target, selectedKPI.unit)}
                  </p>
                </div>
              </div>
              {selectedKPI.history.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Trend</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={selectedKPI.history}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="value" fill="#3b82f6" name="Actual" />
                      <Bar dataKey="target" fill="#e5e7eb" name="Target" />
                      <ReferenceLine y={selectedKPI.alertThreshold} stroke="#ef4444" strokeDasharray="3 3" label="Alert" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              <p className="text-xs text-gray-500 font-mono">Formula: {selectedKPI.formula}</p>
              <DialogFooter>
                <Button variant="destructive" size="sm" onClick={() => deleteKPI(selectedKPI.id)}>
                  <Trash className="w-4 h-4 mr-1" /> Delete
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
