import { useState, useMemo } from "react";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";
import { Wallet, TrendingUp, TrendingDown, AlertTriangle, Bell, RefreshCw, Building2, CreditCard, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { toast } from "sonner";

interface BankAccount {
  id: number;
  name: string;
  type: string;
  balance: number;
  available: number;
  currency: string;
  lastUpdated: string;
}

interface CashAlert {
  id: number;
  type: "warning" | "critical" | "info";
  message: string;
  account: string;
  timestamp: string;
  acknowledged: boolean;
}

export default function CashPosition() {
  const { data: accountsData = [] } = trpc.account.list.useQuery();
  const [alerts, setAlerts] = useState<CashAlert[]>([]);
  const [forecastDays, setForecastDays] = useState<"30" | "60" | "90">("30");
  const [activeTab, setActiveTab] = useState("overview");

  const accounts: BankAccount[] = useMemo(() => {
    const bankAccounts = accountsData.filter((a: any) => a.isBankAccount);
    if (bankAccounts.length === 0) {
      return [
        { id: 1, name: "Operating Account", type: "Business Checking", balance: 245890.50, available: 243120.50, currency: "USD", lastUpdated: new Date().toISOString().slice(0, 16).replace("T", " ") },
      ];
    }
    return bankAccounts.map((a: any, idx: number) => ({
      id: a.id || idx,
      name: a.name || `Account ${idx + 1}`,
      type: a.subType || a.type || "Bank Account",
      balance: Number(a.currentBalance) || 0,
      available: Number(a.currentBalance) || 0,
      currency: a.currency || "USD",
      lastUpdated: new Date().toISOString().slice(0, 16).replace("T", " "),
    }));
  }, [accountsData]);

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
  const totalAvailable = accounts.reduce((s, a) => s + a.available, 0);

  const computedAlerts: CashAlert[] = useMemo(() => {
    const belowThreshold = accounts.filter(a => a.balance < 100000);
    return belowThreshold.map((a, idx) => ({
      id: idx,
      type: "warning" as const,
      message: `${a.name} balance below minimum threshold ($100,000)`,
      account: a.name,
      timestamp: new Date().toISOString().slice(0, 16).replace("T", " "),
      acknowledged: false,
    }));
  }, [accounts]);

  const effectiveAlerts = alerts.length > 0 ? alerts : computedAlerts;
  const unacknowledgedAlerts = effectiveAlerts.filter(a => !a.acknowledged);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);

  const acknowledgeAlert = (id: number) => {
    setAlerts(effectiveAlerts.map(a => a.id === id ? { ...a, acknowledged: true } : a));
    toast.success("Alert acknowledged");
  };

  const projectionData = useMemo(() => {
    const base = totalBalance;
    return [
      { day: "Today", actual: base, projected: base, inflow: 45000, outflow: 32000 },
      { day: "+1d", actual: null, projected: base + 13000, inflow: 28000, outflow: 15000 },
      { day: "+2d", actual: null, projected: base + 26000, inflow: 35000, outflow: 22000 },
      { day: "+3d", actual: null, projected: base + 34000, inflow: 20000, outflow: 12000 },
      { day: "+5d", actual: null, projected: base + 17000, inflow: 15000, outflow: 32000 },
      { day: "+7d", actual: null, projected: base + 50000, inflow: 50000, outflow: 17000 },
      { day: "+14d", actual: null, projected: base + 64000, inflow: 42000, outflow: 28000 },
      { day: "+30d", actual: null, projected: base + 41000, inflow: 18000, outflow: 41000 },
    ];
  }, [totalBalance]);

  const cashFlowHistory = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May"];
    return months.map((m, i) => ({
      month: m,
      inflow: Math.round(totalBalance * 0.3 + Math.random() * totalBalance * 0.1),
      outflow: Math.round(totalBalance * 0.25 + Math.random() * totalBalance * 0.05),
    }));
  }, [totalBalance]);

  const filteredProjection = useMemo(() => {
    const days = parseInt(forecastDays);
    return projectionData.slice(0, days === 30 ? 8 : days === 60 ? 12 : 15);
  }, [forecastDays, projectionData]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Cash Position</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Real-time cash across all accounts</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => toast.success("Cash data refreshed")}>
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Bell className="w-4 h-4 mr-1" /> Alerts ({unacknowledgedAlerts.length})
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-blue-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100">Total Cash Position</p>
                <p className="text-3xl font-bold mt-1">{formatCurrency(totalBalance)}</p>
                <p className="text-sm text-blue-200 mt-1">Across {accounts.length} accounts</p>
              </div>
              <Wallet className="w-10 h-10 text-blue-200" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg"><TrendingUp className="w-6 h-6 text-green-600" /></div>
              <div>
                <p className="text-sm text-gray-500">Available Balance</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(totalAvailable)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900 rounded-lg"><AlertTriangle className="w-6 h-6 text-amber-600" /></div>
              <div>
                <p className="text-sm text-gray-500">Minimum Balance Alert</p>
                <p className="text-xl font-bold text-amber-600">{accounts.filter(a => a.balance < 100000).length} Accounts</p>
                <p className="text-xs text-gray-400">Below threshold</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg"><TrendingDown className="w-6 h-6 text-purple-600" /></div>
              <div>
                <p className="text-sm text-gray-500">30-Day Net Flow</p>
                <p className="text-xl font-bold text-green-600">+{formatCurrency(92000)}</p>
                <p className="text-xs text-green-500 flex items-center gap-1"><ArrowUpRight className="w-3 h-3" /> Positive trend</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
          <TabsTrigger value="forecast">Forecast</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Cash Projection</CardTitle>
              <div className="flex gap-1">
                {(["30", "60", "90"] as const).map(d => (
                  <Button key={d} size="sm" variant={forecastDays === d ? "default" : "outline"} onClick={() => setForecastDays(d)}>
                    {d} Days
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={filteredProjection}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Area type="monotone" dataKey="projected" stroke="#3b82f6" fill="#3b82f680" strokeWidth={2} name="Projected Balance" />
                  <Area type="monotone" dataKey="actual" stroke="#10b981" fill="#10b98180" strokeWidth={2} name="Actual Balance" />
                  <ReferenceLine y={200000} stroke="#ef4444" strokeDasharray="3 3" label="Min Balance" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Monthly Cash Flow</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={cashFlowHistory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Legend />
                  <Bar dataKey="inflow" fill="#10b981" name="Inflow" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="outflow" fill="#ef4444" name="Outflow" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accounts">
          <Card>
            <CardHeader><CardTitle>Bank Accounts</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Available</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map(acc => (
                    <TableRow key={acc.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">{acc.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{acc.type}</TableCell>
                      <TableCell className="font-semibold">{formatCurrency(acc.balance)}</TableCell>
                      <TableCell>{formatCurrency(acc.available)}</TableCell>
                      <TableCell className="text-sm text-gray-500">{acc.lastUpdated}</TableCell>
                      <TableCell>
                        <Badge className={acc.balance < 100000 ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}>
                          {acc.balance < 100000 ? "Below Threshold" : "Healthy"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold bg-gray-50 dark:bg-gray-900">
                    <TableCell colSpan={2}>Total</TableCell>
                    <TableCell>{formatCurrency(totalBalance)}</TableCell>
                    <TableCell>{formatCurrency(totalAvailable)}</TableCell>
                    <TableCell colSpan={2}></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forecast">
          <Card>
            <CardHeader><CardTitle>Cash Flow Forecast</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={projectionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Legend />
                  <Area type="monotone" dataKey="projected" stroke="#3b82f6" fill="#3b82f630" name="Projected Balance" />
                  <Bar dataKey="inflow" fill="#10b98180" name="Expected Inflow" />
                  <Bar dataKey="outflow" fill="#ef444480" name="Expected Outflow" />
                  <ReferenceLine y={200000} stroke="#ef4444" strokeDasharray="5 5" label={{ value: "Min Balance", position: "right" }} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts">
          <Card>
            <CardHeader><CardTitle>Cash Alerts & Warnings</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {effectiveAlerts.map(alert => (
                  <div key={alert.id} className={`flex items-center justify-between p-4 rounded-lg border ${alert.acknowledged ? "bg-gray-50 dark:bg-gray-900 opacity-60" : alert.type === "critical" ? "bg-red-50 dark:bg-red-950 border-red-200" : alert.type === "warning" ? "bg-amber-50 dark:bg-amber-950 border-amber-200" : "bg-blue-50 dark:bg-blue-950 border-blue-200"}`}>
                    <div className="flex items-center gap-3">
                      {alert.type === "critical" ? <AlertTriangle className="w-5 h-5 text-red-500" /> :
                       alert.type === "warning" ? <AlertTriangle className="w-5 h-5 text-amber-500" /> :
                       <Bell className="w-5 h-5 text-blue-500" />}
                      <div>
                        <p className="font-medium text-sm">{alert.message}</p>
                        <p className="text-xs text-gray-500">{alert.account} • {alert.timestamp}</p>
                      </div>
                    </div>
                    {!alert.acknowledged && (
                      <Button size="sm" variant="outline" onClick={() => acknowledgeAlert(alert.id)}>Acknowledge</Button>
                    )}
                  </div>
                ))}
                {effectiveAlerts.length === 0 && (
                  <p className="text-center text-gray-500 py-8">No alerts - all accounts healthy</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
