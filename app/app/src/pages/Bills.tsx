import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Trash, X, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  received: "bg-blue-100 text-blue-700",
  approved: "bg-purple-100 text-purple-700",
  partial: "bg-amber-100 text-amber-700",
  paid: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
};

type BillLineItem = {
  description: string;
  quantity: string;
  unitPrice: string;
  taxRate: string;
  amount: string;
};

export default function Bills() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [lineItems, setLineItems] = useState<BillLineItem[]>([
    { description: "", quantity: "1", unitPrice: "0", taxRate: "0", amount: "0" },
  ]);

  const { data, isLoading, refetch } = trpc.bill.list.useQuery({
    status: status === "all" ? undefined : status,
    search: search || undefined,
    page,
    limit: 20,
  });
  const bills = data?.bills || [];
  const totalPages = Math.ceil((data?.total || 0) / 20);

  const { data: contacts } = trpc.contact.list.useQuery();
  const { data: nextNumber } = trpc.bill.nextNumber.useQuery();
  const { data: accounts } = trpc.account.list.useQuery();

  const utils = trpc.useUtils();
  const createBill = trpc.bill.create.useMutation({
    onSuccess: () => {
      setOpen(false);
      refetch();
      utils.dashboard.stats.invalidate();
      setLineItems([{ description: "", quantity: "1", unitPrice: "0", taxRate: "0", amount: "0" }]);
      toast.success("Bill created");
    },
    onError: (error) => toast.error(error.message),
  });
  const recordPayment = trpc.bill.recordPayment.useMutation({
    onSuccess: () => {
      refetch();
      utils.dashboard.stats.invalidate();
      toast.success("Payment recorded");
    },
  });
  const deleteBill = trpc.bill.delete.useMutation({
    onSuccess: () => {
      refetch();
      utils.dashboard.stats.invalidate();
      setDeleteId(null);
      toast.success("Bill deleted");
    },
  });

  const formatCurrency = (v: string | number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(v));

  const updateLineItem = (index: number, field: keyof BillLineItem, value: string) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };

    if (["quantity", "unitPrice", "taxRate"].includes(field)) {
      const qty = parseFloat(updated[index].quantity || "0");
      const price = parseFloat(updated[index].unitPrice || "0");
      const taxRate = parseFloat(updated[index].taxRate || "0");
      const sub = qty * price;
      const tax = sub * (taxRate / 100);
      updated[index].amount = (sub + tax).toFixed(2);
    }

    setLineItems(updated);
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { description: "", quantity: "1", unitPrice: "0", taxRate: "0", amount: "0" }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const total = lineItems.reduce((sum, item) => sum + parseFloat(item.amount || "0"), 0);

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const validItems = lineItems.filter((item) => item.description && parseFloat(item.amount || "0") > 0);

    if (validItems.length === 0) {
      toast.error("Add at least one line item");
      return;
    }

    createBill.mutate({
      billNumber: form.get("number") as string,
      contactId: Number(form.get("contact")),
      billDate: form.get("billDate") as string,
      dueDate: form.get("dueDate") as string,
      currency: "USD",
      notes: form.get("notes") as string || undefined,
      items: validItems.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate: item.taxRate || "0",
        amount: item.amount,
      })),
    });
  };

  const handlePay = (billId: number, amount: number) => {
    const bankAcc = accounts?.find(a => a.isBankAccount);
    if (!bankAcc) return toast.error("Create a bank account first");
    recordPayment.mutate({
      id: billId,
      amount: String(amount),
      date: new Date().toISOString().split("T")[0],
      accountId: bankAcc.id,
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bills & Expenses</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Track vendor bills and expenses</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" /> New Bill</Button></DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Create Bill</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Bill #</Label><Input name="number" defaultValue={nextNumber || ""} required /></div>
                <div className="space-y-2"><Label>Vendor</Label>
                  <Select name="contact" required>
                    <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
                    <SelectContent>{contacts?.filter(c => c.type === "vendor" || c.type === "both").map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Bill Date</Label><Input name="billDate" type="date" defaultValue={new Date().toISOString().split("T")[0]} required /></div>
                <div className="space-y-2"><Label>Due Date</Label><Input name="dueDate" type="date" required /></div>
              </div>

              {/* Line Items */}
              <div className="space-y-2">
                <Label>Line Items</Label>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead className="w-[80px]">Qty</TableHead>
                        <TableHead className="w-[100px]">Price</TableHead>
                        <TableHead className="w-[80px]">Tax %</TableHead>
                        <TableHead className="w-[100px] text-right">Amount</TableHead>
                        <TableHead className="w-[40px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lineItems.map((item, i) => (
                        <TableRow key={i}>
                          <TableCell><Input value={item.description} onChange={(e) => updateLineItem(i, "description", e.target.value)} className="h-9" required /></TableCell>
                          <TableCell><Input value={item.quantity} onChange={(e) => updateLineItem(i, "quantity", e.target.value)} type="number" step="0.01" min="0" className="h-9" /></TableCell>
                          <TableCell><Input value={item.unitPrice} onChange={(e) => updateLineItem(i, "unitPrice", e.target.value)} type="number" step="0.01" min="0" className="h-9" /></TableCell>
                          <TableCell><Input value={item.taxRate} onChange={(e) => updateLineItem(i, "taxRate", e.target.value)} type="number" step="0.01" min="0" className="h-9" /></TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(item.amount)}</TableCell>
                          <TableCell>{lineItems.length > 1 && <Button variant="ghost" size="icon" type="button" onClick={() => removeLineItem(i)} className="h-9 w-9"><X className="w-4 h-4" /></Button>}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addLineItem}><Plus className="w-3 h-3 mr-1" /> Add Line</Button>
              </div>

              <div className="flex justify-end">
                <div className="w-48 space-y-1">
                  <div className="flex justify-between font-bold border-t pt-1"><span>Total</span><span>{formatCurrency(total)}</span></div>
                </div>
              </div>

              <div className="space-y-2"><Label>Notes</Label><Input name="notes" placeholder="Optional" /></div>
              <Button type="submit" className="w-full" disabled={createBill.isPending}>{createBill.isPending ? "Creating..." : "Create Bill"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Search bills..." className="pl-9" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
              <SelectTrigger className="w-40"><SelectValue placeholder="All Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem><SelectItem value="draft">Draft</SelectItem><SelectItem value="received">Received</SelectItem>
                <SelectItem value="approved">Approved</SelectItem><SelectItem value="partial">Partial</SelectItem><SelectItem value="paid">Paid</SelectItem><SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow><TableHead>Bill #</TableHead><TableHead>Vendor</TableHead><TableHead>Date</TableHead><TableHead>Due</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">Due</TableHead><TableHead className="w-[120px]"></TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={8} className="text-center py-8">Loading...</TableCell></TableRow>}
              {bills.length === 0 && !isLoading && <TableRow><TableCell colSpan={8} className="text-center py-8 text-gray-500">No bills found</TableCell></TableRow>}
              {bills.map((b) => (
                <TableRow key={b.id} className="cursor-pointer hover:bg-gray-50" onClick={() => navigate(`/bills/${b.id}`)}>
                  <TableCell className="font-medium">{b.billNumber}</TableCell>
                  <TableCell>{b.contactName || "—"}</TableCell>
                  <TableCell>{b.billDate ? new Date(b.billDate).toLocaleDateString() : "—"}</TableCell>
                  <TableCell>{b.dueDate ? new Date(b.dueDate).toLocaleDateString() : "—"}</TableCell>
                  <TableCell><Badge className={statusColors[b.status || "draft"] || ""}>{b.status}</Badge></TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(b.total ?? "0")}</TableCell>
                  <TableCell className="text-right">{formatCurrency(b.amountDue ?? "0")}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" onClick={() => navigate(`/bills/${b.id}`)}>
                        <Eye className="w-4 h-4 text-gray-400" />
                      </Button>
                      {Number(b.amountDue) > 0 && (
                        <Button size="sm" variant="outline" onClick={() => handlePay(b.id, Number(b.amountDue))}>Pay</Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => setDeleteId(b.id)}>
                        <Trash className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-gray-500">Page {page} of {totalPages} ({data?.total || 0} bills)</p>
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Bill</DialogTitle>
            <DialogDescription>Are you sure you want to delete this bill? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && deleteBill.mutate({ id: deleteId })} disabled={deleteBill.isPending}>
              {deleteBill.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
