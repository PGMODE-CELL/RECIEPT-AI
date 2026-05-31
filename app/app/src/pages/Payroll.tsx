import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, CalendarDays, Users, DollarSign, Trash } from "lucide-react";
import { toast } from "sonner";

export default function Payroll() {
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const { data: payrollRuns, isLoading, refetch } = trpc.payroll.list.useQuery();
  const { data: stats } = trpc.payroll.getStats.useQuery();

  const createRun = trpc.payroll.create.useMutation({
    onSuccess: () => {
      setOpen(false);
      refetch();
      toast.success("Payroll run created");
    },
    onError: (error) => toast.error(error.message),
  });
  const deleteRun = trpc.payroll.delete.useMutation({
    onSuccess: () => {
      refetch();
      setDeleteId(null);
      toast.success("Payroll run deleted");
    },
  });

  const formatCurrency = (v: string | number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(v));

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    createRun.mutate({
      periodStart: form.get("periodStart") as string,
      periodEnd: form.get("periodEnd") as string,
      payDate: form.get("payDate") as string,
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payroll</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Run payroll and manage payslips</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" /> Run Payroll</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Run Payroll</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Period Start</Label><Input name="periodStart" type="date" required /></div>
                <div className="space-y-2"><Label>Period End</Label><Input name="periodEnd" type="date" required /></div>
              </div>
              <div className="space-y-2"><Label>Pay Date</Label><Input name="payDate" type="date" required /></div>
              <p className="text-sm text-gray-500">Payroll will be calculated for {stats?.activeEmployees || 0} active employees.</p>
              <Button type="submit" className="w-full" disabled={createRun.isPending}>
                {createRun.isPending ? "Creating..." : "Run Payroll"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Employees</p>
                <p className="text-2xl font-bold">{stats?.activeEmployees || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Monthly Salary</p>
                <p className="text-2xl font-bold">{formatCurrency(stats?.totalMonthlySalary || 0)}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-50 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Last Pay Run</p>
                <p className="text-2xl font-bold">{stats?.lastRunDate ? new Date(stats.lastRunDate).toLocaleDateString() : "Never"}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-purple-50 flex items-center justify-center">
                <CalendarDays className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Payroll Runs</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow><TableHead>Period</TableHead><TableHead>Pay Date</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Gross</TableHead><TableHead className="text-right">Tax</TableHead><TableHead className="text-right">Net</TableHead><TableHead className="w-[60px]"></TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow>}
              {payrollRuns?.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-gray-500">No payroll runs yet</TableCell></TableRow>}
              {payrollRuns?.map((pr) => (
                <TableRow key={pr.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-gray-400" />
                      <span>{pr.periodStart ? new Date(pr.periodStart).toLocaleDateString() : "—"} - {pr.periodEnd ? new Date(pr.periodEnd).toLocaleDateString() : "—"}</span>
                    </div>
                  </TableCell>
                  <TableCell>{pr.payDate ? new Date(pr.payDate).toLocaleDateString() : "—"}</TableCell>
                  <TableCell><Badge variant={pr.status === "completed" ? "default" : "outline"}>{pr.status}</Badge></TableCell>
                  <TableCell className="text-right">{formatCurrency(pr.totalGross ?? "0")}</TableCell>
                  <TableCell className="text-right text-red-600">-{formatCurrency(pr.totalTax ?? "0")}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(pr.totalNet ?? "0")}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(pr.id)}>
                      <Trash className="w-4 h-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Payroll Run</DialogTitle>
            <DialogDescription>Are you sure you want to delete this payroll run? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && deleteRun.mutate({ id: deleteId })} disabled={deleteRun.isPending}>
              {deleteRun.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
