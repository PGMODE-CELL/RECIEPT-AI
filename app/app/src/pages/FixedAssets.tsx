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
import { Plus, Trash, Cog } from "lucide-react";
import { toast } from "sonner";

export default function FixedAssets() {
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const { data: assets, isLoading, refetch } = trpc.fixedAsset.list.useQuery();
  const { data: summary } = trpc.fixedAsset.getSummary.useQuery();
  const createAsset = trpc.fixedAsset.create.useMutation({ onSuccess: () => { setOpen(false); refetch(); toast.success("Asset added"); } });
  const deleteAsset = trpc.fixedAsset.delete.useMutation({ onSuccess: () => { setDeleteId(null); refetch(); toast.success("Asset deleted"); } });
  const depreciate = trpc.fixedAsset.depreciate.useMutation({ onSuccess: () => { refetch(); toast.success("Depreciation applied"); } });

  const formatCurrency = (v: string | number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(v));

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    createAsset.mutate({ name: f.get("name") as string, assetCode: f.get("code") as string, purchaseDate: f.get("date") as string, purchasePrice: f.get("price") as string, usefulLife: Number(f.get("life") || 60), depreciationMethod: f.get("method") as any || "straight_line", location: f.get("location") as string || undefined, salvageValue: f.get("salvage") as string || undefined });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">Fixed Assets</h1><p className="text-sm text-gray-500">Track and depreciate assets</p></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" /> Add Asset</Button></DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Add Fixed Asset</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Name *</Label><Input name="name" required /></div><div className="space-y-2"><Label>Asset Code *</Label><Input name="code" required /></div></div>
              <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Purchase Date *</Label><Input name="date" type="date" required /></div><div className="space-y-2"><Label>Purchase Price *</Label><Input name="price" type="number" step="0.01" required /></div></div>
              <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Useful Life (months) *</Label><Input name="life" type="number" defaultValue="60" required /></div><div className="space-y-2"><Label>Salvage Value</Label><Input name="salvage" type="number" step="0.01" defaultValue="0" /></div></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Depreciation Method</Label><Select name="method" defaultValue="straight_line"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="straight_line">Straight Line</SelectItem><SelectItem value="declining_balance">Declining Balance</SelectItem><SelectItem value="double_declining">Double Declining</SelectItem></SelectContent></Select></div>
                <div className="space-y-2"><Label>Location</Label><Input name="location" /></div>
              </div>
              <Button type="submit" className="w-full">Add Asset</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-6"><p className="text-sm text-gray-500">Total Cost</p><p className="text-2xl font-bold">{formatCurrency(summary?.totalCost || 0)}</p></CardContent></Card>
        <Card><CardContent className="p-6"><p className="text-sm text-gray-500">Accumulated Depreciation</p><p className="text-2xl font-bold text-red-600">{formatCurrency(summary?.totalAccumulated || 0)}</p></CardContent></Card>
        <Card><CardContent className="p-6"><p className="text-sm text-gray-500">Current Value</p><p className="text-2xl font-bold text-green-600">{formatCurrency(summary?.totalCurrentValue || 0)}</p></CardContent></Card>
        <Card><CardContent className="p-6"><p className="text-sm text-gray-500">Total Assets</p><p className="text-2xl font-bold">{summary?.count || 0}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Assets</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Purchase Price</TableHead><TableHead>Accum. Depr.</TableHead><TableHead>Current Value</TableHead><TableHead>Status</TableHead><TableHead className="w-[80px]"></TableHead></TableRow></TableHeader>
            <TableBody>
              {assets?.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-mono text-sm">{a.assetCode}</TableCell>
                  <TableCell className="font-medium">{a.name}</TableCell>
                  <TableCell>{formatCurrency(a.purchasePrice)}</TableCell>
                  <TableCell className="text-red-600">{formatCurrency(a.accumulatedDepreciation || "0")}</TableCell>
                  <TableCell className="text-green-600 font-medium">{formatCurrency(a.currentValue)}</TableCell>
                  <TableCell><Badge variant={a.status === "active" ? "default" : "outline"}>{a.status}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {a.status === "active" && <Button variant="ghost" size="icon" onClick={() => depreciate.mutate({ id: a.id })}><Cog className="w-4 h-4" /></Button>}
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(a.id)}><Trash className="w-4 h-4 text-red-500" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {assets?.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-gray-500">No assets</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent><DialogHeader><DialogTitle>Delete Asset</DialogTitle><DialogDescription>Are you sure?</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button><Button variant="destructive" onClick={() => deleteId && deleteAsset.mutate({ id: deleteId })}>Delete</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
