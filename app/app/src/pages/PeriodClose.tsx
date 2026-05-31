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
import {
  Plus,
  Trash,
  Search,
  Lock,
  Unlock,
  AlertTriangle,
  Calendar,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

interface Period {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  status: "open" | "closed" | "reopened";
  transactionCount: number;
  totalDebits: number;
  totalCredits: number;
  closedAt: string | null;
  closedBy: string | null;
}

const mockPeriods: Period[] = [
  { id: 1, name: "January 2026", startDate: "2026-01-01", endDate: "2026-01-31", status: "closed", transactionCount: 245, totalDebits: 125000, totalCredits: 125000, closedAt: "2026-02-05", closedBy: "Admin" },
  { id: 2, name: "February 2026", startDate: "2026-02-01", endDate: "2026-02-28", status: "closed", transactionCount: 312, totalDebits: 198000, totalCredits: 198000, closedAt: "2026-03-03", closedBy: "Admin" },
  { id: 3, name: "March 2026", startDate: "2026-03-01", endDate: "2026-03-31", status: "closed", transactionCount: 287, totalDebits: 176000, totalCredits: 176000, closedAt: "2026-04-02", closedBy: "Admin" },
  { id: 4, name: "April 2026", startDate: "2026-04-01", endDate: "2026-04-30", status: "reopened", transactionCount: 298, totalDebits: 182000, totalCredits: 182000, closedAt: null, closedBy: null },
  { id: 5, name: "May 2026", startDate: "2026-05-01", endDate: "2026-05-31", status: "open", transactionCount: 215, totalDebits: 156000, totalCredits: 156000, closedAt: null, closedBy: null },
];

export default function PeriodClose() {
  const [periods] = useState<Period[]>(mockPeriods);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [yearEndDialogOpen, setYearEndDialogOpen] = useState(false);
  const [closeConfirmId, setCloseConfirmId] = useState<number | null>(null);

  const filtered = periods.filter(
    (p) =>
      (!search || p.name.toLowerCase().includes(search.toLowerCase())) &&
      (filterStatus === "all" || p.status === filterStatus)
  );

  const handleClose = (id: number) => {
    toast.success("Period closed successfully");
    setCloseConfirmId(null);
  };

  const handleReopen = (id: number) => {
    toast.success("Period reopened successfully");
  };

  const handleYearEnd = () => {
    toast.success("Year-end close completed for FY2025");
    setYearEndDialogOpen(false);
  };

  const openCount = periods.filter((p) => p.status === "open").length;
  const closedCount = periods.filter((p) => p.status === "closed").length;
  const reopenedCount = periods.filter((p) => p.status === "reopened").length;
  const totalTransactions = periods.reduce((s, p) => s + p.transactionCount, 0);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Period Close
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage accounting period close procedures
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={yearEndDialogOpen} onOpenChange={setYearEndDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Calendar className="w-4 h-4 mr-2" /> Year-End Close
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Year-End Close</DialogTitle>
                <DialogDescription>
                  This will close all open periods for the fiscal year, create
                  closing journal entries, and lock the books. This action cannot be
                  undone.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="rounded-lg border p-4 bg-amber-50 dark:bg-amber-950">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                    <AlertTriangle className="w-5 h-5" />
                    <span className="font-medium">Warning</span>
                  </div>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    Ensure all transactions for the fiscal year have been entered and
                    reconciled before proceeding.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Fiscal Year to Close</Label>
                  <Select defaultValue="2025">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2025">FY 2025</SelectItem>
                      <SelectItem value="2024">FY 2024</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setYearEndDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleYearEnd}>
                  Close Fiscal Year
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Open Periods</p>
                <p className="text-2xl font-bold text-green-600">{openCount}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-50 flex items-center justify-center">
                <Unlock className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Closed Periods</p>
                <p className="text-2xl font-bold">{closedCount}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
                <Lock className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Reopened</p>
                <p className="text-2xl font-bold text-amber-600">{reopenedCount}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-amber-50 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Transactions</p>
                <p className="text-2xl font-bold">{totalTransactions.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-purple-50 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-purple-600" />
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
                placeholder="Search periods..."
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
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="reopened">Reopened</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Periods Table */}
      <Card>
        <CardHeader>
          <CardTitle>Accounting Periods</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead className="text-right">Transactions</TableHead>
                <TableHead className="text-right">Debits</TableHead>
                <TableHead className="text-right">Credits</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[140px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{new Date(p.startDate).toLocaleDateString()}</TableCell>
                  <TableCell>{new Date(p.endDate).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    {p.transactionCount.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(p.totalDebits)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(p.totalCredits)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        p.status === "open"
                          ? "default"
                          : p.status === "reopened"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {p.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      {p.status !== "closed" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setCloseConfirmId(p.id)}
                        >
                          <Lock className="w-3 h-3 mr-1" /> Close
                        </Button>
                      )}
                      {(p.status === "closed" || p.status === "reopened") && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReopen(p.id)}
                        >
                          <Unlock className="w-3 h-3 mr-1" /> Reopen
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    No periods found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Close Confirmation */}
      <Dialog open={closeConfirmId !== null} onOpenChange={() => setCloseConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close Period</DialogTitle>
            <DialogDescription>
              Are you sure you want to close this period? No more transactions will
              be allowed once the period is closed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseConfirmId(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => closeConfirmId && handleClose(closeConfirmId)}
            >
              Close Period
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
