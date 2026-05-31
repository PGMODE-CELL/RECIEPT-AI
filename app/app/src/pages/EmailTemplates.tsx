import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

interface EmailTemplate {
  id: string;
  name: string;
  type: "invoice" | "bill" | "payment_reminder" | "welcome" | "custom";
  subject: string;
  body: string;
  lastModified: string;
}

const sampleData: Record<string, string> = {
  invoiceNumber: "INV-2026-0042",
  amount: "₹12,500.00",
  dueDate: "2026-06-15",
  customerName: "Acme Corp",
  companyName: "Your Company",
  paymentLink: "https://pay.example.com/abc123",
};

const initialTemplates: EmailTemplate[] = [
  {
    id: "1",
    name: "Invoice Delivery",
    type: "invoice",
    subject: "Invoice {{invoiceNumber}} from {{companyName}}",
    body: "Dear {{customerName}},\n\nPlease find attached invoice {{invoiceNumber}} for ₹{{amount}}.\n\nPayment is due by {{dueDate}}.\n\nYou can pay online at: {{paymentLink}}\n\nThank you for your business!\n\nBest regards,\n{{companyName}}",
    lastModified: "2026-05-28",
  },
  {
    id: "2",
    name: "Bill Receipt",
    type: "bill",
    subject: "Payment Received - {{invoiceNumber}}",
    body: "Dear {{customerName}},\n\nWe have received your payment of ₹{{amount}} for invoice {{invoiceNumber}}.\n\nThank you for your prompt payment!\n\nBest regards,\n{{companyName}}",
    lastModified: "2026-05-25",
  },
  {
    id: "3",
    name: "Payment Reminder",
    type: "payment_reminder",
    subject: "Reminder: Invoice {{invoiceNumber}} due on {{dueDate}}",
    body: "Dear {{customerName}},\n\nThis is a friendly reminder that invoice {{invoiceNumber}} for ₹{{amount}} is due on {{dueDate}}.\n\nPlease make the payment at your earliest convenience.\n\nIf you have already paid, please disregard this reminder.\n\nBest regards,\n{{companyName}}",
    lastModified: "2026-05-20",
  },
  {
    id: "4",
    name: "Welcome Email",
    type: "welcome",
    subject: "Welcome to {{companyName}}!",
    body: "Dear {{customerName}},\n\nWelcome to {{companyName}}! We are excited to have you on board.\n\nIf you have any questions, please don't hesitate to reach out.\n\nBest regards,\n{{companyName}}",
    lastModified: "2026-05-15",
  },
];

export default function EmailTemplates() {
  const [templates, setTemplates] = useState<EmailTemplate[]>(initialTemplates);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [formData, setFormData] = useState({ name: "", type: "custom" as EmailTemplate["type"], subject: "", body: "" });

  const replaceVariables = (text: string) =>
    Object.entries(sampleData).reduce((result, [key, val]) => result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), val), text);

  const openCreate = () => {
    setEditingTemplate(null);
    setFormData({ name: "", type: "custom", subject: "", body: "" });
    setDialogOpen(true);
  };

  const openEdit = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setFormData({ name: template.name, type: template.type, subject: template.subject, body: template.body });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.subject || !formData.body) {
      toast.error("Please fill in all fields");
      return;
    }

    if (editingTemplate) {
      setTemplates((prev) =>
        prev.map((t) =>
          t.id === editingTemplate.id
            ? { ...t, ...formData, lastModified: new Date().toISOString().split("T")[0] }
            : t
        )
      );
      toast.success("Template updated");
    } else {
      const newTemplate: EmailTemplate = {
        id: Date.now().toString(),
        ...formData,
        lastModified: new Date().toISOString().split("T")[0],
      };
      setTemplates((prev) => [...prev, newTemplate]);
      toast.success("Template created");
    }
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    toast.success("Template deleted");
  };

  const sendTestEmail = () => {
    toast.success("Test email sent to your address");
  };

  const getTypeBadge = (type: EmailTemplate["type"]) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      invoice: "default",
      bill: "secondary",
      payment_reminder: "destructive",
      welcome: "outline",
      custom: "secondary",
    };
    return <Badge variant={variants[type] || "secondary"}>{type.replace("_", " ")}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Email Templates</h1>
        <Button onClick={openCreate}>Create Template</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {(["invoice", "bill", "payment_reminder", "welcome"] as const).map((type) => (
          <Card key={type}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground capitalize">{type.replace("_", " ")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{templates.filter((t) => t.type === type).length}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Last Modified</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className="font-medium">{template.name}</TableCell>
                  <TableCell>{getTypeBadge(template.type)}</TableCell>
                  <TableCell className="max-w-xs truncate">{template.subject}</TableCell>
                  <TableCell>{template.lastModified}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => { setEditingTemplate(template); setPreviewOpen(true); }}>
                        Preview
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openEdit(template)}>
                        Edit
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(template.id)}>
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Edit Template" : "Create Template"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Template Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Invoice Delivery"
                />
              </div>
              <div>
                <Label>Type</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.type}
                  onChange={(e) => setFormData((prev) => ({ ...prev, type: e.target.value as EmailTemplate["type"] }))}
                >
                  <option value="invoice">Invoice</option>
                  <option value="bill">Bill</option>
                  <option value="payment_reminder">Payment Reminder</option>
                  <option value="welcome">Welcome</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
            </div>
            <div>
              <Label>Subject</Label>
              <Input
                value={formData.subject}
                onChange={(e) => setFormData((prev) => ({ ...prev, subject: e.target.value }))}
                placeholder="Use {{variable}} for dynamic content"
              />
            </div>
            <div>
              <Label>Body</Label>
              <textarea
                className="flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.body}
                onChange={(e) => setFormData((prev) => ({ ...prev, body: e.target.value }))}
                placeholder="Use {{variable}} for dynamic content"
              />
            </div>
            <div className="text-xs text-muted-foreground">
              Available variables: {Object.keys(sampleData).map((k) => `{{${k}}}`).join(", ")}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave}>{editingTemplate ? "Update" : "Create"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Preview: {editingTemplate?.name}</DialogTitle>
          </DialogHeader>
          {editingTemplate && (
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Subject</Label>
                <p className="font-medium">{replaceVariables(editingTemplate.subject)}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Body</Label>
                <div className="border rounded-md p-4 whitespace-pre-wrap text-sm bg-muted/50">
                  {replaceVariables(editingTemplate.body)}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setPreviewOpen(false)}>Close</Button>
                <Button onClick={sendTestEmail}>Send Test Email</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
