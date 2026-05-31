import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Plus, Webhook, Send, CheckCircle, XCircle, Clock, History, Settings, Trash, Play, Eye, RotateCcw, Code } from "lucide-react";
import { toast } from "sonner";

interface WebhookSubscription {
  id: number;
  name: string;
  url: string;
  events: string[];
  secret: string;
  enabled: boolean;
  retryPolicy: string;
  customHeaders: Record<string, string>;
  createdAt: string;
  lastTriggered: string;
  successRate: number;
}

interface WebhookLog {
  id: number;
  subscriptionId: number;
  event: string;
  url: string;
  statusCode: number;
  requestPayload: string;
  responsePayload: string;
  duration: number;
  timestamp: string;
  attempt: number;
  status: "success" | "failed" | "retrying";
}

const availableEvents = [
  "invoice.created", "invoice.paid", "invoice.overdue",
  "bill.created", "bill.paid",
  "contact.created", "contact.updated",
  "payment.received", "payment.failed",
  "product.created", "product.updated",
  "expense.claimed", "expense.approved",
  "report.generated",
];

const defaultSubscriptions: WebhookSubscription[] = [
  { id: 1, name: "Slack Notifications", url: "https://hooks.slack.com/services/T00/B00/xxx", events: ["invoice.paid", "payment.received"], secret: "whsec_abc123", enabled: true, retryPolicy: "3 attempts, exponential backoff", customHeaders: { "Content-Type": "application/json" }, createdAt: "2026-04-15", lastTriggered: "2026-05-31 08:30", successRate: 99.2 },
  { id: 2, name: "ERP Sync", url: "https://erp.company.com/api/webhooks", events: ["invoice.created", "bill.created", "contact.created"], secret: "whsec_def456", enabled: true, retryPolicy: "5 attempts, linear backoff", customHeaders: { "X-API-Key": "erp-key-123" }, createdAt: "2026-03-20", lastTriggered: "2026-05-31 09:00", successRate: 97.8 },
  { id: 3, name: "Analytics Pipeline", url: "https://analytics.company.com/ingest", events: ["invoice.paid", "expense.approved", "report.generated"], secret: "whsec_ghi789", enabled: false, retryPolicy: "3 attempts, fixed delay", customHeaders: {}, createdAt: "2026-05-01", lastTriggered: "2026-05-28 14:00", successRate: 95.0 },
];

const defaultLogs: WebhookLog[] = [
  { id: 1, subscriptionId: 1, event: "invoice.paid", url: "https://hooks.slack.com/...", statusCode: 200, requestPayload: '{"event":"invoice.paid","data":{"id":"INV-0142","amount":2450}}', responsePayload: '{"ok":true}', duration: 245, timestamp: "2026-05-31 08:30:12", attempt: 1, status: "success" },
  { id: 2, subscriptionId: 2, event: "invoice.created", url: "https://erp.company.com/...", statusCode: 200, requestPayload: '{"event":"invoice.created","data":{"id":"INV-0143"}}', responsePayload: '{"synced":true}', duration: 892, timestamp: "2026-05-31 09:00:05", attempt: 1, status: "success" },
  { id: 3, subscriptionId: 1, event: "payment.received", url: "https://hooks.slack.com/...", statusCode: 500, requestPayload: '{"event":"payment.received","data":{}}', responsePayload: '{"error":"internal"}', duration: 1200, timestamp: "2026-05-30 15:22:10", attempt: 1, status: "failed" },
  { id: 4, subscriptionId: 1, event: "payment.received", url: "https://hooks.slack.com/...", statusCode: 200, requestPayload: '{"event":"payment.received","data":{}}', responsePayload: '{"ok":true}', duration: 310, timestamp: "2026-05-30 15:22:15", attempt: 2, status: "success" },
  { id: 5, subscriptionId: 3, event: "expense.approved", url: "https://analytics.company.com/...", statusCode: 408, requestPayload: '{"event":"expense.approved"}', responsePayload: '{"timeout":true}', duration: 5000, timestamp: "2026-05-28 14:00:30", attempt: 3, status: "failed" },
];

export default function APIWebhooks() {
  const [subscriptions, setSubscriptions] = useState<WebhookSubscription[]>(defaultSubscriptions);
  const [logs, setLogs] = useState<WebhookLog[]>(defaultLogs);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; status: number; duration: number } | null>(null);
  const [activeTab, setActiveTab] = useState("subscriptions");
  const [selectedLog, setSelectedLog] = useState<WebhookLog | null>(null);

  const [newSub, setNewSub] = useState({ name: "", url: "", events: [] as string[], secret: "", retryPolicy: "3 attempts, exponential backoff" });

  const toggleSubscription = (id: number) => {
    setSubscriptions(subscriptions.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s));
    toast.success("Subscription updated");
  };

  const deleteSubscription = (id: number) => {
    setSubscriptions(subscriptions.filter(s => s.id !== id));
    toast.success("Subscription deleted");
  };

  const addSubscription = () => {
    if (!newSub.name || !newSub.url) { toast.error("Name and URL required"); return; }
    setSubscriptions([...subscriptions, {
      id: Date.now(),
      name: newSub.name,
      url: newSub.url,
      events: newSub.events,
      secret: "whsec_" + Math.random().toString(36).slice(2, 14),
      enabled: true,
      retryPolicy: newSub.retryPolicy,
      customHeaders: {},
      createdAt: new Date().toISOString().split("T")[0],
      lastTriggered: "Never",
      successRate: 100,
    }]);
    setCreateDialogOpen(false);
    setNewSub({ name: "", url: "", events: [], secret: "", retryPolicy: "3 attempts, exponential backoff" });
    toast.success("Webhook subscription created");
  };

  const toggleEvent = (event: string) => {
    setNewSub(prev => ({
      ...prev,
      events: prev.events.includes(event) ? prev.events.filter(e => e !== event) : [...prev.events, event],
    }));
  };

  const testWebhook = () => {
    setTestResult(null);
    setTimeout(() => {
      setTestResult({ success: true, status: 200, duration: Math.floor(Math.random() * 500) + 100 });
      toast.success("Test webhook delivered successfully");
    }, 1500);
  };

  const retryWebhook = (logId: number) => {
    toast.success("Webhook retry initiated");
  };

  const successLogs = logs.filter(l => l.status === "success").length;
  const failedLogs = logs.filter(l => l.status === "failed").length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">API Webhooks</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Event subscriptions, payload customization, and delivery logs</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setTestDialogOpen(true)}>
            <Play className="w-4 h-4 mr-2" /> Test Sandbox
          </Button>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" /> New Webhook</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Create Webhook Subscription</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Name</Label><Input value={newSub.name} onChange={e => setNewSub({ ...newSub, name: e.target.value })} /></div>
                <div><Label>Endpoint URL</Label><Input value={newSub.url} onChange={e => setNewSub({ ...newSub, url: e.target.value })} placeholder="https://your-server.com/webhook" /></div>
                <div>
                  <Label>Events to Subscribe</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2 max-h-40 overflow-y-auto border rounded p-3">
                    {availableEvents.map(event => (
                      <label key={event} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="checkbox" checked={newSub.events.includes(event)} onChange={() => toggleEvent(event)} className="rounded" />
                        <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">{event}</code>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Retry Policy</Label>
                  <Select value={newSub.retryPolicy} onValueChange={v => setNewSub({ ...newSub, retryPolicy: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3 attempts, exponential backoff">3 attempts, exponential backoff</SelectItem>
                      <SelectItem value="5 attempts, linear backoff">5 attempts, linear backoff</SelectItem>
                      <SelectItem value="3 attempts, fixed delay">3 attempts, fixed delay</SelectItem>
                      <SelectItem value="No retries">No retries</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={addSubscription} className="w-full">Create Webhook</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Webhook className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-500">Active Subscriptions</p>
                <p className="text-2xl font-bold text-blue-600">{subscriptions.filter(s => s.enabled).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-50 dark:bg-green-950 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-500">Successful Deliveries</p>
                <p className="text-2xl font-bold text-green-600">{successLogs}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-red-50 dark:bg-red-950 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <XCircle className="w-8 h-8 text-red-600" />
              <div>
                <p className="text-sm text-gray-500">Failed Deliveries</p>
                <p className="text-2xl font-bold text-red-600">{failedLogs}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-purple-50 dark:bg-purple-950 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-purple-600" />
              <div>
                <p className="text-sm text-gray-500">Avg Response Time</p>
                <p className="text-2xl font-bold text-purple-600">{Math.round(logs.reduce((s, l) => s + l.duration, 0) / logs.length)}ms</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="logs">Delivery Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="subscriptions">
          <div className="space-y-4">
            {subscriptions.map(sub => (
              <Card key={sub.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Webhook className="w-4 h-4 text-blue-500" />
                        <span className="font-semibold">{sub.name}</span>
                        <Badge className={sub.enabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}>
                          {sub.enabled ? "Active" : "Disabled"}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500 mt-1 font-mono">{sub.url}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {sub.events.map(e => <Badge key={e} className="bg-indigo-100 text-indigo-700 text-xs">{e}</Badge>)}
                      </div>
                      <div className="flex gap-4 mt-2 text-xs text-gray-500">
                        <span>Retry: {sub.retryPolicy}</span>
                        <span>Success rate: {sub.successRate}%</span>
                        <span>Last triggered: {sub.lastTriggered}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={sub.enabled} onCheckedChange={() => toggleSubscription(sub.id)} />
                      <Button size="sm" variant="ghost" onClick={() => deleteSubscription(sub.id)}>
                        <Trash className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader><CardTitle>Delivery Logs</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Endpoint</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Attempt</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map(log => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">{log.timestamp}</TableCell>
                      <TableCell><Badge className="bg-indigo-100 text-indigo-700 text-xs">{log.event}</Badge></TableCell>
                      <TableCell className="font-mono text-xs max-w-[200px] truncate">{log.url}</TableCell>
                      <TableCell>
                        <Badge className={log.statusCode < 300 ? "bg-green-100 text-green-700" : log.statusCode < 500 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}>
                          {log.statusCode}
                        </Badge>
                      </TableCell>
                      <TableCell>{log.duration}ms</TableCell>
                      <TableCell>#{log.attempt}</TableCell>
                      <TableCell>
                        <Badge className={log.status === "success" ? "bg-green-100 text-green-700" : log.status === "retrying" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}>
                          {log.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => setSelectedLog(log)}><Eye className="w-4 h-4" /></Button>
                          {log.status === "failed" && <Button size="sm" variant="ghost" onClick={() => retryWebhook(log.id)}><RotateCcw className="w-4 h-4 text-blue-500" /></Button>}
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

      {/* Test Sandbox Dialog */}
      <Dialog open={testDialogOpen} onOpenChange={() => setTestDialogOpen(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Webhook Testing Sandbox</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Select Webhook</Label>
              <Select>
                <SelectTrigger><SelectValue placeholder="Choose subscription" /></SelectTrigger>
                <SelectContent>
                  {subscriptions.filter(s => s.enabled).map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Test Event</Label>
              <Select>
                <SelectTrigger><SelectValue placeholder="Choose event" /></SelectTrigger>
                <SelectContent>
                  {availableEvents.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Payload (JSON)</Label>
              <Textarea rows={6} defaultValue={JSON.stringify({ event: "invoice.paid", data: { id: "INV-TEST-001", amount: 1500.00, customer: "Test Corp" }, timestamp: new Date().toISOString() }, null, 2)} className="font-mono text-xs" />
            </div>
            <Button onClick={testWebhook} className="w-full"><Send className="w-4 h-4 mr-2" /> Send Test Webhook</Button>
            {testResult && (
              <div className={`p-4 rounded-lg ${testResult.success ? "bg-green-50 dark:bg-green-950 border border-green-200" : "bg-red-50 dark:bg-red-950 border border-red-200"}`}>
                <p className={`font-medium ${testResult.success ? "text-green-700" : "text-red-700"}`}>
                  {testResult.success ? "Delivery Successful" : "Delivery Failed"}
                </p>
                <p className="text-sm text-gray-600 mt-1">Status: {testResult.status} • Duration: {testResult.duration}ms</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Log Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Webhook Payload</DialogTitle></DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="flex justify-between">
                <Badge className="bg-indigo-100 text-indigo-700">{selectedLog.event}</Badge>
                <Badge className={selectedLog.status === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>{selectedLog.statusCode}</Badge>
              </div>
              <div>
                <Label className="text-xs text-gray-500">REQUEST PAYLOAD</Label>
                <pre className="bg-gray-50 dark:bg-gray-900 p-3 rounded text-xs font-mono overflow-x-auto">{selectedLog.requestPayload}</pre>
              </div>
              <div>
                <Label className="text-xs text-gray-500">RESPONSE</Label>
                <pre className="bg-gray-50 dark:bg-gray-900 p-3 rounded text-xs font-mono overflow-x-auto">{selectedLog.responsePayload}</pre>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div><p className="text-gray-500">Duration</p><p className="font-medium">{selectedLog.duration}ms</p></div>
                <div><p className="text-gray-500">Attempt</p><p className="font-medium">#{selectedLog.attempt}</p></div>
                <div><p className="text-gray-500">Time</p><p className="font-medium">{selectedLog.timestamp}</p></div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
