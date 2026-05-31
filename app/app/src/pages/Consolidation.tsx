import { useState, useMemo } from "react";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Building2, Plus, ArrowRight, Download, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface Company {
  id: number;
  name: string;
  currency: string;
  selected: boolean;
}

interface EliminationEntry {
  id: number;
  description: string;
  amount: number;
  accounts: string;
}

export default function Consolidation() {
  const [companies, setCompanies] = useState<Company[]>([
    { id: 1, name: "Parent Corp", currency: "USD", selected: true },
    { id: 2, name: "UK Subsidiary", currency: "GBP", selected: true },
    { id: 3, name: "EU Branch", currency: "EUR", selected: true },
    { id: 4, name: "Asia Pacific", currency: "JPY", selected: false },
  ]);
  const [baseCurrency, setBaseCurrency] = useState("USD");

  const formatCurrency = (v: number, currency = "USD") =>
    new Intl.NumberFormat("en-US", { style: "currency", currency }).format(v);

  const selectedCompanies = companies.filter((c) => c.selected);

  const toggleCompany = (id: number) => {
    setCompanies((prev) => prev.map((c) => c.id === id ? { ...c, selected: !c.selected } : c));
  };

  const eliminationEntries: EliminationEntry[] = [
    { id: 1, description: "Inter-company revenue/expense elimination", amount: 45000, accounts: "Revenue / COGS" },
    { id: 2, description: "Inter-company loan elimination", amount: 120000, accounts: "Receivable / Payable" },
    { id: 3, description: "Inter-company dividend elimination", amount: 25000, accounts: "Dividend Income / Retained Earnings" },
  ];

  const consolidatedPL = {
    revenue: selectedCompanies.reduce((s, c) => {
      const base = c.id === 1 ? 1500000 : c.id === 2 ? 800000 : c.id === 3 ? 600000 : 400000;
      const rate = c.currency === baseCurrency ? 1 : c.currency === "GBP" ? 1.27 : c.currency === "EUR" ? 1.09 : 0.0067;
      return s + base * rate;
    }, 0),
    cogs: selectedCompanies.reduce((s, c) => {
      const base = c.id === 1 ? 900000 : c.id === 2 ? 480000 : c.id === 3 ? 360000 : 240000;
      const rate = c.currency === baseCurrency ? 1 : c.currency === "GBP" ? 1.27 : c.currency === "EUR" ? 1.09 : 0.0067;
      return s + base * rate;
    }, 0),
    opex: selectedCompanies.reduce((s, c) => {
      const base = c.id === 1 ? 350000 : c.id === 2 ? 180000 : c.id === 3 ? 140000 : 90000;
      const rate = c.currency === baseCurrency ? 1 : c.currency === "GBP" ? 1.27 : c.currency === "EUR" ? 1.09 : 0.0067;
      return s + base * rate;
    }, 0),
  };

  const consolidatedBS = {
    assets: selectedCompanies.reduce((s, c) => {
      const base = c.id === 1 ? 3200000 : c.id === 2 ? 1600000 : c.id === 3 ? 1200000 : 800000;
      const rate = c.currency === baseCurrency ? 1 : c.currency === "GBP" ? 1.27 : c.currency === "EUR" ? 1.09 : 0.0067;
      return s + base * rate;
    }, 0),
    liabilities: selectedCompanies.reduce((s, c) => {
      const base = c.id === 1 ? 1800000 : c.id === 2 ? 900000 : c.id === 3 ? 700000 : 500000;
      const rate = c.currency === baseCurrency ? 1 : c.currency === "GBP" ? 1.27 : c.currency === "EUR" ? 1.09 : 0.0067;
      return s + base * rate;
    }, 0),
    equity: selectedCompanies.reduce((s, c) => {
      const base = c.id === 1 ? 1400000 : c.id === 2 ? 700000 : c.id === 3 ? 500000 : 300000;
      const rate = c.currency === baseCurrency ? 1 : c.currency === "GBP" ? 1.27 : c.currency === "EUR" ? 1.09 : 0.0067;
      return s + base * rate;
    }, 0),
  };

  const totalEliminations = eliminationEntries.reduce((s, e) => s + e.amount, 0);
  const netIncome = consolidatedPL.revenue - consolidatedPL.cogs - consolidatedPL.opex;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-6 h-6 text-indigo-600" /> Multi-Company Consolidation
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Consolidate financials across entities</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline"><Download className="w-4 h-4 mr-2" /> Export</Button>
          <Button><RefreshCw className="w-4 h-4 mr-2" /> Consolidate</Button>
        </div>
      </div>

      {/* Company Selection */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Select Companies to Consolidate</CardTitle>
            <div className="flex items-center gap-2">
              <Label className="text-sm">Base Currency:</Label>
              <Select value={baseCurrency} onValueChange={setBaseCurrency}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {companies.map((company) => (
              <div
                key={company.id}
                className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${company.selected ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/10" : "hover:border-gray-300"}`}
                onClick={() => toggleCompany(company.id)}
              >
                <Checkbox checked={company.selected} onCheckedChange={() => toggleCompany(company.id)} />
                <div className="flex-1">
                  <p className="font-medium">{company.name}</p>
                  <p className="text-xs text-gray-500">Currency: {company.currency}</p>
                </div>
                <Badge variant="outline">{company.currency}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="pl">
        <TabsList>
          <TabsTrigger value="pl">Consolidated P&L</TabsTrigger>
          <TabsTrigger value="bs">Consolidated Balance Sheet</TabsTrigger>
          <TabsTrigger value="eliminations">Eliminations</TabsTrigger>
          <TabsTrigger value="currency">Currency Adjustments</TabsTrigger>
        </TabsList>

        <TabsContent value="pl" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Consolidated Profit & Loss</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Line Item</TableHead><TableHead className="text-right">Amount</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Revenue</TableCell>
                    <TableCell className="text-right font-mono text-green-600">{formatCurrency(consolidatedPL.revenue)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Cost of Goods Sold</TableCell>
                    <TableCell className="text-right font-mono text-red-600">({formatCurrency(consolidatedPL.cogs)})</TableCell>
                  </TableRow>
                  <TableRow className="border-t-2">
                    <TableCell className="font-bold">Gross Profit</TableCell>
                    <TableCell className="text-right font-mono font-bold">{formatCurrency(consolidatedPL.revenue - consolidatedPL.cogs)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Operating Expenses</TableCell>
                    <TableCell className="text-right font-mono text-red-600">({formatCurrency(consolidatedPL.opex)})</TableCell>
                  </TableRow>
                  <TableRow className="border-t-2">
                    <TableCell className="font-bold text-lg">Net Income</TableCell>
                    <TableCell className={`text-right font-mono font-bold text-lg ${netIncome >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {formatCurrency(netIncome)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bs" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Consolidated Balance Sheet</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Line Item</TableHead><TableHead className="text-right">Amount</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Total Assets</TableCell>
                    <TableCell className="text-right font-mono font-bold">{formatCurrency(consolidatedBS.assets)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Total Liabilities</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(consolidatedBS.liabilities)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Shareholders Equity</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(consolidatedBS.equity)}</TableCell>
                  </TableRow>
                  <TableRow className="border-t-2">
                    <TableCell className="font-bold">Liabilities + Equity</TableCell>
                    <TableCell className="text-right font-mono font-bold">{formatCurrency(consolidatedBS.liabilities + consolidatedBS.equity)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 ${Math.abs(consolidatedBS.assets - (consolidatedBS.liabilities + consolidatedBS.equity)) < 1 ? "bg-green-50 dark:bg-green-900/20" : "bg-red-50 dark:bg-red-900/20"}`}>
                {Math.abs(consolidatedBS.assets - (consolidatedBS.liabilities + consolidatedBS.equity)) < 1 ? (
                  <><Badge className="bg-green-100 text-green-700">Balanced</Badge><span className="text-sm text-green-700 dark:text-green-400">Balance sheet is in balance</span></>
                ) : (
                  <><Badge className="bg-red-100 text-red-700">Imbalanced</Badge><span className="text-sm text-red-700 dark:text-red-400">Difference: {formatCurrency(Math.abs(consolidatedBS.assets - (consolidatedBS.liabilities + consolidatedBS.equity)))}</span></>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="eliminations" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Inter-Company Elimination Entries</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>Accounts</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eliminationEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">{entry.description}</TableCell>
                      <TableCell><Badge variant="outline">{entry.accounts}</Badge></TableCell>
                      <TableCell className="text-right font-mono text-red-600">({formatCurrency(entry.amount)})</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="border-t-2 font-bold">
                    <TableCell>Total Eliminations</TableCell>
                    <TableCell></TableCell>
                    <TableCell className="text-right font-mono">({formatCurrency(totalEliminations)})</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="currency" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Currency Translation Adjustments</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Local Currency</TableHead>
                    <TableHead className="text-right">Exchange Rate</TableHead>
                    <TableHead className="text-right">CTA</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companies.filter(c => c.selected).map((company) => {
                    const rate = company.currency === baseCurrency ? 1 : company.currency === "GBP" ? 1.27 : company.currency === "EUR" ? 1.09 : 0.0067;
                    const cta = company.currency === baseCurrency ? 0 : (Math.random() * 20000 - 10000);
                    return (
                      <TableRow key={company.id}>
                        <TableCell className="font-medium">{company.name}</TableCell>
                        <TableCell><Badge variant="outline">{company.currency}</Badge></TableCell>
                        <TableCell className="text-right font-mono">{rate.toFixed(4)}</TableCell>
                        <TableCell className={`text-right font-mono ${cta >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {formatCurrency(cta)}
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
