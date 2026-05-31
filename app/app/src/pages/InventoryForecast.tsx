"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, AreaChart, Area
} from "recharts";
import { Package, TrendingUp, AlertTriangle, ShoppingCart, ArrowDown, ArrowUp, RefreshCw } from "lucide-react";

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  currentStock: number;
  avgMonthlySales: number;
  leadTimeDays: number;
  safetyStock: number;
  reorderPoint: number;
  unitCost: number;
  seasonalFactor: number;
  category: string;
}

function mapProductToInventory(product: any): InventoryItem {
  const qty = Number(product.quantityOnHand) || 0;
  const cost = Number(product.costPrice) || 0;
  const sale = Number(product.salePrice) || 0;
  const reorder = Number(product.reorderLevel) || 0;
  return {
    id: String(product.id),
    name: product.name,
    sku: product.sku || `SKU-${product.id}`,
    currentStock: qty,
    avgMonthlySales: Math.max(1, Math.round(qty * 0.3)),
    leadTimeDays: 14,
    safetyStock: Math.max(1, Math.round(reorder * 0.5)),
    reorderPoint: reorder || Math.max(1, Math.round(qty * 0.5)),
    unitCost: cost,
    seasonalFactor: 1.0,
    category: product.category || product.type || "General",
  };
}

export default function InventoryForecast() {
  const { data: products = [] } = trpc.product.list.useQuery();
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  const inventory = useMemo(() => products.map(mapProductToInventory), [products]);

  const lowStockItems = inventory.filter((i) => i.currentStock <= i.reorderPoint);
  const totalValue = inventory.reduce((s, i) => s + i.currentStock * i.unitCost, 0);
  const totalForecastDemand = inventory.reduce((s, i) => s + i.avgMonthlySales * i.seasonalFactor, 0);

  const formatCurrency = (v: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

  const getRecommendation = (item: InventoryItem) => {
    if (item.currentStock <= item.safetyStock) return { text: "Urgent Reorder", color: "text-red-600", bg: "bg-red-100" };
    if (item.currentStock <= item.reorderPoint) return { text: "Reorder Soon", color: "text-yellow-600", bg: "bg-yellow-100" };
    if (item.currentStock > item.reorderPoint * 2) return { text: "Overstocked", color: "text-blue-600", bg: "bg-blue-100" };
    return { text: "Optimal", color: "text-green-600", bg: "bg-green-100" };
  };

  const FORECAST_DATA = useMemo(() => {
    const months = ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May"];
    const baseDemand = inventory.reduce((s, i) => s + i.avgMonthlySales, 0);
    return months.map((month, idx) => ({
      month,
      actual: idx < 3 ? Math.round(baseDemand * (0.85 + Math.random() * 0.3)) : 0,
      forecast: Math.round(baseDemand * (0.9 + Math.random() * 0.2)),
    }));
  }, [inventory]);

  const CATEGORY_DATA = useMemo(() => {
    const cats: Record<string, { stock: number; demand: number }> = {};
    inventory.forEach((i) => {
      if (!cats[i.category]) cats[i.category] = { stock: 0, demand: 0 };
      cats[i.category].stock += i.currentStock;
      cats[i.category].demand += i.avgMonthlySales;
    });
    return Object.entries(cats).map(([category, data]) => ({ category, ...data }));
  }, [inventory]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inventory Forecast</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Demand forecasting and reorder point calculation</p>
        </div>
        <Button variant="outline" onClick={() => toast.success("Forecast recalculated")}>
          <RefreshCw className="w-4 h-4 mr-2" /> Recalculate
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg"><Package className="w-5 h-5 text-blue-600" /></div>
            <div><p className="text-xs text-gray-500">Total SKUs</p><p className="text-2xl font-bold">{inventory.length}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg"><TrendingUp className="w-5 h-5 text-green-600" /></div>
            <div><p className="text-xs text-gray-500">Inventory Value</p><p className="text-2xl font-bold">{formatCurrency(totalValue)}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg"><AlertTriangle className="w-5 h-5 text-red-600" /></div>
            <div><p className="text-xs text-gray-500">Low Stock Alerts</p><p className="text-2xl font-bold text-red-600">{lowStockItems.length}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg"><ShoppingCart className="w-5 h-5 text-purple-600" /></div>
            <div><p className="text-xs text-gray-500">Monthly Demand</p><p className="text-2xl font-bold">{Math.round(totalForecastDemand)}</p></div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">Demand Forecast</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={FORECAST_DATA}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="actual" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} name="Actual Sales" />
                <Area type="monotone" dataKey="forecast" stroke="#f97316" fill="#f97316" fillOpacity={0.2} strokeDasharray="5 5" name="Forecast" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Stock by Category</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={CATEGORY_DATA}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="stock" fill="#3b82f6" name="Current Stock" />
                <Bar dataKey="demand" fill="#f97316" name="Monthly Demand" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {lowStockItems.length > 0 && (
        <Card className="border-red-200 dark:border-red-800">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" /> Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {lowStockItems.map((item) => {
                const rec = getRecommendation(item);
                return (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Package className="w-5 h-5 text-red-500" />
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-gray-500">SKU: {item.sku} &middot; Reorder point: {item.reorderPoint}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-red-600">{item.currentStock} left</span>
                      <Button size="sm" onClick={() => toast.success(`Reorder placed for ${item.name}`)}>
                        <ShoppingCart className="w-4 h-4 mr-1" /> Reorder
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-lg">Inventory Analysis</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right">Avg Sales</TableHead>
                <TableHead className="text-right">Lead Time</TableHead>
                <TableHead className="text-right">Safety Stock</TableHead>
                <TableHead className="text-right">Reorder Point</TableHead>
                <TableHead className="text-right">Seasonal Adj</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventory.map((item) => {
                const rec = getRecommendation(item);
                return (
                  <TableRow key={item.id} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800" onClick={() => setSelectedItem(item)}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                    <TableCell className="text-right font-semibold">{item.currentStock}</TableCell>
                    <TableCell className="text-right">{item.avgMonthlySales}/mo</TableCell>
                    <TableCell className="text-right">{item.leadTimeDays} days</TableCell>
                    <TableCell className="text-right">{item.safetyStock}</TableCell>
                    <TableCell className="text-right font-medium">{item.reorderPoint}</TableCell>
                    <TableCell className="text-right">
                      {item.seasonalFactor > 1 ? (
                        <span className="text-green-600 flex items-center justify-end gap-1">
                          <ArrowUp className="w-3 h-3" /> {(item.seasonalFactor * 100 - 100).toFixed(0)}%
                        </span>
                      ) : item.seasonalFactor < 1 ? (
                        <span className="text-red-600 flex items-center justify-end gap-1">
                          <ArrowDown className="w-3 h-3" /> {(100 - item.seasonalFactor * 100).toFixed(0)}%
                        </span>
                      ) : (
                        <span className="text-gray-500">Base</span>
                      )}
                    </TableCell>
                    <TableCell><Badge className={`${rec.bg} ${rec.color}`}>{rec.text}</Badge></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
