import { useState, useMemo } from "react";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, Printer, BookOpen, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export default function TrialBalance() {
  const [asOf, setAsOf] = useState(new Date().toISOString().split("T")[0]);
  const { data: accounts, isLoading } = trpc.account.list.useQuery();

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

  const trialBalanceData = useMemo(() => {
    if (!accounts) return { rows: [], totalDebit: 0, totalCredit: 0 };

    const rows = accounts.map((acc: any) => {
      const balance = Number(acc.balance) || 0;
      const isDebit = ["asset", "expense"].includes(acc.type);
      const debit = isDebit && balance >= 0 ? balance : 0;
      const credit = !isDebit && balance >= 0 ? balance : !isDebit && balance < 0 ? Math.abs(balance) : 0;
      const adjustedDebit = isDebit && balance < 0 ? 0 : isDebit ? balance : !isDebit && balance < 0 ? Math.abs(balance) : 0;
      const adjustedCredit = !isDebit && balance >= 0 ? balance : isDebit && balance < 0 ? Math.abs(balance) : 0;

      return {
        code: acc.code,
        name: acc.name,
        type: acc.type,
        debit: Math.max(0, isDebit ? balance : 0) + (!isDebit && balance < 0 ? Math.abs(balance) : 0),
        credit: Math.max(0, !isDebit ? balance : 0) + (isDebit && balance < 0 ? Math.abs(balance) : 0),
      };
    }).filter((r: any) => r.debit !== 0 || r.credit !== 0);

    const totalDebit = rows.reduce((sum: number, r: any) => sum + r.debit, 0);
    const totalCredit = rows.reduce((sum: number, r: any) => sum + r.credit, 0);

    return { rows, totalDebit, totalCredit };
  }, [accounts]);

  const isBalanced = Math.abs(trialBalanceData.totalDebit - trialBalanceData.totalCredit) < 0.01;

  const handlePrint = () => window.print();

  const handleExport = () => {
    if (trialBalanceData.rows.length === 0) {
      toast.error("No data to export");
      return;
    }
    const headers = ["Account Code", "Account Name", "Type", "Debit", "Credit"];
    const csvContent = [
      `Trial Balance as of ${asOf}`,
      "",
      headers.join(","),
      ...trialBalanceData.rows.map((r: any) =>
        [r.code, `"${r.name}"`, r.type, r.debit.toFixed(2), r.credit.toFixed(2)].join(",")
      ),
      "",
      `"Total",,,,${trialBalanceData.totalDebit.toFixed(2)},${trialBalanceData.totalCredit.toFixed(2)}`,
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trial_balance_${asOf}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Trial balance exported");
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-600" /> Trial Balance
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Verify that total debits equal total credits</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="space-y-1">
            <Label className="text-xs">As of Date</Label>
            <Input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} />
          </div>
          <div className="flex gap-2 mt-5">
            <Button variant="outline" onClick={handlePrint}><Printer className="w-4 h-4 mr-2" /> Print</Button>
            <Button variant="outline" onClick={handleExport}><Download className="w-4 h-4 mr-2" /> Export CSV</Button>
          </div>
        </div>
      </div>

      {/* Balance Status */}
      <Card>
        <CardContent className="p-4">
          <div className={`flex items-center justify-between p-3 rounded-lg ${isBalanced ? "bg-green-50 border border-green-200 dark:bg-green-900/20" : "bg-red-50 border border-red-200 dark:bg-red-900/20"}`}>
            <div className="flex items-center gap-2">
              <CheckCircle className={`w-5 h-5 ${isBalanced ? "text-green-600" : "text-red-600"}`} />
              <span className="font-medium">{isBalanced ? "Trial Balance is balanced" : "Trial Balance is NOT balanced"}</span>
            </div>
            <Badge className={isBalanced ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
              Difference: {formatCurrency(Math.abs(trialBalanceData.totalDebit - trialBalanceData.totalCredit))}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-sm text-gray-500">Total Debits</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(trialBalanceData.totalDebit)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-sm text-gray-500">Total Credits</p>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(trialBalanceData.totalCredit)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-sm text-gray-500">Difference</p>
            <p className={`text-2xl font-bold ${isBalanced ? "text-green-600" : "text-red-600"}`}>
              {formatCurrency(Math.abs(trialBalanceData.totalDebit - trialBalanceData.totalCredit))}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Trial Balance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Account Balances as of {asOf}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading accounts...</div>
          ) : trialBalanceData.rows.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No accounts found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Account Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trialBalanceData.rows.map((row: any) => (
                  <TableRow key={row.code}>
                    <TableCell className="font-mono text-sm">{row.code}</TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>
                      <Badge className={
                        row.type === "asset" ? "bg-blue-100 text-blue-700" :
                        row.type === "liability" ? "bg-amber-100 text-amber-700" :
                        row.type === "equity" ? "bg-purple-100 text-purple-700" :
                        row.type === "income" ? "bg-green-100 text-green-700" :
                        "bg-red-100 text-red-700"
                      }>{row.type}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {row.debit > 0 ? formatCurrency(row.debit) : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {row.credit > 0 ? formatCurrency(row.credit) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="border-t-2 border-gray-300 font-bold bg-gray-50 dark:bg-gray-800">
                  <TableCell colSpan={3}>TOTAL</TableCell>
                  <TableCell className="text-right font-mono text-green-700">
                    {formatCurrency(trialBalanceData.totalDebit)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-blue-700">
                    {formatCurrency(trialBalanceData.totalCredit)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
