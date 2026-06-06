import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

interface CostCenter {
  id: string;
  name: string;
  code: string;
  budget: number;
  spent: number;
  department: string;
}

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  costCenterId: string;
}

// TODO: Replace with backend endpoint when available

export default function CostCenters() {
  // TODO: Replace with backend endpoint when available
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  // TODO: Replace with backend endpoint when available
  const [transactions] = useState<Transaction[]>([]);
  const [selectedCenter, setSelectedCenter] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCenter, setEditingCenter] = useState<CostCenter | null>(null);
  const [formData, setFormData] = useState({ name: "", code: "", budget: "", department: "" });

  const getUsagePercent = (center: CostCenter) => Math.min(Math.round((center.spent / center.budget) * 100), 100);

  const getUsageColor = (percent: number) => {
    if (percent < 70) return "bg-green-500";
    if (percent < 90) return "bg-yellow-500";
    return "bg-red-500";
  };

  const openCreate = () => {
    setEditingCenter(null);
    setFormData({ name: "", code: "", budget: "", department: "" });
    setDialogOpen(true);
  };

  const openEdit = (center: CostCenter) => {
    setEditingCenter(center);
    setFormData({ name: center.name, code: center.code, budget: center.budget.toString(), department: center.department });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.code || !formData.budget) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (editingCenter) {
      setCostCenters((prev) =>
        prev.map((c) =>
          c.id === editingCenter.id
            ? { ...c, name: formData.name, code: formData.code, budget: Number(formData.budget), department: formData.department }
            : c
        )
      );
      toast.success("Cost center updated");
    } else {
      const newCenter: CostCenter = {
        id: Date.now().toString(),
        name: formData.name,
        code: formData.code,
        budget: Number(formData.budget),
        spent: 0,
        department: formData.department,
      };
      setCostCenters((prev) => [...prev, newCenter]);
      toast.success("Cost center created");
    }
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    setCostCenters((prev) => prev.filter((c) => c.id !== id));
    toast.success("Cost center deleted");
  };

  const totalBudget = costCenters.reduce((sum, c) => sum + c.budget, 0);
  const totalSpent = costCenters.reduce((sum, c) => sum + c.spent, 0);
  const selectedTransactions = selectedCenter ? transactions.filter((t) => t.costCenterId === selectedCenter) : [];
  const selectedCenterData = selectedCenter ? costCenters.find((c) => c.id === selectedCenter) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Cost Centers</h1>
        <Button onClick={openCreate}>Create Cost Center</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalBudget.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Spent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalSpent.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Remaining</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">₹{(totalBudget - totalSpent).toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Budget vs Actual Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Department</TableHead>
                <TableHead className="text-right">Budget</TableHead>
                <TableHead className="text-right">Spent</TableHead>
                <TableHead className="text-right">Remaining</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {costCenters.map((center) => {
                const percent = getUsagePercent(center);
                const remaining = center.budget - center.spent;
                return (
                  <TableRow
                    key={center.id}
                    className={selectedCenter === center.id ? "bg-muted/50" : ""}
                  >
                    <TableCell><Badge variant="outline">{center.code}</Badge></TableCell>
                    <TableCell className="font-medium">{center.name}</TableCell>
                    <TableCell>{center.department}</TableCell>
                    <TableCell className="text-right">₹{center.budget.toLocaleString()}</TableCell>
                    <TableCell className="text-right">₹{center.spent.toLocaleString()}</TableCell>
                    <TableCell className={`text-right font-medium ${remaining < 0 ? "text-red-600" : "text-green-600"}`}>
                      ₹{remaining.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={percent} className="h-2 w-24" />
                        <span className="text-xs text-muted-foreground">{percent}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setSelectedCenter(center.id)}>
                          Drill Down
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => openEdit(center)}>
                          Edit
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(center.id)}>
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedCenter && selectedCenterData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Transactions: {selectedCenterData.name}</span>
              <Button variant="ghost" size="sm" onClick={() => setSelectedCenter(null)}>
                Close
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedTransactions.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No transactions found</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>{tx.date}</TableCell>
                      <TableCell>{tx.description}</TableCell>
                      <TableCell><Badge variant="secondary">{tx.category}</Badge></TableCell>
                      <TableCell className="text-right font-medium">₹{tx.amount.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg p-6 w-full max-w-md space-y-4">
            <h2 className="text-lg font-bold">{editingCenter ? "Edit Cost Center" : "Create Cost Center"}</h2>
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} placeholder="e.g., Marketing" />
              </div>
              <div>
                <Label>Code</Label>
                <Input value={formData.code} onChange={(e) => setFormData((p) => ({ ...p, code: e.target.value }))} placeholder="e.g., MKT-001" />
              </div>
              <div>
                <Label>Budget (₹)</Label>
                <Input type="number" value={formData.budget} onChange={(e) => setFormData((p) => ({ ...p, budget: e.target.value }))} placeholder="500000" />
              </div>
              <div>
                <Label>Department</Label>
                <Input value={formData.department} onChange={(e) => setFormData((p) => ({ ...p, department: e.target.value }))} placeholder="e.g., Marketing" />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSave}>{editingCenter ? "Update" : "Create"}</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
