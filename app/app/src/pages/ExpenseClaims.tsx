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
import { Plus, Search, Trash, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  submitted: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  paid: "bg-purple-100 text-purple-700",
};

const categories = ["Travel", "Meals", "Office Supplies", "Software", "Hardware", "Communication", "Training", "Other"];

export default function ExpenseClaims() {
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [page, setPage] = useState(1);

  const { data, isLoading, refetch } = trpc.expenseClaim.list.useQuery({
    status: status === "all" ? undefined : status,
    search: search || undefined,
    page,
    limit: 20,
  });
  const claims = data?.claims || [];
  const totalPages = Math.ceil((data?.total || 0) / 20);

  const { data: employees } = trpc.employee.list.useQuery();
  const { data: nextNumber } = trpc.expenseClaim.nextNumber.useQuery();

  const utils = trpc.useUtils();
  const createClaim = trpc.expenseClaim.create.useMutation({
    onSuccess: () => { setOpen(false); refetch(); utils.dashboard.stats.invalidate(); toast.success("Expense claim created"); },
    onError: (error) => toast.error(error.message),
  });
  const deleteClaim = trpc.expenseClaim.delete.useMutation({
    onSuccess: () => { setDeleteId(null); refetch(); utils.dashboard.stats.invalidate(); toast.success("Expense claim deleted"); },
  });

  const formatCurrency = (v: string | number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(v));

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    createClaim.mutate({
      claimNumber: form.get("number") as string,
      employeeId: Number(form.get("employee")),
      date: form.get("date") as string,
      category: form.get("category") as string,
      amount: form.get("amount") as string,
      description: form.get("description") as string || undefined,
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Expense Claims</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage employee expense claims</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" /> New Claim</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Create Expense Claim</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Claim #</Label><Input name="number" defaultValue={nextNumber || ""} required /></div>
                <div className="space-y-2"><Label>Employee</Label>
                  <Select name="employee" required>
                    <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                    <SelectContent>{employees?.map(e => <SelectItem key={e.id} value={String(e.id)}>{e.firstName} {e.lastName}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Date</Label><Input name="date" type="date" defaultValue={new Date().toISOString().split("T")[0]} required /></div>
                <div className="space-y-2"><Label>Category</Label>
                  <Select name="category" required>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2"><Label>Amount ($)</Label><Input name="amount" type="number" step="0.01" min="0" required /></div>
              <div className="space-y-2"><Label>Description</Label><Input name="description" placeholder="Expense details" /></div>
              <Button type="submit" className="w-full" disabled={createClaim.isPending}>{createClaim.isPending ? "Creating..." : "Create Claim"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Search expense claims..." className="pl-9" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
              <SelectTrigger className="w-40"><SelectValue placeholder="All Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem><SelectItem value="draft">Draft</SelectItem><SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="approved">Approved</SelectItem><SelectItem value="rejected">Rejected</SelectItem><SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Claim #</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow>}
              {claims.length === 0 && !isLoading && <TableRow><TableCell colSpan={7} className="text-center py-8 text-gray-500">No expense claims found</TableCell></TableRow>}
              {claims.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.claimNumber}</TableCell>
                  <TableCell>{c.employeeName || "—"}</TableCell>
                  <TableCell>{c.date ? new Date(c.date).toLocaleDateString() : "—"}</TableCell>
                  <TableCell><Badge variant="outline">{c.category}</Badge></TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(c.amount ?? "0")}</TableCell>
                  <TableCell><Badge className={statusColors[c.status || "draft"] || ""}>{c.status}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(c.id)}>
                        <Trash className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-gray-500">Page {page} of {totalPages} ({data?.total || 0} claims)</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Expense Claim</DialogTitle>
            <DialogDescription>Are you sure you want to delete this expense claim? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && deleteClaim.mutate({ id: deleteId })} disabled={deleteClaim.isPending}>
              {deleteClaim.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
