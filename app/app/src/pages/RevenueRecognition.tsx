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
  DollarSign,
  CheckCircle2,
  Clock,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

interface RecognitionSchedule {
  id: number;
  invoiceRef: string;
  customerName: string;
  totalAmount: number;
  recognizedAmount: number;
  remainingAmount: number;
  method: "straight_line" | "percentage_completion" | "milestone";
  startDate: string;
  endDate: string;
  progressPct: number;
  status: "active" | "completed" | "pending";
}

const mockSchedules: RecognitionSchedule[] = []

export default function RevenueRecognition() {
  const [schedules] = useState<RecognitionSchedule[]>(mockSchedules);
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [filterMethod, setFilterMethod] = useState("all");

  const [newSchedule, setNewSchedule] = useState({
    invoiceRef: "",
    customerName: "",
    totalAmount: "",
    method: "straight_line" as string,
    startDate: "",
    endDate: "",
  });

  const filtered = schedules.filter(
    (s) =>
      (!search ||
        s.invoiceRef.toLowerCase().includes(search.toLowerCase()) ||
        s.customerName.toLowerCase().includes(search.toLowerCase())) &&
      (filterMethod === "all" || s.method === filterMethod)
  );

  const handleCreate = () => {
    if (!newSchedule.invoiceRef || !newSchedule.totalAmount) {
      toast.error("Invoice reference and amount are required");
      return;
    }
    toast.success("Recognition schedule created");
    setOpen(false);
    setNewSchedule({
      invoiceRef: "",
      customerName: "",
      totalAmount: "",
      method: "straight_line",
      startDate: "",
      endDate: "",
    });
  };

  const handleDelete = () => {
    if (deleteId) {
      toast.success("Schedule deleted");
      setDeleteId(null);
    }
  };

  const totalAmount = schedules.reduce((s, r) => s + r.totalAmount, 0);
  const totalRecognized = schedules.reduce((s, r) => s + r.recognizedAmount, 0);
  const totalRemaining = schedules.reduce((s, r) => s + r.remainingAmount, 0);
  const activeCount = schedules.filter((s) => s.status === "active").length;

  const methodLabels: Record<string, string> = {
    straight_line: "Straight Line",
    percentage_completion: "% Completion",
    milestone: "Milestone",
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Revenue Recognition
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage revenue recognition schedules and track recognized amounts
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" /> New Schedule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Recognition Schedule</DialogTitle>
              <DialogDescription>
                Set up a new revenue recognition schedule for an invoice.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Invoice Reference *</Label>
                  <Input
                    placeholder="INV-2026-006"
                    value={newSchedule.invoiceRef}
                    onChange={(e) =>
                      setNewSchedule((p) => ({ ...p, invoiceRef: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Customer</Label>
                  <Input
                    placeholder="Customer name"
                    value={newSchedule.customerName}
                    onChange={(e) =>
                      setNewSchedule((p) => ({ ...p, customerName: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Total Amount *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={newSchedule.totalAmount}
                    onChange={(e) =>
                      setNewSchedule((p) => ({ ...p, totalAmount: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Method</Label>
                  <Select
                    value={newSchedule.method}
                    onValueChange={(v) =>
                      setNewSchedule((p) => ({ ...p, method: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="straight_line">Straight Line</SelectItem>
                      <SelectItem value="percentage_completion">
                        Percentage of Completion
                      </SelectItem>
                      <SelectItem value="milestone">Milestone</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={newSchedule.startDate}
                    onChange={(e) =>
                      setNewSchedule((p) => ({ ...p, startDate: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={newSchedule.endDate}
                    onChange={(e) =>
                      setNewSchedule((p) => ({ ...p, endDate: e.target.value }))
                    }
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate}>Create Schedule</Button>
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
                <p className="text-sm text-gray-500">Total Contract Value</p>
                <p className="text-2xl font-bold">{formatCurrency(totalAmount)}</p>
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
                <p className="text-sm text-gray-500">Recognized</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(totalRecognized)}
                </p>
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
                <p className="text-sm text-gray-500">Remaining</p>
                <p className="text-2xl font-bold text-amber-600">
                  {formatCurrency(totalRemaining)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-amber-50 flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Schedules</p>
                <p className="text-2xl font-bold">{activeCount}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-purple-50 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overall Progress */}
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between text-sm mb-2">
            <span>Overall Recognition Progress</span>
            <span>
              {totalAmount > 0
                ? ((totalRecognized / totalAmount) * 100).toFixed(1)
                : 0}
              %
            </span>
          </div>
          <Progress
            value={totalAmount > 0 ? (totalRecognized / totalAmount) * 100 : 0}
            className="h-3"
          />
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search schedules..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={filterMethod} onValueChange={setFilterMethod}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                <SelectItem value="straight_line">Straight Line</SelectItem>
                <SelectItem value="percentage_completion">% Completion</SelectItem>
                <SelectItem value="milestone">Milestone</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Schedules Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recognition Schedules</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Method</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Recognized</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[40px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.invoiceRef}</TableCell>
                  <TableCell>{s.customerName}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{methodLabels[s.method]}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(s.totalAmount)}</TableCell>
                  <TableCell className="text-right text-green-600">
                    {formatCurrency(s.recognizedAmount)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={s.progressPct} className="h-2 flex-1" />
                      <span className="text-xs w-10">{s.progressPct}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {new Date(s.startDate).toLocaleDateString()} -{" "}
                    {new Date(s.endDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        s.status === "completed"
                          ? "default"
                          : s.status === "pending"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {s.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteId(s.id)}
                    >
                      <Trash className="w-4 h-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                    No schedules found
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
            <DialogTitle>Delete Schedule</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this recognition schedule?
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
