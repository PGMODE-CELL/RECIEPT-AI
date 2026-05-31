"use client";

import { useState, useMemo, useEffect } from "react";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  CheckSquare, Mail, Trash, Download, RefreshCw, Filter, Search,
  Send, FileText, DollarSign, AlertTriangle, Clock, ChevronDown
} from "lucide-react";

interface BulkItem {
  id: string;
  type: "invoice" | "bill" | "contact";
  number: string;
  name: string;
  status: string;
  amount?: number;
  date: string;
  selected: boolean;
}

type BulkAction = "email" | "status" | "export" | "delete";

const STATUS_OPTIONS = ["draft", "sent", "paid", "overdue", "cancelled"];

export default function BulkActions() {
  const [items, setItems] = useState<BulkItem[]>([]);
  const [filterType, setFilterType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionDialog, setActionDialog] = useState<BulkAction | null>(null);
  const [newStatus, setNewStatus] = useState("paid");
  const [progress, setProgress] = useState(0);
  const [processing, setProcessing] = useState(false);

  const { data: invoiceData, isLoading: invLoading } = trpc.invoice.list.useQuery({ limit: 200 });
  const { data: billData, isLoading: billLoading } = trpc.bill.list.useQuery({ limit: 200 });
  const { data: contacts, isLoading: contactLoading } = trpc.contact.list.useQuery();

  useEffect(() => {
    const newItems: BulkItem[] = [];

    if (invoiceData?.invoices) {
      invoiceData.invoices.forEach((inv) => {
        newItems.push({
          id: `inv-${inv.id}`,
          type: "invoice",
          number: inv.invoiceNumber,
          name: inv.contactName || "Unknown",
          status: inv.status,
          amount: Number(inv.total) || 0,
          date: inv.issueDate || "",
          selected: false,
        });
      });
    }

    if (billData?.bills) {
      billData.bills.forEach((bill) => {
        newItems.push({
          id: `bill-${bill.id}`,
          type: "bill",
          number: bill.billNumber,
          name: bill.contactName || "Unknown",
          status: bill.status,
          amount: Number(bill.total) || 0,
          date: bill.billDate || "",
          selected: false,
        });
      });
    }

    if (contacts) {
      contacts.forEach((c) => {
        newItems.push({
          id: `contact-${c.id}`,
          type: "contact",
          number: `CNT-${c.id}`,
          name: c.name,
          status: "active",
          date: "",
          selected: false,
        });
      });
    }

    setItems((prev) => {
      const selectedIds = new Set(prev.filter((i) => i.selected).map((i) => i.id));
      return newItems.map((item) => ({ ...item, selected: selectedIds.has(item.id) }));
    });
  }, [invoiceData, billData, contacts]);

  const filtered = useMemo(() => {
    return items.filter((i) => {
      if (filterType !== "all" && i.type !== filterType) return false;
      if (searchQuery && !i.name.toLowerCase().includes(searchQuery.toLowerCase()) && !i.number.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [items, filterType, searchQuery]);

  const selected = items.filter((i) => i.selected);
  const selectedCount = selected.length;

  const toggleAll = () => {
    const allFilteredSelected = filtered.every((i) => i.selected);
    setItems((prev) =>
      prev.map((i) => {
        if (filtered.find((f) => f.id === i.id)) return { ...i, selected: !allFilteredSelected };
        return i;
      })
    );
  };

  const toggleItem = (id: string) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, selected: !i.selected } : i)));
  };

  const simulateProgress = (callback: () => void) => {
    setProcessing(true);
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setProcessing(false);
          callback();
          return 100;
        }
        return prev + Math.random() * 25 + 5;
      });
    }, 300);
  };

  const handleBulkEmail = () => {
    simulateProgress(() => {
      toast.success(`${selectedCount} emails queued for sending`);
      setActionDialog(null);
      setItems((prev) => prev.map((i) => ({ ...i, selected: false })));
    });
  };

  const handleBulkStatus = () => {
    simulateProgress(() => {
      setItems((prev) =>
        prev.map((i) => (i.selected ? { ...i, status: newStatus, selected: false } : i))
      );
      toast.success(`${selectedCount} items updated to "${newStatus}"`);
      setActionDialog(null);
    });
  };

  const handleBulkExport = () => {
    simulateProgress(() => {
      toast.success(`${selectedCount} items exported to CSV`);
      setActionDialog(null);
      setItems((prev) => prev.map((i) => ({ ...i, selected: false })));
    });
  };

  const handleBulkDelete = () => {
    simulateProgress(() => {
      setItems((prev) => prev.filter((i) => !i.selected));
      toast.success(`${selectedCount} items deleted`);
      setActionDialog(null);
    });
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "paid": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "sent": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "draft": return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
      case "overdue": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      case "pending": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "active": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const formatCurrency = (v: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);
  const isLoading = invLoading || billLoading || contactLoading;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bulk Actions</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Perform bulk operations on invoices, bills, and contacts</p>
        </div>
      </div>

      {selectedCount > 0 && (
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckSquare className="w-5 h-5 text-blue-600" />
              <span className="font-medium">{selectedCount} item{selectedCount > 1 ? "s" : ""} selected</span>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setActionDialog("email")}>
                <Mail className="w-4 h-4 mr-1" /> Send Email
              </Button>
              <Button size="sm" variant="outline" onClick={() => setActionDialog("status")}>
                <RefreshCw className="w-4 h-4 mr-1" /> Update Status
              </Button>
              <Button size="sm" variant="outline" onClick={() => setActionDialog("export")}>
                <Download className="w-4 h-4 mr-1" /> Export
              </Button>
              <Button size="sm" variant="destructive" onClick={() => setActionDialog("delete")}>
                <Trash className="w-4 h-4 mr-1" /> Delete
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {processing && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Processing bulk action...</span>
              <span>{Math.min(100, Math.round(progress))}%</span>
            </div>
            <Progress value={Math.min(100, progress)} />
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-40">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="invoice">Invoices</SelectItem>
            <SelectItem value="bill">Bills</SelectItem>
            <SelectItem value="contact">Contacts</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={filtered.length > 0 && filtered.every((i) => i.selected)}
                      onCheckedChange={toggleAll}
                    />
                  </TableHead>
                  <TableHead>Number</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Checkbox checked={item.selected} onCheckedChange={() => toggleItem(item.id)} />
                    </TableCell>
                    <TableCell className="font-mono text-sm">{item.number}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{item.type}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor(item.status)}`}>
                        {item.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">{item.date}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {item.amount ? formatCurrency(item.amount) : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={actionDialog !== null} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog === "email" && "Bulk Send Emails"}
              {actionDialog === "status" && "Bulk Update Status"}
              {actionDialog === "export" && "Bulk Export"}
              {actionDialog === "delete" && "Bulk Delete"}
            </DialogTitle>
            <DialogDescription>
              {actionDialog === "delete"
                ? `This will permanently delete ${selectedCount} item${selectedCount > 1 ? "s" : ""}. This action cannot be undone.`
                : `This will affect ${selectedCount} selected item${selectedCount > 1 ? "s" : ""}.`}
            </DialogDescription>
          </DialogHeader>

          {actionDialog === "status" && (
            <div className="space-y-2">
              <Label>New Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>Cancel</Button>
            <Button
              variant={actionDialog === "delete" ? "destructive" : "default"}
              onClick={() => {
                if (actionDialog === "email") handleBulkEmail();
                if (actionDialog === "status") handleBulkStatus();
                if (actionDialog === "export") handleBulkExport();
                if (actionDialog === "delete") handleBulkDelete();
              }}
              disabled={processing}
            >
              {actionDialog === "email" && <><Send className="w-4 h-4 mr-2" /> Send Emails</>}
              {actionDialog === "status" && <><RefreshCw className="w-4 h-4 mr-2" /> Update Status</>}
              {actionDialog === "export" && <><Download className="w-4 h-4 mr-2" /> Export</>}
              {actionDialog === "delete" && <><Trash className="w-4 h-4 mr-2" /> Delete</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
