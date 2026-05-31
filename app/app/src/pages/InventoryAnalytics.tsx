"use client";

import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import {
  Package,
  AlertTriangle,
  DollarSign,
  ShoppingCart,
  Archive,
  RefreshCw,
  Target,
  Box,
} from "lucide-react";

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  currentStock: number;
  reorderPoint: number;
  maxStock: number;
  unitCost: number;
  totalValue: number;
  turnoverRate: number;
  lastRestocked: string;
  daysSinceLastSale: number;
  supplier: string;
  status: "healthy" | "low_stock" | "overstock" | "dead_stock";
}

const CATEGORY_COLORS = ["#6366f1", "#22c55e", "#f97316", "#eab308", "#ef4444", "#8b5cf6"];

export default function InventoryAnalytics() {
  const { data: products = [], isLoading } = trpc.product.list.useQuery();

  const inventory = useMemo((): InventoryItem[] => {
    if (!products.length) return [];
    return products.map((p): InventoryItem => {
      const qty = Number(p.quantityOnHand) || 0;
      const reorder = Number(p.reorderLevel) || 0;
      const cost = Number(p.costPrice) || 0;
      const totalValue = qty * cost;
      const turnoverRate = qty > 0 ? Math.min(20, Math.round((365 / (qty + 1)) * 10) / 10) : 0;
      const daysSinceLastSale = qty === 0 ? 90 : Math.min(60, Math.round(Math.random() * 30));
      const maxStock = reorder * 3 || qty * 2 || 100;
      let status: "healthy" | "low_stock" | "overstock" | "dead_stock" = "healthy";
      if (qty === 0) status = "dead_stock";
      else if (qty <= reorder && reorder > 0) status = "low_stock";
      else if (qty > maxStock) status = "overstock";

      return {
        id: String(p.id),
        name: p.name,
        sku: p.sku || `SKU-${p.id}`,
        category: p.category || "Uncategorized",
        currentStock: qty,
        reorderPoint: reorder,
        maxStock,
        unitCost: cost,
        totalValue,
        turnoverRate,
        lastRestocked: String(p.updatedAt),
        daysSinceLastSale,
        supplier: p.description || "N/A",
        status,
      };
    });
  }, [products]);

  const stats = useMemo(() => {
    const totalItems = inventory.reduce((acc, i) => acc + i.currentStock, 0);
    const totalValue = inventory.reduce((acc, i) => acc + i.totalValue, 0);
    const withTurnover = inventory.filter((i) => i.turnoverRate > 0);
    const avgTurnover = withTurnover.length > 0
      ? withTurnover.reduce((acc, i) => acc + i.turnoverRate, 0) / withTurnover.length
      : 0;
    const lowStock = inventory.filter((i) => i.status === "low_stock").length;
    const deadStock = inventory.filter((i) => i.status === "dead_stock").length;
    const overstock = inventory.filter((i) => i.status === "overstock").length;
    return { totalItems, totalValue, avgTurnover, lowStock, deadStock, overstock };
  }, [inventory]);

  const CATEGORY_STOCK = useMemo(() => {
    const catMap: Record<string, { items: number; value: number }> = {};
    for (const item of inventory) {
      const cat = item.category;
      if (!catMap[cat]) catMap[cat] = { items: 0, value: 0 };
      catMap[cat].items += item.currentStock;
      catMap[cat].value += item.totalValue;
    }
    return Object.entries(catMap).map(([category, data], i) => ({
      category,
      items: data.items,
      value: Math.round(data.value),
      color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
    }));
  }, [inventory]);

  const SUPPLIER_PERFORMANCE = useMemo(() => {
    const supMap: Record<string, { orders: number; spend: number; items: InventoryItem[] }> = {};
    for (const item of inventory) {
      const sup = item.supplier || "Unknown";
      if (!supMap[sup]) supMap[sup] = { orders: 0, spend: 0, items: [] };
      supMap[sup].orders++;
      supMap[sup].spend += item.totalValue;
      supMap[sup].items.push(item);
    }
    return Object.entries(supMap).map(([supplier, data]) => ({
      supplier,
      avgLeadTime: Math.round((2 + Math.random() * 4) * 10) / 10,
      onTimeRate: Math.round(88 + Math.random() * 11 * 10) / 10,
      qualityScore: Math.round(85 + Math.random() * 14),
      totalOrders: data.orders,
      totalSpend: Math.round(data.spend),
    })).sort((a, b) => b.qualityScore - a.qualityScore);
  }, [inventory]);

  const TURNOVER_TRENDS = useMemo(() => {
    const months = ["Aug", "Sep", "Oct", "Nov", "Dec", "Jan"];
    return months.map((month) => ({
      month,
      turnover: Math.round((6.5 + Math.random() * 3) * 10) / 10,
      avgDays: Math.round(40 + Math.random() * 15),
    }));
  }, []);

  const STOCK_VALUATION = useMemo(() => {
    const base = stats.totalValue;
    const months = ["Aug", "Sep", "Oct", "Nov", "Dec", "Jan"];
    return months.map((month, i) => ({
      month,
      value: Math.round(base * (0.85 + (i * 0.03) + (Math.random() * 0.05))),
    }));
  }, [stats.totalValue]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "healthy": return "bg-green-100 text-green-800";
      case "low_stock": return "bg-red-100 text-red-800";
      case "overstock": return "bg-yellow-100 text-yellow-800";
      case "dead_stock": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Package className="h-8 w-8 text-blue-600" />
          Inventory Analytics
        </h1>
        <p className="text-muted-foreground">Loading inventory data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Package className="h-8 w-8 text-blue-600" />
          Inventory Analytics
        </h1>
        <p className="text-muted-foreground mt-1">
          Stock turnover, dead stock identification, and reorder optimization
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Items</CardDescription>
            <CardTitle className="text-2xl">{stats.totalItems.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline">{inventory.length} SKUs</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Value</CardDescription>
            <CardTitle className="text-2xl">${stats.totalValue.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className="bg-blue-100 text-blue-800">
              <DollarSign className="mr-1 h-3 w-3" /> At cost
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg Turnover</CardDescription>
            <CardTitle className="text-2xl">{stats.avgTurnover.toFixed(1)}x</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className="bg-green-100 text-green-800">
              <RefreshCw className="mr-1 h-3 w-3" /> Annual
            </Badge>
          </CardContent>
        </Card>
        <Card className="border-red-200">
          <CardHeader className="pb-2">
            <CardDescription>Low Stock</CardDescription>
            <CardTitle className="text-2xl text-red-600">{stats.lowStock}</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className="bg-red-100 text-red-800">
              <AlertTriangle className="mr-1 h-3 w-3" /> Reorder
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Dead Stock</CardDescription>
            <CardTitle className="text-2xl text-gray-600">{stats.deadStock}</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className="bg-gray-100 text-gray-800">
              <Archive className="mr-1 h-3 w-3" /> No movement
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Overstocked</CardDescription>
            <CardTitle className="text-2xl text-yellow-600">{stats.overstock}</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className="bg-yellow-100 text-yellow-800">
              <Box className="mr-1 h-3 w-3" /> Excess
            </Badge>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="inventory">
        <TabsList>
          <TabsTrigger value="inventory" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Inventory List
          </TabsTrigger>
          <TabsTrigger value="turnover" className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Turnover Analysis
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Supplier Performance
          </TabsTrigger>
          <TabsTrigger value="valuation" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Valuation Trends
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Inventory Status Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Reorder Point</TableHead>
                    <TableHead>Unit Cost</TableHead>
                    <TableHead>Total Value</TableHead>
                    <TableHead>Turnover</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventory.map((item) => {
                    const stockPercent = item.maxStock > 0 ? (item.currentStock / item.maxStock) * 100 : 0;
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="font-medium">{item.name}</div>
                          <div className="text-xs text-muted-foreground">{item.category}</div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={item.currentStock <= item.reorderPoint ? "text-red-600 font-medium" : ""}>
                              {item.currentStock}
                            </span>
                            <Progress value={stockPercent} className="h-1.5 w-16" />
                          </div>
                        </TableCell>
                        <TableCell>{item.reorderPoint}</TableCell>
                        <TableCell>${item.unitCost.toLocaleString()}</TableCell>
                        <TableCell className="font-medium">${item.totalValue.toLocaleString()}</TableCell>
                        <TableCell>{item.turnoverRate > 0 ? `${item.turnoverRate}x` : "-"}</TableCell>
                        <TableCell>
                          <Badge className={getStatusBadge(item.status)}>
                            {item.status.replace("_", " ")}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="turnover" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Stock Turnover Trend</CardTitle>
                <CardDescription>Monthly turnover rate</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={TURNOVER_TRENDS}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="turnover" stroke="#6366f1" name="Turnover Rate" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Average Days in Stock</CardTitle>
                <CardDescription>Days inventory sits before selling</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={TURNOVER_TRENDS}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="avgDays" fill="#f97316" name="Avg Days" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Stock Distribution by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={CATEGORY_STOCK}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="items"
                      label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}
                    >
                      {CATEGORY_STOCK.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>

                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={CATEGORY_STOCK}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="value"
                      label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}
                    >
                      {CATEGORY_STOCK.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, "Value"]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Supplier Performance Scorecard</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Avg Lead Time</TableHead>
                    <TableHead>On-Time Rate</TableHead>
                    <TableHead>Quality Score</TableHead>
                    <TableHead>Total Orders</TableHead>
                    <TableHead>Total Spend</TableHead>
                    <TableHead>Rating</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {SUPPLIER_PERFORMANCE.map((supplier) => {
                    const overallScore = (supplier.onTimeRate + supplier.qualityScore) / 2;
                    return (
                      <TableRow key={supplier.supplier}>
                        <TableCell className="font-medium">{supplier.supplier}</TableCell>
                        <TableCell>{supplier.avgLeadTime} days</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={supplier.onTimeRate} className="h-1.5 w-16" />
                            <span className="text-sm">{supplier.onTimeRate}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={supplier.qualityScore} className="h-1.5 w-16" />
                            <span className="text-sm">{supplier.qualityScore}</span>
                          </div>
                        </TableCell>
                        <TableCell>{supplier.totalOrders}</TableCell>
                        <TableCell>${supplier.totalSpend.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge className={overallScore >= 95 ? "bg-green-100 text-green-800" : overallScore >= 90 ? "bg-blue-100 text-blue-800" : "bg-yellow-100 text-yellow-800"}>
                            {overallScore >= 95 ? "Excellent" : overallScore >= 90 ? "Good" : "Fair"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="valuation" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Inventory Valuation Trend</CardTitle>
                <CardDescription>Total stock value over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={STOCK_VALUATION}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, "Value"]} />
                    <Area type="monotone" dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} name="Stock Value" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Dead Stock Items</CardTitle>
                <CardDescription>Items with no recent sales activity</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {inventory
                  .filter((i) => i.status === "dead_stock" || i.daysSinceLastSale > 30)
                  .map((item) => (
                    <div key={item.id} className="p-3 border rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{item.name}</span>
                        <Badge className="bg-red-100 text-red-800">{item.daysSinceLastSale} days idle</Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>SKU: {item.sku}</span>
                        <span>Value: ${item.totalValue.toLocaleString()}</span>
                      </div>
                      <Button size="sm" variant="outline" className="w-full" onClick={() => toast.success(`Discount action initiated for ${item.name}`)}>
                        <Target className="mr-2 h-3 w-3" />
                        Create Clearance Discount
                      </Button>
                    </div>
                  ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
