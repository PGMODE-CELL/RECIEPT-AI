import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, BookOpen, Landmark, TrendingUp, TrendingDown, Scale, DollarSign, Trash, Pencil } from "lucide-react";
import { toast } from "sonner";

const typeIcons: Record<string, any> = {
  asset: Landmark,
  liability: Scale,
  equity: DollarSign,
  income: TrendingUp,
  expense: TrendingDown,
};

const typeColors: Record<string, string> = {
  asset: "text-blue-600",
  liability: "text-amber-600",
  equity: "text-purple-600",
  income: "text-green-600",
  expense: "text-red-600",
};

export default function ChartOfAccounts() {
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [filter, setFilter] = useState("");
  const { data: accounts, isLoading, refetch } = trpc.account.list.useQuery();
  const createAccount = trpc.account.create.useMutation({
    onSuccess: () => { setOpen(false); refetch(); toast.success("Account created"); },
    onError: (error) => toast.error(error.message),
  });
  const updateAccount = trpc.account.update.useMutation({
    onSuccess: () => { setEditId(null); refetch(); toast.success("Account updated"); },
  });
  const deleteAccount = trpc.account.delete.useMutation({
    onSuccess: () => { setDeleteId(null); refetch(); toast.success("Account deleted"); },
    onError: (error) => toast.error(error.message),
  });

  const formatCurrency = (v: string | number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(v));

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    createAccount.mutate({
      code: form.get("code") as string,
      name: form.get("name") as string,
      type: form.get("type") as any,
      subType: form.get("subType") as string || undefined,
      isBankAccount: form.get("isBank") === "true",
      openingBalance: (form.get("balance") as string) || "0.00",
      description: form.get("description") as string || undefined,
    });
  };

  const filtered = accounts?.filter((a) => !filter || a.type === filter);

  const editingAccount = accounts?.find(a => a.id === editId);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Chart of Accounts</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your GL accounts</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" /> Add Account</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Add Account</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Account Code</Label><Input name="code" placeholder="e.g. 4100" required /></div>
                <div className="space-y-2"><Label>Name</Label><Input name="name" placeholder="e.g. Sales Revenue" required /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Type</Label>
                  <Select name="type" required><SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="asset">Asset</SelectItem><SelectItem value="liability">Liability</SelectItem><SelectItem value="equity">Equity</SelectItem><SelectItem value="income">Income</SelectItem><SelectItem value="expense">Expense</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Sub Type</Label><Input name="subType" placeholder="e.g. current, fixed" /></div>
              </div>
              <div className="space-y-2"><Label>Opening Balance</Label><Input name="balance" type="number" step="0.01" defaultValue="0" /></div>
              <div className="space-y-2"><Label>Description</Label><Input name="description" /></div>
              <Button type="submit" className="w-full" disabled={createAccount.isPending}>{createAccount.isPending ? "Creating..." : "Add Account"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              {["", "asset", "liability", "equity", "income", "expense"].map(t => (
                <Button key={t} variant={filter === t ? "default" : "outline"} size="sm" onClick={() => setFilter(t)}>{t || "All"}</Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow><TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Opening</TableHead><TableHead className="text-right">Current Balance</TableHead><TableHead>Status</TableHead><TableHead className="w-[80px]"></TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow>}
              {filtered?.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-gray-500">No accounts</TableCell></TableRow>}
              {filtered?.map((a) => {
                const Icon = typeIcons[a.type] || BookOpen;
                return (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono text-sm">{a.code}</TableCell>
                    <TableCell className="font-medium flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${typeColors[a.type] || ""}`} /> {a.name}
                      {a.isBankAccount && <Badge variant="outline" className="text-xs">Bank</Badge>}
                    </TableCell>
                    <TableCell><Badge variant="outline" className="capitalize">{a.type}</Badge></TableCell>
                    <TableCell className="text-right">{formatCurrency(a.openingBalance ?? "0")}</TableCell>
                    <TableCell className={`text-right font-medium ${Number(a.currentBalance) >= 0 ? "text-gray-900" : "text-red-600"}`}>{formatCurrency(a.currentBalance ?? "0")}</TableCell>
                    <TableCell><Badge className={a.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}>{a.isActive ? "Active" : "Inactive"}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="icon" onClick={() => setEditId(a.id)}><Pencil className="w-4 h-4 text-gray-400" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(a.id)}><Trash className="w-4 h-4 text-red-500" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editId !== null} onOpenChange={() => setEditId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Account</DialogTitle></DialogHeader>
          {editingAccount && (
            <form onSubmit={(e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              updateAccount.mutate({
                id: editId!,
                name: form.get("name") as string,
                description: form.get("description") as string || undefined,
                isActive: form.get("isActive") === "true",
              });
            }} className="space-y-4">
              <div className="space-y-2"><Label>Name</Label><Input name="name" defaultValue={editingAccount.name} required /></div>
              <div className="space-y-2"><Label>Description</Label><Input name="description" defaultValue={editingAccount.description || ""} /></div>
              <div className="space-y-2"><Label>Status</Label>
                <Select name="isActive" defaultValue={editingAccount.isActive ? "true" : "false"}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="true">Active</SelectItem><SelectItem value="false">Inactive</SelectItem></SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={updateAccount.isPending}>{updateAccount.isPending ? "Saving..." : "Save Changes"}</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
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
