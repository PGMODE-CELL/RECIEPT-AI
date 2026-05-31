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
import { Progress } from "@/components/ui/progress";
import {
  Plus,
  Trash,
  Search,
  Briefcase,
  DollarSign,
  Clock,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

interface Job {
  id: number;
  jobCode: string;
  projectName: string;
  description: string;
  estimatedCost: number;
  actualCost: number;
  wipAmount: number;
  status: "active" | "completed" | "on_hold" | "cancelled";
  progressPct: number;
  startDate: string;
  endDate: string;
  entries: TimeEntry[];
}

interface TimeEntry {
  id: number;
  date: string;
  description: string;
  hours: number;
  rate: number;
  amount: number;
  type: "time" | "expense";
}

const mockJobs: Job[] = [
  {
    id: 1, jobCode: "JOB-001", projectName: "Website Redesign", description: "Full website redesign project",
    estimatedCost: 45000, actualCost: 28000, wipAmount: 17000, status: "active", progressPct: 62,
    startDate: "2026-01-15", endDate: "2026-06-30",
    entries: [
      { id: 1, date: "2026-05-01", description: "UI/UX Design", hours: 16, rate: 125, amount: 2000, type: "time" },
      { id: 2, date: "2026-05-03", description: "Development Sprint", hours: 24, rate: 125, amount: 3000, type: "time" },
    ],
  },
  {
    id: 2, jobCode: "JOB-002", projectName: "Mobile App", description: "Cross-platform mobile app",
    estimatedCost: 120000, actualCost: 85000, wipAmount: 35000, status: "active", progressPct: 71,
    startDate: "2026-02-01", endDate: "2026-09-30",
    entries: [
      { id: 3, date: "2026-05-02", description: "API Integration", hours: 20, rate: 150, amount: 3000, type: "time" },
    ],
  },
  {
    id: 3, jobCode: "JOB-003", projectName: "Office Renovation", description: "Main office space renovation",
    estimatedCost: 80000, actualCost: 82000, wipAmount: 0, status: "completed", progressPct: 100,
    startDate: "2025-10-01", endDate: "2026-03-31",
    entries: [],
  },
  {
    id: 4, jobCode: "JOB-004", projectName: "Data Migration", description: "Legacy system data migration",
    estimatedCost: 35000, actualCost: 12000, wipAmount: 23000, status: "on_hold", progressPct: 34,
    startDate: "2026-04-01", endDate: "2026-08-31",
    entries: [],
  },
];

export default function JobCosting() {
  const [jobs] = useState<Job[]>(mockJobs);
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);

  const [newJob, setNewJob] = useState({
    projectName: "",
    jobCode: "",
    description: "",
    estimatedCost: "",
    startDate: "",
    endDate: "",
  });

  const filtered = jobs.filter(
    (j) =>
      (!search ||
        j.projectName.toLowerCase().includes(search.toLowerCase()) ||
        j.jobCode.toLowerCase().includes(search.toLowerCase())) &&
      (filterStatus === "all" || j.status === filterStatus)
  );

  const handleCreate = () => {
    if (!newJob.projectName || !newJob.jobCode) {
      toast.error("Project name and job code are required");
      return;
    }
    toast.success("Job created successfully");
    setOpen(false);
    setNewJob({
      projectName: "",
      jobCode: "",
      description: "",
      estimatedCost: "",
      startDate: "",
      endDate: "",
    });
  };

  const handleDelete = () => {
    if (deleteId) {
      toast.success("Job deleted");
      setDeleteId(null);
    }
  };

  const totalEstimated = jobs.reduce((s, j) => s + j.estimatedCost, 0);
  const totalActual = jobs.reduce((s, j) => s + j.actualCost, 0);
  const totalWip = jobs.reduce((s, j) => s + j.wipAmount, 0);
  const activeCount = jobs.filter((j) => j.status === "active").length;

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Job Costing
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Track work-in-progress and job costs
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" /> New Job
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Job</DialogTitle>
              <DialogDescription>
                Set up a new job for cost tracking.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Job Code *</Label>
                  <Input
                    placeholder="JOB-005"
                    value={newJob.jobCode}
                    onChange={(e) =>
                      setNewJob((p) => ({ ...p, jobCode: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Project Name *</Label>
                  <Input
                    placeholder="Project name"
                    value={newJob.projectName}
                    onChange={(e) =>
                      setNewJob((p) => ({ ...p, projectName: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  placeholder="Project description"
                  value={newJob.description}
                  onChange={(e) =>
                    setNewJob((p) => ({ ...p, description: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Estimated Cost</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newJob.estimatedCost}
                  onChange={(e) =>
                    setNewJob((p) => ({ ...p, estimatedCost: e.target.value }))
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={newJob.startDate}
                    onChange={(e) =>
                      setNewJob((p) => ({ ...p, startDate: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={newJob.endDate}
                    onChange={(e) =>
                      setNewJob((p) => ({ ...p, endDate: e.target.value }))
                    }
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate}>Create Job</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Estimated Total</p>
                <p className="text-2xl font-bold">{formatCurrency(totalEstimated)}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Actual Cost</p>
                <p className="text-2xl font-bold text-amber-600">
                  {formatCurrency(totalActual)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-amber-50 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">WIP Amount</p>
                <p className="text-2xl font-bold">{formatCurrency(totalWip)}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-50 flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Jobs</p>
                <p className="text-2xl font-bold">{activeCount}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-purple-50 flex items-center justify-center">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search jobs..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Jobs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job Code</TableHead>
                <TableHead>Project</TableHead>
                <TableHead className="text-right">Estimated</TableHead>
                <TableHead className="text-right">Actual</TableHead>
                <TableHead className="text-right">WIP</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[120px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((j) => (
                <TableRow key={j.id}>
                  <TableCell className="font-mono text-sm">{j.jobCode}</TableCell>
                  <TableCell className="font-medium">{j.projectName}</TableCell>
                  <TableCell className="text-right">{formatCurrency(j.estimatedCost)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(j.actualCost)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(j.wipAmount)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={j.progressPct} className="h-2 flex-1" />
                      <span className="text-xs w-10">{j.progressPct}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        j.status === "active"
                          ? "default"
                          : j.status === "completed"
                          ? "secondary"
                          : j.status === "on_hold"
                          ? "outline"
                          : "destructive"
                      }
                    >
                      {j.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedJob(j);
                          setEntryDialogOpen(true);
                        }}
                      >
                        Entries
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(j.id)}
                      >
                        <Trash className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    No jobs found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Time/Expense Entries Dialog */}
      <Dialog open={entryDialogOpen} onOpenChange={setEntryDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedJob?.jobCode} - {selectedJob?.projectName}
            </DialogTitle>
            <DialogDescription>Time and cost entries</DialogDescription>
          </DialogHeader>
          {selectedJob && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-gray-500">Estimated</p>
                  <p className="font-bold">{formatCurrency(selectedJob.estimatedCost)}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-gray-500">Actual</p>
                  <p className="font-bold">{formatCurrency(selectedJob.actualCost)}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-gray-500">Variance</p>
                  <p
                    className={`font-bold ${
                      selectedJob.estimatedCost - selectedJob.actualCost >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {formatCurrency(selectedJob.estimatedCost - selectedJob.actualCost)}
                  </p>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedJob.entries.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>{new Date(e.date).toLocaleDateString()}</TableCell>
                      <TableCell>{e.description}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{e.type}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{e.hours}</TableCell>
                      <TableCell className="text-right">{formatCurrency(e.rate)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(e.amount)}</TableCell>
                    </TableRow>
                  ))}
                  {selectedJob.entries.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-4 text-gray-500">
                        No entries yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Job</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this job? All associated entries will
              be lost.
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
