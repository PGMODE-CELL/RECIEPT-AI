import { useState } from "react";
import { useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash, FileText, Search, Download, Eye, CreditCard, X, Edit, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
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

type LineItem = {
  productId?: number;
  description: string;
  quantity: string;
  unitPrice: string;
  discount: string;
  taxRate: string;
  amount: string;
};

export default function Invoices() {
  const navigate = useNavigate();

  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: "", quantity: "1", unitPrice: "0", discount: "0", taxRate: "0", amount: "0" },
  ]);

  const { data, isLoading, refetch } = trpc.invoice.list.useQuery({
    status: status === "all" ? undefined : status,
    search: search || undefined,
    page,
    limit: 20,
  });
  const invoices = data?.invoices || [];
  const totalPages = Math.ceil((data?.total || 0) / 20);

  const { data: contacts } = trpc.contact.list.useQuery();
  const { data: products } = trpc.product.list.useQuery();
  const { data: nextNumber } = trpc.invoice.nextNumber.useQuery();

  const createInvoice = trpc.invoice.create.useMutation({
    onSuccess: () => {
      setOpen(false);
      refetch();
      setLineItems([{ description: "", quantity: "1", unitPrice: "0", discount: "0", taxRate: "0", amount: "0" }]);
      toast.success("Invoice created");
    },
    onError: (error) => toast.error(error.message),
  });
  const deleteInvoice = trpc.invoice.delete.useMutation({
    onSuccess: () => {
      refetch();
      setDeleteId(null);
      toast.success("Invoice deleted");
    },
  });

  const formatCurrency = (v: string | number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(v));

  const updateLineItem = (index: number, field: keyof LineItem, value: string) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };

    if (["quantity", "unitPrice", "discount", "taxRate"].includes(field)) {
      const qty = parseFloat(updated[index].quantity || "0");
      const price = parseFloat(updated[index].unitPrice || "0");
      const discount = parseFloat(updated[index].discount || "0");
      const taxRate = parseFloat(updated[index].taxRate || "0");
      const subtotal = qty * price - discount;
      const tax = subtotal * (taxRate / 100);
      updated[index].amount = (subtotal + tax).toFixed(2);
    }

    setLineItems(updated);
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { description: "", quantity: "1", unitPrice: "0", discount: "0", taxRate: "0", amount: "0" }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const handleProductSelect = (index: number, productId: string) => {
    const product = products?.find((p) => p.id === Number(productId));
    if (product) {
      updateLineItem(index, "productId", String(product.id));
      updateLineItem(index, "description", product.name);
      updateLineItem(index, "unitPrice", product.salePrice || "0");
      updateLineItem(index, "taxRate", product.taxRate || "0");
    }
  };

  const subtotal = lineItems.reduce((sum, item) => sum + parseFloat(item.amount || "0"), 0);

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const validItems = lineItems.filter((item) => item.description && parseFloat(item.amount || "0") > 0);

    if (validItems.length === 0) {
      toast.error("Add at least one line item");
      return;
    }

    createInvoice.mutate({
      invoiceNumber: form.get("number") as string,
      contactId: Number(form.get("contact")),
      issueDate: form.get("issueDate") as string,
      dueDate: form.get("dueDate") as string,
      currency: "USD",
      notes: form.get("notes") as string || undefined,
      items: validItems.map((item) => ({
        productId: item.productId,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount || "0",
        taxRate: item.taxRate || "0",
        taxAmount: "0",
        amount: item.amount,
      })),
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Invoices</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage customer invoices</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> New Invoice</Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Create Invoice</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Invoice #</Label><Input name="number" defaultValue={nextNumber || ""} required /></div>
                <div className="space-y-2"><Label>Customer</Label>
                  <Select name="contact" required>
                    <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                    <SelectContent>{contacts?.filter(c => c.type === "customer" || c.type === "both").map(c => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Issue Date</Label><Input name="issueDate" type="date" defaultValue={new Date().toISOString().split("T")[0]} required /></div>
                <div className="space-y-2"><Label>Due Date</Label><Input name="dueDate" type="date" required /></div>
              </div>

              {/* Line Items */}
              <div className="space-y-2">
                <Label>Line Items</Label>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[180px]">Product</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="w-[70px]">Qty</TableHead>
                        <TableHead className="w-[90px]">Price</TableHead>
                        <TableHead className="w-[70px]">Disc</TableHead>
                        <TableHead className="w-[70px]">Tax%</TableHead>
                        <TableHead className="w-[90px] text-right">Amount</TableHead>
                        <TableHead className="w-[40px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lineItems.map((item, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            <Select value={item.productId ? String(item.productId) : ""} onValueChange={(v) => handleProductSelect(i, v)}>
                              <SelectTrigger className="h-9"><SelectValue placeholder="Select" /></SelectTrigger>
                              <SelectContent>{products?.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}</SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell><Input value={item.description} onChange={(e) => updateLineItem(i, "description", e.target.value)} className="h-9" required /></TableCell>
                          <TableCell><Input value={item.quantity} onChange={(e) => updateLineItem(i, "quantity", e.target.value)} type="number" step="0.01" min="0" className="h-9" /></TableCell>
                          <TableCell><Input value={item.unitPrice} onChange={(e) => updateLineItem(i, "unitPrice", e.target.value)} type="number" step="0.01" min="0" className="h-9" /></TableCell>
                          <TableCell><Input value={item.discount} onChange={(e) => updateLineItem(i, "discount", e.target.value)} type="number" step="0.01" min="0" className="h-9" /></TableCell>
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
                  <div className="flex justify-between font-bold border-t pt-1"><span>Total</span><span>{formatCurrency(subtotal)}</span></div>
                </div>
              </div>

              <div className="space-y-2"><Label>Notes</Label><Input name="notes" placeholder="Optional notes" /></div>
              <Button type="submit" className="w-full" disabled={createInvoice.isPending}>
                {createInvoice.isPending ? "Creating..." : "Create Invoice"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Search invoices..." className="pl-9" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
              <SelectTrigger className="w-40"><SelectValue placeholder="All Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Due</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={8} className="text-center py-8">Loading...</TableCell></TableRow>}
              {invoices.length === 0 && !isLoading && <TableRow><TableCell colSpan={8} className="text-center py-8 text-gray-500">No invoices found</TableCell></TableRow>}
              {invoices.map((inv) => (
                <TableRow key={inv.id} className="cursor-pointer hover:bg-gray-50" onClick={() => navigate(`/invoices/${inv.id}`)}>
                  <TableCell className="font-medium">{inv.invoiceNumber}</TableCell>
                  <TableCell>{inv.contactName || "—"}</TableCell>
                  <TableCell>{inv.issueDate ? new Date(inv.issueDate).toLocaleDateString() : "—"}</TableCell>
                  <TableCell>{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "—"}</TableCell>
                  <TableCell><Badge className={statusColors[inv.status || "draft"] || ""}>{inv.status}</Badge></TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(inv.total ?? "0")}</TableCell>
                  <TableCell className="text-right">{formatCurrency(inv.amountDue ?? "0")}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" onClick={() => navigate(`/invoices/${inv.id}`)}>
                        <Eye className="w-4 h-4 text-gray-400" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(inv.id)}>
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
              <p className="text-sm text-gray-500">Page {page} of {totalPages} ({data?.total || 0} invoices)</p>
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
            <DialogTitle>Delete Invoice</DialogTitle>
            <DialogDescription>Are you sure you want to delete this invoice? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && deleteInvoice.mutate({ id: deleteId })} disabled={deleteInvoice.isPending}>
              {deleteInvoice.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
