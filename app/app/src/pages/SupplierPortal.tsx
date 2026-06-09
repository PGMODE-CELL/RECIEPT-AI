"use client";

import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Lock, LogIn, Package, FileText, Clock, CheckCircle, Eye, Download, DollarSign } from "lucide-react";

interface SupplierPO {
  id: number;
  orderNumber: string;
  orderDate: string;
  items: { description: string; quantity: number; unitPrice: number; total: number }[];
  totalAmount: number;
  status: string;
  contactName: string;
}

interface SupplierInvoice {
  id: number;
  invoiceNumber: string;
  poNumber: string;
  date: string;
  amount: number;
  status: string;
}

interface PaymentStatus {
  id: number;
  invoiceNumber: string;
  amount: number;
  submittedDate: string;
  approvedDate?: string;
  paidDate?: string;
  expectedPayment: string;
  status: string;
}

export default function SupplierPortal() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [activeTab, setActiveTab] = useState("pos");
  const [selectedPO, setSelectedPO] = useState<SupplierPO | null>(null);
  const [submitInvoicePO, setSubmitInvoicePO] = useState<SupplierPO | null>(null);

  const { data: purchaseOrders = [] } = trpc.purchaseOrder.list.useQuery({}, { enabled: isLoggedIn });
  const { data: contacts = [] } = trpc.contact.list.useQuery();

  const vendorContacts = contacts.filter((c: any) => c.type === "vendor" || c.type === "supplier");

  const poItems = purchaseOrders.map((po: any) => ({
    id: po.id,
    orderNumber: po.orderNumber,
    orderDate: po.orderDate,
    totalAmount: Number(po.total) || 0,
    status: po.status,
    contactName: po.contactName || "",
    items: [],
  }));

  const invoices: SupplierInvoice[] = poItems
    .filter((po: any) => po.status !== "draft")
    .map((po: any) => ({
      id: po.id,
      invoiceNumber: `INV-${po.orderNumber}`,
      poNumber: po.orderNumber,
      date: po.orderDate,
      amount: po.totalAmount,
      status: po.status === "paid" ? "paid" : po.status === "received" ? "approved" : "submitted",
    }));

  const payments: PaymentStatus[] = invoices.map(inv => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    amount: inv.amount,
    submittedDate: inv.date,
    expectedPayment: inv.date,
    status: inv.status === "paid" ? "paid" : inv.status === "approved" ? "approved" : "submitted",
  }));

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

  const statusColor = (s: string) => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      confirmed: "bg-blue-100 text-blue-800",
      shipped: "bg-purple-100 text-purple-800",
      delivered: "bg-green-100 text-green-800",
      closed: "bg-gray-100 text-gray-800",
      submitted: "bg-yellow-100 text-yellow-800",
      approved: "bg-blue-100 text-blue-800",
      paid: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
      scheduled: "bg-purple-100 text-purple-800",
      draft: "bg-gray-100 text-gray-800",
      sent: "bg-blue-100 text-blue-800",
      received: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
    };
    return colors[s] || "bg-gray-100 text-gray-800";
  };

  const handleLogin = () => {
    if (!loginEmail) {
      toast.error("Please enter your email address");
      return;
    }
    const match = vendorContacts.find((c: any) => c.email?.toLowerCase() === loginEmail.toLowerCase());
    if (!match) {
      toast.error("No supplier account found for this email");
      return;
    }
    setIsLoggedIn(true);
    toast.success("Welcome to the Supplier Portal");
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center mb-3">
              <Lock className="w-6 h-6 text-orange-600" />
            </div>
            <CardTitle>Supplier Portal</CardTitle>
            <p className="text-sm text-gray-500">Sign in to view POs and track payments</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="email"
              placeholder="Email address"
              value={loginEmail}
              onChange={e => setLoginEmail(e.target.value)}
            />
            <Input type="password" placeholder="Password" />
            <Button onClick={handleLogin} className="w-full">
              <LogIn className="w-4 h-4 mr-2" /> Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center text-white font-bold">
              S
            </div>
            <span className="font-semibold">Supplier Portal</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{loginEmail}</span>
            <Button variant="outline" size="sm" onClick={() => setIsLoggedIn(false)}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Total POs</p>
                <p className="text-2xl font-bold">{poItems.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                <FileText className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Invoices</p>
                <p className="text-2xl font-bold">{invoices.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Paid</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(payments.filter(p => p.status === "paid").reduce((s, p) => s + p.amount, 0))}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Clock className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Pending Payment</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(payments.filter(p => p.status !== "paid").reduce((s, p) => s + p.amount, 0))}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="pos">Purchase Orders</TabsTrigger>
            <TabsTrigger value="invoices">My Invoices</TabsTrigger>
            <TabsTrigger value="payments">Payment Status</TabsTrigger>
          </TabsList>

          <TabsContent value="pos">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>PO Number</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {poItems.map(po => (
                      <TableRow key={po.id}>
                        <TableCell className="font-mono font-medium">{po.orderNumber}</TableCell>
                        <TableCell>{po.orderDate}</TableCell>
                        <TableCell>{po.contactName}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(po.totalAmount)}</TableCell>
                        <TableCell>
                          <Badge className={statusColor(po.status)}>{po.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => setSelectedPO(po)}>
                              <Eye className="w-4 h-4" />
                            </Button>
                            {po.status === "confirmed" && (
                              <Button size="sm" variant="outline" onClick={() => setSubmitInvoicePO(po)}>
                                Submit Invoice
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invoices">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>PO Reference</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map(inv => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-mono font-medium">{inv.invoiceNumber}</TableCell>
                        <TableCell>{inv.poNumber}</TableCell>
                        <TableCell>{inv.date}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(inv.amount)}</TableCell>
                        <TableCell>
                          <Badge className={statusColor(inv.status)}>{inv.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Approved</TableHead>
                      <TableHead>Expected Payment</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map(p => (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono">{p.invoiceNumber}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(p.amount)}</TableCell>
                        <TableCell className="text-sm">{p.submittedDate}</TableCell>
                        <TableCell className="text-sm">{p.approvedDate || "-"}</TableCell>
                        <TableCell className="text-sm">{p.expectedPayment}</TableCell>
                        <TableCell className="text-sm">{p.paidDate || "-"}</TableCell>
                        <TableCell>
                          <Badge className={statusColor(p.status)}>{p.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={selectedPO !== null} onOpenChange={() => setSelectedPO(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Purchase Order: {selectedPO?.orderNumber}</DialogTitle>
            </DialogHeader>
            {selectedPO && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Vendor</p>
                    <p className="font-medium">{selectedPO.contactName}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Date</p>
                    <p className="font-medium">{selectedPO.orderDate}</p>
                  </div>
                </div>
                <div className="text-right font-bold text-lg">Total: {formatCurrency(selectedPO.totalAmount)}</div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={submitInvoicePO !== null} onOpenChange={() => setSubmitInvoicePO(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Submit Invoice for {submitInvoicePO?.orderNumber}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input placeholder="Invoice Number" />
              <Input type="date" defaultValue={new Date().toISOString().split("T")[0]} />
              <Input type="number" placeholder="Amount" defaultValue={submitInvoicePO?.totalAmount} />
              <Button
                className="w-full"
                onClick={() => {
                  toast.success("Invoice submitted");
                  setSubmitInvoicePO(null);
                }}
              >
                Submit Invoice
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
