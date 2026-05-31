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
import { Plus, Search, AlertTriangle, Trash, Pencil } from "lucide-react";
import { toast } from "sonner";

export default function Products() {
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const { data: products, isLoading, refetch } = trpc.product.list.useQuery();
  const createProduct = trpc.product.create.useMutation({
    onSuccess: () => { setOpen(false); refetch(); toast.success("Product created"); },
    onError: (error) => toast.error(error.message),
  });
  const updateProduct = trpc.product.update.useMutation({
    onSuccess: () => { setEditId(null); refetch(); toast.success("Product updated"); },
  });
  const deleteProduct = trpc.product.delete.useMutation({
    onSuccess: () => { setDeleteId(null); refetch(); toast.success("Product deleted"); },
  });

  const formatCurrency = (v: string | number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(v));

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    createProduct.mutate({
      sku: form.get("sku") as string || undefined,
      name: form.get("name") as string,
      description: form.get("description") as string || undefined,
      type: form.get("type") as any,
      category: form.get("category") as string || undefined,
      unit: (form.get("unit") as string) || "pcs",
      costPrice: (form.get("cost") as string) || "0.00",
      salePrice: (form.get("sale") as string) || "0.00",
      quantityOnHand: (form.get("qty") as string) || "0",
      reorderLevel: (form.get("reorder") as string) || "0",
    });
  };

  const filtered = products?.filter((p) =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()))
  );

  const editingProduct = products?.find(p => p.id === editId);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Products & Services</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Inventory and service catalog</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" /> Add Product</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Add Product</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>SKU</Label><Input name="sku" /></div>
                <div className="space-y-2"><Label>Name</Label><Input name="name" required /></div>
              </div>
              <div className="space-y-2"><Label>Description</Label><Input name="description" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Type</Label>
                  <Select name="type" defaultValue="product"><SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="product">Product</SelectItem><SelectItem value="service">Service</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Category</Label><Input name="category" /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2"><Label>Cost Price</Label><Input name="cost" type="number" step="0.01" /></div>
                <div className="space-y-2"><Label>Sale Price</Label><Input name="sale" type="number" step="0.01" /></div>
                <div className="space-y-2"><Label>Unit</Label><Input name="unit" defaultValue="pcs" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Quantity</Label><Input name="qty" type="number" /></div>
                <div className="space-y-2"><Label>Reorder Level</Label><Input name="reorder" type="number" /></div>
              </div>
              <Button type="submit" className="w-full" disabled={createProduct.isPending}>{createProduct.isPending ? "Adding..." : "Add Product"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input placeholder="Search products..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow><TableHead>SKU</TableHead><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Category</TableHead><TableHead className="text-right">Cost</TableHead><TableHead className="text-right">Sale Price</TableHead><TableHead className="text-right">Stock</TableHead><TableHead className="w-[80px]"></TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={8} className="text-center py-8">Loading...</TableCell></TableRow>}
              {filtered?.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-8 text-gray-500">No products</TableCell></TableRow>}
              {filtered?.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-sm">{p.sku || "—"}</TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell><Badge variant="outline">{p.type}</Badge></TableCell>
                  <TableCell>{p.category || "—"}</TableCell>
                  <TableCell className="text-right">{formatCurrency(p.costPrice ?? "0")}</TableCell>
                  <TableCell className="text-right">{formatCurrency(p.salePrice ?? "0")}</TableCell>
                  <TableCell className="text-right">
                    {p.type === "product" ? (
                      <span className={`flex items-center justify-end gap-1 ${Number(p.quantityOnHand) <= Number(p.reorderLevel) ? "text-red-600" : ""}`}>
                        {Number(p.quantityOnHand) <= Number(p.reorderLevel) && <AlertTriangle className="w-3 h-3" />}
                        {p.quantityOnHand}
                      </span>
                    ) : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" onClick={() => setEditId(p.id)}><Pencil className="w-4 h-4 text-gray-400" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(p.id)}><Trash className="w-4 h-4 text-red-500" /></Button>
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
          <DialogHeader><DialogTitle>Edit Product</DialogTitle></DialogHeader>
          {editingProduct && (
            <form onSubmit={(e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              updateProduct.mutate({
                id: editId!,
                name: form.get("name") as string,
                sku: form.get("sku") as string || undefined,
                salePrice: (form.get("sale") as string) || "0.00",
                costPrice: (form.get("cost") as string) || "0.00",
                quantityOnHand: (form.get("qty") as string) || "0",
              });
            }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>SKU</Label><Input name="sku" defaultValue={editingProduct.sku || ""} /></div>
                <div className="space-y-2"><Label>Name</Label><Input name="name" defaultValue={editingProduct.name} required /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Cost Price</Label><Input name="cost" type="number" step="0.01" defaultValue={editingProduct.costPrice || ""} /></div>
                <div className="space-y-2"><Label>Sale Price</Label><Input name="sale" type="number" step="0.01" defaultValue={editingProduct.salePrice || ""} /></div>
              </div>
              <div className="space-y-2"><Label>Quantity</Label><Input name="qty" type="number" defaultValue={editingProduct.quantityOnHand || ""} /></div>
              <Button type="submit" className="w-full" disabled={updateProduct.isPending}>{updateProduct.isPending ? "Saving..." : "Save Changes"}</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
            <DialogDescription>Are you sure you want to delete this product? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && deleteProduct.mutate({ id: deleteId })} disabled={deleteProduct.isPending}>
              {deleteProduct.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
