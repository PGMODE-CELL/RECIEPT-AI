"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  User, FileText, Download, CreditCard, Receipt, Eye,
  Lock, LogIn, ChevronRight, CheckCircle, Clock, DollarSign
} from "lucide-react";

interface PortalInvoice {
  id: string;
  number: string;
  date: string;
  dueDate: string;
  amount: number;
  status: "paid" | "pending" | "overdue";
  items: { description: string; quantity: number; unitPrice: number; amount: number }[];
}

export default function CustomerPortal() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [selectedContactId, setSelectedContactId] = useState<string>("");
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [paymentDialog, setPaymentDialog] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("invoices");

  const { data: contacts } = trpc.contact.list.useQuery();
  const { data: invoiceData } = trpc.invoice.list.useQuery({ limit: 500 });

  const customerInvoices = useMemo(() => {
    if (!selectedContactId || !invoiceData?.invoices) return [];
    return invoiceData.invoices.filter((inv) => String(inv.contactId) === selectedContactId);
  }, [selectedContactId, invoiceData]);

  const totalPending = customerInvoices.filter((i) => i.status === "pending").reduce((s, i) => s + (Number(i.total) || 0), 0);
  const totalPaid = customerInvoices.filter((i) => i.status === "paid").reduce((s, i) => s + (Number(i.total) || 0), 0);
  const totalOverdue = customerInvoices.filter((i) => i.status === "overdue").reduce((s, i) => s + (Number(i.total) || 0), 0);

  const formatCurrency = (v: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

  const statusColor = (s: string) => {
    switch (s) {
      case "paid": return "bg-green-100 text-green-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "overdue": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const handleLogin = () => {
    if (loginEmail) {
      const contact = contacts?.find((c) => c.email?.toLowerCase() === loginEmail.toLowerCase());
      if (contact) {
        setSelectedContactId(String(contact.id));
        setIsLoggedIn(true);
        toast.success("Welcome to the customer portal");
      } else {
        const firstContact = contacts?.[0];
        if (firstContact) {
          setSelectedContactId(String(firstContact.id));
          setIsLoggedIn(true);
          toast.success("Welcome to the customer portal");
        } else {
          toast.error("No contacts found");
        }
      }
    }
  };

  const handlePayment = (invoice: any) => {
    toast.success(`Payment of ${formatCurrency(Number(invoice.total))} initiated for ${invoice.invoiceNumber}`);
    setPaymentDialog(null);
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-3">
              <Lock className="w-6 h-6 text-blue-600" />
            </div>
            <CardTitle>Customer Portal</CardTitle>
            <p className="text-sm text-gray-500">Sign in to view your invoices and make payments</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="Email address"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
              />
              <Input type="password" placeholder="Password" />
            </div>
            <Button onClick={handleLogin} className="w-full">
              <LogIn className="w-4 h-4 mr-2" /> Sign In
            </Button>
            <p className="text-xs text-center text-gray-500">
              Demo: enter a contact email or any value to sign in
            </p>
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
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">A</div>
            <span className="font-semibold">Customer Portal</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{loginEmail}</span>
            <Button variant="outline" size="sm" onClick={() => setIsLoggedIn(false)}>Sign Out</Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg"><Clock className="w-5 h-5 text-yellow-600" /></div>
              <div><p className="text-xs text-gray-500">Pending</p><p className="text-2xl font-bold">{formatCurrency(totalPending)}</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg"><CheckCircle className="w-5 h-5 text-green-600" /></div>
              <div><p className="text-xs text-gray-500">Paid</p><p className="text-2xl font-bold">{formatCurrency(totalPaid)}</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg"><DollarSign className="w-5 h-5 text-red-600" /></div>
              <div><p className="text-xs text-gray-500">Overdue</p><p className="text-2xl font-bold">{formatCurrency(totalOverdue)}</p></div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
            <TabsTrigger value="statement">Statement</TabsTrigger>
          </TabsList>

          <TabsContent value="invoices">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customerInvoices.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">No invoices found</TableCell>
                      </TableRow>
                    )}
                    {customerInvoices.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-mono font-medium">{inv.invoiceNumber}</TableCell>
                        <TableCell>{inv.issueDate}</TableCell>
                        <TableCell>{inv.dueDate}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(Number(inv.total) || 0)}</TableCell>
                        <TableCell><Badge className={statusColor(inv.status)}>{inv.status}</Badge></TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => setSelectedInvoice(inv)}>
                              <Eye className="w-4 h-4" />
                            </Button>
                            {inv.status !== "paid" && (
                              <Button size="sm" variant="outline" onClick={() => setPaymentDialog(inv)}>
                                Pay Now
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

          <TabsContent value="statement">
            <Card>
              <CardHeader>
                <CardTitle>Account Statement</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm text-gray-500">Total Invoiced</p>
                    <p className="text-xl font-bold">{formatCurrency(customerInvoices.reduce((s, i) => s + (Number(i.total) || 0), 0))}</p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm text-gray-500">Total Paid</p>
                    <p className="text-xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
                  </div>
                </div>
                <Button variant="outline" className="w-full">
                  <Download className="w-4 h-4 mr-2" /> Download Statement PDF
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={selectedInvoice !== null} onOpenChange={() => setSelectedInvoice(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{selectedInvoice?.invoiceNumber}</DialogTitle>
            </DialogHeader>
            {selectedInvoice && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><p className="text-gray-500">Date</p><p className="font-medium">{selectedInvoice.issueDate}</p></div>
                  <div><p className="text-gray-500">Due Date</p><p className="font-medium">{selectedInvoice.dueDate}</p></div>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold">Total: {formatCurrency(Number(selectedInvoice.total) || 0)}</span>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={paymentDialog !== null} onOpenChange={() => setPaymentDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Make Payment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                <p className="text-sm text-gray-500">Amount Due</p>
                <p className="text-3xl font-bold">{paymentDialog && formatCurrency(Number(paymentDialog.total) || 0)}</p>
                <p className="text-sm text-gray-500 mt-1">{paymentDialog?.invoiceNumber}</p>
              </div>
              <div className="space-y-2">
                <Input placeholder="Card Number" defaultValue="4242 4242 4242 4242" />
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="MM/YY" defaultValue="12/28" />
                  <Input placeholder="CVC" defaultValue="123" />
                </div>
              </div>
              <Button className="w-full" onClick={() => paymentDialog && handlePayment(paymentDialog)}>
                <CreditCard className="w-4 h-4 mr-2" /> Pay {paymentDialog && formatCurrency(Number(paymentDialog.total) || 0)}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
