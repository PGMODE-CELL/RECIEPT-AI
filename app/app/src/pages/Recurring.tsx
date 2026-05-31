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
import { Plus, Trash, Repeat, Pause, Play } from "lucide-react";
import { toast } from "sonner";

export default function Recurring() {
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const { data: templates, isLoading, refetch } = trpc.recurring.list.useQuery();
  const { data: contacts } = trpc.contact.list.useQuery();
  const { data: summary } = trpc.recurring.getSummary.useQuery();
  const createTemplate = trpc.recurring.create.useMutation({ onSuccess: () => { setOpen(false); refetch(); toast.success("Template created"); } });
  const deleteTemplate = trpc.recurring.delete.useMutation({ onSuccess: () => { setDeleteId(null); refetch(); toast.success("Deleted"); } });
  const updateTemplate = trpc.recurring.update.useMutation({ onSuccess: () => { refetch(); toast.success("Updated"); } });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    createTemplate.mutate({ type: f.get("type") as any, name: f.get("name") as string, contactId: Number(f.get("contact")), frequency: f.get("frequency") as any || "monthly", nextDate: f.get("nextDate") as string, totalAmount: f.get("amount") as string || "0" });
  };

  const formatCurrency = (v: string | number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(v));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">Recurring Templates</h1><p className="text-sm text-gray-500">Auto-generate invoices and bills</p></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" /> New Template</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Create Template</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Type *</Label><Select name="type" required><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="invoice">Invoice</SelectItem><SelectItem value="bill">Bill</SelectItem></SelectContent></Select></div>
                <div className="space-y-2"><Label>Name *</Label><Input name="name" required /></div>
              </div>
              <div className="space-y-2"><Label>Contact *</Label><Select name="contact" required><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{contacts?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2"><Label>Frequency</Label><Select name="frequency" defaultValue="monthly"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="weekly">Weekly</SelectItem><SelectItem value="biweekly">Biweekly</SelectItem><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="quarterly">Quarterly</SelectItem><SelectItem value="yearly">Yearly</SelectItem></SelectContent></Select></div>
                <div className="space-y-2"><Label>Next Date *</Label><Input name="nextDate" type="date" required /></div>
                <div className="space-y-2"><Label>Amount</Label><Input name="amount" type="number" step="0.01" /></div>
              </div>
              <Button type="submit" className="w-full">Create</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>Templates ({summary?.activeCount || 0} active)</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Frequency</TableHead><TableHead>Next Date</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="w-[100px]"></TableHead></TableRow></TableHeader>
            <TableBody>
              {templates?.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell><Badge variant="outline">{t.type}</Badge></TableCell>
                  <TableCell>{t.frequency}</TableCell>
                  <TableCell>{t.nextDate ? new Date(t.nextDate).toLocaleDateString() : "—"}</TableCell>
                  <TableCell><Badge variant={t.status === "active" ? "default" : "outline"}>{t.status}</Badge></TableCell>
                  <TableCell className="text-right">{formatCurrency(t.totalAmount || "0")}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" onClick={() => updateTemplate.mutate({ id: t.id, status: t.status === "active" ? "paused" : "active" })}>
                        {t.status === "active" ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 text-green-500" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(t.id)}><Trash className="w-4 h-4 text-red-500" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {templates?.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-gray-500">No templates</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent><DialogHeader><DialogTitle>Delete Template</DialogTitle><DialogDescription>Are you sure?</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button><Button variant="destructive" onClick={() => deleteId && deleteTemplate.mutate({ id: deleteId })}>Delete</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
