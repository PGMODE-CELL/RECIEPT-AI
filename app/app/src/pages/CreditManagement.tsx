import { useState, useMemo } from "react";
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
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Users,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  TrendingUp,
  Shield,
  History,
  Plus,
  Edit,
  Eye,
  Lock,
  Unlock,
} from "lucide-react";
import { toast } from "sonner";

interface CustomerCredit {
  id: number;
  customerName: string;
  creditLimit: number;
  currentBalance: number;
  creditScore: number;
  paymentTerms: string;
  status: "active" | "hold" | "review" | "suspended";
  lastOrderDate: string;
  totalOrders: number;
  onTimePayments: number;
  latePayments: number;
}

interface InvoiceAgg {
  outstanding: number;
  totalOrders: number;
  onTimePayments: number;
  latePayments: number;
  lastOrderDate: string;
}

// Internal credit rating (300-850) derived purely from real payment behaviour.
// Returns 0 when there is no invoice history (rendered as "No history").
function deriveCreditScore(agg: InvoiceAgg): number {
  const settled = agg.onTimePayments + agg.latePayments;
  if (settled === 0) return 0;
  const onTimeRatio = agg.onTimePayments / settled;
  return Math.round(500 + onTimeRatio * 350);
}

function mapContactToCredit(contact: any, agg: InvoiceAgg): CustomerCredit {
  return {
    id: contact.id,
    customerName: contact.companyName || contact.name || "Unknown",
    creditLimit: Number(contact.creditLimit) || 0,
    currentBalance: agg.outstanding,
    creditScore: deriveCreditScore(agg),
    paymentTerms: contact.paymentTerms || "Net 30",
    status: "active",
    lastOrderDate: agg.lastOrderDate || "N/A",
    totalOrders: agg.totalOrders,
    onTimePayments: agg.onTimePayments,
    latePayments: agg.latePayments,
  };
}

export default function CreditManagement() {
  const { data: contacts = [] } = trpc.contact.list.useQuery();
  const { data: invoiceData } = trpc.invoice.list.useQuery({ limit: 1000 });
  const [localCustomers, setLocalCustomers] = useState<CustomerCredit[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailCustomer, setDetailCustomer] = useState<CustomerCredit | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [newCustomer, setNewCustomer] = useState({ customerName: "", creditLimit: 0, paymentTerms: "Net 30" });

  const customerContacts = contacts.filter((c: any) => c.type === "customer");

  // Aggregate real invoice history per customer (outstanding, order count, on-time vs late).
  const aggByContact = useMemo(() => {
    const invoices: any[] = Array.isArray(invoiceData)
      ? invoiceData
      : invoiceData?.invoices ?? invoiceData?.items ?? [];
    const today = new Date().toISOString().split("T")[0];
    const map = new Map<number, InvoiceAgg>();
    for (const inv of invoices) {
      const cid = inv.contact_id ?? inv.contactId;
      if (cid == null) continue;
      const agg = map.get(cid) ?? {
        outstanding: 0,
        totalOrders: 0,
        onTimePayments: 0,
        latePayments: 0,
        lastOrderDate: "",
      };
      agg.totalOrders += 1;
      const due = (inv.due_date ?? inv.dueDate ?? "").slice(0, 10);
      const outstanding = (Number(inv.total) || 0) - (Number(inv.paid) || 0);
      if (inv.status === "paid") {
        agg.onTimePayments += 1;
      } else if (due && due < today) {
        agg.latePayments += 1;
      }
      if (inv.status !== "paid") agg.outstanding += outstanding;
      const date = (inv.date ?? "").slice(0, 10);
      if (date > agg.lastOrderDate) agg.lastOrderDate = date;
      map.set(cid, agg);
    }
    return map;
  }, [invoiceData]);

  const customers = useMemo(() => {
    if (localCustomers.length > 0) return localCustomers;
    return customerContacts.map((c: any) =>
      mapContactToCredit(
        c,
        aggByContact.get(c.id) ?? {
          outstanding: 0,
          totalOrders: 0,
          onTimePayments: 0,
          latePayments: 0,
          lastOrderDate: "",
        },
      ),
    );
  }, [localCustomers, customerContacts, aggByContact]);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

  const getCreditScoreColor = (score: number) => {
    if (score === 0) return "text-gray-400";
    if (score >= 800) return "text-green-600";
    if (score >= 700) return "text-blue-600";
    if (score >= 600) return "text-amber-600";
    return "text-red-600";
  };

  const getCreditScoreLabel = (score: number) => {
    if (score === 0) return "No history";
    if (score >= 800) return "Excellent";
    if (score >= 700) return "Good";
    if (score >= 600) return "Fair";
    return "Poor";
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: "bg-green-100 text-green-700",
      hold: "bg-amber-100 text-amber-700",
      review: "bg-orange-100 text-orange-700",
      suspended: "bg-red-100 text-red-700",
    };
    return colors[status] || "bg-gray-100 text-gray-700";
  };

  const addCustomer = () => {
    if (!newCustomer.customerName || !newCustomer.creditLimit) {
      toast.error("Name and limit required");
      return;
    }
    setLocalCustomers([
      ...customers,
      {
        id: Date.now(),
        ...newCustomer,
        currentBalance: 0,
        creditScore: 700,
        status: "active",
        lastOrderDate: "N/A",
        totalOrders: 0,
        onTimePayments: 0,
        latePayments: 0,
      },
    ]);
    setDialogOpen(false);
    setNewCustomer({ customerName: "", creditLimit: 0, paymentTerms: "Net 30" });
    toast.success("Customer credit account created");
  };

  const toggleHold = (id: number) => {
    setLocalCustomers(
      customers.map(c => {
        if (c.id !== id) return c;
        const newStatus = c.status === "hold" ? "active" : "hold";
        return { ...c, status: newStatus as CustomerCredit["status"] };
      }),
    );
    toast.success("Credit status updated");
  };

  const blockedOrders = customers.filter(c => c.status === "hold" || c.status === "suspended");

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Credit Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Customer credit limits, scoring, and order holds
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" /> New Credit Account
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Credit Account</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Customer Name</Label>
                <Input
                  value={newCustomer.customerName}
                  onChange={e => setNewCustomer({ ...newCustomer, customerName: e.target.value })}
                />
              </div>
              <div>
                <Label>Credit Limit ($)</Label>
                <Input
                  type="number"
                  value={newCustomer.creditLimit || ""}
                  onChange={e => setNewCustomer({ ...newCustomer, creditLimit: +e.target.value })}
                />
              </div>
              <div>
                <Label>Payment Terms</Label>
                <Select
                  value={newCustomer.paymentTerms}
                  onValueChange={v => setNewCustomer({ ...newCustomer, paymentTerms: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["COD", "Net 15", "Net 30", "Net 45", "Net 60"].map(t => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={addCustomer} className="w-full">
                Create Account
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-500">Total Customers</p>
                <p className="text-2xl font-bold text-blue-600">{customers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-50 dark:bg-green-950 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-500">Total Credit Extended</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(customers.reduce((s, c) => s + c.creditLimit, 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 dark:bg-amber-950 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-amber-600" />
              <div>
                <p className="text-sm text-gray-500">On Hold / Suspended</p>
                <p className="text-2xl font-bold text-amber-600">{blockedOrders.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-purple-50 dark:bg-purple-950 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-purple-600" />
              <div>
                <p className="text-sm text-gray-500">Avg Credit Score</p>
                <p className="text-2xl font-bold text-purple-600">
                  {customers.length > 0
                    ? Math.round(customers.reduce((s, c) => s + c.creditScore, 0) / customers.length)
                    : 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Customer Credits</TabsTrigger>
          <TabsTrigger value="blocked">Blocked Orders</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Customer Credit Accounts</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Credit Limit</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Available</TableHead>
                    <TableHead>Credit Score</TableHead>
                    <TableHead>Terms</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map(c => {
                    const available = c.creditLimit - c.currentBalance;
                    const utilization = c.creditLimit > 0 ? (c.currentBalance / c.creditLimit) * 100 : 0;
                    return (
                      <TableRow key={c.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{c.customerName}</p>
                            <p className="text-xs text-gray-500">
                              {c.totalOrders} orders • {c.onTimePayments} on-time
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold">{formatCurrency(c.creditLimit)}</TableCell>
                        <TableCell>{formatCurrency(c.currentBalance)}</TableCell>
                        <TableCell>
                          <span className={available <= 0 ? "text-red-600 font-semibold" : ""}>
                            {formatCurrency(available)}
                          </span>
                          <div className="w-20 mt-1">
                            <Progress
                              value={utilization}
                              className={`h-1.5 ${
                                utilization > 90
                                  ? "[&>div]:bg-red-500"
                                  : utilization > 70
                                    ? "[&>div]:bg-amber-500"
                                    : "[&>div]:bg-green-500"
                              }`}
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`font-bold ${getCreditScoreColor(c.creditScore)}`}>{c.creditScore}</span>
                          <span className="text-xs text-gray-500 block">{getCreditScoreLabel(c.creditScore)}</span>
                        </TableCell>
                        <TableCell>{c.paymentTerms}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(c.status)}>{c.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => setDetailCustomer(c)}>
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => toggleHold(c.id)}>
                              {c.status === "hold" ? (
                                <Unlock className="w-4 h-4 text-green-500" />
                              ) : (
                                <Lock className="w-4 h-4 text-amber-500" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="blocked">
          <Card>
            <CardHeader>
              <CardTitle>Blocked Orders</CardTitle>
            </CardHeader>
            <CardContent>
              {blockedOrders.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No blocked orders</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Credit Limit</TableHead>
                      <TableHead>Current Balance</TableHead>
                      <TableHead>Available Credit</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {blockedOrders.map(c => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.customerName}</TableCell>
                        <TableCell>{formatCurrency(c.creditLimit)}</TableCell>
                        <TableCell className="text-red-600 font-semibold">{formatCurrency(c.currentBalance)}</TableCell>
                        <TableCell>{formatCurrency(c.creditLimit - c.currentBalance)}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(c.status)}>{c.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" onClick={() => toggleHold(c.id)}>
                            <Unlock className="w-3 h-3 mr-1" /> Restore Credit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!detailCustomer} onOpenChange={() => setDetailCustomer(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Credit Details</DialogTitle>
          </DialogHeader>
          {detailCustomer && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-lg">{detailCustomer.customerName}</h3>
                  <p className="text-sm text-gray-500">{detailCustomer.paymentTerms}</p>
                </div>
                <Badge className={getStatusColor(detailCustomer.status)}>{detailCustomer.status}</Badge>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Credit Limit</p>
                  <p className="font-bold">{formatCurrency(detailCustomer.creditLimit)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Current Balance</p>
                  <p className="font-bold">{formatCurrency(detailCustomer.currentBalance)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Credit Score</p>
                  <p className={`font-bold ${getCreditScoreColor(detailCustomer.creditScore)}`}>
                    {detailCustomer.creditScore} ({getCreditScoreLabel(detailCustomer.creditScore)})
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Orders</p>
                  <p className="font-bold">{detailCustomer.totalOrders}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">On-Time Payments</p>
                  <p className="font-bold text-green-600">{detailCustomer.onTimePayments}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Late Payments</p>
                  <p className="font-bold text-red-600">{detailCustomer.latePayments}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Credit Utilization</p>
                <Progress
                  value={
                    detailCustomer.creditLimit > 0
                      ? (detailCustomer.currentBalance / detailCustomer.creditLimit) * 100
                      : 0
                  }
                  className="h-3"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {detailCustomer.creditLimit > 0
                    ? Math.round((detailCustomer.currentBalance / detailCustomer.creditLimit) * 100)
                    : 0}
                  % used
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Payment Reliability</p>
                <Progress
                  value={
                    (detailCustomer.onTimePayments /
                      Math.max(1, detailCustomer.onTimePayments + detailCustomer.latePayments)) *
                    100
                  }
                  className="h-3"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {Math.round(
                    (detailCustomer.onTimePayments /
                      Math.max(1, detailCustomer.onTimePayments + detailCustomer.latePayments)) *
                      100,
                  )}
                  % on-time
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
