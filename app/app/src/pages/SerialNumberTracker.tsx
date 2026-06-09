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
import { Separator } from "@/components/ui/separator";
import {
  Plus,
  Search,
  Shield,
  Wrench,
  AlertTriangle,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  History,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

interface SerialItem {
  id: number;
  serialNumber: string;
  productName: string;
  customerName: string;
  saleDate: string;
  warrantyExpiry: string;
  status: "active" | "expired" | "recalled" | "serviced";
  lastServiceDate: string | null;
  serviceCount: number;
}

export default function SerialNumberTracker() {
  const [localItems, setLocalItems] = useState<SerialItem[]>([]);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("inventory");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<SerialItem | null>(null);

  const items = localItems;

  const [newItem, setNewItem] = useState({
    serialNumber: "",
    productName: "",
    customerName: "",
    saleDate: "",
    warrantyYears: 2,
  });

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

  const filteredItems = items.filter(
    i =>
      i.serialNumber.toLowerCase().includes(search.toLowerCase()) ||
      i.productName.toLowerCase().includes(search.toLowerCase()) ||
      i.customerName.toLowerCase().includes(search.toLowerCase()),
  );

  const addItem = () => {
    if (!newItem.serialNumber || !newItem.productName) {
      toast.error("Serial number and product required");
      return;
    }
    if (items.some(i => i.serialNumber === newItem.serialNumber)) {
      toast.error("Serial number already exists");
      return;
    }
    const warrantyDate = new Date(newItem.saleDate);
    warrantyDate.setFullYear(warrantyDate.getFullYear() + newItem.warrantyYears);
    setLocalItems([
      ...items,
      {
        id: Date.now(),
        ...newItem,
        warrantyExpiry: warrantyDate.toISOString().split("T")[0],
        status: "active",
        lastServiceDate: null,
        serviceCount: 0,
      },
    ]);
    setAddDialogOpen(false);
    setNewItem({ serialNumber: "", productName: "", customerName: "", saleDate: "", warrantyYears: 2 });
    toast.success("Serial number registered");
  };

  const getWarrantyStatus = (expiry: string) => {
    const now = new Date();
    const exp = new Date(expiry);
    const daysLeft = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0) return { label: "Expired", color: "text-red-600", days: 0 };
    if (daysLeft < 90) return { label: `${daysLeft} days left`, color: "text-amber-600", days: daysLeft };
    return { label: `${Math.floor(daysLeft / 30)} months left`, color: "text-green-600", days: daysLeft };
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: "bg-green-100 text-green-700",
      expired: "bg-gray-100 text-gray-700",
      recalled: "bg-red-100 text-red-700",
      serviced: "bg-blue-100 text-blue-700",
    };
    return colors[status] || "bg-gray-100 text-gray-700";
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Serial Number Tracker</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Track items by serial number, warranty, and service history
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              className="pl-9 w-64"
              placeholder="Search serial, product, customer..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" /> Register Serial
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Register New Serial Number</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Serial Number</Label>
                  <Input
                    value={newItem.serialNumber}
                    onChange={e => setNewItem({ ...newItem, serialNumber: e.target.value })}
                    placeholder="SN-2026-XXXXXX"
                  />
                </div>
                <div>
                  <Label>Product Name</Label>
                  <Input
                    value={newItem.productName}
                    onChange={e => setNewItem({ ...newItem, productName: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Customer Name</Label>
                  <Input
                    value={newItem.customerName}
                    onChange={e => setNewItem({ ...newItem, customerName: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Sale Date</Label>
                    <Input
                      type="date"
                      value={newItem.saleDate}
                      onChange={e => setNewItem({ ...newItem, saleDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Warranty (years)</Label>
                    <Input
                      type="number"
                      value={newItem.warrantyYears}
                      onChange={e => setNewItem({ ...newItem, warrantyYears: +e.target.value })}
                    />
                  </div>
                </div>
                <Button onClick={addItem} className="w-full">
                  Register
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Total Items", value: items.length, icon: Package, color: "text-blue-600", bg: "bg-blue-50" },
          {
            label: "Active Warranty",
            value: items.filter(i => new Date(i.warrantyExpiry) > new Date()).length,
            icon: Shield,
            color: "text-green-600",
            bg: "bg-green-50",
          },
          {
            label: "Expired Warranty",
            value: items.filter(i => new Date(i.warrantyExpiry) <= new Date()).length,
            icon: Clock,
            color: "text-gray-600",
            bg: "bg-gray-50",
          },
          {
            label: "Under Recall",
            value: items.filter(i => i.status === "recalled").length,
            icon: AlertTriangle,
            color: "text-red-600",
            bg: "bg-red-50",
          },
        ].map(s => (
          <Card key={s.label} className={`${s.bg} border-${s.color.replace("text-", "")}-200`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <s.icon className={`w-6 h-6 ${s.color}`} />
                <div>
                  <p className="text-xs text-gray-500">{s.label}</p>
                  <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="inventory">Serial Inventory</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Serial Number</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Sale Date</TableHead>
                    <TableHead>Warranty</TableHead>
                    <TableHead>Services</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map(item => {
                    const warranty = getWarrantyStatus(item.warrantyExpiry);
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono font-medium">{item.serialNumber}</TableCell>
                        <TableCell>{item.productName}</TableCell>
                        <TableCell>{item.customerName}</TableCell>
                        <TableCell>{item.saleDate}</TableCell>
                        <TableCell>
                          <span className={warranty.color}>{warranty.label}</span>
                          <span className="text-xs text-gray-400 block">Exp: {item.warrantyExpiry}</span>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-blue-100 text-blue-700">{item.serviceCount}x</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(item.status)}>{item.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" onClick={() => setDetailItem(item)}>
                            <FileText className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!detailItem} onOpenChange={() => setDetailItem(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Serial Number Details</DialogTitle>
          </DialogHeader>
          {detailItem && (
            <div className="space-y-4">
              <div className="flex justify-between">
                <div>
                  <p className="font-mono text-lg font-bold">{detailItem.serialNumber}</p>
                  <p className="text-gray-500">{detailItem.productName}</p>
                </div>
                <Badge className={getStatusColor(detailItem.status)}>{detailItem.status}</Badge>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Customer</p>
                  <p className="font-medium">{detailItem.customerName}</p>
                </div>
                <div>
                  <p className="text-gray-500">Sale Date</p>
                  <p className="font-medium">{detailItem.saleDate}</p>
                </div>
                <div>
                  <p className="text-gray-500">Warranty Expiry</p>
                  <p className={`font-medium ${getWarrantyStatus(detailItem.warrantyExpiry).color}`}>
                    {detailItem.warrantyExpiry}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Service Count</p>
                  <p className="font-medium">{detailItem.serviceCount}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
