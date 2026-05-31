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
  Trash,
  Pencil,
  Package,
  Wrench,
  Calculator,
  ClipboardList,
} from "lucide-react";
import { toast } from "sonner";

const BOM_STATUSES = ["draft", "active", "obsolete"] as const;
const WO_STATUSES = ["draft", "planned", "in_progress", "completed", "cancelled"] as const;

const bomStatusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  active: "bg-green-100 text-green-700",
  obsolete: "bg-red-100 text-red-700",
};

const woStatusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  planned: "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function Manufacturing() {
  const [activeTab, setActiveTab] = useState<"bom" | "workOrders">("bom");
  const [bomOpen, setBomOpen] = useState(false);
  const [woOpen, setWoOpen] = useState(false);
  const [bomItemOpen, setBomItemOpen] = useState(false);
  const [editBomId, setEditBomId] = useState<number | null>(null);
  const [editWoId, setEditWoId] = useState<number | null>(null);
  const [selectedBomId, setSelectedBomId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const { data: products } = trpc.product.list.useQuery();

  const { data: boms, isLoading: bomsLoading, refetch: refetchBoms } =
    trpc.manufacturing.listBoms.useQuery();
  const { data: workOrders, isLoading: woLoading, refetch: refetchWo } =
    trpc.manufacturing.listWorkOrders.useQuery();
  const { data: bomItems } = trpc.manufacturing.listBomItems.useQuery(
    { bomId: selectedBomId! },
    { enabled: !!selectedBomId }
  );

  const createBom = trpc.manufacturing.createBom.useMutation({
    onSuccess: () => {
      setBomOpen(false);
      refetchBoms();
      toast.success("BOM created");
    },
    onError: (error) => toast.error(error.message),
  });

  const updateBom = trpc.manufacturing.updateBom.useMutation({
    onSuccess: () => {
      setEditBomId(null);
      refetchBoms();
      toast.success("BOM updated");
    },
  });

  const deleteBom = trpc.manufacturing.deleteBom.useMutation({
    onSuccess: () => {
      refetchBoms();
      toast.success("BOM deleted");
    },
  });

  const createWorkOrder = trpc.manufacturing.createWorkOrder.useMutation({
    onSuccess: () => {
      setWoOpen(false);
      refetchWo();
      toast.success("Work order created");
    },
    onError: (error) => toast.error(error.message),
  });

  const updateWorkOrder = trpc.manufacturing.updateWorkOrder.useMutation({
    onSuccess: () => {
      setEditWoId(null);
      refetchWo();
      toast.success("Work order updated");
    },
  });

  const deleteWorkOrder = trpc.manufacturing.deleteWorkOrder.useMutation({
    onSuccess: () => {
      refetchWo();
      toast.success("Work order deleted");
    },
  });

  const addBomItem = trpc.manufacturing.addBomItem.useMutation({
    onSuccess: () => {
      setBomItemOpen(false);
      refetchBoms();
      toast.success("BOM item added");
    },
  });

  const removeBomItem = trpc.manufacturing.removeBomItem.useMutation({
    onSuccess: () => {
      refetchBoms();
      toast.success("BOM item removed");
    },
  });

  const formatCurrency = (v: string | number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(Number(v));

  const filteredBoms = useMemo(() => {
    if (!boms) return [];
    return boms.filter(
      (b) =>
        !search ||
        b.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [boms, search]);

  const filteredWorkOrders = useMemo(() => {
    if (!workOrders) return [];
    return workOrders.filter(
      (wo) =>
        !search ||
        wo.orderNumber.toLowerCase().includes(search.toLowerCase())
    );
  }, [workOrders, search]);

  const stats = useMemo(() => {
    const totalBoms = boms?.length || 0;
    const activeBoms = boms?.filter((b) => b.status === "active").length || 0;
    const totalWorkOrders = workOrders?.length || 0;
    const inProgress =
      workOrders?.filter((wo) => wo.status === "in_progress").length || 0;
    const totalCost =
      workOrders?.reduce((sum, wo) => sum + Number(wo.actualCost || 0), 0) || 0;
    return { totalBoms, activeBoms, totalWorkOrders, inProgress, totalCost };
  }, [boms, workOrders]);

  const handleCreateBom = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    createBom.mutate({
      name: form.get("name") as string,
      productId: Number(form.get("productId")),
      quantity: (form.get("quantity") as string) || undefined,
      description: (form.get("description") as string) || undefined,
    });
  };

  const handleCreateWorkOrder = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    createWorkOrder.mutate({
      orderNumber: form.get("orderNumber") as string,
      bomId: Number(form.get("bomId")),
      quantity: (form.get("quantity") as string) || undefined,
      startDate: (form.get("startDate") as string) || undefined,
      endDate: (form.get("endDate") as string) || undefined,
      notes: (form.get("notes") as string) || undefined,
    });
  };

  const handleAddBomItem = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    addBomItem.mutate({
      bomId: selectedBomId!,
      productId: Number(form.get("productId")),
      quantity: (form.get("quantity") as string) || undefined,
      unitCost: (form.get("unitCost") as string) || undefined,
    });
  };

  const editingBom = boms?.find((b) => b.id === editBomId);
  const editingWo = workOrders?.find((wo) => wo.id === editWoId);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Manufacturing
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Bills of materials and work orders
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={activeTab === "bom" ? "default" : "outline"}
            onClick={() => setActiveTab("bom")}
          >
            <Package className="w-4 h-4 mr-2" /> BOMs
          </Button>
          <Button
            variant={activeTab === "workOrders" ? "default" : "outline"}
            onClick={() => setActiveTab("workOrders")}
          >
            <ClipboardList className="w-4 h-4 mr-2" /> Work Orders
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total BOMs</p>
                <p className="text-2xl font-bold">{stats.totalBoms}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Wrench className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Active BOMs</p>
                <p className="text-2xl font-bold">{stats.activeBoms}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <ClipboardList className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">In Progress</p>
                <p className="text-2xl font-bold">{stats.inProgress}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Calculator className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Cost</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(stats.totalCost)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder={`Search ${activeTab === "bom" ? "BOMs" : "work orders"}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {activeTab === "bom" ? (
        <>
          <div className="flex justify-end">
            <Dialog open={bomOpen} onOpenChange={setBomOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" /> New BOM
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create Bill of Materials</DialogTitle>
                  <DialogDescription>
                    Define a product assembly with its components
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateBom} className="space-y-4">
                  <div className="space-y-2">
                    <Label>BOM Name *</Label>
                    <Input name="name" required placeholder="e.g. Widget Assembly" />
                  </div>
                  <div className="space-y-2">
                    <Label>Product *</Label>
                    <Select name="productId" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products?.map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input
                      name="quantity"
                      type="number"
                      step="0.01"
                      defaultValue="1.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea name="description" placeholder="BOM description..." />
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={createBom.isPending}>
                      Create BOM
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBoms?.map((bom) => {
                    const product = products?.find(
                      (p) => p.id === bom.productId
                    );
                    return (
                      <TableRow
                        key={bom.id}
                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                        onClick={() => setSelectedBomId(bom.id)}
                      >
                        <TableCell className="font-medium">
                          {bom.name}
                        </TableCell>
                        <TableCell>{product?.name || "-"}</TableCell>
                        <TableCell>{bom.quantity}</TableCell>
                        <TableCell>
                          <Badge
                            className={`${bomStatusColors[bom.status]} border-0`}
                          >
                            {bom.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-500">
                          {new Date(bom.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditBomId(bom.id);
                              }}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteBom.mutate({ id: bom.id });
                              }}
                            >
                              <Trash className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {(!filteredBoms || filteredBoms.length === 0) && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center py-8 text-gray-400"
                      >
                        No bills of materials found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {selectedBomId && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">BOM Components</CardTitle>
                <Dialog open={bomItemOpen} onOpenChange={setBomItemOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="w-4 h-4 mr-2" /> Add Component
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Component</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddBomItem} className="space-y-4">
                      <div className="space-y-2">
                        <Label>Product *</Label>
                        <Select name="productId" required>
                          <SelectTrigger>
                            <SelectValue placeholder="Select product" />
                          </SelectTrigger>
                          <SelectContent>
                            {products?.map((p) => (
                              <SelectItem key={p.id} value={String(p.id)}>
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Quantity</Label>
                        <Input
                          name="quantity"
                          type="number"
                          step="0.01"
                          defaultValue="1.00"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Unit Cost ($)</Label>
                        <Input
                          name="unitCost"
                          type="number"
                          step="0.01"
                          defaultValue="0.00"
                        />
                      </div>
                      <DialogFooter>
                        <Button type="submit">Add Component</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Unit Cost</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bomItems?.map((item) => {
                      const product = products?.find(
                        (p) => p.id === item.productId
                      );
                      return (
                        <TableRow key={item.id}>
                          <TableCell>{product?.name || "-"}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>{formatCurrency(item.unitCost)}</TableCell>
                          <TableCell>
                            {formatCurrency(
                              Number(item.quantity) * Number(item.unitCost)
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                              onClick={() =>
                                removeBomItem.mutate({ id: item.id })
                              }
                            >
                              <Trash className="w-3.5 h-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {(!bomItems || bomItems.length === 0) && (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center py-8 text-gray-400"
                        >
                          No components added
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {editingBom && (
            <Dialog
              open={!!editBomId}
              onOpenChange={(open) => !open && setEditBomId(null)}
            >
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Edit BOM</DialogTitle>
                </DialogHeader>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const form = new FormData(e.currentTarget);
                    updateBom.mutate({
                      id: editBomId!,
                      name: form.get("name") as string,
                      productId: Number(form.get("productId")),
                      quantity: (form.get("quantity") as string) || undefined,
                      status: form.get("status") as string,
                      description:
                        (form.get("description") as string) || undefined,
                    });
                  }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label>BOM Name *</Label>
                    <Input
                      name="name"
                      required
                      defaultValue={editingBom.name}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Product *</Label>
                    <Select
                      name="productId"
                      defaultValue={String(editingBom.productId)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {products?.map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select name="status" defaultValue={editingBom.status}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BOM_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input
                      name="quantity"
                      type="number"
                      step="0.01"
                      defaultValue={editingBom.quantity}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      name="description"
                      defaultValue={editingBom.description || ""}
                    />
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={updateBom.isPending}>
                      Save Changes
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </>
      ) : (
        <>
          <div className="flex justify-end">
            <Dialog open={woOpen} onOpenChange={setWoOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" /> New Work Order
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create Work Order</DialogTitle>
                  <DialogDescription>
                    Schedule production based on a BOM
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateWorkOrder} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Order Number *</Label>
                    <Input
                      name="orderNumber"
                      required
                      placeholder="WO-001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>BOM *</Label>
                    <Select name="bomId" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select BOM" />
                      </SelectTrigger>
                      <SelectContent>
                        {boms?.map((b) => (
                          <SelectItem key={b.id} value={String(b.id)}>
                            {b.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input
                      name="quantity"
                      type="number"
                      step="0.01"
                      defaultValue="1.00"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Input name="startDate" type="date" />
                    </div>
                    <div className="space-y-2">
                      <Label>End Date</Label>
                      <Input name="endDate" type="date" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea name="notes" placeholder="Production notes..." />
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={createWorkOrder.isPending}>
                      Create Work Order
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>BOM</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>End</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWorkOrders?.map((wo) => {
                    const bom = boms?.find((b) => b.id === wo.bomId);
                    return (
                      <TableRow key={wo.id}>
                        <TableCell className="font-medium">
                          {wo.orderNumber}
                        </TableCell>
                        <TableCell>{bom?.name || "-"}</TableCell>
                        <TableCell>{wo.quantity}</TableCell>
                        <TableCell>
                          <Badge
                            className={`${woStatusColors[wo.status]} border-0`}
                          >
                            {wo.status.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>{wo.startDate || "-"}</TableCell>
                        <TableCell>{wo.endDate || "-"}</TableCell>
                        <TableCell>{formatCurrency(wo.actualCost)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => setEditWoId(wo.id)}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                              onClick={() =>
                                deleteWorkOrder.mutate({ id: wo.id })
                              }
                            >
                              <Trash className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {(!filteredWorkOrders ||
                    filteredWorkOrders.length === 0) && (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center py-8 text-gray-400"
                      >
                        No work orders found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {editingWo && (
            <Dialog
              open={!!editWoId}
              onOpenChange={(open) => !open && setEditWoId(null)}
            >
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Edit Work Order</DialogTitle>
                </DialogHeader>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const form = new FormData(e.currentTarget);
                    updateWorkOrder.mutate({
                      id: editWoId!,
                      orderNumber: form.get("orderNumber") as string,
                      bomId: Number(form.get("bomId")),
                      quantity: (form.get("quantity") as string) || undefined,
                      status: form.get("status") as string,
                      startDate:
                        (form.get("startDate") as string) || undefined,
                      endDate: (form.get("endDate") as string) || undefined,
                      actualCost:
                        (form.get("actualCost") as string) || undefined,
                      notes: (form.get("notes") as string) || undefined,
                    });
                  }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label>Order Number *</Label>
                    <Input
                      name="orderNumber"
                      required
                      defaultValue={editingWo.orderNumber}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>BOM *</Label>
                    <Select name="bomId" defaultValue={String(editingWo.bomId)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {boms?.map((b) => (
                          <SelectItem key={b.id} value={String(b.id)}>
                            {b.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select name="status" defaultValue={editingWo.status}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {WO_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s.replace("_", " ").replace(/\b\w/g, (l) =>
                              l.toUpperCase()
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input
                      name="quantity"
                      type="number"
                      step="0.01"
                      defaultValue={editingWo.quantity}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Input
                        name="startDate"
                        type="date"
                        defaultValue={editingWo.startDate || ""}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End Date</Label>
                      <Input
                        name="endDate"
                        type="date"
                        defaultValue={editingWo.endDate || ""}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Actual Cost ($)</Label>
                    <Input
                      name="actualCost"
                      type="number"
                      step="0.01"
                      defaultValue={editingWo.actualCost || ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea
                      name="notes"
                      defaultValue={editingWo.notes || ""}
                    />
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={updateWorkOrder.isPending}>
                      Save Changes
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </>
      )}
    </div>
  );
}
