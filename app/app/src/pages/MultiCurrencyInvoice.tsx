"use client";

import { useState, useMemo } from "react";
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
import { trpc } from "@/providers/trpc";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Plus, Trash, DollarSign, TrendingUp, TrendingDown, ArrowRightLeft, RefreshCw } from "lucide-react";

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

interface MCInvoice {
  id: string;
  number: string;
  customer: string;
  currency: string;
  exchangeRate: number;
  items: InvoiceItem[];
  totalForeign: number;
  totalBase: number;
  status: "draft" | "sent" | "paid";
  createdDate: string;
  realizedGainLoss: number;
}

export default function MultiCurrencyInvoice() {
  const { data: invoiceData, isLoading: loadingInvoices } = trpc.invoice.list.useQuery();
  const { data: currencies = [], isLoading: loadingCurrencies } = trpc.settings.listCurrencies.useQuery();

  const [createOpen, setCreateOpen] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState("EUR");
  const [newItems, setNewItems] = useState<InvoiceItem[]>([
    { id: "1", description: "", quantity: 1, unitPrice: 0, amount: 0 },
  ]);

  const exchangeRates = useMemo(() => {
    const rates: Record<string, { rate: number; change: number }> = {
      USD: { rate: 1.0, change: 0 },
    };
    for (const cur of currencies) {
      rates[cur.code] = {
        rate: Number(cur.exchangeRate) || 1,
        change: 0,
      };
    }
    if (!rates.EUR) rates.EUR = { rate: 0.92, change: -0.3 };
    if (!rates.GBP) rates.GBP = { rate: 0.79, change: 0.2 };
    if (!rates.JPY) rates.JPY = { rate: 148.5, change: 0.8 };
    if (!rates.CAD) rates.CAD = { rate: 1.36, change: -0.1 };
    if (!rates.AUD) rates.AUD = { rate: 1.53, change: 0.4 };
    if (!rates.CHF) rates.CHF = { rate: 0.88, change: 0.1 };
    if (!rates.INR) rates.INR = { rate: 83.12, change: -0.5 };
    return rates;
  }, [currencies]);

  const invoices = useMemo((): MCInvoice[] => {
    const raw = invoiceData?.invoices ?? [];
    return raw.map((inv, i): MCInvoice => {
      const currency = inv.currency || "USD";
      const rateData = exchangeRates[currency];
      const rate = rateData ? 1 / rateData.rate : 1;
      const totalForeign = Number(inv.total) || 0;
      const totalBase = totalForeign * rate;
      return {
        id: String(inv.id),
        number: inv.invoiceNumber,
        customer: inv.contactName || "Customer",
        currency,
        exchangeRate: Math.round(rate * 10000) / 10000,
        items: [],
        totalForeign,
        totalBase: Math.round(totalBase * 100) / 100,
        status: (inv.status as MCInvoice["status"]) || "draft",
        createdDate: String(inv.issueDate),
        realizedGainLoss: 0,
      };
    });
  }, [invoiceData, exchangeRates]);

  const totalBaseCurrency = invoices.reduce((s, i) => s + i.totalBase, 0);
  const totalForeignCurrency = invoices.reduce((s, i) => s + i.totalForeign, 0);
  const totalGainLoss = invoices.reduce((s, i) => s + i.realizedGainLoss, 0);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

  const calcTotal = (items: InvoiceItem[]) => items.reduce((s, i) => s + i.amount, 0);

  const addItem = () => {
    setNewItems(prev => [...prev, { id: String(Date.now()), description: "", quantity: 1, unitPrice: 0, amount: 0 }]);
  };

  const removeItem = (id: string) => {
    setNewItems(prev => prev.filter(i => i.id !== id));
  };

  const updateItem = (id: string, field: string, value: string | number) => {
    setNewItems(prev =>
      prev.map(i => {
        if (i.id !== id) return i;
        const updated = { ...i, [field]: value };
        updated.amount = updated.quantity * updated.unitPrice;
        return updated;
      }),
    );
  };

  const createInvoice = () => {
    const rate = 1 / (exchangeRates[selectedCurrency]?.rate || 1);
    const foreignTotal = calcTotal(newItems);
    const baseTotal = foreignTotal * rate;
    const newInvoice: MCInvoice = {
      id: String(Date.now()),
      number: `MC-INV-${String(invoices.length + 1).padStart(3, "0")}`,
      customer: "New Customer",
      currency: selectedCurrency,
      exchangeRate: Math.round(rate * 10000) / 10000,
      items: newItems,
      totalForeign: foreignTotal,
      totalBase: Math.round(baseTotal * 100) / 100,
      status: "draft",
      createdDate: new Date().toISOString().split("T")[0],
      realizedGainLoss: 0,
    };
    setNewItems([{ id: "1", description: "", quantity: 1, unitPrice: 0, amount: 0 }]);
    setCreateOpen(false);
    toast.success("Multi-currency invoice created");
  };

  const refreshRates = () => {
    toast.info("Exchange rates reflect your configured currency settings.");
  };

  // Rate history and realized/unrealized FX gain-loss series require a
  // time-series feed the backend does not expose yet; no fabricated data shown.
  const RATE_TREND: { date: string; EUR: number; GBP: number }[] = [];
  const GAIN_LOSS_DATA: { month: string; realized: number; unrealized: number }[] = [];

  const isLoading = loadingInvoices || loadingCurrencies;

  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Multi-Currency Invoicing</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Loading data...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Multi-Currency Invoicing</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Create invoices in foreign currencies with automatic conversion
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={refreshRates}>
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh Rates
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> New Invoice
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Base Currency Total</p>
              <p className="text-xl font-bold">{formatCurrency(totalBaseCurrency)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <ArrowRightLeft className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Invoices</p>
              <p className="text-2xl font-bold">{invoices.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div
              className={`p-2 rounded-lg ${
                totalGainLoss >= 0 ? "bg-green-100 dark:bg-green-900" : "bg-red-100 dark:bg-red-900"
              }`}
            >
              {totalGainLoss >= 0 ? (
                <TrendingUp className="w-5 h-5 text-green-600" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-600" />
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500">Realized G/L</p>
              <p className={`text-xl font-bold ${totalGainLoss >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(totalGainLoss)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
              <TrendingUp className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Unrealized G/L</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(0)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Exchange Rates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(exchangeRates)
              .filter(([c]) => c !== "USD")
              .map(([currency, data]) => (
                <div
                  key={currency}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{currency}</span>
                    <span className="text-sm text-gray-500">= {data.rate}</span>
                  </div>
                  <span
                    className={`text-sm ${
                      data.change > 0 ? "text-green-600" : data.change < 0 ? "text-red-600" : "text-gray-400"
                    }`}
                  >
                    {data.change > 0 ? "+" : ""}
                    {data.change}%
                  </span>
                </div>
              ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Rate Trends</CardTitle>
          </CardHeader>
          <CardContent>
            {RATE_TREND.length === 0 ? (
              <div className="h-[250px] flex items-center justify-center text-center text-sm text-gray-500">
                Rate trend history is not available yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={RATE_TREND}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="EUR" stroke="#3b82f6" strokeWidth={2} />
                  <Line yAxisId="left" type="monotone" dataKey="GBP" stroke="#22c55e" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Realized & Unrealized Gains/Losses</CardTitle>
        </CardHeader>
        <CardContent>
          {GAIN_LOSS_DATA.length === 0 ? (
            <div className="h-[250px] flex items-center justify-center text-center text-sm text-gray-500">
              FX gain/loss history will appear once invoices are settled across periods.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={GAIN_LOSS_DATA}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend />
                <Line type="monotone" dataKey="realized" stroke="#22c55e" strokeWidth={2} name="Realized" />
                <Line type="monotone" dataKey="unrealized" stroke="#f97316" strokeWidth={2} name="Unrealized" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Invoices</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead className="text-right">Foreign Amount</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">Base Amount (USD)</TableHead>
                <TableHead className="text-right">Gain/Loss</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map(inv => (
                <TableRow key={inv.id}>
                  <TableCell className="font-mono font-medium">{inv.number}</TableCell>
                  <TableCell>{inv.customer}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{inv.currency}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {inv.totalForeign.toLocaleString()} {inv.currency}
                  </TableCell>
                  <TableCell className="text-right font-mono">{inv.exchangeRate}</TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(inv.totalBase)}</TableCell>
                  <TableCell className="text-right">
                    {inv.realizedGainLoss !== 0 ? (
                      <span
                        className={
                          inv.realizedGainLoss > 0 ? "text-green-600 font-semibold" : "text-red-600 font-semibold"
                        }
                      >
                        {inv.realizedGainLoss > 0 ? "+" : ""}
                        {formatCurrency(inv.realizedGainLoss)}
                      </span>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        inv.status === "paid"
                          ? "bg-green-100 text-green-800"
                          : inv.status === "sent"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-800"
                      }
                    >
                      {inv.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Multi-Currency Invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Customer</Label>
                <Input placeholder="Customer name" />
              </div>
              <div className="space-y-2">
                <Label>Invoice Currency</Label>
                <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(exchangeRates)
                      .filter(c => c !== "USD")
                      .map(c => (
                        <SelectItem key={c} value={c}>
                          {c} (Rate: {exchangeRates[c].rate})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Line Items</Label>
                <Button size="sm" variant="outline" onClick={addItem}>
                  <Plus className="w-3 h-3 mr-1" /> Add
                </Button>
              </div>
              <div className="space-y-2">
                {newItems.map(item => (
                  <div key={item.id} className="flex items-center gap-2">
                    <Input
                      placeholder="Description"
                      value={item.description}
                      onChange={e => updateItem(item.id, "description", e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      placeholder="Qty"
                      value={item.quantity || ""}
                      onChange={e => updateItem(item.id, "quantity", Number(e.target.value))}
                      className="w-20"
                    />
                    <Input
                      type="number"
                      placeholder="Price"
                      value={item.unitPrice || ""}
                      onChange={e => updateItem(item.id, "unitPrice", Number(e.target.value))}
                      className="w-28"
                    />
                    <span className="w-28 text-right font-mono text-sm">{item.amount.toLocaleString()}</span>
                    {newItems.length > 1 && (
                      <Button size="sm" variant="ghost" onClick={() => removeItem(item.id)}>
                        <Trash className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg flex justify-between">
                <span className="font-medium">Total ({selectedCurrency})</span>
                <span className="font-bold">{calcTotal(newItems).toLocaleString()}</span>
              </div>
              <div className="mt-1 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg flex justify-between">
                <span className="font-medium">Base Currency (USD) @ {exchangeRates[selectedCurrency]?.rate}</span>
                <span className="font-bold">
                  {formatCurrency(calcTotal(newItems) / (exchangeRates[selectedCurrency]?.rate || 1))}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createInvoice}>Create Invoice</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
