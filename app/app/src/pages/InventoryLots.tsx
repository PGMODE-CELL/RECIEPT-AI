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
  Package,
  AlertTriangle,
  Clock,
  Hash,
} from "lucide-react";
import { toast } from "sonner";

interface InventoryLot {
  id: number;
  productName: string;
  lotNumber: string;
  serialNumber: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  status: "available" | "reserved" | "depleted" | "expired";
  expiryDate: string | null;
  receivedDate: string;
}

const mockLots: InventoryLot[] = []

export default function InventoryLots() {
  const [lots] = useState<InventoryLot[]>(mockLots);
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const [newLot, setNewLot] = useState({
    productName: "",
    lotNumber: "",
    serialNumber: "",
    quantity: "",
    unitCost: "",
    expiryDate: "",
  });

  const filtered = lots.filter(
    (l) =>
      (!search ||
        l.productName.toLowerCase().includes(search.toLowerCase()) ||
        l.lotNumber.toLowerCase().includes(search.toLowerCase()) ||
        l.serialNumber.toLowerCase().includes(search.toLowerCase())) &&
      (filterStatus === "all" || l.status === filterStatus)
  );

  const handleCreate = () => {
    if (!newLot.productName || !newLot.lotNumber) {
      toast.error("Product name and lot number are required");
      return;
    }
    toast.success("Inventory lot created");
    setOpen(false);
    setNewLot({
      productName: "",
      lotNumber: "",
      serialNumber: "",
      quantity: "",
      unitCost: "",
      expiryDate: "",
    });
  };

  const handleDelete = () => {
    if (deleteId) {
      toast.success("Lot deleted");
      setDeleteId(null);
    }
  };

  const totalQty = lots.reduce((s, l) => s + l.quantity, 0);
  const totalValue = lots.reduce((s, l) => s + l.totalCost, 0);
  const expiringCount = lots.filter(
    (l) =>
      l.expiryDate &&
      new Date(l.expiryDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) &&
      l.status !== "expired" &&
      l.status !== "depleted"
  ).length;
  const lotCount = lots.length;

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Inventory Lots
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Lot and serial number tracking for inventory
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" /> New Lot
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Inventory Lot</DialogTitle>
              <DialogDescription>
                Add a new lot or serial number record.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Product Name *</Label>
                <Input
                  placeholder="Widget A"
                  value={newLot.productName}
                  onChange={(e) =>
                    setNewLot((p) => ({ ...p, productName: e.target.value }))
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Lot Number *</Label>
                  <Input
                    placeholder="LOT-2026-006"
                    value={newLot.lotNumber}
                    onChange={(e) =>
                      setNewLot((p) => ({ ...p, lotNumber: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Serial Number</Label>
                  <Input
                    placeholder="SN-XX-001"
                    value={newLot.serialNumber}
                    onChange={(e) =>
                      setNewLot((p) => ({ ...p, serialNumber: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    value={newLot.quantity}
                    onChange={(e) =>
                      setNewLot((p) => ({ ...p, quantity: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Unit Cost</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newLot.unitCost}
                    onChange={(e) =>
                      setNewLot((p) => ({ ...p, unitCost: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Expiry Date</Label>
                <Input
                  type="date"
                  value={newLot.expiryDate}
                  onChange={(e) =>
                    setNewLot((p) => ({ ...p, expiryDate: e.target.value }))
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate}>Create Lot</Button>
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
                <p className="text-sm text-gray-500">Total Lots</p>
                <p className="text-2xl font-bold">{lotCount}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
                <Hash className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Quantity</p>
                <p className="text-2xl font-bold">{totalQty.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-50 flex items-center justify-center">
                <Package className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Value</p>
                <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-purple-50 flex items-center justify-center">
                <Package className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Expiring Soon</p>
                <p className="text-2xl font-bold text-amber-600">{expiringCount}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-amber-50 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
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
                placeholder="Search lots..."
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
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="reserved">Reserved</SelectItem>
                <SelectItem value="depleted">Depleted</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lots Table */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory Lots</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Lot #</TableHead>
                <TableHead>Serial #</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit Cost</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[40px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((l) => {
                const isExpiring =
                  l.expiryDate &&
                  new Date(l.expiryDate) <=
                    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) &&
                  l.status !== "expired" &&
                  l.status !== "depleted";
                return (
                  <TableRow key={l.id} className={isExpiring ? "bg-amber-50 dark:bg-amber-950" : ""}>
                    <TableCell className="font-medium">{l.productName}</TableCell>
                    <TableCell className="font-mono text-sm">{l.lotNumber}</TableCell>
                    <TableCell className="font-mono text-sm">{l.serialNumber}</TableCell>
                    <TableCell className="text-right">{l.quantity}</TableCell>
                    <TableCell className="text-right">{formatCurrency(l.unitCost)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(l.totalCost)}</TableCell>
                    <TableCell>
                      {l.expiryDate ? (
                        <span className={isExpiring ? "text-amber-600 font-medium" : ""}>
                          {new Date(l.expiryDate).toLocaleDateString()}
                          {isExpiring && <Clock className="inline w-3 h-3 ml-1" />}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          l.status === "available"
                            ? "default"
                            : l.status === "expired"
                            ? "destructive"
                            : l.status === "reserved"
                            ? "secondary"
                            : "outline"
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
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                    No lots found
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
            <DialogTitle>Delete Lot</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this inventory lot?
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
