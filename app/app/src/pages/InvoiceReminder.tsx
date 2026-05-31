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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Plus, Send, Clock, AlertTriangle, Mail, History, Settings, Trash, Eye, RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface ReminderTemplate {
  id: number;
  name: string;
  subject: string;
  body: string;
  daysAfterDue: number;
  escalationLevel: string;
  enabled: boolean;
}

interface ReminderLog {
  id: number;
  invoiceNumber: string;
  customer: string;
  amount: number;
  template: string;
  sentAt: string;
  status: "sent" | "failed" | "pending";
  escalationLevel: string;
}

interface OverdueInvoice {
  id: number;
  invoiceNumber: string;
  customer: string;
  amount: number;
  dueDate: string;
  daysOverdue: number;
  lastReminder: string;
  reminderCount: number;
  status: "active" | "escalated" | "legal";
}

const defaultTemplates: ReminderTemplate[] = [
  { id: 1, name: "Friendly Reminder", subject: "Payment Reminder - Invoice {{invoiceNumber}}", body: "Dear {{customer}},\n\nThis is a friendly reminder that invoice {{invoiceNumber}} for {{amount}} is now {{daysOverdue}} days past due.\n\nPlease arrange payment at your earliest convenience.\n\nBest regards,\nAccounts Team", daysAfterDue: 3, escalationLevel: "Level 1", enabled: true },
  { id: 2, name: "Second Notice", subject: "Second Notice - Invoice {{invoiceNumber}} Overdue", body: "Dear {{customer}},\n\nWe notice that invoice {{invoiceNumber}} for {{amount}} is now {{daysOverdue}} days overdue.\n\nPlease remit payment immediately to avoid late fees.\n\nRegards,\nFinance Department", daysAfterDue: 7, escalationLevel: "Level 2", enabled: true },
  { id: 3, name: "Urgent Escalation", subject: "URGENT: Invoice {{invoiceNumber}} - Immediate Action Required", body: "Dear {{customer}},\n\nInvoice {{invoiceNumber}} for {{amount}} is now {{daysOverdue}} days overdue.\n\nFailure to pay within 48 hours will result in account suspension.\n\nAccounts Receivable", daysAfterDue: 14, escalationLevel: "Level 3", enabled: true },
  { id: 4, name: "Final Notice", subject: "FINAL NOTICE - Invoice {{invoiceNumber}}", body: "Dear {{customer}},\n\nThis is your final notice regarding invoice {{invoiceNumber}} for {{amount}}.\n\nImmediate payment is required to avoid further collection action.\n\nLegal Department", daysAfterDue: 30, escalationLevel: "Level 4", enabled: true },
];

export default function InvoiceReminder() {
  const { data: invoiceData } = trpc.invoice.list.useQuery({ status: "overdue", limit: 100 });
  const [templates, setTemplates] = useState<ReminderTemplate[]>(defaultTemplates);
  const [logs, setLogs] = useState<ReminderLog[]>([]);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<ReminderTemplate | null>(null);
  const [activeTab, setActiveTab] = useState("overdue");
  const [newTemplate, setNewTemplate] = useState({ name: "", subject: "", body: "", daysAfterDue: 3, escalationLevel: "Level 1" });

  const overdueInvoices: OverdueInvoice[] = useMemo(() => {
    const invoices = invoiceData?.invoices || [];
    if (invoices.length === 0) {
      return [
        { id: 1, invoiceNumber: "INV-2026-0142", customer: "Acme Corp", amount: 2450.00, dueDate: "2026-05-20", daysOverdue: 11, lastReminder: "2026-05-28", reminderCount: 2, status: "active" },
        { id: 2, invoiceNumber: "INV-2026-0138", customer: "TechStart Inc", amount: 8750.50, dueDate: "2026-05-15", daysOverdue: 16, lastReminder: "2026-05-27", reminderCount: 3, status: "escalated" },
      ];
    }
    return invoices.map((inv: any) => {
      const dueDate = inv.dueDate ? new Date(inv.dueDate) : new Date();
      const today = new Date();
      const daysOverdue = Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
      return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber || `INV-${inv.id}`,
        customer: inv.contactName || "Customer",
        amount: Number(inv.total) || 0,
        dueDate: inv.dueDate ? new Date(inv.dueDate).toISOString().split("T")[0] : "N/A",
        daysOverdue,
        lastReminder: "N/A",
        reminderCount: 0,
        status: daysOverdue > 30 ? "legal" as const : daysOverdue > 14 ? "escalated" as const : "active" as const,
      };
    });
  }, [invoiceData]);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

  const addTemplate = () => {
    if (!newTemplate.name || !newTemplate.subject) { toast.error("Name and subject required"); return; }
    setTemplates([...templates, { ...newTemplate, id: Date.now(), enabled: true }]);
    setTemplateDialogOpen(false);
    setNewTemplate({ name: "", subject: "", body: "", daysAfterDue: 3, escalationLevel: "Level 1" });
    toast.success("Template created");
  };

  const removeTemplate = (id: number) => {
    setTemplates(templates.filter(t => t.id !== id));
    toast.success("Template removed");
  };

  const toggleTemplate = (id: number) => {
    setTemplates(templates.map(t => t.id === id ? { ...t, enabled: !t.enabled } : t));
  };

  const sendReminder = (invoice: OverdueInvoice) => {
    const applicableTemplate = templates
      .filter(t => t.enabled && t.daysAfterDue <= invoice.daysOverdue)
      .sort((a, b) => b.daysAfterDue - a.daysAfterDue)[0];
    if (!applicableTemplate) { toast.error("No template for this overdue period"); return; }

    const newLog: ReminderLog = {
      id: Date.now(),
      invoiceNumber: invoice.invoiceNumber,
      customer: invoice.customer,
      amount: invoice.amount,
      template: applicableTemplate.name,
      sentAt: new Date().toISOString().replace("T", " ").slice(0, 16),
      status: "sent",
      escalationLevel: applicableTemplate.escalationLevel,
    };
    setLogs([newLog, ...logs]);
    toast.success(`Reminder sent to ${invoice.customer}`);
  };

  const sendBulkReminders = () => {
    const active = overdueInvoices.filter(inv => inv.status !== "legal");
    active.forEach(inv => sendReminder(inv));
    toast.success(`Reminders sent to ${active.length} customers`);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Smart Invoice Reminders</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Automated payment reminders with escalation</p>
        </div>
        <Button onClick={sendBulkReminders} className="bg-blue-600 hover:bg-blue-700">
          <Send className="w-4 h-4 mr-2" /> Send All Due Reminders
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-amber-50 dark:bg-amber-950 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-amber-600" />
              <div>
                <p className="text-sm text-gray-500">Active Overdue</p>
                <p className="text-2xl font-bold text-amber-600">{overdueInvoices.filter(i => i.status === "active").length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-red-50 dark:bg-red-950 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-red-600" />
              <div>
                <p className="text-sm text-gray-500">Escalated</p>
                <p className="text-2xl font-bold text-red-600">{overdueInvoices.filter(i => i.status === "escalated").length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-purple-50 dark:bg-purple-950 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <History className="w-8 h-8 text-purple-600" />
              <div>
                <p className="text-sm text-gray-500">Reminders Sent</p>
                <p className="text-2xl font-bold text-purple-600">{logs.filter(l => l.status === "sent").length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-50 dark:bg-green-950 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Mail className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-500">Total Overdue</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(overdueInvoices.reduce((s, i) => s + i.amount, 0))}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overdue">Overdue Invoices</TabsTrigger>
          <TabsTrigger value="templates">Reminder Templates</TabsTrigger>
          <TabsTrigger value="history">Send History</TabsTrigger>
        </TabsList>

        <TabsContent value="overdue">
          <Card>
            <CardHeader>
              <CardTitle>Overdue Invoices ({overdueInvoices.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Days Overdue</TableHead>
                    <TableHead>Reminders</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overdueInvoices.map(inv => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">{inv.invoiceNumber}</TableCell>
                      <TableCell>{inv.customer}</TableCell>
                      <TableCell className="font-semibold">{formatCurrency(inv.amount)}</TableCell>
                      <TableCell>{inv.dueDate}</TableCell>
                      <TableCell>
                        <Badge className={inv.daysOverdue > 14 ? "bg-red-100 text-red-700" : inv.daysOverdue > 7 ? "bg-amber-100 text-amber-700" : "bg-yellow-100 text-yellow-700"}>
                          {inv.daysOverdue} days
                        </Badge>
                      </TableCell>
                      <TableCell>{inv.reminderCount}</TableCell>
                      <TableCell>
                        <Badge className={
                          inv.status === "active" ? "bg-blue-100 text-blue-700" :
                          inv.status === "escalated" ? "bg-orange-100 text-orange-700" :
                          "bg-red-100 text-red-700"
                        }>{inv.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => sendReminder(inv)} disabled={inv.status === "legal"}>
                          <Send className="w-3 h-3 mr-1" /> Send
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Reminder Templates</CardTitle>
              <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
                <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" /> New Template</Button></DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader><DialogTitle>Create Reminder Template</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div><Label>Template Name</Label><Input value={newTemplate.name} onChange={e => setNewTemplate({ ...newTemplate, name: e.target.value })} /></div>
                    <div><Label>Email Subject</Label><Input value={newTemplate.subject} onChange={e => setNewTemplate({ ...newTemplate, subject: e.target.value })} placeholder="Use {{invoiceNumber}}, {{amount}}, {{customer}}" /></div>
                    <div><Label>Email Body</Label><Textarea rows={6} value={newTemplate.body} onChange={e => setNewTemplate({ ...newTemplate, body: e.target.value })} /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label>Send After (days overdue)</Label><Input type="number" value={newTemplate.daysAfterDue} onChange={e => setNewTemplate({ ...newTemplate, daysAfterDue: +e.target.value })} /></div>
                      <div>
                        <Label>Escalation Level</Label>
                        <Select value={newTemplate.escalationLevel} onValueChange={v => setNewTemplate({ ...newTemplate, escalationLevel: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {["Level 1", "Level 2", "Level 3", "Level 4"].map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button onClick={addTemplate} className="w-full">Create Template</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {templates.map(template => (
                  <div key={template.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge className="bg-blue-100 text-blue-700">{template.escalationLevel}</Badge>
                        <span className="font-semibold">{template.name}</span>
                        <span className="text-sm text-gray-500">• {template.daysAfterDue} days after due</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={template.enabled} onCheckedChange={() => toggleTemplate(template.id)} />
                        <Button variant="ghost" size="sm" onClick={() => setPreviewTemplate(template)}><Eye className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => removeTemplate(template.id)}><Trash className="w-4 h-4 text-red-500" /></Button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Subject: {template.subject}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Reminder History</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Sent At</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map(log => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">{log.invoiceNumber}</TableCell>
                      <TableCell>{log.customer}</TableCell>
                      <TableCell>{formatCurrency(log.amount)}</TableCell>
                      <TableCell>{log.template}</TableCell>
                      <TableCell><Badge className="bg-indigo-100 text-indigo-700">{log.escalationLevel}</Badge></TableCell>
                      <TableCell className="text-sm">{log.sentAt}</TableCell>
                      <TableCell>
                        <Badge className={log.status === "sent" ? "bg-green-100 text-green-700" : log.status === "failed" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}>
                          {log.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Template Preview</DialogTitle></DialogHeader>
          {previewTemplate && (
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-gray-500">SUBJECT</Label>
                <p className="font-semibold">{previewTemplate.subject.replace(/\{\{invoiceNumber\}\}/g, "INV-2026-0142").replace(/\{\{amount\}\}/g, "$2,450.00").replace(/\{\{customer\}\}/g, "Acme Corp").replace(/\{\{daysOverdue\}\}/g, "11")}</p>
              </div>
              <Separator />
              <div>
                <Label className="text-xs text-gray-500">BODY</Label>
                <pre className="text-sm whitespace-pre-wrap bg-gray-50 dark:bg-gray-900 p-4 rounded">{previewTemplate.body.replace(/\{\{invoiceNumber\}\}/g, "INV-2026-0142").replace(/\{\{amount\}\}/g, "$2,450.00").replace(/\{\{customer\}\}/g, "Acme Corp").replace(/\{\{daysOverdue\}\}/g, "11")}</pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
