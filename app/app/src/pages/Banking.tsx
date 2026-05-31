import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Landmark, Plus, ArrowUpRight, Trash } from "lucide-react";
import { toast } from "sonner";

export default function Banking() {
  const [open, setOpen] = useState(false);
  const [txnOpen, setTxnOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [accountFilter, setAccountFilter] = useState<string>("all");

  const { data: accounts, isLoading, refetch } = trpc.account.list.useQuery();
  const { data: transactions, refetch: refetchTxn } = trpc.transaction.list.useQuery(
    accountFilter === "all" ? undefined : { accountId: Number(accountFilter) }
  );

  const utils = trpc.useUtils();
  const createAccount = trpc.account.create.useMutation({
    onSuccess: () => { setOpen(false); refetch(); utils.dashboard.stats.invalidate(); toast.success("Account created"); },
    onError: (error) => toast.error(error.message),
  });
  const deleteAccount = trpc.account.delete.useMutation({
    onSuccess: () => { setDeleteId(null); refetch(); toast.success("Account deleted"); },
    onError: (error) => toast.error(error.message),
  });
  const createTxn = trpc.transaction.create.useMutation({
    onSuccess: () => { setTxnOpen(false); refetchTxn(); refetch(); utils.dashboard.stats.invalidate(); toast.success("Transaction added"); },
    onError: (error) => toast.error(error.message),
  });
  const deleteTxn = trpc.transaction.delete.useMutation({
    onSuccess: () => { refetchTxn(); refetch(); toast.success("Transaction deleted"); },
  });

  const bankAccounts = accounts?.filter(a => a.isBankAccount) || [];
  const formatCurrency = (v: string | number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(v));

  const handleCreateAccount = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    createAccount.mutate({
      code: form.get("code") as string,
      name: form.get("name") as string,
      type: "asset",
      subType: "bank",
      isBankAccount: true,
      bankName: form.get("bankName") as string || undefined,
      bankAccountNumber: form.get("accountNumber") as string || undefined,
      openingBalance: (form.get("balance") as string) || "0.00",
    });
  };

  const handleCreateTxn = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    createTxn.mutate({
      accountId: Number(form.get("account")),
      date: form.get("date") as string,
      description: form.get("description") as string,
      type: form.get("type") as any,
      amount: (form.get("amount") as string) || "0",
      direction: form.get("direction") as any,
      reference: form.get("reference") as string || undefined,
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Banking</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Bank accounts and transactions</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={txnOpen} onOpenChange={setTxnOpen}>
            <DialogTrigger asChild><Button variant="outline"><ArrowUpRight className="w-4 h-4 mr-2" /> Add Transaction</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Add Transaction</DialogTitle></DialogHeader>
              <form onSubmit={handleCreateTxn} className="space-y-4">
                <div><Label>Account</Label>
                  <Select name="account" required>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select account" /></SelectTrigger>
                    <SelectContent>{bankAccounts.map(a => <SelectItem key={a.id} value={String(a.id)}>{a.name} ({formatCurrency(a.currentBalance ?? "0")})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Date</Label><Input name="date" type="date" className="mt-1" defaultValue={new Date().toISOString().split("T")[0]} required /></div>
                  <div><Label>Amount</Label><Input name="amount" type="number" step="0.01" className="mt-1" required /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Type</Label>
                    <Select name="type" required>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="income">Income</SelectItem><SelectItem value="expense">Expense</SelectItem>
                        <SelectItem value="deposit">Deposit</SelectItem><SelectItem value="withdrawal">Withdrawal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Direction</Label>
                    <Select name="direction" required>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="debit">Money In</SelectItem><SelectItem value="credit">Money Out</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>Description</Label><Input name="description" className="mt-1" required /></div>
                <div><Label>Reference</Label><Input name="reference" className="mt-1" placeholder="Optional" /></div>
                <Button type="submit" className="w-full" disabled={createTxn.isPending}>{createTxn.isPending ? "Adding..." : "Add Transaction"}</Button>
              </form>
            </DialogContent>
          </Dialog>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" /> Add Account</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Add Bank Account</DialogTitle></DialogHeader>
              <form onSubmit={handleCreateAccount} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Account Code</Label><Input name="code" placeholder="1200" className="mt-1" required /></div>
                  <div><Label>Account Name</Label><Input name="name" placeholder="Main Checking" className="mt-1" required /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Bank Name</Label><Input name="bankName" className="mt-1" /></div>
                  <div><Label>Account Number</Label><Input name="accountNumber" className="mt-1" /></div>
                </div>
                <div><Label>Opening Balance</Label><Input name="balance" type="number" step="0.01" className="mt-1" defaultValue="0" /></div>
                <Button type="submit" className="w-full" disabled={createAccount.isPending}>{createAccount.isPending ? "Adding..." : "Add Account"}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Bank Account Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading && Array.from({ length: 3 }).map((_, i) => <Card key={i}><CardContent className="p-6"><div className="animate-pulse h-20 bg-gray-200 rounded" /></CardContent></Card>)}
        {bankAccounts.length === 0 && !isLoading && (
          <Card className="col-span-full">
            <CardContent className="p-8 text-center">
              <Landmark className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No bank accounts yet. Add your first account to get started.</p>
            </CardContent>
          </Card>
        )}
        {bankAccounts.map((acc) => (
          <Card key={acc.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Landmark className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{acc.name}</p>
                    {acc.bankName && <p className="text-xs text-gray-500">{acc.bankName}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${Number(acc.currentBalance) >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {formatCurrency(acc.currentBalance ?? "0")}
                  </span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setDeleteId(acc.id)}>
                    <Trash className="w-3 h-3 text-red-500" />
                  </Button>
                </div>
              </div>
              {acc.bankAccountNumber && <p className="text-xs text-gray-400">{acc.bankAccountNumber}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Transactions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Transactions</CardTitle>
            <Select value={accountFilter} onValueChange={setAccountFilter}>
              <SelectTrigger className="w-48"><SelectValue placeholder="All Accounts" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Accounts</SelectItem>
                {bankAccounts.map(a => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow><TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead>Account</TableHead><TableHead>Type</TableHead><TableHead>Reference</TableHead><TableHead className="text-right">Debit</TableHead><TableHead className="text-right">Credit</TableHead><TableHead className="w-[40px]"></TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {transactions?.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-8 text-gray-500">No transactions</TableCell></TableRow>}
              {transactions?.slice(0, 50).map((t) => (
                <TableRow key={t.id}>
                  <TableCell>{t.date ? new Date(t.date).toLocaleDateString() : "—"}</TableCell>
                  <TableCell className="font-medium">{t.description}</TableCell>
                  <TableCell className="text-gray-500">{t.accountName || "—"}</TableCell>
                  <TableCell><span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{t.type}</span></TableCell>
                  <TableCell className="text-gray-500">{t.reference || "—"}</TableCell>
                  <TableCell className="text-right text-green-600">{Number(t.debit) > 0 ? formatCurrency(t.debit ?? "0") : "—"}</TableCell>
                  <TableCell className="text-right text-red-600">{Number(t.credit) > 0 ? formatCurrency(t.credit ?? "0") : "—"}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => deleteTxn.mutate({ id: t.id })}>
                      <Trash className="w-3 h-3 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delete Account Confirmation */}
      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogDescription>Are you sure you want to delete this account? This will fail if the account has transactions.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && deleteAccount.mutate({ id: deleteId })} disabled={deleteAccount.isPending}>
              {deleteAccount.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
