import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Send, Eye, Paperclip, Clock, CheckCircle, XCircle, Upload } from "lucide-react";
import { toast } from "sonner";

interface EmailTemplate {
  id: number;
  name: string;
  subject: string;
  body: string;
}

interface EmailLog {
  id: number;
  to: string;
  subject: string;
  template: string;
  status: "sent" | "delivered" | "failed" | "pending";
  sentAt: string;
  attachments: number;
}

const templates: EmailTemplate[] = [
  { id: 1, name: "Invoice", subject: "Invoice #{{invoiceNumber}} from Your Company", body: "Dear {{clientName}},\n\nPlease find attached invoice #{{invoiceNumber}} for {{amount}}.\n\nPayment is due within {{dueDays}} days.\n\nBest regards,\n{{senderName}}" },
  { id: 2, name: "Payment Reminder", subject: "Payment Reminder - Invoice #{{invoiceNumber}}", body: "Dear {{clientName}},\n\nThis is a friendly reminder that invoice #{{invoiceNumber}} for {{amount}} is {{overdueDays}} days overdue.\n\nPlease process payment at your earliest convenience.\n\nBest regards,\n{{senderName}}" },
  { id: 3, name: "Welcome", subject: "Welcome to {{companyName}}!", body: "Dear {{clientName}},\n\nThank you for choosing {{companyName}}. We are delighted to have you as a customer.\n\nIf you have any questions, please don't hesitate to reach out.\n\nBest regards,\n{{senderName}}" },
];

const emailHistory: EmailLog[] = [
  { id: 1, to: "john@example.com", subject: "Invoice #INV-001", template: "Invoice", status: "delivered", sentAt: "2026-05-30 14:30", attachments: 1 },
  { id: 2, to: "jane@example.com", subject: "Payment Reminder", template: "Payment Reminder", status: "sent", sentAt: "2026-05-30 10:15", attachments: 0 },
  { id: 3, to: "bob@example.com", subject: "Invoice #INV-002", template: "Invoice", status: "failed", sentAt: "2026-05-29 16:45", attachments: 1 },
  { id: 4, to: "alice@example.com", subject: "Welcome!", template: "Welcome", status: "delivered", sentAt: "2026-05-29 09:00", attachments: 0 },
  { id: 5, to: "carol@example.com", subject: "Invoice #INV-003", template: "Invoice", status: "pending", sentAt: "2026-05-28 11:20", attachments: 2 },
];

export default function EmailSender() {
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

  const selectTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
    const tmpl = templates.find((t) => t.id === Number(templateId));
    if (tmpl) {
      setSubject(tmpl.subject);
      setBody(tmpl.body);
    }
  };

  const handleSend = () => {
    if (!to || !subject) { toast.error("Please fill in all required fields"); return; }
    toast.success("Email sent successfully");
    setSendOpen(false);
    setTo("");
  };

  const handleBatchSend = () => {
    toast.success("Batch send queued - 12 emails");
    setBatchOpen(false);
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "delivered": return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "sent": return <Send className="w-4 h-4 text-blue-500" />;
      case "failed": return <XCircle className="w-4 h-4 text-red-500" />;
      case "pending": return <Clock className="w-4 h-4 text-amber-500" />;
      default: return null;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Mail className="w-6 h-6 text-indigo-600" /> Email Sender
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Send emails with templates and batch support</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setBatchOpen(true)}><Send className="w-4 h-4 mr-2" /> Batch Send</Button>
          <Button onClick={() => setSendOpen(true)}><Mail className="w-4 h-4 mr-2" /> Compose Email</Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg"><CheckCircle className="w-5 h-5 text-green-600" /></div>
              <div>
                <p className="text-sm text-gray-500">Delivered</p>
                <p className="text-xl font-bold">{emailHistory.filter(e => e.status === "delivered").length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg"><Send className="w-5 h-5 text-blue-600" /></div>
              <div>
                <p className="text-sm text-gray-500">Sent</p>
                <p className="text-xl font-bold">{emailHistory.filter(e => e.status === "sent").length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg"><XCircle className="w-5 h-5 text-red-600" /></div>
              <div>
                <p className="text-sm text-gray-500">Failed</p>
                <p className="text-xl font-bold">{emailHistory.filter(e => e.status === "failed").length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg"><Clock className="w-5 h-5 text-amber-600" /></div>
              <div>
                <p className="text-sm text-gray-500">Pending</p>
                <p className="text-xl font-bold">{emailHistory.filter(e => e.status === "pending").length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="compose">
        <TabsList>
          <TabsTrigger value="compose">Compose</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="history">Email History</TabsTrigger>
        </TabsList>

        <TabsContent value="compose" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Compose Email</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Template</Label>
                  <Select value={selectedTemplate} onValueChange={selectTemplate}>
                    <SelectTrigger><SelectValue placeholder="Choose a template..." /></SelectTrigger>
                    <SelectContent>
                      {templates.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>To</Label>
                  <Input placeholder="recipient@example.com" value={to} onChange={(e) => setTo(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Subject</Label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Body</Label>
                <Textarea rows={10} value={body} onChange={(e) => setBody(e.target.value)} className="font-mono text-sm" />
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm"><Paperclip className="w-4 h-4 mr-1" /> Attach File</Button>
                <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)}><Eye className="w-4 h-4 mr-1" /> Preview</Button>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline">Save Draft</Button>
                <Button onClick={handleSend}><Send className="w-4 h-4 mr-2" /> Send Email</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {templates.map((tmpl) => (
              <Card key={tmpl.id} className="cursor-pointer hover:border-indigo-300 transition-colors" onClick={() => selectTemplate(String(tmpl.id))}>
                <CardHeader>
                  <CardTitle className="text-base">{tmpl.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500 mb-2">{tmpl.subject}</p>
                  <p className="text-xs text-gray-400 line-clamp-3 whitespace-pre-line">{tmpl.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Email History</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>To</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Sent At</TableHead>
                    <TableHead>Attachments</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {emailHistory.map((email) => (
                    <TableRow key={email.id}>
                      <TableCell className="font-medium">{email.to}</TableCell>
                      <TableCell>{email.subject}</TableCell>
                      <TableCell><Badge variant="outline">{email.template}</Badge></TableCell>
                      <TableCell className="font-mono text-sm">{email.sentAt}</TableCell>
                      <TableCell className="text-center">{email.attachments > 0 ? <Badge>{email.attachments}</Badge> : "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {statusIcon(email.status)}
                          <span className="capitalize text-sm">{email.status}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Email Preview</DialogTitle></DialogHeader>
          <div className="border rounded-lg p-4 space-y-3 bg-white dark:bg-gray-50">
            <div className="text-sm text-gray-500">
              <span className="font-medium">To:</span> {to || "recipient@example.com"}
            </div>
            <div className="text-sm text-gray-500">
              <span className="font-medium">Subject:</span> {subject}
            </div>
            <hr />
            <div className="whitespace-pre-line text-sm text-gray-700">{body}</div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Batch Send Dialog */}
      <Dialog open={batchOpen} onOpenChange={setBatchOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Batch Send</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-500">This will send the email to all contacts matching the selected filter.</p>
            <div className="space-y-2">
              <Label>Recipients</Label>
              <Select defaultValue="all">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Contacts (12)</SelectItem>
                  <SelectItem value="customers">Customers (8)</SelectItem>
                  <SelectItem value="vendors">Vendors (4)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Template</Label>
              <Select value={selectedTemplate} onValueChange={selectTemplate}>
                <SelectTrigger><SelectValue placeholder="Choose template..." /></SelectTrigger>
                <SelectContent>
                  {templates.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchOpen(false)}>Cancel</Button>
            <Button onClick={handleBatchSend}><Send className="w-4 h-4 mr-2" /> Send Batch</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
