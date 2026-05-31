import { useState, useMemo } from "react";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
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
import {
  Plus,
  Search,
  Phone,
  Mail,
  Calendar,
  FileText,
  CheckCircle2,
  Circle,
  TrendingUp,
  DollarSign,
  Users,
  Target,
  Trash,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";

const LEAD_STATUSES = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
] as const;

const ACTIVITY_TYPES = ["call", "email", "meeting", "task", "note"] as const;

const statusConfig: Record<
  string,
  { color: string; bgColor: string }
> = {
  new: { color: "text-blue-700", bgColor: "bg-blue-100" },
  contacted: { color: "text-indigo-700", bgColor: "bg-indigo-100" },
  qualified: { color: "text-purple-700", bgColor: "bg-purple-100" },
  proposal: { color: "text-amber-700", bgColor: "bg-amber-100" },
  negotiation: { color: "text-orange-700", bgColor: "bg-orange-100" },
  won: { color: "text-green-700", bgColor: "bg-green-100" },
  lost: { color: "text-red-700", bgColor: "bg-red-100" },
};

const activityIcons: Record<string, any> = {
  call: Phone,
  email: Mail,
  meeting: Calendar,
  task: CheckCircle2,
  note: FileText,
};

const activityColors: Record<string, string> = {
  call: "bg-green-100 text-green-700",
  email: "bg-blue-100 text-blue-700",
  meeting: "bg-purple-100 text-purple-700",
  task: "bg-amber-100 text-amber-700",
  note: "bg-gray-100 text-gray-600",
};

export default function CRM() {
  const [activeView, setActiveView] = useState<"pipeline" | "activities">(
    "pipeline"
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [editLeadId, setEditLeadId] = useState<number | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const { data: leads, isLoading, refetch } = trpc.crm.listLeads.useQuery();
  const { data: activities } = trpc.crm.listActivities.useQuery(
    { leadId: selectedLeadId! },
    { enabled: !!selectedLeadId }
  );

  const createLead = trpc.crm.createLead.useMutation({
    onSuccess: () => {
      setCreateOpen(false);
      refetch();
      toast.success("Lead created");
    },
    onError: (error) => toast.error(error.message),
  });

  const updateLead = trpc.crm.updateLead.useMutation({
    onSuccess: () => {
      setEditLeadId(null);
      refetch();
      toast.success("Lead updated");
    },
  });

  const deleteLead = trpc.crm.deleteLead.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Lead deleted");
    },
  });

  const createActivity = trpc.crm.createActivity.useMutation({
    onSuccess: () => {
      setActivityOpen(false);
      refetch();
      toast.success("Activity logged");
    },
  });

  const formatCurrency = (v: string | number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(Number(v));

  const filteredLeads = useMemo(() => {
    if (!leads) return [];
    return leads.filter((lead) => {
      const matchesSearch =
        !search ||
        lead.name.toLowerCase().includes(search.toLowerCase()) ||
        lead.company?.toLowerCase().includes(search.toLowerCase()) ||
        lead.email?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus =
        filterStatus === "all" || lead.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [leads, search, filterStatus]);

  const pipelineLeads = useMemo(() => {
    const grouped: Record<string, typeof filteredLeads> = {};
    LEAD_STATUSES.forEach((s) => (grouped[s] = []));
    filteredLeads.forEach((lead) => {
      if (grouped[lead.status]) {
        grouped[lead.status].push(lead);
      }
    });
    return grouped;
  }, [filteredLeads]);

  const stats = useMemo(() => {
    if (!leads) return { total: 0, pipelineValue: 0, wonValue: 0, conversionRate: 0 };
    const total = leads.length;
    const pipelineValue = leads
      .filter((l) => !["won", "lost"].includes(l.status))
      .reduce((sum, l) => sum + Number(l.value || 0), 0);
    const wonValue = leads
      .filter((l) => l.status === "won")
      .reduce((sum, l) => sum + Number(l.value || 0), 0);
    const conversionRate =
      total > 0
        ? Math.round(
            (leads.filter((l) => l.status === "won").length / total) * 100
          )
        : 0;
    return { total, pipelineValue, wonValue, conversionRate };
  }, [leads]);

  const handleCreateLead = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    createLead.mutate({
      name: form.get("name") as string,
      email: (form.get("email") as string) || undefined,
      phone: (form.get("phone") as string) || undefined,
      company: (form.get("company") as string) || undefined,
      source: (form.get("source") as string) || undefined,
      value: (form.get("value") as string) || undefined,
      assignee: (form.get("assignee") as string) || undefined,
      notes: (form.get("notes") as string) || undefined,
      expectedCloseDate:
        (form.get("expectedCloseDate") as string) || undefined,
    });
  };

  const handleCreateActivity = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    createActivity.mutate({
      leadId: selectedLeadId!,
      type: form.get("type") as string,
      subject: form.get("subject") as string,
      description: (form.get("description") as string) || undefined,
      dueDate: (form.get("dueDate") as string) || undefined,
    });
  };

  const editingLead = leads?.find((l) => l.id === editLeadId);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            CRM
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage leads, pipeline, and activities
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={activeView === "pipeline" ? "default" : "outline"}
            onClick={() => setActiveView("pipeline")}
          >
            Pipeline
          </Button>
          <Button
            variant={activeView === "activities" ? "default" : "outline"}
            onClick={() => setActiveView("activities")}
          >
            Activities
          </Button>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" /> New Lead
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Lead</DialogTitle>
                <DialogDescription>Add a new lead to your pipeline</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateLead} className="space-y-4">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input name="name" required placeholder="Lead name" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input name="email" type="email" placeholder="email@example.com" />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input name="phone" placeholder="+1 234 567 890" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Company</Label>
                    <Input name="company" placeholder="Company name" />
                  </div>
                  <div className="space-y-2">
                    <Label>Source</Label>
                    <Input name="source" placeholder="e.g. Website, Referral" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Deal Value ($)</Label>
                    <Input name="value" type="number" step="0.01" placeholder="0.00" />
                  </div>
                  <div className="space-y-2">
                    <Label>Assignee</Label>
                    <Input name="assignee" placeholder="Assigned to" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Expected Close Date</Label>
                  <Input name="expectedCloseDate" type="date" />
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea name="notes" placeholder="Additional notes..." />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createLead.isPending}>
                    Create Lead
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Leads</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Pipeline Value</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(stats.pipelineValue)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Won Value</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(stats.wonValue)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Target className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Conversion Rate</p>
                <p className="text-2xl font-bold">{stats.conversionRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search leads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {LEAD_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {activeView === "pipeline" ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {LEAD_STATUSES.map((status) => (
            <div key={status} className="min-w-[280px] flex-shrink-0">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300 capitalize">
                    {status}
                  </h3>
                  <Badge variant="secondary" className="text-xs">
                    {pipelineLeads[status]?.length || 0}
                  </Badge>
                </div>
                <span className="text-xs text-gray-500">
                  {formatCurrency(
                    pipelineLeads[status]?.reduce(
                      (sum, l) => sum + Number(l.value || 0),
                      0
                    ) || 0
                  )}
                </span>
              </div>
              <div className="space-y-3">
                {pipelineLeads[status]?.map((lead) => (
                  <Card
                    key={lead.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setSelectedLeadId(lead.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white truncate">
                            {lead.name}
                          </p>
                          {lead.company && (
                            <p className="text-xs text-gray-500 truncate">
                              {lead.company}
                            </p>
                          )}
                          {lead.email && (
                            <p className="text-xs text-gray-400 truncate">
                              {lead.email}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditLeadId(lead.id);
                            }}
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteLead.mutate({ id: lead.id });
                            }}
                          >
                            <Trash className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <Badge
                          className={`${statusConfig[lead.status]?.bgColor} ${statusConfig[lead.status]?.color} border-0`}
                        >
                          {lead.status}
                        </Badge>
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                          {formatCurrency(lead.value || 0)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {(!pipelineLeads[status] ||
                  pipelineLeads[status].length === 0) && (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    No leads
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Activity Log</CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedLeadId ? (
              <p className="text-gray-500 text-center py-8">
                Select a lead from the pipeline to view activities
              </p>
            ) : (
              <>
                <div className="flex justify-end mb-4">
                  <Dialog open={activityOpen} onOpenChange={setActivityOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="w-4 h-4 mr-2" /> Log Activity
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Log Activity</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleCreateActivity} className="space-y-4">
                        <div className="space-y-2">
                          <Label>Type *</Label>
                          <Select name="type" required>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              {ACTIVITY_TYPES.map((t) => (
                                <SelectItem key={t} value={t}>
                                  {t.charAt(0).toUpperCase() + t.slice(1)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Subject *</Label>
                          <Input name="subject" required placeholder="Activity subject" />
                        </div>
                        <div className="space-y-2">
                          <Label>Description</Label>
                          <Textarea name="description" placeholder="Details..." />
                        </div>
                        <div className="space-y-2">
                          <Label>Due Date</Label>
                          <Input name="dueDate" type="date" />
                        </div>
                        <DialogFooter>
                          <Button type="submit">Log Activity</Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activities?.map((activity) => {
                      const Icon = activityIcons[activity.type] || Circle;
                      return (
                        <TableRow key={activity.id}>
                          <TableCell>
                            <Badge
                              className={`${activityColors[activity.type]} border-0`}
                            >
                              <Icon className="w-3 h-3 mr-1" />
                              {activity.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">
                            {activity.subject}
                          </TableCell>
                          <TableCell className="text-gray-500 max-w-xs truncate">
                            {activity.description || "-"}
                          </TableCell>
                          <TableCell>{activity.dueDate || "-"}</TableCell>
                          <TableCell>
                            {activity.completed ? (
                              <Badge className="bg-green-100 text-green-700 border-0">
                                Done
                              </Badge>
                            ) : (
                              <Badge className="bg-gray-100 text-gray-600 border-0">
                                Open
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {(!activities || activities.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-gray-400">
                          No activities logged
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {editingLead && (
        <Dialog
          open={!!editLeadId}
          onOpenChange={(open) => !open && setEditLeadId(null)}
        >
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Lead</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                updateLead.mutate({
                  id: editLeadId!,
                  name: form.get("name") as string,
                  email: (form.get("email") as string) || undefined,
                  phone: (form.get("phone") as string) || undefined,
                  company: (form.get("company") as string) || undefined,
                  source: (form.get("source") as string) || undefined,
                  status: form.get("status") as string,
                  value: (form.get("value") as string) || undefined,
                  assignee: (form.get("assignee") as string) || undefined,
                  notes: (form.get("notes") as string) || undefined,
                  expectedCloseDate:
                    (form.get("expectedCloseDate") as string) || undefined,
                });
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  name="name"
                  required
                  defaultValue={editingLead.name}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    name="email"
                    type="email"
                    defaultValue={editingLead.email || ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    name="phone"
                    defaultValue={editingLead.phone || ""}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Company</Label>
                  <Input
                    name="company"
                    defaultValue={editingLead.company || ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Source</Label>
                  <Input
                    name="source"
                    defaultValue={editingLead.source || ""}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  name="status"
                  defaultValue={editingLead.status}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Deal Value ($)</Label>
                  <Input
                    name="value"
                    type="number"
                    step="0.01"
                    defaultValue={editingLead.value || ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Assignee</Label>
                  <Input
                    name="assignee"
                    defaultValue={editingLead.assignee || ""}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Expected Close Date</Label>
                <Input
                  name="expectedCloseDate"
                  type="date"
                  defaultValue={editingLead.expectedCloseDate || ""}
                />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  name="notes"
                  defaultValue={editingLead.notes || ""}
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={updateLead.isPending}>
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
