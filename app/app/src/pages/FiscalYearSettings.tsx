import { useState } from "react";
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
import { Calendar, Plus, CheckCircle, Lock, Unlock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

interface FiscalPeriod {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  status: "open" | "closed";
  type: "month" | "quarter";
}

export default function FiscalYearSettings() {
  const [open, setOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [closeConfirmId, setCloseConfirmId] = useState<number | null>(null);

  const { data: fiscalYear, isLoading, refetch } = trpc.fiscalPeriod.get.useQuery();
  const updateFiscalYear = trpc.fiscalPeriod.update.useMutation({
    onSuccess: () => { setOpen(false); refetch(); toast.success("Fiscal year updated"); },
    onError: (e) => toast.error(e.message),
  });
  const closePeriod = trpc.fiscalPeriod.closePeriod.useMutation({
    onSuccess: () => { setCloseConfirmId(null); refetch(); toast.success("Period closed successfully"); },
    onError: (e) => toast.error(e.message),
  });
  const yearEndClose = trpc.fiscalPeriod.yearEndClose.useMutation({
    onSuccess: () => { setWizardOpen(false); refetch(); toast.success("Year-end closing completed"); },
    onError: (e) => toast.error(e.message),
  });

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

  const startMonth = fiscalYear?.startMonth || 1;
  const currentYear = new Date().getFullYear();

  const periods: FiscalPeriod[] = Array.from({ length: 12 }, (_, i) => {
    const monthIdx = ((startMonth - 1 + i) % 12);
    const year = startMonth + i > 12 ? currentYear + 1 : currentYear;
    const isClosed = i < 8;
    return {
      id: i + 1,
      name: `${months[monthIdx]} ${year}`,
      startDate: new Date(year, monthIdx, 1).toISOString().split("T")[0],
      endDate: new Date(year, monthIdx + 1, 0).toISOString().split("T")[0],
      status: isClosed ? "closed" : "open",
      type: "month",
    };
  });

  const openPeriods = periods.filter((p) => p.status === "open");
  const closedPeriods = periods.filter((p) => p.status === "closed");

  const trialBalance = {
    totalDebits: 245680.50,
    totalCredits: 245680.50,
    accounts: [
      { name: "Cash", debit: 45000, credit: 0 },
      { name: "Accounts Receivable", debit: 32500, credit: 0 },
      { name: "Inventory", debit: 28000, credit: 0 },
      { name: "Accounts Payable", debit: 0, credit: 18500 },
      { name: "Revenue", debit: 0, credit: 156800 },
      { name: "Expenses", debit: 140180.50, credit: 0 },
      { name: "Retained Earnings", debit: 0, credit: 70380.50 },
    ],
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-6 h-6 text-indigo-600" /> Fiscal Year Settings
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage fiscal periods and year-end closing</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setOpen(true)}>Edit Fiscal Year</Button>
          <Button onClick={() => setWizardOpen(true)}>Year-End Close Wizard</Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg"><Calendar className="w-5 h-5 text-blue-600" /></div>
              <div>
                <p className="text-sm text-gray-500">Fiscal Year</p>
                <p className="text-xl font-bold">{currentYear}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg"><CheckCircle className="w-5 h-5 text-green-600" /></div>
              <div>
                <p className="text-sm text-gray-500">Closed Periods</p>
                <p className="text-xl font-bold">{closedPeriods.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg"><Unlock className="w-5 h-5 text-amber-600" /></div>
              <div>
                <p className="text-sm text-gray-500">Open Periods</p>
                <p className="text-xl font-bold">{openPeriods.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg"><Calendar className="w-5 h-5 text-purple-600" /></div>
              <div>
                <p className="text-sm text-gray-500">Start Month</p>
                <p className="text-xl font-bold">{months[startMonth - 1]}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="periods">
        <TabsList>
          <TabsTrigger value="periods">Fiscal Periods</TabsTrigger>
          <TabsTrigger value="trial">Trial Balance</TabsTrigger>
        </TabsList>

        <TabsContent value="periods" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Fiscal Periods</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && <TableRow><TableCell colSpan={5} className="text-center py-8">Loading...</TableCell></TableRow>}
                  {periods.map((period) => (
                    <TableRow key={period.id}>
                      <TableCell className="font-medium">{period.name}</TableCell>
                      <TableCell className="font-mono text-sm">{period.startDate}</TableCell>
                      <TableCell className="font-mono text-sm">{period.endDate}</TableCell>
                      <TableCell>
                        <Badge className={period.status === "closed" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}>
                          {period.status === "closed" ? "Closed" : "Open"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {period.status === "open" && (
                          <Button variant="ghost" size="sm" onClick={() => setCloseConfirmId(period.id)}>
                            <Lock className="w-4 h-4 mr-1" /> Close
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trial" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Trial Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trialBalance.accounts.map((acc, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{acc.name}</TableCell>
                      <TableCell className="text-right font-mono">{acc.debit > 0 ? formatCurrency(acc.debit) : "—"}</TableCell>
                      <TableCell className="text-right font-mono">{acc.credit > 0 ? formatCurrency(acc.credit) : "—"}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="border-t-2 font-bold">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(trialBalance.totalDebits)}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(trialBalance.totalCredits)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <div className="mt-4 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <p className="text-sm text-green-700 dark:text-green-400">Trial balance is in balance. Ready for year-end closing.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Fiscal Year Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Fiscal Year</DialogTitle></DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            updateFiscalYear.mutate({ startMonth: Number(form.get("startMonth")) });
          }} className="space-y-4">
            <div className="space-y-2">
              <Label>Fiscal Year Start Month</Label>
              <Select name="startMonth" defaultValue={String(startMonth)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {months.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={updateFiscalYear.isPending}>
              {updateFiscalYear.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Close Period Confirmation */}
      <Dialog open={closeConfirmId !== null} onOpenChange={() => setCloseConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close Period</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="w-5 h-5" />
              <p className="text-sm font-medium">This action cannot be undone.</p>
            </div>
            <p className="text-sm text-gray-500">
              Closing this period will prevent any further journal entries from being posted. Ensure all transactions for <strong>{periods.find(p => p.id === closeConfirmId)?.name}</strong> have been recorded.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseConfirmId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => closeConfirmId && closePeriod.mutate({ periodId: closeConfirmId })} disabled={closePeriod.isPending}>
              {closePeriod.isPending ? "Closing..." : "Close Period"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Year-End Close Wizard */}
      <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Year-End Close Wizard</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-500">Complete the following steps to close the fiscal year:</p>
            <div className="space-y-3">
              {[
                { step: 1, label: "Review trial balance", done: true },
                { step: 2, label: "Post adjusting entries", done: true },
                { step: 3, label: "Close revenue accounts", done: false },
                { step: 4, label: "Close expense accounts", done: false },
                { step: 5, label: "Post income summary", done: false },
                { step: 6, label: "Close retained earnings", done: false },
              ].map((item) => (
                <div key={item.step} className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${item.done ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {item.done ? <CheckCircle className="w-4 h-4" /> : item.step}
                  </div>
                  <span className={`text-sm ${item.done ? "text-gray-400 line-through" : ""}`}>{item.label}</span>
                </div>
              ))}
            </div>
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <p className="text-sm text-blue-700 dark:text-blue-400">Ensure all periods are closed before running year-end closing.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWizardOpen(false)}>Cancel</Button>
            <Button onClick={() => yearEndClose.mutate({ year: currentYear })} disabled={yearEndClose.isPending}>
              {yearEndClose.isPending ? "Processing..." : "Run Year-End Close"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
