import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, FileBarChart, Wallet, Receipt, AlertTriangle, Download, Calendar, Printer, Copy } from "lucide-react";
import { toast } from "sonner";

export default function Reports() {
  const [period, setPeriod] = useState({
    from: new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0],
    to: new Date().toISOString().split("T")[0],
  });
  const { data: pl, isLoading: plLoading } = trpc.report.profitLoss.useQuery(period);
  const { data: bs, isLoading: bsLoading } = trpc.report.balanceSheet.useQuery({ asOf: period.to });
  const { data: cf, isLoading: cfLoading } = trpc.report.cashFlow.useQuery(period);
  const { data: ar } = trpc.report.agedReceivables.useQuery();
  const { data: ap } = trpc.report.agedPayables.useQuery();
  const { data: tax } = trpc.report.taxSummary.useQuery(period);

  const formatCurrency = (v: string | number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(v));

  const handlePrint = () => window.print();

  const exportToCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) {
      toast.error("No data to export");
      return;
    }
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(","),
      ...data.map(row => headers.map(h => `"${row[h] || ""}"`).join(","))
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported successfully");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const formatPLForExport = () => {
    if (!pl) return [];
    const rows = [
      { Type: "INCOME", Account: "", Amount: "" },
      ...(pl.incomeAccounts || []).map((a: any) => ({ Type: "", Account: a.name, Amount: a.amount })),
      { Type: "Total Income", Account: "", Amount: pl.income },
      { Type: "", Account: "", Amount: "" },
      { Type: "EXPENSES", Account: "", Amount: "" },
      ...(pl.expenseAccounts || []).map((a: any) => ({ Type: "", Account: a.name, Amount: a.amount })),
      { Type: "Total Expenses", Account: "", Amount: pl.expenses },
      { Type: "", Account: "", Amount: "" },
      { Type: "NET PROFIT/LOSS", Account: "", Amount: pl.netProfit },
    ];
    return rows;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Financial reports and analytics</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="space-y-1"><Label className="text-xs">From</Label><Input type="date" value={period.from} onChange={(e) => setPeriod({ ...period, from: e.target.value })} /></div>
          <div className="space-y-1"><Label className="text-xs">To</Label><Input type="date" value={period.to} onChange={(e) => setPeriod({ ...period, to: e.target.value })} /></div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrint}><Printer className="w-4 h-4 mr-2" /> Print</Button>
            <Button variant="outline" onClick={() => exportToCSV(formatPLForExport(), "profit_loss")}><Download className="w-4 h-4 mr-2" /> Export</Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="pl">
        <TabsList>
          <TabsTrigger value="pl"><TrendingUp className="w-4 h-4 mr-1" /> P&L</TabsTrigger>
          <TabsTrigger value="bs"><FileBarChart className="w-4 h-4 mr-1" /> Balance Sheet</TabsTrigger>
          <TabsTrigger value="cf"><Wallet className="w-4 h-4 mr-1" /> Cash Flow</TabsTrigger>
          <TabsTrigger value="tax"><Receipt className="w-4 h-4 mr-1" /> Tax</TabsTrigger>
          <TabsTrigger value="aged"><AlertTriangle className="w-4 h-4 mr-1" /> Aged</TabsTrigger>
        </TabsList>

        {/* Profit & Loss */}
        <TabsContent value="pl" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  <CardTitle>Profit & Loss Statement</CardTitle>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(`P&L Report\nPeriod: ${period.from} to ${period.to}\n\nRevenue: ${formatCurrency(pl?.income || 0)}\nExpenses: ${formatCurrency(pl?.expenses || 0)}\nNet Profit: ${formatCurrency(pl?.netProfit || 0)}`)}>
                    <Copy className="w-4 h-4 mr-1" /> Copy
                  </Button>
                </div>
              </div>
              <p className="text-sm text-gray-500">{period.from} to {period.to}</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-green-700">{formatCurrency(pl?.income || 0)}</p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg">
                  <p className="text-sm text-gray-600">Total Expenses</p>
                  <p className="text-2xl font-bold text-red-700">{formatCurrency(pl?.expenses || 0)}</p>
                </div>
                <div className={`p-4 rounded-lg ${(pl?.netProfit || 0) >= 0 ? "bg-blue-50" : "bg-red-50"}`}>
                  <p className="text-sm text-gray-600">Net Profit / Loss</p>
                  <p className={`text-2xl font-bold ${(pl?.netProfit || 0) >= 0 ? "text-blue-700" : "text-red-700"}`}>{formatCurrency(pl?.netProfit || 0)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-sm text-gray-700 mb-3">Income Accounts</h4>
                  <Table>
                    <TableHeader><TableRow><TableHead>Account</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {pl?.incomeAccounts?.map((a: any) => (
                        <TableRow key={a.code}><TableCell>{a.name}</TableCell><TableCell className="text-right">{formatCurrency(a.amount)}</TableCell></TableRow>
                      ))}
                      {(!pl?.incomeAccounts || pl.incomeAccounts.length === 0) && (
                        <TableRow><TableCell colSpan={2} className="text-center text-gray-500">No income data</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-gray-700 mb-3">Expense Accounts</h4>
                  <Table>
                    <TableHeader><TableRow><TableHead>Account</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {pl?.expenseAccounts?.map((a: any) => (
                        <TableRow key={a.code}><TableCell>{a.name}</TableCell><TableCell className="text-right">{formatCurrency(a.amount)}</TableCell></TableRow>
                      ))}
                      {(!pl?.expenseAccounts || pl.expenseAccounts.length === 0) && (
                        <TableRow><TableCell colSpan={2} className="text-center text-gray-500">No expense data</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Balance Sheet */}
        <TabsContent value="bs" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileBarChart className="w-5 h-5 text-indigo-600" />
                  <CardTitle>Balance Sheet</CardTitle>
                </div>
                <Button variant="ghost" size="sm" onClick={() => copyToClipboard(`Balance Sheet\nAs of: ${period.to}\n\nAssets: ${formatCurrency(bs?.totalAssets || 0)}\nLiabilities: ${formatCurrency(bs?.totalLiabilities || 0)}\nEquity: ${formatCurrency(bs?.totalEquity || 0)}`)}>
                  <Copy className="w-4 h-4 mr-1" /> Copy
                </Button>
              </div>
              <p className="text-sm text-gray-500">As of {period.to}</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-gray-700">Assets</h4>
                {bs?.assets?.map((a: any) => (
                  <div key={a.code} className="flex justify-between text-sm"><span>{a.name}</span><span>{formatCurrency(a.balance)}</span></div>
                ))}
                <div className="flex justify-between font-medium pt-1 border-t"><span>Total Assets</span><span>{formatCurrency(bs?.totalAssets || 0)}</span></div>
              </div>
              <div className="space-y-2 pt-3 border-t">
                <h4 className="font-semibold text-sm text-gray-700">Liabilities</h4>
                {bs?.liabilities?.map((l: any) => (
                  <div key={l.code} className="flex justify-between text-sm"><span>{l.name}</span><span>{formatCurrency(l.balance)}</span></div>
                ))}
                <div className="flex justify-between font-medium pt-1 border-t"><span>Total Liabilities</span><span>{formatCurrency(bs?.totalLiabilities || 0)}</span></div>
              </div>
              <div className="space-y-2 pt-3 border-t">
                <h4 className="font-semibold text-sm text-gray-700">Equity</h4>
                {bs?.equity?.map((e: any) => (
                  <div key={e.code} className="flex justify-between text-sm"><span>{e.name}</span><span>{formatCurrency(e.balance)}</span></div>
                ))}
                <div className="flex justify-between font-medium pt-1 border-t"><span>Total Equity</span><span>{formatCurrency(bs?.totalEquity || 0)}</span></div>
              </div>

              <div className={`p-4 rounded-lg ${Math.abs((bs?.totalAssets || 0) - ((bs?.totalLiabilities || 0) + (bs?.totalEquity || 0))) < 0.01 ? "bg-green-50" : "bg-red-50"}`}>
                <div className="flex justify-between">
                  <span className="font-medium">Assets = Liabilities + Equity</span>
                  <span className={Math.abs((bs?.totalAssets || 0) - ((bs?.totalLiabilities || 0) + (bs?.totalEquity || 0))) < 0.01 ? "text-green-700" : "text-red-700"}>
                    {Math.abs((bs?.totalAssets || 0) - ((bs?.totalLiabilities || 0) + (bs?.totalEquity || 0))) < 0.01 ? "Balanced ✓" : "Imbalanced"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cash Flow */}
        <TabsContent value="cf" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-blue-600" />
                  <CardTitle>Cash Flow Statement</CardTitle>
                </div>
                <Button variant="ghost" size="sm" onClick={() => copyToClipboard(`Cash Flow\nPeriod: ${period.from} to ${period.to}\n\nInflows: ${formatCurrency(cf?.totalIn || 0)}\nOutflows: ${formatCurrency(cf?.totalOut || 0)}\nNet: ${formatCurrency(cf?.netFlow || 0)}`)}>
                  <Copy className="w-4 h-4 mr-1" /> Copy
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600">Total Inflows</p>
                  <p className="text-2xl font-bold text-green-700">{formatCurrency(cf?.totalIn || 0)}</p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg">
                  <p className="text-sm text-gray-600">Total Outflows</p>
                  <p className="text-2xl font-bold text-red-700">{formatCurrency(cf?.totalOut || 0)}</p>
                </div>
              </div>
              <div className={`p-4 rounded-lg ${(cf?.netFlow || 0) >= 0 ? "bg-blue-50" : "bg-red-50"}`}>
                <p className="text-sm text-gray-600">Net Cash Flow</p>
                <p className={`text-2xl font-bold ${(cf?.netFlow || 0) >= 0 ? "text-blue-700" : "text-red-700"}`}>{formatCurrency(cf?.netFlow || 0)}</p>
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-sm text-gray-700 mb-3">Inflows by Type</h4>
                  <Table>
                    <TableHeader><TableRow><TableHead>Type</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {cf?.inflows?.map((i: any) => (
                        <TableRow key={i.type}><TableCell className="capitalize">{i.type}</TableCell><TableCell className="text-right text-green-600">{formatCurrency(i.total)}</TableCell></TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-gray-700 mb-3">Outflows by Type</h4>
                  <Table>
                    <TableHeader><TableRow><TableHead>Type</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {cf?.outflows?.map((o: any) => (
                        <TableRow key={o.type}><TableCell className="capitalize">{o.type}</TableCell><TableCell className="text-right text-red-600">{formatCurrency(o.total)}</TableCell></TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tax Summary */}
        <TabsContent value="tax" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-amber-600" />
                  <CardTitle>Tax Summary</CardTitle>
                </div>
                <Button variant="ghost" size="sm" onClick={() => copyToClipboard(`Tax Summary\nPeriod: ${period.from} to ${period.to}\n\nOutput Tax: ${formatCurrency(tax?.outputTax || 0)}\nInput Tax: ${formatCurrency(tax?.inputTax || 0)}\nTax Payable: ${formatCurrency(tax?.taxPayable || 0)}`)}>
                  <Copy className="w-4 h-4 mr-1" /> Copy
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                    <h4 className="font-semibold text-sm">Sales Tax (Output)</h4>
                    <div className="flex justify-between"><span className="text-sm text-gray-600">Total Revenue</span><span className="font-medium">{formatCurrency(tax?.totalRevenue || 0)}</span></div>
                    <div className="flex justify-between"><span className="text-sm text-gray-600">Output Tax Collected</span><span className="font-medium text-green-600">{formatCurrency(tax?.outputTax || 0)}</span></div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                    <h4 className="font-semibold text-sm">Purchase Tax (Input)</h4>
                    <div className="flex justify-between"><span className="text-sm text-gray-600">Total Purchases</span><span className="font-medium">{formatCurrency(tax?.totalPurchases || 0)}</span></div>
                    <div className="flex justify-between"><span className="text-sm text-gray-600">Input Tax Paid</span><span className="font-medium text-red-600">-{formatCurrency(tax?.inputTax || 0)}</span></div>
                  </div>
                </div>
                <div className={`p-4 rounded-lg ${(tax?.taxPayable || 0) >= 0 ? "bg-amber-50" : "bg-green-50"}`}>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Tax Payable / (Refundable)</span>
                    <span className={`text-xl font-bold ${(tax?.taxPayable || 0) >= 0 ? "text-amber-700" : "text-green-700"}`}>{formatCurrency(tax?.taxPayable || 0)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aged Receivables & Payables */}
        <TabsContent value="aged" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <CardTitle>Aged Receivables</CardTitle>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => exportToCSV((ar || []).map((i: any) => ({ Invoice: i.number, Customer: i.contactName, Days: i.daysOverdue, Due: i.amountDue })), "aged_receivables")}>
                    <Download className="w-4 h-4 mr-1" /> Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Customer</TableHead><TableHead>Days</TableHead><TableHead className="text-right">Due</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {ar?.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-4 text-gray-500">No overdue invoices</TableCell></TableRow>}
                    {ar?.map((i: any) => (
                      <TableRow key={i.id}>
                        <TableCell>{i.number}</TableCell>
                        <TableCell>{i.contactName || "—"}</TableCell>
                        <TableCell className="text-red-600">{i.daysOverdue} days</TableCell>
                        <TableCell className="text-right">{formatCurrency(i.amountDue)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {ar && ar.length > 0 && (
                  <div className="mt-4 pt-4 border-t flex justify-between font-medium">
                    <span>Total Overdue</span>
                    <span className="text-red-600">{formatCurrency(ar.reduce((s: number, i: any) => s + Number(i.amountDue), 0))}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    <CardTitle>Aged Payables</CardTitle>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => exportToCSV((ap || []).map((b: any) => ({ Bill: b.number, Vendor: b.contactName, Days: b.daysOverdue, Due: b.amountDue })), "aged_payables")}>
                    <Download className="w-4 h-4 mr-1" /> Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Bill</TableHead><TableHead>Vendor</TableHead><TableHead>Days</TableHead><TableHead className="text-right">Due</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {ap?.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-4 text-gray-500">No overdue bills</TableCell></TableRow>}
                    {ap?.map((b: any) => (
                      <TableRow key={b.id}>
                        <TableCell>{b.number}</TableCell>
                        <TableCell>{b.contactName || "—"}</TableCell>
                        <TableCell className="text-amber-600">{b.daysOverdue} days</TableCell>
                        <TableCell className="text-right">{formatCurrency(b.amountDue)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {ap && ap.length > 0 && (
                  <div className="mt-4 pt-4 border-t flex justify-between font-medium">
                    <span>Total Overdue</span>
                    <span className="text-amber-600">{formatCurrency(ap.reduce((s: number, b: any) => s + Number(b.amountDue), 0))}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
