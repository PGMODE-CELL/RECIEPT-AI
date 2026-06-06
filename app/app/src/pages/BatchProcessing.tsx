import { useState, useEffect } from "react";
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
import { Play, Pause, CheckCircle, XCircle, Clock, FileText, Mail, Upload, Download, RefreshCw, Plus, Trash, Eye } from "lucide-react";
import { toast } from "sonner";

interface BatchJob {
  id: number;
  name: string;
  type: "invoices" | "emails" | "statuses" | "import" | "export";
  status: "queued" | "running" | "completed" | "failed" | "paused";
  totalItems: number;
  processedItems: number;
  failedItems: number;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  errors: string[];
}

const typeLabels: Record<string, string> = {
  invoices: "Batch Invoices",
  emails: "Batch Emails",
  statuses: "Status Update",
  import: "Data Import",
  export: "Data Export",
};

const typeIcons: Record<string, typeof FileText> = {
  invoices: FileText,
  emails: Mail,
  statuses: RefreshCw,
  import: Upload,
  export: Download,
};

export default function BatchProcessing() {
  const { data: invoices = [] } = trpc.invoice.list.useQuery({ limit: 200 });
  const { data: bills = [] } = trpc.bill.list.useQuery({ limit: 200 });

  // TODO: replace with backend query when batch jobs endpoint exists
  const [jobs, setJobs] = useState<BatchJob[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("jobs");
  const [selectedJob, setSelectedJob] = useState<BatchJob | null>(null);

  const [newJob, setNewJob] = useState({ name: "", type: "invoices" as BatchJob["type"] });

  const invoiceCount = invoices?.invoices?.length || 0;
  const billCount = bills?.bills?.length || 0;

  const effectiveJobs = jobs;

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      queued: "bg-gray-100 text-gray-700",
      running: "bg-blue-100 text-blue-700",
      completed: "bg-green-100 text-green-700",
      failed: "bg-red-100 text-red-700",
      paused: "bg-amber-100 text-amber-700",
    };
    return colors[status] || "bg-gray-100 text-gray-700";
  };

  const createJob = () => {
    if (!newJob.name) { toast.error("Job name required"); return; }
    const totalItems = newJob.type === "invoices" ? invoiceCount : billCount;
    setJobs([...effectiveJobs, {
      id: Date.now(),
      name: newJob.name,
      type: newJob.type,
      status: "queued",
      totalItems: totalItems || 0,
      processedItems: 0,
      failedItems: 0,
      createdAt: new Date().toISOString().replace("T", " ").slice(0, 16),
      startedAt: null,
      completedAt: null,
      errors: [],
    }]);
    setCreateDialogOpen(false);
    setNewJob({ name: "", type: "invoices" });
    toast.success("Batch job created");
  };

  const startJob = (jobId: number) => {
    setJobs(effectiveJobs.map(j => j.id === jobId ? { ...j, status: "running", startedAt: new Date().toISOString().replace("T", " ").slice(0, 16) } : j));
    toast.success("Job started");
  };

  const pauseJob = (jobId: number) => {
    setJobs(effectiveJobs.map(j => j.id === jobId ? { ...j, status: "paused" } : j));
    toast.success("Job paused");
  };

  const deleteJob = (jobId: number) => {
    setJobs(effectiveJobs.filter(j => j.id !== jobId));
    toast.success("Job removed");
  };

  const runningJobs = effectiveJobs.filter(j => j.status === "running");
  const completedJobs = effectiveJobs.filter(j => j.status === "completed");
  const failedJobs = effectiveJobs.filter(j => j.status === "failed");

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Batch Processing Center</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Batch create, send, and update with progress tracking</p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" /> New Batch Job</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Batch Job</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Job Name</Label><Input value={newJob.name} onChange={e => setNewJob({ ...newJob, name: e.target.value })} /></div>
              <div>
                <Label>Job Type</Label>
                <Select value={newJob.type} onValueChange={v => setNewJob({ ...newJob, type: v as BatchJob["type"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="invoices">Batch Create Invoices</SelectItem>
                    <SelectItem value="emails">Batch Send Emails</SelectItem>
                    <SelectItem value="statuses">Batch Update Statuses</SelectItem>
                    <SelectItem value="import">Batch Import Data</SelectItem>
                    <SelectItem value="export">Batch Export Data</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={createJob} className="w-full">Create Job</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Play className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-500">Running</p>
                <p className="text-2xl font-bold text-blue-600">{runningJobs.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-50 dark:bg-green-950 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-500">Completed</p>
                <p className="text-2xl font-bold text-green-600">{completedJobs.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-red-50 dark:bg-red-950 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <XCircle className="w-8 h-8 text-red-600" />
              <div>
                <p className="text-sm text-gray-500">Failed</p>
                <p className="text-2xl font-bold text-red-600">{failedJobs.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-purple-50 dark:bg-purple-950 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-purple-600" />
              <div>
                <p className="text-sm text-gray-500">Total Items Processed</p>
                <p className="text-2xl font-bold text-purple-600">{effectiveJobs.reduce((s, j) => s + j.processedItems, 0).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="jobs">All Jobs</TabsTrigger>
          <TabsTrigger value="progress">Live Progress</TabsTrigger>
        </TabsList>

        <TabsContent value="jobs">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Failed</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {effectiveJobs.map(job => {
                    const Icon = typeIcons[job.type];
                    const progress = job.totalItems > 0 ? Math.round((job.processedItems / job.totalItems) * 100) : 0;
                    return (
                      <TableRow key={job.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4 text-gray-400" />
                            <span className="font-medium">{job.name}</span>
                          </div>
                        </TableCell>
                        <TableCell><Badge className="bg-indigo-100 text-indigo-700">{typeLabels[job.type]}</Badge></TableCell>
                        <TableCell>
                          <div className="w-32">
                            <Progress value={progress} className="h-2" />
                            <span className="text-xs text-gray-500">{progress}%</span>
                          </div>
                        </TableCell>
                        <TableCell>{job.processedItems}/{job.totalItems}</TableCell>
                        <TableCell>{job.failedItems > 0 ? <span className="text-red-600 font-medium">{job.failedItems}</span> : "0"}</TableCell>
                        <TableCell><Badge className={getStatusColor(job.status)}>{job.status}</Badge></TableCell>
                        <TableCell className="text-sm text-gray-500">{job.createdAt}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {job.status === "queued" && <Button size="sm" variant="ghost" onClick={() => startJob(job.id)}><Play className="w-4 h-4 text-green-500" /></Button>}
                            {job.status === "running" && <Button size="sm" variant="ghost" onClick={() => pauseJob(job.id)}><Pause className="w-4 h-4 text-amber-500" /></Button>}
                            <Button size="sm" variant="ghost" onClick={() => setSelectedJob(job)}><Eye className="w-4 h-4" /></Button>
                            <Button size="sm" variant="ghost" onClick={() => deleteJob(job.id)}><Trash className="w-4 h-4 text-red-500" /></Button>
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

        <TabsContent value="progress">
          <div className="space-y-4">
            {effectiveJobs.filter(j => j.status === "running").map(job => {
              const progress = job.totalItems > 0 ? Math.round((job.processedItems / job.totalItems) * 100) : 0;
              return (
                <Card key={job.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                        <span className="font-semibold">{job.name}</span>
                        <Badge className="bg-blue-100 text-blue-700">{typeLabels[job.type]}</Badge>
                      </div>
                      <span className="text-sm text-gray-500">{job.processedItems.toLocaleString()} / {job.totalItems.toLocaleString()}</span>
                    </div>
                    <Progress value={progress} className="h-4" />
                    <div className="flex justify-between mt-2 text-xs text-gray-500">
                      <span>{progress}% complete</span>
                      <span>{job.failedItems} errors</span>
                    </div>
                    {job.errors.length > 0 && (
                      <div className="mt-3 bg-red-50 dark:bg-red-950 p-3 rounded text-sm">
                        {job.errors.slice(-3).map((err, i) => <p key={i} className="text-red-600">{err}</p>)}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
            {effectiveJobs.filter(j => j.status === "running").length === 0 && (
              <Card>
                <CardContent className="p-8 text-center text-gray-500">
                  No running jobs. Start a job to see live progress.
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedJob} onOpenChange={() => setSelectedJob(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Job Details</DialogTitle></DialogHeader>
          {selectedJob && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">{selectedJob.name}</h3>
                <Badge className={getStatusColor(selectedJob.status)}>{selectedJob.status}</Badge>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-gray-500">Type</p><p className="font-medium">{typeLabels[selectedJob.type]}</p></div>
                <div><p className="text-gray-500">Total Items</p><p className="font-medium">{selectedJob.totalItems}</p></div>
                <div><p className="text-gray-500">Processed</p><p className="font-medium text-green-600">{selectedJob.processedItems}</p></div>
                <div><p className="text-gray-500">Failed</p><p className="font-medium text-red-600">{selectedJob.failedItems}</p></div>
                <div><p className="text-gray-500">Created</p><p className="font-medium">{selectedJob.createdAt}</p></div>
                <div><p className="text-gray-500">Started</p><p className="font-medium">{selectedJob.startedAt || "—"}</p></div>
                {selectedJob.completedAt && <div><p className="text-gray-500">Completed</p><p className="font-medium">{selectedJob.completedAt}</p></div>}
              </div>
              {selectedJob.errors.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Errors</p>
                  <div className="bg-red-50 dark:bg-red-950 p-3 rounded max-h-32 overflow-y-auto text-sm space-y-1">
                    {selectedJob.errors.map((err, i) => <p key={i} className="text-red-600">{err}</p>)}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
