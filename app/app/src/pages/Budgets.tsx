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
import { Progress } from "@/components/ui/progress";
import { Plus, Trash, Target, TrendingUp, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function Budgets() {
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const { data: budgets, isLoading, refetch } = trpc.budget.list.useQuery();
  const { data: accounts } = trpc.account.list.useQuery();
  const { data: summary } = trpc.budget.getSummary.useQuery();

  const createBudget = trpc.budget.create.useMutation({
    onSuccess: () => { setOpen(false); refetch(); toast.success("Budget created"); },
    onError: (error) => toast.error(error.message),
  });
  const deleteBudget = trpc.budget.delete.useMutation({
    onSuccess: () => { setDeleteId(null); refetch(); toast.success("Budget deleted"); },
  });

  const formatCurrency = (v: string | number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(v));

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    createBudget.mutate({
      name: form.get("name") as string,
      accountId: Number(form.get("account")),
      period: form.get("period") as any,
      amount: form.get("amount") as string,
      startDate: form.get("startDate") as string,
      endDate: form.get("endDate") as string,
    });
  };

  const totalBudget = summary?.totalBudget || 0;
  const totalSpent = summary?.totalSpent || 0;
  const overallPct = totalBudget > 0 ? Math.min(100, (totalSpent / totalBudget) * 100) : 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Budgets</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Track spending against budgets</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" /> New Budget</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Create Budget</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2"><Label>Name *</Label><Input name="name" required /></div>
              <div className="space-y-2"><Label>Account *</Label>
                <Select name="account" required><SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                  <SelectContent>{accounts?.filter(a => a.type === "expense" || a.type === "income").map(a => <SelectItem key={a.id} value={String(a.id)}>{a.code} - {a.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Period</Label>
                  <Select name="period" defaultValue="monthly"><SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="quarterly">Quarterly</SelectItem><SelectItem value="yearly">Yearly</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Amount *</Label><Input name="amount" type="number" step="0.01" required /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Start Date *</Label><Input name="startDate" type="date" required /></div>
                <div className="space-y-2"><Label>End Date *</Label><Input name="endDate" type="date" required /></div>
              </div>
              <Button type="submit" className="w-full" disabled={createBudget.isPending}>{createBudget.isPending ? "Creating..." : "Create Budget"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-gray-500">Total Budget</p><p className="text-2xl font-bold">{formatCurrency(totalBudget)}</p></div>
              <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center"><Target className="w-6 h-6 text-blue-600" /></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-gray-500">Total Spent</p><p className="text-2xl font-bold">{formatCurrency(totalSpent)}</p></div>
              <div className="w-12 h-12 rounded-lg bg-amber-50 flex items-center justify-center"><TrendingUp className="w-6 h-6 text-amber-600" /></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-gray-500">Remaining</p><p className={`text-2xl font-bold ${totalBudget - totalSpent >= 0 ? "text-green-600" : "text-red-600"}`}>{formatCurrency(totalBudget - totalSpent)}</p></div>
              <div className={`w-12 h-12 rounded-lg ${totalBudget - totalSpent >= 0 ? "bg-green-50" : "bg-red-50"} flex items-center justify-center`}><AlertTriangle className={`w-6 h-6 ${totalBudget - totalSpent >= 0 ? "text-green-600" : "text-red-600"}`} /></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overall Progress */}
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between text-sm mb-2">
            <span>Overall Budget Usage</span>
            <span>{overallPct.toFixed(1)}%</span>
          </div>
          <Progress value={overallPct} className="h-3" />
        </CardContent>
      </Card>

      {/* Budget List */}
      <Card>
        <CardHeader><CardTitle>Budgets</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow><TableHead>Name</TableHead><TableHead>Account</TableHead><TableHead>Period</TableHead><TableHead className="text-right">Budget</TableHead><TableHead className="text-right">Spent</TableHead><TableHead>Progress</TableHead><TableHead className="w-[40px]"></TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow>}
              {budgets?.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-gray-500">No budgets yet</TableCell></TableRow>}
              {budgets?.map((b) => {
                const pct = Number(b.amount) > 0 ? Math.min(100, (Number(b.spent) / Number(b.amount)) * 100) : 0;
                return (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.name}</TableCell>
                    <TableCell>{b.accountName || "—"}</TableCell>
                    <TableCell><Badge variant="outline">{b.period}</Badge></TableCell>
                    <TableCell className="text-right">{formatCurrency(b.amount)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(b.spent)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={pct} className="h-2 flex-1" />
                        <span className="text-xs w-10">{pct.toFixed(0)}%</span>
                      </div>
                    </TableCell>
                    <TableCell><Button variant="ghost" size="icon" onClick={() => setDeleteId(b.id)}><Trash className="w-4 h-4 text-red-500" /></Button></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Budget</DialogTitle><DialogDescription>Are you sure?</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && deleteBudget.mutate({ id: deleteId })}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
