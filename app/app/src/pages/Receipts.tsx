import { useState, useRef } from "react";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClipboardList, Camera, FileText, Trash, Pencil } from "lucide-react";
import { toast } from "sonner";

export default function Receipts() {
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: receipts, isLoading, refetch } = trpc.receipt.list.useQuery();
  const createReceipt = trpc.receipt.create.useMutation({
    onSuccess: () => { setOpen(false); refetch(); toast.success("Receipt added"); },
    onError: (error) => toast.error(error.message),
  });
  const updateReceipt = trpc.receipt.update.useMutation({
    onSuccess: () => { setEditId(null); refetch(); toast.success("Receipt updated"); },
  });
  const deleteReceipt = trpc.receipt.delete.useMutation({
    onSuccess: () => { setDeleteId(null); refetch(); toast.success("Receipt deleted"); },
  });

  const formatCurrency = (v: string | number | null) =>
    v ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(v)) : "—";

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    createReceipt.mutate({
      fileName: form.get("fileName") as string,
      fileUrl: form.get("fileUrl") as string || "#",
      vendorName: form.get("vendor") as string || undefined,
      receiptDate: form.get("date") as string || undefined,
      totalAmount: (form.get("amount") as string) || undefined,
      taxAmount: (form.get("tax") as string) || undefined,
      category: form.get("category") as string || undefined,
      paymentMethod: form.get("method") as string || undefined,
      notes: form.get("notes") as string || undefined,
    });
  };

  const handleFileUpload = () => fileRef.current?.click();

  const filtered = receipts?.filter((r) =>
    !search || r.fileName?.toLowerCase().includes(search.toLowerCase()) || r.vendorName?.toLowerCase().includes(search.toLowerCase())
  );

  const editingReceipt = receipts?.find(r => r.id === editId);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Receipts</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Upload and track receipts</p>
        </div>
        <div className="flex gap-2">
          <input ref={fileRef} type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => { if (e.target.files?.[0]) { const f = e.target.files[0]; createReceipt.mutate({ fileName: f.name, fileUrl: URL.createObjectURL(f) }); } }} />
          <Button variant="outline" onClick={handleFileUpload}><Camera className="w-4 h-4 mr-2" /> Upload</Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><ClipboardList className="w-4 h-4 mr-2" /> Add Receipt</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Add Receipt</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2"><Label>File Name</Label><Input name="fileName" required /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Vendor</Label><Input name="vendor" /></div>
                  <div className="space-y-2"><Label>Date</Label><Input name="date" type="date" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Total Amount</Label><Input name="amount" type="number" step="0.01" /></div>
                  <div className="space-y-2"><Label>Tax</Label><Input name="tax" type="number" step="0.01" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Category</Label><Input name="category" placeholder="e.g. Meals, Office Supplies" /></div>
                  <div className="space-y-2"><Label>Payment Method</Label><Input name="method" placeholder="e.g. Credit Card, Cash" /></div>
                </div>
                <div className="space-y-2"><Label>Notes</Label><Input name="notes" /></div>
                <Button type="submit" className="w-full" disabled={createReceipt.isPending}>{createReceipt.isPending ? "Adding..." : "Add Receipt"}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <Input placeholder="Search receipts..." className="max-w-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow><TableHead>File</TableHead><TableHead>Vendor</TableHead><TableHead>Date</TableHead><TableHead>Category</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="w-[80px]"></TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow>}
              {filtered?.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-gray-500">No receipts yet</TableCell></TableRow>}
              {filtered?.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="flex items-center gap-2"><FileText className="w-4 h-4 text-gray-400" /> {r.fileName}</TableCell>
                  <TableCell>{r.vendorName || "—"}</TableCell>
                  <TableCell>{r.receiptDate ? new Date(r.receiptDate).toLocaleDateString() : "—"}</TableCell>
                  <TableCell>{r.category || "—"}</TableCell>
                  <TableCell><Badge variant={r.status === "processed" ? "default" : "outline"}>{r.status}</Badge></TableCell>
                  <TableCell className="text-right">{formatCurrency(r.totalAmount ?? "0")}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" onClick={() => setEditId(r.id)}><Pencil className="w-4 h-4 text-gray-400" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(r.id)}><Trash className="w-4 h-4 text-red-500" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editId !== null} onOpenChange={() => setEditId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Receipt</DialogTitle></DialogHeader>
          {editingReceipt && (
            <form onSubmit={(e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              updateReceipt.mutate({
                id: editId!,
                vendorName: form.get("vendor") as string || undefined,
                receiptDate: form.get("date") as string || undefined,
                totalAmount: (form.get("amount") as string) || undefined,
                taxAmount: (form.get("tax") as string) || undefined,
                category: form.get("category") as string || undefined,
                paymentMethod: form.get("method") as string || undefined,
                notes: form.get("notes") as string || undefined,
              });
            }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Vendor</Label><Input name="vendor" defaultValue={editingReceipt.vendorName || ""} /></div>
                <div className="space-y-2"><Label>Date</Label><Input name="date" type="date" defaultValue={editingReceipt.receiptDate ? new Date(editingReceipt.receiptDate).toISOString().split("T")[0] : ""} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Total Amount</Label><Input name="amount" type="number" step="0.01" defaultValue={editingReceipt.totalAmount || ""} /></div>
                <div className="space-y-2"><Label>Tax</Label><Input name="tax" type="number" step="0.01" defaultValue={editingReceipt.taxAmount || ""} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Category</Label><Input name="category" defaultValue={editingReceipt.category || ""} /></div>
                <div className="space-y-2"><Label>Payment Method</Label><Input name="method" defaultValue={editingReceipt.paymentMethod || ""} /></div>
              </div>
              <div className="space-y-2"><Label>Notes</Label><Input name="notes" defaultValue={editingReceipt.notes || ""} /></div>
              <Button type="submit" className="w-full" disabled={updateReceipt.isPending}>{updateReceipt.isPending ? "Saving..." : "Save Changes"}</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Receipt</DialogTitle>
            <DialogDescription>Are you sure you want to delete this receipt? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && deleteReceipt.mutate({ id: deleteId })} disabled={deleteReceipt.isPending}>
              {deleteReceipt.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
