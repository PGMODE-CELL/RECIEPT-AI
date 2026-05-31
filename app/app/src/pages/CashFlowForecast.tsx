import { useState, useMemo } from "react";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Plus, Download, TrendingUp, TrendingDown, DollarSign, Trash } from "lucide-react";
import { toast } from "sonner";

interface CashFlowItem {
  id: number;
  type: "income" | "expense";
  category: string;
  description: string;
  amount: number;
  frequency: string;
  startDate: string;
}

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function CashFlowForecast() {
  const [forecastMonths, setForecastMonths] = useState("6");
  const [open, setOpen] = useState(false);
  const [scenario, setScenario] = useState("likely");

  const { data: projectedItems, isLoading, refetch } = trpc.cashFlowForecast.list.useQuery();
  const createItem = trpc.cashFlowForecast.create.useMutation({
    onSuccess: () => { setOpen(false); refetch(); toast.success("Item added"); },
    onError: (e) => toast.error(e.message),
  });
  const deleteItem = trpc.cashFlowForecast.delete.useMutation({
    onSuccess: () => { refetch(); toast.success("Item removed"); },
  });

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

  const items: CashFlowItem[] = projectedItems?.map((item: any, i: number) => ({
    id: item.id || i,
    type: item.type,
    category: item.category || "General",
    description: item.description,
    amount: Number(item.amount) || 0,
    frequency: item.frequency || "monthly",
    startDate: item.startDate || new Date().toISOString().split("T")[0],
  })) || [];

  const incomeItems = items.filter((i) => i.type === "income");
  const expenseItems = items.filter((i) => i.type === "expense");

  const totalMonthlyIncome = incomeItems.reduce((s, i) => {
    if (i.frequency === "monthly") return s + i.amount;
    if (i.frequency === "quarterly") return s + i.amount / 3;
    if (i.frequency === "annually") return s + i.amount / 12;
    return s + i.amount;
  }, 0);

  const totalMonthlyExpense = expenseItems.reduce((s, i) => {
    if (i.frequency === "monthly") return s + i.amount;
    if (i.frequency === "quarterly") return s + i.amount / 3;
    if (i.frequency === "annually") return s + i.amount / 12;
    return s + i.amount;
  }, 0);

  const scenarioMultipliers: Record<string, { income: number; expense: number }> = {
    best: { income: 1.2, expense: 0.9 },
    likely: { income: 1.0, expense: 1.0 },
    worst: { income: 0.8, expense: 1.15 },
  };

  const numMonths = parseInt(forecastMonths) || 6;
  const startMonth = new Date().getMonth();
  const startYear = new Date().getFullYear();

  const forecastData = useMemo(() => {
    const mult = scenarioMultipliers[scenario];
    let cumulative = 0;
    return Array.from({ length: numMonths }, (_, i) => {
      const monthIdx = (startMonth + i) % 12;
      const yearOffset = Math.floor((startMonth + i) / 12);
      const monthIncome = totalMonthlyIncome * mult.income * (1 + Math.sin(i * 0.5) * 0.1);
      const monthExpense = totalMonthlyExpense * mult.expense * (1 + Math.cos(i * 0.3) * 0.08);
      const net = monthIncome - monthExpense;
      cumulative += net;
      return {
        name: `${months[monthIdx]} ${startYear + yearOffset}`,
        income: Math.round(monthIncome * 100) / 100,
        expense: Math.round(monthExpense * 100) / 100,
        net: Math.round(net * 100) / 100,
        cumulative: Math.round(cumulative * 100) / 100,
      };
    });
  }, [totalMonthlyIncome, totalMonthlyExpense, numMonths, scenario]);

  const finalCumulative = forecastData[forecastData.length - 1]?.cumulative || 0;
  const bestData = useMemo(() => {
    const mult = scenarioMultipliers.best;
    let cumulative = 0;
    return Array.from({ length: numMonths }, (_, i) => {
      const monthIdx = (startMonth + i) % 12;
      const yearOffset = Math.floor((startMonth + i) / 12);
      const income = totalMonthlyIncome * mult.income * (1 + Math.sin(i * 0.5) * 0.1);
      const expense = totalMonthlyExpense * mult.expense * (1 + Math.cos(i * 0.3) * 0.08);
      cumulative += income - expense;
      return { name: `${months[monthIdx]}`, cumulative: Math.round(cumulative * 100) / 100 };
    });
  }, [totalMonthlyIncome, totalMonthlyExpense, numMonths]);

  const worstData = useMemo(() => {
    const mult = scenarioMultipliers.worst;
    let cumulative = 0;
    return Array.from({ length: numMonths }, (_, i) => {
      const monthIdx = (startMonth + i) % 12;
      const income = totalMonthlyIncome * mult.income * (1 + Math.sin(i * 0.5) * 0.1);
      const expense = totalMonthlyExpense * mult.expense * (1 + Math.cos(i * 0.3) * 0.08);
      cumulative += income - expense;
      return { name: `${months[monthIdx]}`, cumulative: Math.round(cumulative * 100) / 100 };
    });
  }, [totalMonthlyIncome, totalMonthlyExpense, numMonths]);

  const handleExport = () => {
    const headers = ["Month", "Income", "Expense", "Net Cash Flow", "Cumulative"];
    const csv = [
      `Cash Flow Forecast - ${scenario.charAt(0).toUpperCase() + scenario.slice(1)} Scenario`,
      `Period: ${numMonths} months`,
      "",
      headers.join(","),
      ...forecastData.map((d) => [d.name, d.income.toFixed(2), d.expense.toFixed(2), d.net.toFixed(2), d.cumulative.toFixed(2)].join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cash_flow_forecast_${scenario}_${numMonths}mo.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Forecast exported");
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-indigo-600" /> Cash Flow Forecast
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Project future cash positions and scenario analysis</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}><Download className="w-4 h-4 mr-2" /> Export</Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" /> Add Projection</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Add Cash Flow Projection</DialogTitle></DialogHeader>
              <form onSubmit={(e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                createItem.mutate({
                  type: form.get("type") as "income" | "expense",
                  category: form.get("category") as string,
                  description: form.get("description") as string,
                  amount: form.get("amount") as string,
                  frequency: form.get("frequency") as string,
                  startDate: form.get("startDate") as string,
                });
              }} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select name="type" defaultValue="income">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="income">Income</SelectItem>
                        <SelectItem value="expense">Expense</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Frequency</Label>
                    <Select name="frequency" defaultValue="monthly">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="annually">Annually</SelectItem>
                        <SelectItem value="one_time">One-time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2"><Label>Description</Label><Input name="description" required /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Category</Label><Input name="category" placeholder="e.g. Sales, Rent" /></div>
                  <div className="space-y-2"><Label>Amount ($)</Label><Input name="amount" type="number" step="0.01" required /></div>
                </div>
                <div className="space-y-2"><Label>Start Date</Label><Input name="startDate" type="date" defaultValue={new Date().toISOString().split("T")[0]} /></div>
                <Button type="submit" className="w-full" disabled={createItem.isPending}>{createItem.isPending ? "Adding..." : "Add Projection"}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg"><TrendingUp className="w-5 h-5 text-green-600" /></div>
              <div>
                <p className="text-sm text-gray-500">Monthly Income</p>
                <p className="text-xl font-bold">{formatCurrency(totalMonthlyIncome)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg"><TrendingDown className="w-5 h-5 text-red-600" /></div>
              <div>
                <p className="text-sm text-gray-500">Monthly Expenses</p>
                <p className="text-xl font-bold">{formatCurrency(totalMonthlyExpense)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg"><DollarSign className="w-5 h-5 text-blue-600" /></div>
              <div>
                <p className="text-sm text-gray-500">Net Monthly</p>
                <p className={`text-xl font-bold ${totalMonthlyIncome - totalMonthlyExpense >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(totalMonthlyIncome - totalMonthlyExpense)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg"><DollarSign className="w-5 h-5 text-purple-600" /></div>
              <div>
                <p className="text-sm text-gray-500">End Balance ({numMonths}mo)</p>
                <p className={`text-xl font-bold ${finalCumulative >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(finalCumulative)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Label className="text-sm">Forecast Period:</Label>
          <Select value={forecastMonths} onValueChange={setForecastMonths}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 Months</SelectItem>
              <SelectItem value="6">6 Months</SelectItem>
              <SelectItem value="12">12 Months</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm">Scenario:</Label>
          <Select value={scenario} onValueChange={setScenario}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="best">Best Case</SelectItem>
              <SelectItem value="likely">Likely</SelectItem>
              <SelectItem value="worst">Worst Case</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="chart">
        <TabsList>
          <TabsTrigger value="chart">Forecast Chart</TabsTrigger>
          <TabsTrigger value="scenarios">Scenario Comparison</TabsTrigger>
          <TabsTrigger value="items">Projections</TabsTrigger>
        </TabsList>

        <TabsContent value="chart" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Cash Flow Forecast ({scenario})</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={forecastData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis fontSize={12} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Legend />
                    <Area type="monotone" dataKey="income" stroke="#22c55e" fill="#22c55e20" name="Income" />
                    <Area type="monotone" dataKey="expense" stroke="#ef4444" fill="#ef444420" name="Expenses" />
                    <Area type="monotone" dataKey="cumulative" stroke="#6366f1" fill="#6366f120" name="Cumulative" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scenarios" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Scenario Comparison (Cumulative Cash Position)</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={bestData.map((d, i) => ({
                    name: d.name,
                    best: d.cumulative,
                    likely: forecastData[i]?.cumulative || 0,
                    worst: worstData[i]?.cumulative || 0,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis fontSize={12} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Legend />
                    <Area type="monotone" dataKey="best" stroke="#22c55e" fill="#22c55e15" name="Best Case" />
                    <Area type="monotone" dataKey="likely" stroke="#6366f1" fill="#6366f115" name="Likely" />
                    <Area type="monotone" dataKey="worst" stroke="#ef4444" fill="#ef444415" name="Worst Case" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="items" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Projected Items</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead className="text-right">Monthly Equiv.</TableHead>
                    <TableHead className="w-[40px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-500">No projections. Add one to get started.</TableCell></TableRow>}
                  {items.map((item) => {
                    const monthly = item.frequency === "monthly" ? item.amount : item.frequency === "quarterly" ? item.amount / 3 : item.amount / 12;
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Badge className={item.type === "income" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                            {item.type === "income" ? "Income" : "Expense"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{item.description}</TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell className="capitalize">{item.frequency}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(monthly)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => deleteItem.mutate({ id: item.id })}>
                            <Trash className="w-4 h-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
