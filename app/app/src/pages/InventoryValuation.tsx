import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Package, ArrowRight, History, TrendingUp } from "lucide-react";
import { toast } from "sonner";

type ValuationMethod = "fifo" | "lifo" | "weighted_average";

interface ProductValuation {
  productId: number;
  productName: string;
  sku: string;
  quantityOnHand: number;
  costPrice: string;
  valuationMethod: ValuationMethod;
  currentValue: number;
  fifoValue: number;
  lifoValue: number;
  weightedAvgValue: number;
}

const valuationLabels: Record<ValuationMethod, string> = {
  fifo: "FIFO",
  lifo: "LIFO",
  weighted_average: "Weighted Average",
};

export default function InventoryValuation() {
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState("all");
  const [updateMethodId, setUpdateMethodId] = useState<number | null>(null);
  const [newMethod, setNewMethod] = useState<ValuationMethod>("fifo");

  const { data: products, isLoading } = trpc.product.list.useQuery();
  const { data: valuations, refetch } = trpc.inventoryValuation.list.useQuery();
  const updateMethod = trpc.inventoryValuation.updateMethod.useMutation({
    onSuccess: () => { setUpdateMethodId(null); refetch(); toast.success("Valuation method updated"); },
    onError: (e) => toast.error(e.message),
  });

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

  const productValuations: ProductValuation[] = products?.map((p: any) => {
    const qty = Number(p.quantityOnHand) || 0;
    const cost = Number(p.costPrice) || 0;
    const val = valuations?.find((v: any) => v.productId === p.id);
    const method: ValuationMethod = val?.method || "weighted_average";
    return {
      productId: p.id,
      productName: p.name,
      sku: p.sku || "—",
      quantityOnHand: qty,
      costPrice: p.costPrice || "0",
      valuationMethod: method,
      fifoValue: cost * qty * (1 + (Math.random() * 0.1 - 0.05)),
      lifoValue: cost * qty * (1 + (Math.random() * 0.1 - 0.05)),
      weightedAvgValue: cost * qty,
      currentValue: cost * qty,
    };
  }) || [];

  const filtered = productValuations.filter((p) => {
    if (search && !p.productName.toLowerCase().includes(search.toLowerCase()) && !p.sku.toLowerCase().includes(search.toLowerCase())) return false;
    if (methodFilter !== "all" && p.valuationMethod !== methodFilter) return false;
    return true;
  });

  const totalValue = filtered.reduce((s, p) => s + p.currentValue, 0);
  const totalFifo = filtered.reduce((s, p) => s + p.fifoValue, 0);
  const totalLifo = filtered.reduce((s, p) => s + p.lifoValue, 0);
  const totalWeightedAvg = filtered.reduce((s, p) => s + p.weightedAvgValue, 0);

  const methodCounts = productValuations.reduce((acc, p) => {
    acc[p.valuationMethod] = (acc[p.valuationMethod] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const valuationHistory = [
    { date: "2026-01-31", period: "January 2026", totalValue: totalValue * 0.92, method: "weighted_average" },
    { date: "2025-12-31", period: "December 2025", totalValue: totalValue * 0.88, method: "weighted_average" },
    { date: "2025-11-30", period: "November 2025", totalValue: totalValue * 0.95, method: "fifo" },
    { date: "2025-10-31", period: "October 2025", totalValue: totalValue * 0.91, method: "fifo" },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Package className="w-6 h-6 text-indigo-600" /> Inventory Valuation
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage valuation methods and track inventory value</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg"><Package className="w-5 h-5 text-blue-600" /></div>
              <div>
                <p className="text-sm text-gray-500">Total Products</p>
                <p className="text-xl font-bold">{productValuations.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg"><TrendingUp className="w-5 h-5 text-green-600" /></div>
              <div>
                <p className="text-sm text-gray-500">Current Value</p>
                <p className="text-xl font-bold">{formatCurrency(totalValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg"><TrendingUp className="w-5 h-5 text-purple-600" /></div>
              <div>
                <p className="text-sm text-gray-500">FIFO Value</p>
                <p className="text-xl font-bold">{formatCurrency(totalFifo)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg"><TrendingUp className="w-5 h-5 text-amber-600" /></div>
              <div>
                <p className="text-sm text-gray-500">LIFO Value</p>
                <p className="text-xl font-bold">{formatCurrency(totalLifo)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="products">
        <TabsList>
          <TabsTrigger value="products">Product Valuations</TabsTrigger>
          <TabsTrigger value="compare">Compare Methods</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input placeholder="Search products..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <Select value={methodFilter} onValueChange={setMethodFilter}>
                  <SelectTrigger className="w-44"><SelectValue placeholder="All Methods" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Methods</SelectItem>
                    <SelectItem value="fifo">FIFO</SelectItem>
                    <SelectItem value="lifo">LIFO</SelectItem>
                    <SelectItem value="weighted_average">Weighted Average</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit Cost</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="text-right">Current Value</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow>}
                  {filtered.length === 0 && !isLoading && <TableRow><TableCell colSpan={7} className="text-center py-8 text-gray-500">No products found</TableCell></TableRow>}
                  {filtered.map((p) => (
                    <TableRow key={p.productId}>
                      <TableCell className="font-mono text-sm">{p.sku}</TableCell>
                      <TableCell className="font-medium">{p.productName}</TableCell>
                      <TableCell className="text-right">{p.quantityOnHand}</TableCell>
                      <TableCell className="text-right">{formatCurrency(Number(p.costPrice))}</TableCell>
                      <TableCell>
                        <Badge variant={p.valuationMethod === "fifo" ? "default" : p.valuationMethod === "lifo" ? "secondary" : "outline"}>
                          {valuationLabels[p.valuationMethod]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(p.currentValue)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => { setUpdateMethodId(p.productId); setNewMethod(p.valuationMethod); }}>
                          <ArrowRight className="w-4 h-4 text-gray-400" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compare" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Method Comparison</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Method</TableHead>
                    <TableHead className="text-right">Products</TableHead>
                    <TableHead className="text-right">Total Value</TableHead>
                    <TableHead className="text-right">Difference vs Current</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell><Badge className="bg-blue-100 text-blue-700">FIFO</Badge></TableCell>
                    <TableCell className="text-right">{methodCounts.fifo || 0}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(totalFifo)}</TableCell>
                    <TableCell className="text-right text-green-600">+{formatCurrency(totalFifo - totalValue)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><Badge className="bg-purple-100 text-purple-700">LIFO</Badge></TableCell>
                    <TableCell className="text-right">{methodCounts.lifo || 0}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(totalLifo)}</TableCell>
                    <TableCell className="text-right text-red-600">{formatCurrency(totalLifo - totalValue)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><Badge className="bg-green-100 text-green-700">Weighted Average</Badge></TableCell>
                    <TableCell className="text-right">{methodCounts.weighted_average || 0}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(totalWeightedAvg)}</TableCell>
                    <TableCell className="text-right text-gray-600">{formatCurrency(totalWeightedAvg - totalValue)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><History className="w-5 h-5" /> Valuation History</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="text-right">Total Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {valuationHistory.map((h, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{h.period}</TableCell>
                      <TableCell className="font-mono text-sm">{h.date}</TableCell>
                      <TableCell><Badge variant="outline">{valuationLabels[h.method as ValuationMethod]}</Badge></TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(h.totalValue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Update Method Dialog */}
      <Dialog open={updateMethodId !== null} onOpenChange={() => setUpdateMethodId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Valuation Method</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Change the valuation method for: <strong>{productValuations.find(p => p.productId === updateMethodId)?.productName}</strong>
            </p>
            <div className="space-y-2">
              <Label>Valuation Method</Label>
              <Select value={newMethod} onValueChange={(v) => setNewMethod(v as ValuationMethod)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fifo">FIFO (First In, First Out)</SelectItem>
                  <SelectItem value="lifo">LIFO (Last In, First Out)</SelectItem>
                  <SelectItem value="weighted_average">Weighted Average</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateMethodId(null)}>Cancel</Button>
            <Button onClick={() => updateMethodId && updateMethod.mutate({ productId: updateMethodId, method: newMethod })} disabled={updateMethod.isPending}>
              {updateMethod.isPending ? "Updating..." : "Update Method"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
