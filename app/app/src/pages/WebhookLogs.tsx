import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Search, RefreshCw, CheckCircle, XCircle, Clock, AlertTriangle, Eye, RotateCcw, Webhook, Bug } from "lucide-react";
import { toast } from "sonner";

interface WebhookLog {
  id: number;
  webhookName: string;
  event: string;
  url: string;
  method: string;
  statusCode: number;
  responseTime: number;
  timestamp: string;
  status: "success" | "failed" | "pending" | "timeout";
  requestBody: string;
  responseBody: string;
  headers: Record<string, string>;
  retryCount: number;
}

const mockLogs: WebhookLog[] = []

export default function WebhookLogs() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterWebhook, setFilterWebhook] = useState("all");
  const [detailLog, setDetailLog] = useState<WebhookLog | null>(null);
  const [debugLog, setDebugLog] = useState<WebhookLog | null>(null);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

  const uniqueWebhooks = [...new Set(mockLogs.map((l) => l.webhookName))];

  const filtered = mockLogs.filter((l) => {
    if (search && !l.event.toLowerCase().includes(search.toLowerCase()) && !l.url.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus !== "all" && l.status !== filterStatus) return false;
    if (filterWebhook !== "all" && l.webhookName !== filterWebhook) return false;
    return true;
  });

  const successCount = mockLogs.filter((l) => l.status === "success").length;
  const failedCount = mockLogs.filter((l) => l.status === "failed").length;
  const timeoutCount = mockLogs.filter((l) => l.status === "timeout").length;
  const avgResponseTime = mockLogs.filter((l) => l.status === "success").reduce((s, l) => s + l.responseTime, 0) / successCount || 0;

  const statusIcon = (status: string) => {
    switch (status) {
      case "success": return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "failed": return <XCircle className="w-4 h-4 text-red-500" />;
      case "pending": return <Clock className="w-4 h-4 text-amber-500" />;
      case "timeout": return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      default: return null;
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "success": return <Badge className="bg-green-100 text-green-700">Success</Badge>;
      case "failed": return <Badge className="bg-red-100 text-red-700">Failed</Badge>;
      case "pending": return <Badge className="bg-amber-100 text-amber-700">Pending</Badge>;
      case "timeout": return <Badge className="bg-orange-100 text-orange-700">Timeout</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const retryWebhook = (id: number) => {
    toast.success(`Webhook ${id} retry queued`);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Webhook className="w-6 h-6 text-indigo-600" /> Webhook Logs
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Monitor and debug webhook executions</p>
        </div>
        <Button variant="outline" onClick={() => toast.success("Logs refreshed")}><RefreshCw className="w-4 h-4 mr-2" /> Refresh</Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg"><CheckCircle className="w-5 h-5 text-green-600" /></div>
              <div>
                <p className="text-sm text-gray-500">Successful</p>
                <p className="text-xl font-bold">{successCount}</p>
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
                <p className="text-xl font-bold">{failedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg"><AlertTriangle className="w-5 h-5 text-orange-600" /></div>
              <div>
                <p className="text-sm text-gray-500">Timeouts</p>
                <p className="text-xl font-bold">{timeoutCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg"><Clock className="w-5 h-5 text-blue-600" /></div>
              <div>
                <p className="text-sm text-gray-500">Avg Response</p>
                <p className="text-xl font-bold">{avgResponseTime.toFixed(0)}ms</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Search by event or URL..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={filterWebhook} onValueChange={setFilterWebhook}>
              <SelectTrigger className="w-44"><SelectValue placeholder="All Webhooks" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Webhooks</SelectItem>
                {uniqueWebhooks.map((w) => <SelectItem key={w} value={w}>{w}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-32"><SelectValue placeholder="All Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="timeout">Timeout</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader><CardTitle>Execution Logs ({filtered.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Webhook</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status Code</TableHead>
                <TableHead>Response Time</TableHead>
                <TableHead>Timestamp</TableHead>
                <TableHead>Retries</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-gray-500">No logs found</TableCell></TableRow>
              )}
              {filtered.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-medium">{log.webhookName}</TableCell>
                  <TableCell><code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">{log.event}</code></TableCell>
                  <TableCell><Badge variant="outline">{log.method}</Badge></TableCell>
                  <TableCell>
                    <span className={`font-mono ${log.statusCode >= 200 && log.statusCode < 300 ? "text-green-600" : log.statusCode >= 400 ? "text-red-600" : "text-gray-500"}`}>
                      {log.statusCode || "—"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`font-mono ${log.responseTime > 1000 ? "text-red-600" : log.responseTime > 500 ? "text-amber-600" : "text-green-600"}`}>
                      {log.responseTime}ms
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{log.timestamp}</TableCell>
                  <TableCell className="text-center">
                    {log.retryCount > 0 ? <Badge className="bg-amber-100 text-amber-700">{log.retryCount}</Badge> : "0"}
                  </TableCell>
                  <TableCell>{statusBadge(log.status)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setDetailLog(log)}>
                        <Eye className="w-4 h-4 text-gray-400" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDebugLog(log)}>
                        <Bug className="w-4 h-4 text-gray-400" />
                      </Button>
                      {log.status !== "success" && (
                        <Button variant="ghost" size="icon" onClick={() => retryWebhook(log.id)}>
                          <RotateCcw className="w-4 h-4 text-gray-400" />
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

      {/* Detail Dialog */}
      <Dialog open={detailLog !== null} onOpenChange={() => setDetailLog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Webhook Details</DialogTitle></DialogHeader>
          {detailLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-xs">Webhook</Label><p className="font-medium">{detailLog.webhookName}</p></div>
                <div><Label className="text-xs">Event</Label><p className="font-mono text-sm">{detailLog.event}</p></div>
                <div><Label className="text-xs">URL</Label><p className="font-mono text-sm break-all">{detailLog.url}</p></div>
                <div><Label className="text-xs">Status Code</Label><p className="font-mono">{detailLog.statusCode}</p></div>
                <div><Label className="text-xs">Response Time</Label><p className="font-mono">{detailLog.responseTime}ms</p></div>
                <div><Label className="text-xs">Retries</Label><p>{detailLog.retryCount}</p></div>
                <div><Label className="text-xs">Timestamp</Label><p className="font-mono text-sm">{detailLog.timestamp}</p></div>
                <div><Label className="text-xs">Status</Label>{statusBadge(detailLog.status)}</div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Request Headers</Label>
                <pre className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-xs font-mono overflow-x-auto">
                  {JSON.stringify(detailLog.headers, null, 2)}
                </pre>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Request Body</Label>
                <pre className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-xs font-mono overflow-x-auto">{detailLog.requestBody}</pre>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Response Body</Label>
                <pre className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-xs font-mono overflow-x-auto">{detailLog.responseBody || "(empty)"}</pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Debug Dialog */}
      <Dialog open={debugLog !== null} onOpenChange={() => setDebugLog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bug className="w-5 h-5" /> Debug View
            </DialogTitle>
          </DialogHeader>
          {debugLog && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">Debug information for webhook execution #{debugLog.id}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Full Request</Label>
                <pre className="p-3 bg-gray-900 text-green-400 rounded-lg text-xs font-mono overflow-x-auto whitespace-pre-wrap">
{`→ ${debugLog.method} ${debugLog.url}
${Object.entries(debugLog.headers).map(([k, v]) => `→ ${k}: ${v}`).join("\n")}

${debugLog.requestBody}`}
                </pre>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Full Response</Label>
                <pre className="p-3 bg-gray-900 text-blue-400 rounded-lg text-xs font-mono overflow-x-auto whitespace-pre-wrap">
{`← HTTP ${debugLog.statusCode || "TIMEOUT"} (${debugLog.responseTime}ms)

${debugLog.responseBody || "(no response body)"}`}
                </pre>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Timing Breakdown</Label>
                <div className="space-y-1">
                  {[
                    { label: "DNS Lookup", time: Math.round(debugLog.responseTime * 0.05) },
                    { label: "TLS Handshake", time: Math.round(debugLog.responseTime * 0.08) },
                    { label: "Server Processing", time: Math.round(debugLog.responseTime * 0.7) },
                    { label: "Data Transfer", time: Math.round(debugLog.responseTime * 0.17) },
                  ].map((step, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs w-32 text-gray-500">{step.label}</span>
                      <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(step.time / debugLog.responseTime) * 100}%` }} />
                      </div>
                      <span className="text-xs font-mono w-16 text-right">{step.time}ms</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
