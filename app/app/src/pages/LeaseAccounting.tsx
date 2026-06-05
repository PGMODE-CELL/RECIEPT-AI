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
  Building2,
  Landmark,
  TrendingDown,
  Calculator,
} from "lucide-react";
import { toast } from "sonner";

interface Lease {
  id: number;
  name: string;
  type: "operating" | "finance";
  startDate: string;
  endDate: string;
  monthlyPayment: number;
  discountRate: number;
  rouAsset: number;
  leaseLiability: number;
  status: "active" | "expired" | "terminated";
}

const mockLeases: Lease[] = []

export default function LeaseAccounting() {
  const [leases] = useState<Lease[]>(mockLeases);
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");

  const [newLease, setNewLease] = useState({
    name: "",
    type: "operating",
    startDate: "",
    endDate: "",
    monthlyPayment: "",
    discountRate: "5.0",
  });

  const filtered = leases.filter(
    (l) =>
      (!search || l.name.toLowerCase().includes(search.toLowerCase())) &&
      (filterType === "all" || l.type === filterType)
  );

  const handleCreate = () => {
    if (!newLease.name || !newLease.startDate || !newLease.endDate) {
      toast.error("Name, start date, and end date are required");
      return;
    }
    toast.success("Lease created successfully");
    setOpen(false);
    setNewLease({
      name: "",
      type: "operating",
      startDate: "",
      endDate: "",
      monthlyPayment: "",
      discountRate: "5.0",
    });
  };

  const handleDelete = () => {
    if (deleteId) {
      toast.success("Lease deleted");
      setDeleteId(null);
    }
  };

  const totalRou = leases.reduce((s, l) => s + l.rouAsset, 0);
  const totalLiability = leases.reduce((s, l) => s + l.leaseLiability, 0);
  const monthlyPayments = leases
    .filter((l) => l.status === "active")
    .reduce((s, l) => s + l.monthlyPayment, 0);
  const activeCount = leases.filter((l) => l.status === "active").length;

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Lease Accounting
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage operating and finance leases per ASC 842 / IFRS 16
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" /> New Lease
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Lease</DialogTitle>
              <DialogDescription>
                Add a new operating or finance lease agreement.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Lease Name *</Label>
                <Input
                  placeholder="Office - Manhattan"
                  value={newLease.name}
                  onChange={(e) =>
                    setNewLease((p) => ({ ...p, name: e.target.value }))
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Lease Type</Label>
                  <Select
                    value={newLease.type}
                    onValueChange={(v) =>
                      setNewLease((p) => ({ ...p, type: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="operating">Operating</SelectItem>
                      <SelectItem value="finance">Finance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Monthly Payment</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newLease.monthlyPayment}
                    onChange={(e) =>
                      setNewLease((p) => ({ ...p, monthlyPayment: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date *</Label>
                  <Input
                    type="date"
                    value={newLease.startDate}
                    onChange={(e) =>
                      setNewLease((p) => ({ ...p, startDate: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date *</Label>
                  <Input
                    type="date"
                    value={newLease.endDate}
                    onChange={(e) =>
                      setNewLease((p) => ({ ...p, endDate: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Discount Rate (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={newLease.discountRate}
                  onChange={(e) =>
                    setNewLease((p) => ({ ...p, discountRate: e.target.value }))
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate}>Create Lease</Button>
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
                <p className="text-sm text-gray-500">Total ROU Assets</p>
                <p className="text-2xl font-bold">{formatCurrency(totalRou)}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Lease Liabilities</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(totalLiability)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-red-50 flex items-center justify-center">
                <Landmark className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Monthly Payments</p>
                <p className="text-2xl font-bold">{formatCurrency(monthlyPayments)}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-amber-50 flex items-center justify-center">
                <Calculator className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Leases</p>
                <p className="text-2xl font-bold">{activeCount}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-50 flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-green-600" />
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
                placeholder="Search leases..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="operating">Operating</SelectItem>
                <SelectItem value="finance">Finance</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Leases Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lease Agreements</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Period</TableHead>
                <TableHead className="text-right">Payment/Mo</TableHead>
                <TableHead className="text-right">ROU Asset</TableHead>
                <TableHead className="text-right">Liability</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[40px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.name}</TableCell>
                  <TableCell>
                    <Badge variant={l.type === "finance" ? "default" : "outline"}>
                      {l.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {new Date(l.startDate).toLocaleDateString()} -{" "}
                    {new Date(l.endDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(l.monthlyPayment)}</TableCell>
                  <TableCell className="text-right text-blue-600">
                    {formatCurrency(l.rouAsset)}
                  </TableCell>
                  <TableCell className="text-right text-red-600">
                    {formatCurrency(l.leaseLiability)}
                  </TableCell>
                  <TableCell>{l.discountRate}%</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        l.status === "active"
                          ? "default"
                          : l.status === "expired"
                          ? "secondary"
                          : "destructive"
                      }
                    >
                      {l.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteId(l.id)}
                    >
                      <Trash className="w-4 h-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                    No leases found
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
            <DialogTitle>Delete Lease</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this lease agreement?
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
