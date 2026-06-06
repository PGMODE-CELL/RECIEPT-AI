import { useState } from "react";
import { trpc } from "@/providers/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus,
  Trash,
  Search,
  Webhook,
  CheckCircle2,
  XCircle,
  Send,
} from "lucide-react";
import { toast } from "sonner";

interface WebhookEntry {
  id: number;
  name: string;
  url: string;
  events: string[];
  enabled: boolean;
  lastTriggered: string | null;
  lastStatus: "success" | "failed" | null;
  createdAt: string;
}

const availableEvents = [
  "invoice.created",
  "invoice.sent",
  "invoice.paid",
  "bill.created",
  "bill.paid",
  "payment.received",
  "payment.overdue",
  "journal.created",
  "period.closed",
  "export.completed",
];

export default function Webhooks() {
  const { data: webhooks = [], isLoading, refetch } = trpc.webhook.list.useQuery();
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const [newWebhook, setNewWebhook] = useState({
    name: "",
    url: "",
    events: [] as string[],
  });

  const createWebhook = trpc.webhook.create.useMutation({
    onSuccess: () => {
      setOpen(false);
      refetch();
      toast.success("Webhook created");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteWebhook = trpc.webhook.delete.useMutation({
    onSuccess: () => {
      setDeleteId(null);
      refetch();
      toast.success("Webhook deleted");
    },
    onError: (e) => toast.error(e.message),
  });

  const filtered = webhooks.filter(
    (w) =>
      !search ||
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      w.url.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = () => {
    if (!newWebhook.name || !newWebhook.url) {
      toast.error("Name and URL are required");
      return;
    }
    if (newWebhook.events.length === 0) {
      toast.error("Select at least one event");
      return;
    }
    createWebhook.mutate(newWebhook as any);
    setNewWebhook({ name: "", url: "", events: [] });
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteWebhook.mutate({ id: deleteId });
    }
  };

  const handleTest = (id: number) => {
    toast.success("Test webhook sent successfully");
  };

  const toggleEvent = (event: string) => {
    setNewWebhook((p) => ({
      ...p,
      events: p.events.includes(event)
        ? p.events.filter((e) => e !== event)
        : [...p.events, event],
    }));
  };

  const activeCount = webhooks.filter((w) => w.enabled).length;
  const totalTriggers = webhooks.filter((w) => w.lastStatus === "success").length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Webhooks
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage webhook integrations for event notifications
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" /> New Webhook
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Webhook</DialogTitle>
              <DialogDescription>
                Set up a new webhook endpoint to receive event notifications.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  placeholder="Slack Notifications"
                  value={newWebhook.name}
                  onChange={(e) =>
                    setNewWebhook((p) => ({ ...p, name: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>URL *</Label>
                <Input
                  placeholder="https://api.example.com/webhook"
                  value={newWebhook.url}
                  onChange={(e) =>
                    setNewWebhook((p) => ({ ...p, url: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Events *</Label>
                <div className="grid grid-cols-2 gap-2 border rounded-lg p-3 max-h-[200px] overflow-y-auto">
                  {availableEvents.map((event) => (
                    <label
                      key={event}
                      className="flex items-center gap-2 text-sm cursor-pointer"
                    >
                      <Checkbox
                        checked={newWebhook.events.includes(event)}
                        onCheckedChange={() => toggleEvent(event)}
                      />
                      <span className="font-mono text-xs">{event}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate}>Create Webhook</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Webhooks</p>
                <p className="text-2xl font-bold">{activeCount}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
                <Webhook className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Successful Deliveries</p>
                <p className="text-2xl font-bold text-green-600">{totalTriggers}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-50 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Failed Deliveries</p>
                <p className="text-2xl font-bold text-red-600">
                  {webhooks.filter((w) => w.lastStatus === "failed").length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-red-50 flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Webhooks Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Webhook Endpoints</CardTitle>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search webhooks..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Events</TableHead>
                <TableHead>Last Triggered</TableHead>
                <TableHead className="text-right">Enabled</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow>}
              {filtered.map((w) => (
                <TableRow key={w.id}>
                  <TableCell className="font-medium">{w.name}</TableCell>
                  <TableCell className="font-mono text-xs text-gray-500 max-w-[200px] truncate">
                    {w.url}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {w.events.slice(0, 2).map((e) => (
                        <Badge key={e} variant="outline" className="text-xs">
                          {e}
                        </Badge>
                      ))}
                      {w.events.length > 2 && (
                        <Badge variant="secondary" className="text-xs">
                          +{w.events.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {w.lastTriggered ? (
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        {w.lastStatus === "success" ? (
                          <CheckCircle2 className="w-3 h-3 text-green-500" />
                        ) : (
                          <XCircle className="w-3 h-3 text-red-500" />
                        )}
                        {w.lastTriggered}
                      </div>
                    ) : (
                      "Never"
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Switch checked={w.enabled} />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleTest(w.id)}
                        title="Test webhook"
                      >
                        <Send className="w-4 h-4 text-blue-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(w.id)}
                      >
                        <Trash className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    No webhooks found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Webhook</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this webhook? It will stop receiving
              events immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
