import { useState, useMemo } from "react";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, Printer, Wallet, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { toast } from "sonner";

export default function CashBook() {
  const { data: invoices } = trpc.invoice.list.useQuery();
  const { data: bills } = trpc.bill.list.useQuery();
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0],
    to: new Date().toISOString().split("T")[0],
  });

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

  const cashTransactions = useMemo(() => {
    const txns: any[] = [];

    (invoices || []).forEach((inv: any) => {
      if (inv.status === "paid" || inv.status === "partially_paid") {
        txns.push({
          date: inv.paidDate || inv.date,
          type: "income",
          reference: inv.number,
          description: `Invoice to ${inv.contactName || "Customer"}`,
          amount: Number(inv.amount) || 0,
          source: "invoice",
        });
      }
    });

    (bills || []).forEach((bill: any) => {
      if (bill.status === "paid" || bill.status === "partially_paid") {
        txns.push({
          date: bill.paidDate || bill.date,
          type: "expense",
          reference: bill.number,
          description: `Bill from ${bill.contactName || "Vendor"}`,
          amount: Number(bill.amount) || 0,
          source: "bill",
        });
      }
    });

    // Add mock transactions if none exist
    if (txns.length === 0) {
      const mockTxns: any[] = []
      txns.push(...mockTxns);
    }

    return txns
      .filter((t) => t.date >= dateRange.from && t.date <= dateRange.to)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [invoices, bills, dateRange]);

  const summary = useMemo(() => {
    const totalIncome = cashTransactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const totalExpenses = cashTransactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    const netCashFlow = totalIncome - totalExpenses;
    return { totalIncome, totalExpenses, netCashFlow };
  }, [cashTransactions]);

  // Running balance
  const transactionsWithBalance = useMemo(() => {
    let runningBalance = 0;
    return cashTransactions.map((t) => {
      if (t.type === "income") runningBalance += t.amount;
      else runningBalance -= t.amount;
      return { ...t, balance: runningBalance };
    });
  }, [cashTransactions]);

  const handlePrint = () => window.print();

  const handleExport = () => {
    if (cashTransactions.length === 0) {
      toast.error("No data to export");
      return;
    }
    const headers = ["Date", "Type", "Reference", "Description", "Amount", "Running Balance"];
    const csvContent = [
      `Cash Book Report`,
      `Period: ${dateRange.from} to ${dateRange.to}`,
      "",
      `Total Income: ${summary.totalIncome.toFixed(2)}`,
      `Total Expenses: ${summary.totalExpenses.toFixed(2)}`,
      `Net Cash Flow: ${summary.netCashFlow.toFixed(2)}`,
      "",
      headers.join(","),
      ...transactionsWithBalance.map((t) =>
        [t.date, t.type, t.reference, `"${t.description}"`, t.amount.toFixed(2), t.balance.toFixed(2)].join(",")
      ),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cash_book_${dateRange.from}_${dateRange.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Cash book exported");
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Wallet className="w-6 h-6 text-blue-600" /> Cash Book
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Track all cash inflows and outflows</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="space-y-1">
            <Label className="text-xs">From</Label>
            <Input type="date" value={dateRange.from} onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">To</Label>
            <Input type="date" value={dateRange.to} onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })} />
          </div>
          <div className="flex gap-2 mt-5">
            <Button variant="outline" onClick={handlePrint}><Printer className="w-4 h-4 mr-2" /> Print</Button>
            <Button variant="outline" onClick={handleExport}><Download className="w-4 h-4 mr-2" /> Export CSV</Button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Income</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalIncome)}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-50 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Expenses</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(summary.totalExpenses)}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-red-50 flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Net Cash Flow</p>
                <p className={`text-2xl font-bold ${summary.netCashFlow >= 0 ? "text-blue-600" : "text-red-600"}`}>
                  {formatCurrency(summary.netCashFlow)}
                </p>
              </div>
              <div className={`w-12 h-12 rounded-lg ${summary.netCashFlow >= 0 ? "bg-blue-50" : "bg-red-50"} flex items-center justify-center`}>
                <Wallet className={`w-6 h-6 ${summary.netCashFlow >= 0 ? "text-blue-600" : "text-red-600"}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cash Flow Visualization */}
      <Card>
        <CardHeader>
          <CardTitle>Cash Flow Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex justify-between text-sm mb-1">
                <span>Income</span>
                <span>{formatCurrency(summary.totalIncome)}</span>
              </div>
              <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min(100, (summary.totalIncome / (summary.totalIncome || 1)) * 100)}%` }} />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex justify-between text-sm mb-1">
                <span>Expenses</span>
                <span>{formatCurrency(summary.totalExpenses)}</span>
              </div>
              <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-red-500 rounded-full" style={{ width: `${Math.min(100, (summary.totalExpenses / (summary.totalIncome || 1)) * 100)}%` }} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Cash Transactions ({transactionsWithBalance.length} entries)</CardTitle>
        </CardHeader>
        <CardContent>
          {transactionsWithBalance.length === 0 ? (
            <div className="text-center py-12">
              <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No cash transactions found for this period</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Running Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactionsWithBalance.map((txn, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-sm">{txn.date}</TableCell>
                    <TableCell>
                      <Badge className={txn.type === "income" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                        {txn.type === "income" ? (
                          <ArrowUpRight className="w-3 h-3 mr-1" />
                        ) : (
                          <ArrowDownRight className="w-3 h-3 mr-1" />
                        )}
                        {txn.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{txn.reference}</TableCell>
                    <TableCell>{txn.description}</TableCell>
                    <TableCell className="text-right font-mono">
                      <span className={txn.type === "income" ? "text-green-600" : "text-red-600"}>
                        {txn.type === "income" ? "+" : "-"}{formatCurrency(txn.amount)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      {formatCurrency(txn.balance)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="border-t-2 border-gray-300 font-bold bg-gray-50 dark:bg-gray-800">
                  <TableCell colSpan={4}>Final Balance</TableCell>
                  <TableCell className="text-right">
                    <span className={summary.netCashFlow >= 0 ? "text-green-600" : "text-red-600"}>
                      {summary.netCashFlow >= 0 ? "+" : ""}{formatCurrency(summary.netCashFlow)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(transactionsWithBalance[transactionsWithBalance.length - 1]?.balance || 0)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
