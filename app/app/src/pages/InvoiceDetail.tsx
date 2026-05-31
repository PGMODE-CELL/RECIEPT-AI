import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, CheckCircle, Trash } from "lucide-react";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  viewed: "bg-purple-100 text-purple-700",
  partial: "bg-amber-100 text-amber-700",
  paid: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
};

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const invoiceId = Number(id);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: invoice, isLoading, refetch } = trpc.invoice.getById.useQuery({ id: invoiceId });
  const { data: accounts } = trpc.account.list.useQuery();

  const utils = trpc.useUtils();
  const updateStatus = trpc.invoice.updateStatus.useMutation({
    onSuccess: () => { refetch(); toast.success("Status updated"); },
  });
  const recordPayment = trpc.invoice.recordPayment.useMutation({
    onSuccess: () => { refetch(); utils.dashboard.stats.invalidate(); toast.success("Payment recorded"); },
    onError: (error) => toast.error(error.message),
  });
  const deleteInvoice = trpc.invoice.delete.useMutation({
    onSuccess: () => { navigate("/invoices"); utils.dashboard.stats.invalidate(); toast.success("Invoice deleted"); },
  });

  const formatCurrency = (v: string | number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(v));

  const handlePayment = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    recordPayment.mutate({
      id: invoiceId,
      amount: form.get("amount") as string,
      date: form.get("date") as string,
      accountId: Number(form.get("account")),
      reference: form.get("reference") as string || undefined,
    });
  };

  if (isLoading) return <div className="p-6 text-center">Loading...</div>;
  if (!invoice) return <div className="p-6 text-center text-gray-500">Invoice not found</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/invoices")}><ArrowLeft className="w-5 h-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{invoice.invoiceNumber}</h1>
            <Badge className={statusColors[invoice.status || "draft"] || ""}>{invoice.status}</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Select value={invoice.status || ""} onValueChange={(v) => updateStatus.mutate({ id: invoiceId, status: v as any })}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="viewed">Viewed</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline"><CheckCircle className="w-4 h-4 mr-2" /> Record Payment</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
              <form onSubmit={handlePayment} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-sm font-medium">Amount</label><input name="amount" type="number" step="0.01" max={invoice.amountDue || undefined} className="w-full mt-1 px-3 py-2 border rounded-lg" required /></div>
                  <div><label className="text-sm font-medium">Date</label><input name="date" type="date" defaultValue={new Date().toISOString().split("T")[0]} className="w-full mt-1 px-3 py-2 border rounded-lg" required /></div>
                </div>
                <div>
                  <label className="text-sm font-medium">Deposit Account</label>
                  <Select name="account" required>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select account" /></SelectTrigger>
                    <SelectContent>{accounts?.filter(a => a.isBankAccount).map(a => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><label className="text-sm font-medium">Reference</label><input name="reference" className="w-full mt-1 px-3 py-2 border rounded-lg" placeholder="Check #, Ref #" /></div>
                <Button type="submit" className="w-full" disabled={recordPayment.isPending}>
                  {recordPayment.isPending ? "Processing..." : "Record Payment"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
          <Button variant="outline" size="icon" onClick={() => setDeleteOpen(true)}><Trash className="w-4 h-4 text-red-500" /></Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Invoice Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <div>
                <p className="text-sm text-gray-500">Bill To</p>
                <p className="font-medium text-lg">{invoice.contactName || "—"}</p>
                {invoice.contactEmail && <p className="text-sm text-gray-600">{invoice.contactEmail}</p>}
                {invoice.contactAddress && <p className="text-sm text-gray-600">{invoice.contactAddress}</p>}
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Issue Date</p>
                <p className="font-medium">{invoice.issueDate ? new Date(invoice.issueDate).toLocaleDateString() : "—"}</p>
                <p className="text-sm text-gray-500 mt-2">Due Date</p>
                <p className="font-medium">{invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : "—"}</p>
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow><TableHead>Description</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Price</TableHead><TableHead className="text-right">Amount</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {invoice.items?.map((item, i) => (
                  <TableRow key={i}>
                    <TableCell>{item.description}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.unitPrice ?? "0")}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.amount ?? "0")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="border-t pt-4 space-y-1">
              <div className="flex justify-between text-sm"><span className="text-gray-500">Subtotal</span><span>{formatCurrency(invoice.subTotal ?? "0")}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Tax</span><span>{formatCurrency(invoice.taxTotal ?? "0")}</span></div>
              {invoice.discountTotal && Number(invoice.discountTotal) > 0 && (
                <div className="flex justify-between text-sm"><span className="text-gray-500">Discount</span><span>-{formatCurrency(invoice.discountTotal ?? "0")}</span></div>
              )}
              <div className="flex justify-between text-lg font-bold pt-2 border-t"><span>Total</span><span>{formatCurrency(invoice.total ?? "0")}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Paid</span><span className="text-green-600">{formatCurrency(invoice.amountPaid ?? "0")}</span></div>
              <div className="flex justify-between text-sm font-medium"><span className="text-gray-500">Amount Due</span><span className="text-amber-600">{formatCurrency(invoice.amountDue ?? "0")}</span></div>
            </div>
            {invoice.notes && <div className="mt-4 p-3 bg-gray-50 rounded-lg"><p className="text-sm text-gray-600">{invoice.notes}</p></div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between"><span className="text-sm text-gray-500">Status</span><Badge className={statusColors[invoice.status || "draft"] || ""}>{invoice.status}</Badge></div>
              <div className="flex justify-between"><span className="text-sm text-gray-500">Total</span><span className="font-medium">{formatCurrency(invoice.total ?? "0")}</span></div>
              <div className="flex justify-between"><span className="text-sm text-gray-500">Paid</span><span className="text-green-600">{formatCurrency(invoice.amountPaid ?? "0")}</span></div>
              <div className="flex justify-between"><span className="text-sm text-gray-500">Due</span><span className="text-amber-600 font-medium">{formatCurrency(invoice.amountDue ?? "0")}</span></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Invoice</DialogTitle>
            <DialogDescription>Are you sure you want to delete this invoice? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteInvoice.mutate({ id: invoiceId })} disabled={deleteInvoice.isPending}>
              {deleteInvoice.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
