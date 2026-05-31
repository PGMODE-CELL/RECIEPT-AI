import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Trash, Clock } from "lucide-react";
import { toast } from "sonner";

export default function TimeTracking() {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [billableOnly, setBillableOnly] = useState("all");

  const { data: entries, isLoading, refetch } = trpc.timeTracking.list.useQuery({
    search: search || undefined,
  });
  const { data: projects } = trpc.project.list.useQuery();

  const createTimeEntry = trpc.timeTracking.create.useMutation({
    onSuccess: () => { setOpen(false); refetch(); toast.success("Time entry added"); },
    onError: (error) => toast.error(error.message),
  });
  const deleteTimeEntry = trpc.timeTracking.delete.useMutation({
    onSuccess: () => { setDeleteId(null); refetch(); toast.success("Time entry deleted"); },
  });

  const formatCurrency = (v: string | number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(v));

  const filtered = entries?.filter((e) => {
    if (billableOnly === "billable" && !e.billable) return false;
    if (billableOnly === "unbilled" && e.billed) return false;
    return true;
  });

  const totalHours = filtered?.reduce((sum, e) => sum + Number(e.hours || 0), 0) || 0;
  const billableHours = filtered?.filter(e => e.billable).reduce((sum, e) => sum + Number(e.hours || 0), 0) || 0;
  const totalAmount = filtered?.reduce((sum, e) => sum + Number(e.hours || 0) * Number(e.rate || 0), 0) || 0;

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const startTime = form.get("startTime") as string;
    const endTime = form.get("endTime") as string;
    const hours = form.get("hours") as string;

    let calculatedHours = hours;
    if (startTime && endTime && !hours) {
      const [sh, sm] = startTime.split(":").map(Number);
      const [eh, em] = endTime.split(":").map(Number);
      const diff = (eh * 60 + em - sh * 60 - sm) / 60;
      calculatedHours = diff > 0 ? String(diff.toFixed(2)) : "0";
    }

    createTimeEntry.mutate({
      projectId: form.get("project") ? Number(form.get("project")) : undefined,
      description: form.get("description") as string,
      date: form.get("date") as string,
      hours: calculatedHours || "0",
      rate: (form.get("rate") as string) || "0",
      billable: form.get("billable") === "on",
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Time Tracking</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Track billable and non-billable hours</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" /> Log Time</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Add Time Entry</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2"><Label>Project</Label>
                <Select name="project"><SelectTrigger><SelectValue placeholder="Select project (optional)" /></SelectTrigger>
                  <SelectContent>{projects?.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Description</Label><Input name="description" required placeholder="What did you work on?" /></div>
              <div className="space-y-2"><Label>Date</Label><Input name="date" type="date" defaultValue={new Date().toISOString().split("T")[0]} required /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Start Time</Label><Input name="startTime" type="time" /></div>
                <div className="space-y-2"><Label>End Time</Label><Input name="endTime" type="time" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Hours</Label><Input name="hours" type="number" step="0.25" min="0" placeholder="Auto-calc or enter" /></div>
                <div className="space-y-2"><Label>Rate ($/hr)</Label><Input name="rate" type="number" step="0.01" min="0" defaultValue="0" /></div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" name="billable" defaultChecked className="rounded" />
                <Label>Billable</Label>
              </div>
              <Button type="submit" className="w-full" disabled={createTimeEntry.isPending}>{createTimeEntry.isPending ? "Adding..." : "Add Time Entry"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg"><Clock className="w-5 h-5 text-blue-600" /></div>
              <div>
                <p className="text-sm text-gray-500">Total Hours</p>
                <p className="text-xl font-bold">{totalHours.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg"><Clock className="w-5 h-5 text-green-600" /></div>
              <div>
                <p className="text-sm text-gray-500">Billable Hours</p>
                <p className="text-xl font-bold">{billableHours.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg"><Clock className="w-5 h-5 text-purple-600" /></div>
              <div>
                <p className="text-sm text-gray-500">Total Value</p>
                <p className="text-xl font-bold">{formatCurrency(totalAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Search time entries..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={billableOnly} onValueChange={setBillableOnly}>
              <SelectTrigger className="w-40"><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem><SelectItem value="billable">Billable</SelectItem><SelectItem value="unbilled">Unbilled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Hours</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={8} className="text-center py-8">Loading...</TableCell></TableRow>}
              {filtered?.length === 0 && !isLoading && <TableRow><TableCell colSpan={8} className="text-center py-8 text-gray-500">No time entries</TableCell></TableRow>}
              {filtered?.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{entry.projectName || "—"}</TableCell>
                  <TableCell className="font-medium">{entry.description}</TableCell>
                  <TableCell>{entry.date ? new Date(entry.date).toLocaleDateString() : "—"}</TableCell>
                  <TableCell className="text-right">{Number(entry.hours || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(entry.rate || 0)}/hr</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(Number(entry.hours || 0) * Number(entry.rate || 0))}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {entry.billable && <Badge className="bg-green-100 text-green-700">Billable</Badge>}
                      {entry.billed && <Badge className="bg-blue-100 text-blue-700">Billed</Badge>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(entry.id)}>
                      <Trash className="w-4 h-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Time Entry</DialogTitle>
            <p className="text-sm text-gray-500">Are you sure you want to delete this time entry?</p>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && deleteTimeEntry.mutate({ id: deleteId })} disabled={deleteTimeEntry.isPending}>
              {deleteTimeEntry.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
