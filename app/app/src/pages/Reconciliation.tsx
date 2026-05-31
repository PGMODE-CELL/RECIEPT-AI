import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export default function Reconciliation() {
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const { data: reconciliations, isLoading, refetch } = trpc.reconciliation.list.useQuery(selectedAccount ? { accountId: Number(selectedAccount) } : undefined);
  const { data: accounts } = trpc.account.list.useQuery();
  const { data: unreconciled } = trpc.reconciliation.getUnreconciled.useQuery(
    { accountId: Number(selectedAccount) || 0 },
    { enabled: !!selectedAccount }
  );

  const createReconciliation = trpc.reconciliation.create.useMutation({ onSuccess: () => { setOpen(false); refetch(); toast.success("Reconciliation created"); } });
  const reconcile = trpc.reconciliation.reconcile.useMutation({ onSuccess: () => { refetch(); toast.success("Reconciled"); } });
  const deleteReconciliation = trpc.reconciliation.delete.useMutation({ onSuccess: () => { setDeleteId(null); refetch(); toast.success("Deleted"); } });

  const formatCurrency = (v: string | number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(v));

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    createReconciliation.mutate({ accountId: Number(f.get("account")), statementDate: f.get("date") as string, statementBalance: f.get("balance") as string, notes: f.get("notes") as string || undefined });
  };

  const bankAccounts = accounts?.filter(a => a.isBankAccount) || [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bank Reconciliation</h1><p className="text-sm text-gray-500">Reconcile bank statements</p></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" /> New Reconciliation</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>New Reconciliation</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2"><Label>Account *</Label><Select name="account" required><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{bankAccounts.map(a => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Statement Date *</Label><Input name="date" type="date" required /></div>
                <div className="space-y-2"><Label>Statement Balance *</Label><Input name="balance" type="number" step="0.01" required /></div>
              </div>
              <div className="space-y-2"><Label>Notes</Label><Input name="notes" /></div>
              <Button type="submit" className="w-full">Create</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        <Label>Select Bank Account</Label>
        <Select value={selectedAccount} onValueChange={setSelectedAccount}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Select account" /></SelectTrigger>
          <SelectContent>{bankAccounts.map(a => <SelectItem key={a.id} value={String(a.id)}>{a.name} ({formatCurrency(a.currentBalance || "0")})</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {selectedAccount && unreconciled && unreconciled.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Unreconciled Transactions ({unreconciled.length})</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
              <TableBody>
                {unreconciled.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>{t.date ? new Date(t.date).toLocaleDateString() : "—"}</TableCell>
                    <TableCell className="font-medium">{t.description}</TableCell>
                    <TableCell><Badge variant="outline">{t.type}</Badge></TableCell>
                    <TableCell className="text-right">{formatCurrency(Number(t.debit) > 0 ? t.debit : `-${t.credit}`)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Reconciliation History</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Statement Balance</TableHead><TableHead>System Balance</TableHead><TableHead>Difference</TableHead><TableHead>Status</TableHead><TableHead className="w-[80px]"></TableHead></TableRow></TableHeader>
            <TableBody>
              {reconciliations?.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.statementDate ? new Date(r.statementDate).toLocaleDateString() : "—"}</TableCell>
                  <TableCell>{formatCurrency(r.statementBalance)}</TableCell>
                  <TableCell>{formatCurrency(r.endingBalance)}</TableCell>
                  <TableCell className={Math.abs(Number(r.statementBalance) - Number(r.endingBalance)) < 0.01 ? "text-green-600" : "text-red-600"}>
                    {formatCurrency(Math.abs(Number(r.statementBalance) - Number(r.endingBalance)))}
                  </TableCell>
                  <TableCell><Badge variant={r.status === "reconciled" ? "default" : "outline"}>{r.status}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {r.status === "draft" && <Button variant="ghost" size="icon" onClick={() => reconcile.mutate({ id: r.id })}><CheckCircle className="w-4 h-4 text-green-500" /></Button>}
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(r.id)}><Trash className="w-4 h-4 text-red-500" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {reconciliations?.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-500">No reconciliations</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent><DialogHeader><DialogTitle>Delete?</DialogTitle></DialogHeader>
          <DialogFooter><Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button><Button variant="destructive" onClick={() => deleteId && deleteReconciliation.mutate({ id: deleteId })}>Delete</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
