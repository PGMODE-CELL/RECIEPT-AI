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
import { Plus, Search, Building2, ArrowRightLeft, CheckCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface InterCompanyTransaction {
  id: number;
  fromCompany: string;
  toCompany: string;
  description: string;
  amount: number;
  type: string;
  status: "pending" | "reconciled" | "disputed";
  date: string;
}

const companies = ["Parent Corp", "UK Subsidiary", "EU Branch", "Asia Pacific"];

const transactions: InterCompanyTransaction[] = [
  { id: 1, fromCompany: "Parent Corp", toCompany: "UK Subsidiary", description: "Management fees - Q2", amount: 45000, type: "Service", status: "reconciled", date: "2026-05-15" },
  { id: 2, fromCompany: "UK Subsidiary", toCompany: "Parent Corp", description: "Software license fees", amount: 12000, type: "License", status: "pending", date: "2026-05-20" },
  { id: 3, fromCompany: "Parent Corp", toCompany: "EU Branch", description: "Shared services allocation", amount: 32000, type: "Allocation", status: "reconciled", date: "2026-05-10" },
  { id: 4, fromCompany: "EU Branch", toCompany: "Asia Pacific", description: "Consulting services", amount: 18500, type: "Service", status: "disputed", date: "2026-05-18" },
  { id: 5, fromCompany: "Asia Pacific", toCompany: "Parent Corp", description: "Product royalties", amount: 67000, type: "Royalty", status: "pending", date: "2026-05-22" },
  { id: 6, fromCompany: "UK Subsidiary", toCompany: "EU Branch", description: "Marketing support", amount: 8200, type: "Service", status: "reconciled", date: "2026-05-12" },
];

export default function InterCompany() {
  const [search, setSearch] = useState("");
  const [filterCompany, setFilterCompany] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [open, setOpen] = useState(false);
  const [reconcileId, setReconcileId] = useState<number | null>(null);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

  const filtered = transactions.filter((t) => {
    if (search && !t.description.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCompany !== "all" && t.fromCompany !== filterCompany && t.toCompany !== filterCompany) return false;
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    return true;
  });

  const totalPending = transactions.filter((t) => t.status === "pending").reduce((s, t) => s + t.amount, 0);
  const totalReconciled = transactions.filter((t) => t.status === "reconciled").reduce((s, t) => s + t.amount, 0);
  const totalDisputed = transactions.filter((t) => t.status === "disputed").reduce((s, t) => s + t.amount, 0);

  const eliminationPairs = [
    { from: "Parent Corp", to: "UK Subsidiary", amount: 45000, description: "Inter-co revenue/expense" },
    { from: "Parent Corp", to: "EU Branch", amount: 32000, description: "Shared services allocation" },
    { from: "UK Subsidiary", to: "EU Branch", amount: 8200, description: "Marketing support" },
  ];

  const transferPricing = [
    { entity: "Parent Corp", method: "Cost Plus", margin: "15%", lastReview: "2026-01-15" },
    { entity: "UK Subsidiary", method: "Comparable Uncontrolled Price", margin: "N/A", lastReview: "2026-02-20" },
    { entity: "EU Branch", method: "Transactional Net Margin", margin: "8%", lastReview: "2025-11-10" },
    { entity: "Asia Pacific", method: "Resale Price Method", margin: "12%", lastReview: "2026-03-05" },
  ];

  const statusBadge = (status: string) => {
    switch (status) {
      case "reconciled": return <Badge className="bg-green-100 text-green-700">Reconciled</Badge>;
      case "pending": return <Badge className="bg-amber-100 text-amber-700">Pending</Badge>;
      case "disputed": return <Badge className="bg-red-100 text-red-700">Disputed</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ArrowRightLeft className="w-6 h-6 text-indigo-600" /> Inter-Company Transactions
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage transactions between company entities</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" /> New Transaction</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Create Inter-Company Transaction</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); setOpen(false); toast.success("Transaction created"); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>From Company</Label>
                  <Select defaultValue="Parent Corp">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{companies.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>To Company</Label>
                  <Select defaultValue="UK Subsidiary">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{companies.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2"><Label>Description</Label><Input required placeholder="Transaction description" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select defaultValue="Service">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Service">Service</SelectItem>
                      <SelectItem value="Product">Product</SelectItem>
                      <SelectItem value="License">License</SelectItem>
                      <SelectItem value="Royalty">Royalty</SelectItem>
                      <SelectItem value="Allocation">Allocation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Amount ($)</Label><Input type="number" step="0.01" required /></div>
              </div>
              <Button type="submit" className="w-full">Create Transaction</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg"><Building2 className="w-5 h-5 text-blue-600" /></div>
              <div>
                <p className="text-sm text-gray-500">Total Transactions</p>
                <p className="text-xl font-bold">{transactions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg"><AlertTriangle className="w-5 h-5 text-amber-600" /></div>
              <div>
                <p className="text-sm text-gray-500">Pending</p>
                <p className="text-xl font-bold">{formatCurrency(totalPending)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg"><CheckCircle className="w-5 h-5 text-green-600" /></div>
              <div>
                <p className="text-sm text-gray-500">Reconciled</p>
                <p className="text-xl font-bold">{formatCurrency(totalReconciled)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg"><AlertTriangle className="w-5 h-5 text-red-600" /></div>
              <div>
                <p className="text-sm text-gray-500">Disputed</p>
                <p className="text-xl font-bold">{formatCurrency(totalDisputed)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="transactions">
        <TabsList>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="elimination">Elimination Entries</TabsTrigger>
          <TabsTrigger value="reconciliation">Reconciliation</TabsTrigger>
          <TabsTrigger value="transfer">Transfer Pricing</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input placeholder="Search transactions..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <Select value={filterCompany} onValueChange={setFilterCompany}>
                  <SelectTrigger className="w-40"><SelectValue placeholder="All Companies" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Companies</SelectItem>
                    {companies.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-32"><SelectValue placeholder="All Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="reconciled">Reconciled</SelectItem>
                    <SelectItem value="disputed">Disputed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.fromCompany}</TableCell>
                      <TableCell>{t.toCompany}</TableCell>
                      <TableCell>{t.description}</TableCell>
                      <TableCell><Badge variant="outline">{t.type}</Badge></TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(t.amount)}</TableCell>
                      <TableCell className="font-mono text-sm">{t.date}</TableCell>
                      <TableCell>{statusBadge(t.status)}</TableCell>
                      <TableCell>
                        {t.status === "pending" && (
                          <Button variant="ghost" size="icon" onClick={() => setReconcileId(t.id)}>
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="elimination" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Elimination Entries</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eliminationPairs.map((pair, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{pair.from}</TableCell>
                      <TableCell>{pair.to}</TableCell>
                      <TableCell>{pair.description}</TableCell>
                      <TableCell className="text-right font-mono text-red-600">({formatCurrency(pair.amount)})</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reconciliation" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Inter-Company Reconciliation</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Entity Pair</TableHead>
                    <TableHead className="text-right">Payable</TableHead>
                    <TableHead className="text-right">Receivable</TableHead>
                    <TableHead className="text-right">Difference</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { pair: "Parent Corp ↔ UK Subsidiary", payable: 45000, receivable: 12000 },
                    { pair: "Parent Corp ↔ EU Branch", payable: 32000, receivable: 0 },
                    { pair: "UK Subsidiary ↔ EU Branch", payable: 8200, receivable: 0 },
                    { pair: "EU Branch ↔ Asia Pacific", payable: 0, receivable: 18500 },
                    { pair: "Asia Pacific ↔ Parent Corp", payable: 0, receivable: 67000 },
                  ].map((row, i) => {
                    const diff = Math.abs(row.payable - row.receivable);
                    return (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{row.pair}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(row.payable)}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(row.receivable)}</TableCell>
                        <TableCell className={`text-right font-mono ${diff === 0 ? "text-green-600" : "text-amber-600"}`}>{formatCurrency(diff)}</TableCell>
                        <TableCell>
                          {diff === 0 ? <Badge className="bg-green-100 text-green-700">Balanced</Badge> : <Badge className="bg-amber-100 text-amber-700">Unbalanced</Badge>}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transfer" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Transfer Pricing Methods</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Entity</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Target Margin</TableHead>
                    <TableHead>Last Review</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transferPricing.map((tp, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{tp.entity}</TableCell>
                      <TableCell><Badge variant="outline">{tp.method}</Badge></TableCell>
                      <TableCell>{tp.margin}</TableCell>
                      <TableCell className="font-mono text-sm">{tp.lastReview}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Reconcile Dialog */}
      <Dialog open={reconcileId !== null} onOpenChange={() => setReconcileId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reconcile Transaction</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500">
            Mark transaction #{reconcileId} as reconciled? This confirms that both entities agree on this transaction.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReconcileId(null)}>Cancel</Button>
            <Button onClick={() => { setReconcileId(null); toast.success("Transaction reconciled"); }}>
              <CheckCircle className="w-4 h-4 mr-2" /> Reconcile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
