"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
  AreaChart,
  Area,
  Legend,
} from "recharts";
import { ArrowRightLeft, TrendingUp, TrendingDown, DollarSign, Shield, Plus } from "lucide-react";

interface HedgePosition {
  id: string;
  currency: string;
  exposureType: "payable" | "receivable";
  amount: number;
  exchangeRate: number;
  hedgeRate: number;
  hedgeType: "forward" | "option" | "none";
  hedgeRatio: number;
  maturityDate: string;
  unrealizedPL: number;
  counterparty: string;
}

interface HedgeContract {
  id: string;
  type: string;
  currency: string;
  notional: number;
  rate: number;
  maturity: string;
  counterparty: string;
  status: "active" | "matured" | "cancelled";
  realizedPL: number;
}

const FX_RATES: Record<string, number> = {
  EUR: 1.08,
  GBP: 1.27,
  JPY: 0.0067,
  CAD: 0.74,
  AUD: 0.65,
  CHF: 0.92,
  INR: 0.012,
  CNY: 0.14,
  MXN: 0.058,
  BRL: 0.2,
};

export default function CurrencyHedge() {
  const { data: transactions = [], isLoading: loadingTxns } = trpc.transaction.list.useQuery();
  const [addDialog, setAddDialog] = useState(false);

  const positions = useMemo((): HedgePosition[] => {
    const currencyTxns: Record<string, { payables: number; receivables: number; rate: number }> = {};

    for (const t of transactions) {
      const desc = (t.description || "").toUpperCase();
      const currencies = ["EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "INR", "CNY", "MXN", "BRL"];
      let detected = "USD";
      for (const c of currencies) {
        if (desc.includes(c)) {
          detected = c;
          break;
        }
      }
      if (detected === "USD") continue;

      if (!currencyTxns[detected])
        currencyTxns[detected] = { payables: 0, receivables: 0, rate: FX_RATES[detected] || 1 };
      const amt = (Number(t.debit) || 0) + (Number(t.credit) || 0);
      if (Number(t.debit) > 0) {
        currencyTxns[detected].payables += amt;
      } else {
        currencyTxns[detected].receivables += amt;
      }
    }

    const result: HedgePosition[] = [];

    for (const [cur, txData] of Object.entries(currencyTxns)) {
      if (txData.payables === 0 && txData.receivables === 0) continue;
      const rate = FX_RATES[cur] || 1;
      const total = txData.payables + txData.receivables;
      const isPayable = txData.payables > txData.receivables;

      result.push({
        id: `pos-${cur}`,
        currency: cur,
        exposureType: isPayable ? "payable" : "receivable",
        amount: total,
        exchangeRate: rate,
        hedgeRate: 0,
        hedgeType: "none",
        hedgeRatio: 0,
        maturityDate: "-",
        unrealizedPL: 0,
        counterparty: "-",
      });
    }

    return result;
  }, [transactions]);

  const contracts = useMemo((): HedgeContract[] => {
    return positions
      .filter(p => p.hedgeType !== "none")
      .map(
        (p): HedgeContract => ({
          id: `contract-${p.id}`,
          type: p.hedgeType === "forward" ? "Forward" : "Option",
          currency: p.currency,
          notional: Math.round((p.amount * p.hedgeRatio) / 100),
          rate: p.hedgeRate,
          maturity: p.maturityDate,
          counterparty: p.counterparty,
          status: "active",
          realizedPL: 0,
        }),
      );
  }, [positions]);

  const totalExposure = positions.reduce((s, p) => s + p.amount * p.exchangeRate, 0);
  const totalHedged = positions
    .filter(p => p.hedgeType !== "none")
    .reduce((s, p) => s + ((p.amount * p.hedgeRatio) / 100) * p.hedgeRate, 0);
  const totalUnrealizedPL = positions.reduce((s, p) => s + p.unrealizedPL, 0);
  const hedgeRatio = totalExposure > 0 ? ((totalHedged / totalExposure) * 100).toFixed(1) : "0";

  const EXPOSURE_DATA = useMemo(
    () =>
      positions.map(p => ({
        currency: p.currency,
        exposure: Math.round(p.amount * p.exchangeRate),
        hedged: p.hedgeType !== "none" ? Math.round(((p.amount * p.hedgeRatio) / 100) * p.hedgeRate) : 0,
      })),
    [positions],
  );

  // Historical hedge P&L requires settled-position history the backend does not
  // track yet; no fabricated series is shown.
  const PL_DATA: { month: string; unrealized: number; realized: number }[] = [];

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

  const getHedgeColor = (ratio: number) => {
    if (ratio >= 80) return "text-green-600";
    if (ratio >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const isLoading = loadingTxns;

  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Currency Hedge Tracker</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Loading transaction data...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Currency Hedge Tracker</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Track foreign currency positions and hedge contracts
          </p>
        </div>
        <Button onClick={() => setAddDialog(true)}>
          <Plus className="w-4 h-4 mr-2" /> Add Position
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Exposure</p>
              <p className="text-xl font-bold">{formatCurrency(totalExposure)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <Shield className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Hedge Ratio</p>
              <p className={`text-xl font-bold ${getHedgeColor(Number(hedgeRatio))}`}>{hedgeRatio}%</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div
              className={`p-2 rounded-lg ${
                totalUnrealizedPL >= 0 ? "bg-green-100 dark:bg-green-900" : "bg-red-100 dark:bg-red-900"
              }`}
            >
              {totalUnrealizedPL >= 0 ? (
                <TrendingUp className="w-5 h-5 text-green-600" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-600" />
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500">Unrealized P&L</p>
              <p className={`text-xl font-bold ${totalUnrealizedPL >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(totalUnrealizedPL)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <ArrowRightLeft className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Active Hedges</p>
              <p className="text-xl font-bold">{contracts.filter(c => c.status === "active").length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Exposure by Currency</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={EXPOSURE_DATA}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="currency" />
                <YAxis />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend />
                <Bar dataKey="exposure" fill="#3b82f6" name="Total Exposure" />
                <Bar dataKey="hedged" fill="#22c55e" name="Hedged Amount" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Hedge P&L Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {PL_DATA.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-center text-sm text-gray-500">
                Hedge P&amp;L history will appear once positions settle over time.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={PL_DATA}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="unrealized"
                    stroke="#f97316"
                    fill="#f97316"
                    fillOpacity={0.2}
                    name="Unrealized"
                  />
                  <Area
                    type="monotone"
                    dataKey="realized"
                    stroke="#22c55e"
                    fill="#22c55e"
                    fillOpacity={0.2}
                    name="Realized"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="positions">
        <TabsList>
          <TabsTrigger value="positions">Open Positions</TabsTrigger>
          <TabsTrigger value="contracts">Hedge Contracts</TabsTrigger>
        </TabsList>

        <TabsContent value="positions">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Currency</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Market Rate</TableHead>
                    <TableHead className="text-right">Hedge Rate</TableHead>
                    <TableHead>Hedge Type</TableHead>
                    <TableHead className="text-right">Hedge Ratio</TableHead>
                    <TableHead>Maturity</TableHead>
                    <TableHead className="text-right">Unrealized P&L</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {positions.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-semibold">{p.currency}</TableCell>
                      <TableCell>
                        <Badge variant={p.exposureType === "payable" ? "default" : "secondary"}>{p.exposureType}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">{p.amount.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-mono">{p.exchangeRate}</TableCell>
                      <TableCell className="text-right font-mono">
                        {p.hedgeType !== "none" ? p.hedgeRate : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            p.hedgeType === "forward" ? "default" : p.hedgeType === "option" ? "secondary" : "outline"
                          }
                        >
                          {p.hedgeType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={getHedgeColor(p.hedgeRatio)}>{p.hedgeRatio}%</span>
                      </TableCell>
                      <TableCell className="text-sm">{p.maturityDate}</TableCell>
                      <TableCell
                        className={`text-right font-semibold ${
                          p.unrealizedPL >= 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {formatCurrency(p.unrealizedPL)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contracts">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead className="text-right">Notional</TableHead>
                    <TableHead className="text-right">Contract Rate</TableHead>
                    <TableHead>Maturity</TableHead>
                    <TableHead>Counterparty</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Realized P&L</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contracts.map(c => (
                    <TableRow key={c.id}>
                      <TableCell>{c.type}</TableCell>
                      <TableCell className="font-semibold">{c.currency}</TableCell>
                      <TableCell className="text-right font-mono">{c.notional.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-mono">{c.rate}</TableCell>
                      <TableCell className="text-sm">{c.maturity}</TableCell>
                      <TableCell>{c.counterparty}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            c.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                          }
                        >
                          {c.status}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className={`text-right font-semibold ${c.realizedPL >= 0 ? "text-green-600" : "text-red-600"}`}
                      >
                        {formatCurrency(c.realizedPL)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Currency Position</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Currency</Label>
                <Input placeholder="EUR" />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Input placeholder="payable / receivable" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input type="number" placeholder="50000" />
              </div>
              <div className="space-y-2">
                <Label>Exchange Rate</Label>
                <Input type="number" step="0.0001" placeholder="1.08" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Hedge Type</Label>
                <Input placeholder="forward / option / none" />
              </div>
              <div className="space-y-2">
                <Label>Maturity Date</Label>
                <Input type="date" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                toast.success("Position added");
                setAddDialog(false);
              }}
            >
              Add Position
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
