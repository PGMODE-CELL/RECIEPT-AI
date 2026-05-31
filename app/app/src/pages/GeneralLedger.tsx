import { useState, useMemo } from "react";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, Printer, BookOpen, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { toast } from "sonner";

export default function GeneralLedger() {
  const { data: accounts } = trpc.account.list.useQuery();
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0],
    to: new Date().toISOString().split("T")[0],
  });

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

  const selectedAccount = useMemo(() => {
    if (!accounts || !selectedAccountId) return null;
    return accounts.find((a: any) => a.id === selectedAccountId) || null;
  }, [accounts, selectedAccountId]);

  // Mock transactions based on account data
  const transactions = useMemo(() => {
    if (!selectedAccount) return [];
    const balance = Number(selectedAccount.balance) || 0;
    const monthlyAmount = balance / 6;
    const txns = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const amount = monthlyAmount * (0.8 + Math.random() * 0.4);
      const isInflow = ["asset", "expense"].includes(selectedAccount.type) ? amount > 0 : amount >= 0;
      txns.push({
        date: date.toISOString().split("T")[0],
        reference: `TXN-${String(1000 + i).padStart(4, "0")}`,
        description: i % 2 === 0 ? "Invoice payment received" : "Bill payment made",
        debit: isInflow ? Math.abs(amount) : 0,
        credit: !isInflow ? Math.abs(amount) : 0,
        balance: balance * ((6 - i) / 6),
      });
    }
    return txns;
  }, [selectedAccount]);

  const openingBalance = transactions.length > 0 ? transactions[0].balance - (transactions[0].debit - transactions[0].credit) : 0;
  const closingBalance = transactions.length > 0 ? transactions[transactions.length - 1].balance : 0;

  const handlePrint = () => window.print();

  const handleExport = () => {
    if (transactions.length === 0) {
      toast.error("No data to export");
      return;
    }
    const headers = ["Date", "Reference", "Description", "Debit", "Credit", "Balance"];
    const csvContent = [
      `General Ledger - ${selectedAccount?.name || "All Accounts"}`,
      `Period: ${dateRange.from} to ${dateRange.to}`,
      "",
      headers.join(","),
      ...transactions.map((t) =>
        [t.date, t.reference, `"${t.description}"`, t.debit.toFixed(2), t.credit.toFixed(2), t.balance.toFixed(2)].join(",")
      ),
      "",
      `"Opening Balance",,,,,"${openingBalance.toFixed(2)}"`,
      `"Closing Balance",,,,,"${closingBalance.toFixed(2)}"`,
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `general_ledger_${selectedAccount?.code || "all"}_${dateRange.from}_${dateRange.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("General ledger exported");
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-600" /> General Ledger
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Detailed transaction history for any account</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}><Printer className="w-4 h-4 mr-2" /> Print</Button>
          <Button variant="outline" onClick={handleExport}><Download className="w-4 h-4 mr-2" /> Export CSV</Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1 flex-1 min-w-[200px]">
              <Label className="text-xs">Account</Label>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="w-full h-10 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
              >
                <option value="">Select an account</option>
                {accounts?.map((acc: any) => (
                  <option key={acc.id} value={acc.id}>{acc.code} - {acc.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">From</Label>
              <Input type="date" value={dateRange.from} onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">To</Label>
              <Input type="date" value={dateRange.to} onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })} />
            </div>
          </div>
        </CardContent>
      </Card>

      {!selectedAccountId ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Select an account to view its ledger</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Account Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-gray-500">Account</p>
                <p className="font-medium">{selectedAccount?.code} - {selectedAccount?.name}</p>
                <Badge className={`mt-1 ${
                  selectedAccount?.type === "asset" ? "bg-blue-100 text-blue-700" :
                  selectedAccount?.type === "liability" ? "bg-amber-100 text-amber-700" :
                  selectedAccount?.type === "equity" ? "bg-purple-100 text-purple-700" :
                  selectedAccount?.type === "income" ? "bg-green-100 text-green-700" :
                  "bg-red-100 text-red-700"
                }`}>{selectedAccount?.type}</Badge>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-gray-500">Opening Balance</p>
                <p className="text-xl font-bold">{formatCurrency(openingBalance)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-gray-500">Closing Balance</p>
                <p className={`text-xl font-bold ${closingBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(closingBalance)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Transactions Table */}
          <Card>
            <CardHeader>
              <CardTitle>Transactions ({dateRange.from} to {dateRange.to})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    <TableHead className="text-right">Running Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">No transactions found</TableCell>
                    </TableRow>
                  ) : (
                    transactions.map((txn, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-sm">{txn.date}</TableCell>
                        <TableCell className="font-mono text-sm">{txn.reference}</TableCell>
                        <TableCell>{txn.description}</TableCell>
                        <TableCell className="text-right font-mono">
                          {txn.debit > 0 ? (
                            <span className="text-green-600 flex items-center justify-end gap-1">
                              <ArrowUpRight className="w-3 h-3" />{formatCurrency(txn.debit)}
                            </span>
                          ) : "—"}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {txn.credit > 0 ? (
                            <span className="text-red-600 flex items-center justify-end gap-1">
                              <ArrowDownRight className="w-3 h-3" />{formatCurrency(txn.credit)}
                            </span>
                          ) : "—"}
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium">
                          {formatCurrency(txn.balance)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
