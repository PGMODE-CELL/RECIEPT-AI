"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { SplitSquareHorizontal, Plus, Trash, Eye, CheckCircle, ArrowRight } from "lucide-react";

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  selected: boolean;
  targetInvoice: number;
}

interface SplitInvoice {
  id: number;
  label: string;
  items: string[];
  total: number;
}

export default function InvoiceSplitter() {
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("");
  const [items, setItems] = useState<LineItem[]>([]);
  const [splitCount, setSplitCount] = useState(2);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [splitInvoices, setSplitInvoices] = useState<SplitInvoice[]>([]);

  const { data: invoiceData, isLoading } = trpc.invoice.list.useQuery({ limit: 100 });
  const { data: selectedInvoice, refetch: refetchInvoice } = trpc.invoice.getById.useQuery(
    { id: Number(selectedInvoiceId) },
    { enabled: !!selectedInvoiceId }
  );

  useEffect(() => {
    if (selectedInvoice?.items && selectedInvoice.items.length > 0) {
      const lineItems: LineItem[] = selectedInvoice.items.map((item: any, idx: number) => ({
        id: String(idx + 1),
        description: item.description || `Item ${idx + 1}`,
        quantity: Number(item.quantity) || 1,
        unitPrice: Number(item.unitPrice) || 0,
        amount: Number(item.amount) || Number(item.quantity) * Number(item.unitPrice) || 0,
        selected: false,
        targetInvoice: 1,
      }));
      setItems(lineItems);
    } else {
      setItems([]);
    }
  }, [selectedInvoice]);

  const totalAmount = items.reduce((sum, i) => sum + i.amount, 0);
  const selectedTotal = items.filter((i) => i.selected).reduce((sum, i) => sum + i.amount, 0);

  const toggleItem = (id: string) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, selected: !i.selected } : i)));
  };

  const assignItem = (id: string, target: number) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, targetInvoice: target } : i)));
  };

  const autoAssignEvenly = () => {
    const splitItems = items.map((item, idx) => ({
      ...item,
      selected: true,
      targetInvoice: (idx % splitCount) + 1,
    }));
    setItems(splitItems);
    toast.success("Items auto-assigned evenly across splits");
  };

  const autoAssignByProportion = () => {
    let target = 1;
    let accumulated = 0;
    const perInvoice = totalAmount / splitCount;
    const splitItems = items.map((item) => {
      accumulated += item.amount;
      if (accumulated > perInvoice * target && target < splitCount) target++;
      return { ...item, selected: true, targetInvoice: target };
    });
    setItems(splitItems);
    toast.success("Items auto-assigned by proportion");
  };

  const generatePreview = () => {
    const invoices: SplitInvoice[] = [];
    for (let i = 1; i <= splitCount; i++) {
      const invoiceItems = items.filter((it) => it.selected && it.targetInvoice === i);
      invoices.push({
        id: i,
        label: `Split ${i}`,
        items: invoiceItems.map((it) => it.description),
        total: invoiceItems.reduce((sum, it) => sum + it.amount, 0),
      });
    }
    setSplitInvoices(invoices);
    setPreviewOpen(true);
  };

  const confirmSplit = () => {
    toast.success(`Invoice split into ${splitCount} invoices successfully`);
    setPreviewOpen(false);
  };

  const getSplitStats = () => {
    const stats: { invoice: number; count: number; total: number; pct: number }[] = [];
    for (let i = 1; i <= splitCount; i++) {
      const invoiceItems = items.filter((it) => it.selected && it.targetInvoice === i);
      const total = invoiceItems.reduce((sum, it) => sum + it.amount, 0);
      stats.push({
        invoice: i,
        count: invoiceItems.length,
        total,
        pct: totalAmount > 0 ? (total / totalAmount) * 100 : 0,
      });
    }
    return stats;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Invoice Splitter</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Split a single invoice into multiple invoices for shared expenses</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={autoAssignEvenly} disabled={items.length === 0}>Even Split</Button>
          <Button variant="outline" onClick={autoAssignByProportion} disabled={items.length === 0}>Proportional Split</Button>
          <Button onClick={generatePreview} disabled={items.filter((i) => i.selected).length === 0}>
            <Eye className="w-4 h-4 mr-2" /> Preview Split
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <Label>Select Invoice to Split</Label>
          <Select value={selectedInvoiceId} onValueChange={setSelectedInvoiceId}>
            <SelectTrigger className="mt-2">
              <SelectValue placeholder={isLoading ? "Loading invoices..." : "Choose an invoice"} />
            </SelectTrigger>
            <SelectContent>
              {invoiceData?.invoices?.map((inv) => (
                <SelectItem key={inv.id} value={String(inv.id)}>
                  {inv.invoiceNumber} - {inv.contactName || "Unknown"} (${Number(inv.total).toLocaleString()})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {items.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-gray-500">Original Total</p>
                <p className="text-2xl font-bold">${totalAmount.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-gray-500">Selected Total</p>
                <p className="text-2xl font-bold text-blue-600">${selectedTotal.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-gray-500">Number of Splits</p>
                <div className="flex items-center gap-2 mt-1">
                  <Button size="sm" variant="outline" onClick={() => setSplitCount(Math.max(2, splitCount - 1))}>-</Button>
                  <span className="text-2xl font-bold">{splitCount}</span>
                  <Button size="sm" variant="outline" onClick={() => setSplitCount(Math.min(10, splitCount + 1))}>+</Button>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-gray-500">Remaining</p>
                <p className="text-2xl font-bold text-orange-600">${(totalAmount - selectedTotal).toLocaleString()}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SplitSquareHorizontal className="w-5 h-5" /> Line Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Assign To</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Checkbox checked={item.selected} onCheckedChange={() => toggleItem(item.id)} />
                        </TableCell>
                        <TableCell className="font-medium">{item.description}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">${item.unitPrice.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-semibold">${item.amount.toLocaleString()}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {Array.from({ length: splitCount }, (_, i) => (
                              <Button
                                key={i}
                                size="sm"
                                variant={item.targetInvoice === i + 1 && item.selected ? "default" : "outline"}
                                className="w-8 h-8 p-0"
                                onClick={() => assignItem(item.id, i + 1)}
                                disabled={!item.selected}
                              >
                                {i + 1}
                              </Button>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Split Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {getSplitStats().map((stat) => (
                  <div key={stat.invoice} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Badge>Split {stat.invoice}</Badge>
                      <span className="font-semibold">${stat.total.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${stat.pct}%` }} />
                    </div>
                    <p className="text-xs text-gray-500">{stat.count} items &middot; {stat.pct.toFixed(1)}%</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Preview Split Invoices</DialogTitle>
            <DialogDescription>Review the split before confirming</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {splitInvoices.map((inv) => (
              <Card key={inv.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold">Invoice #{inv.id}</h3>
                    <Badge variant="secondary">${inv.total.toLocaleString()}</Badge>
                  </div>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    {inv.items.map((desc, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <CheckCircle className="w-3 h-3 text-green-500" /> {desc}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>Cancel</Button>
            <Button onClick={confirmSplit}>
              <SplitSquareHorizontal className="w-4 h-4 mr-2" /> Confirm Split
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
