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
import { Plus, Search, Clock, DollarSign, FileText, CheckCircle, Send } from "lucide-react";
import { toast } from "sonner";

export default function ProjectBilling() {
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [selectedEntries, setSelectedEntries] = useState<number[]>([]);

  const { data: projects } = trpc.project.list.useQuery();
  const { data: timeEntries, isLoading, refetch } = trpc.timeEntry.list.useQuery();
  const { data: invoices } = trpc.invoice.list.useQuery();
  const generateInvoice = trpc.invoice.createFromTimeEntries.useMutation({
    onSuccess: () => { setInvoiceDialogOpen(false); setSelectedEntries([]); refetch(); toast.success("Invoice generated"); },
    onError: (e) => toast.error(e.message),
  });

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

  const billableEntries = useMemo(() => {
    return (timeEntries || []).filter((e: any) => e.billable && !e.billed);
  }, [timeEntries]);

  const billedEntries = useMemo(() => {
    return (timeEntries || []).filter((e: any) => e.billed);
  }, [timeEntries]);

  const filteredEntries = useMemo(() => {
    const entries = billableEntries.filter((e: any) => {
      if (selectedProject !== "all" && String(e.projectId) !== selectedProject) return false;
      if (search && !e.description?.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
    return entries;
  }, [billableEntries, selectedProject, search]);

  const projectGroups = useMemo(() => {
    const groups: Record<string, { entries: any[]; totalHours: number; totalAmount: number }> = {};
    filteredEntries.forEach((e: any) => {
      const key = String(e.projectId || "unassigned");
      if (!groups[key]) groups[key] = { entries: [], totalHours: 0, totalAmount: 0 };
      groups[key].entries.push(e);
      groups[key].totalHours += Number(e.hours || 0);
      groups[key].totalAmount += Number(e.hours || 0) * Number(e.rate || 0);
    });
    return groups;
  }, [filteredEntries]);

  const totalBillableAmount = filteredEntries.reduce((s: number, e: any) => s + Number(e.hours || 0) * Number(e.rate || 0), 0);
  const totalBilledAmount = billedEntries.reduce((s: number, e: any) => s + Number(e.hours || 0) * Number(e.rate || 0), 0);
  const totalBilledHours = billedEntries.reduce((s: number, e: any) => s + Number(e.hours || 0), 0);
  const totalBillableHours = filteredEntries.reduce((s: number, e: any) => s + Number(e.hours || 0), 0);

  const toggleEntry = (id: number) => {
    setSelectedEntries((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    if (selectedEntries.length === filteredEntries.length) {
      setSelectedEntries([]);
    } else {
      setSelectedEntries(filteredEntries.map((e: any) => e.id));
    }
  };

  const selectedTotal = filteredEntries
    .filter((e: any) => selectedEntries.includes(e.id))
    .reduce((s: number, e: any) => s + Number(e.hours || 0) * Number(e.rate || 0), 0);

  const projectName = (id: string) => projects?.find((p: any) => String(p.id) === id)?.name || "Unassigned";

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Clock className="w-6 h-6 text-indigo-600" /> Project Billing
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Time & materials billing for projects</p>
        </div>
        <Button onClick={() => { if (selectedEntries.length === 0) { toast.error("Select entries to invoice"); return; } setInvoiceDialogOpen(true); }}>
          <FileText className="w-4 h-4 mr-2" /> Generate Invoice
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg"><Clock className="w-5 h-5 text-blue-600" /></div>
              <div>
                <p className="text-sm text-gray-500">Unbilled Hours</p>
                <p className="text-xl font-bold">{totalBillableHours.toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg"><DollarSign className="w-5 h-5 text-green-600" /></div>
              <div>
                <p className="text-sm text-gray-500">Unbilled Amount</p>
                <p className="text-xl font-bold">{formatCurrency(totalBillableAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg"><CheckCircle className="w-5 h-5 text-purple-600" /></div>
              <div>
                <p className="text-sm text-gray-500">Billed Hours</p>
                <p className="text-xl font-bold">{totalBilledHours.toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg"><DollarSign className="w-5 h-5 text-amber-600" /></div>
              <div>
                <p className="text-sm text-gray-500">Billed Amount</p>
                <p className="text-xl font-bold">{formatCurrency(totalBilledAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="unbilled">
        <TabsList>
          <TabsTrigger value="unbilled">Unbilled Entries ({filteredEntries.length})</TabsTrigger>
          <TabsTrigger value="billed">Billed Entries ({billedEntries.length})</TabsTrigger>
          <TabsTrigger value="byproject">By Project</TabsTrigger>
        </TabsList>

        <TabsContent value="unbilled" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input placeholder="Search entries..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger className="w-44"><SelectValue placeholder="All Projects" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    {projects?.map((p: any) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {selectedEntries.length > 0 && (
                  <div className="text-sm text-gray-500">
                    {selectedEntries.length} selected — {formatCurrency(selectedTotal)}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">
                      <input type="checkbox" checked={selectedEntries.length === filteredEntries.length && filteredEntries.length > 0} onChange={toggleAll} className="rounded" />
                    </TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow>}
                  {filteredEntries.length === 0 && !isLoading && <TableRow><TableCell colSpan={7} className="text-center py-8 text-gray-500">No unbilled entries</TableCell></TableRow>}
                  {filteredEntries.map((e: any) => (
                    <TableRow key={e.id}>
                      <TableCell>
                        <input type="checkbox" checked={selectedEntries.includes(e.id)} onChange={() => toggleEntry(e.id)} className="rounded" />
                      </TableCell>
                      <TableCell>{e.projectName || projectName(String(e.projectId))}</TableCell>
                      <TableCell className="font-medium">{e.description}</TableCell>
                      <TableCell className="font-mono text-sm">{e.date ? new Date(e.date).toLocaleDateString() : "—"}</TableCell>
                      <TableCell className="text-right">{Number(e.hours || 0).toFixed(2)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(Number(e.rate || 0))}/hr</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(Number(e.hours || 0) * Number(e.rate || 0))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Billed Time Entries</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {billedEntries.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-gray-500">No billed entries</TableCell></TableRow>}
                  {billedEntries.map((e: any) => (
                    <TableRow key={e.id}>
                      <TableCell>{e.projectName || "—"}</TableCell>
                      <TableCell className="font-medium">{e.description}</TableCell>
                      <TableCell className="font-mono text-sm">{e.date ? new Date(e.date).toLocaleDateString() : "—"}</TableCell>
                      <TableCell className="text-right">{Number(e.hours || 0).toFixed(2)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(Number(e.rate || 0))}/hr</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(Number(e.hours || 0) * Number(e.rate || 0))}</TableCell>
                      <TableCell><Badge className="bg-green-100 text-green-700">Billed</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="byproject" className="space-y-4">
          {Object.entries(projectGroups).map(([key, group]) => (
            <Card key={key}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{projectName(key)}</CardTitle>
                  <div className="text-sm text-gray-500">{group.entries.length} entries • {group.totalHours.toFixed(1)} hrs • {formatCurrency(group.totalAmount)}</div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Hours</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.entries.map((e: any) => (
                      <TableRow key={e.id}>
                        <TableCell className="font-medium">{e.description}</TableCell>
                        <TableCell className="font-mono text-sm">{e.date ? new Date(e.date).toLocaleDateString() : "—"}</TableCell>
                        <TableCell className="text-right">{Number(e.hours || 0).toFixed(2)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(Number(e.hours || 0) * Number(e.rate || 0))}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
          {Object.keys(projectGroups).length === 0 && (
            <Card><CardContent className="py-12 text-center text-gray-500">No entries to display</CardContent></Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Generate Invoice Dialog */}
      <Dialog open={invoiceDialogOpen} onOpenChange={setInvoiceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate T&M Invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              This will create an invoice for {selectedEntries.length} time entries totaling <strong>{formatCurrency(selectedTotal)}</strong>.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInvoiceDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => generateInvoice.mutate({ entryIds: selectedEntries })} disabled={generateInvoice.isPending}>
              <Send className="w-4 h-4 mr-2" />{generateInvoice.isPending ? "Generating..." : "Generate Invoice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
