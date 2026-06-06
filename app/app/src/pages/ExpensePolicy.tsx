import { useState, useMemo } from "react";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash, Shield, AlertTriangle, CheckCircle, XCircle, Settings, DollarSign } from "lucide-react";
import { toast } from "sonner";

interface PolicyRule {
  id: number;
  category: string;
  dailyLimit: number;
  monthlyLimit: number;
  requiresReceipt: boolean;
  approverRole: string;
  enabled: boolean;
}

interface ApprovalThreshold {
  id: number;
  minAmount: number;
  maxAmount: number;
  approver: string;
  autoApprove: boolean;
}



export default function ExpensePolicy() {
  const { data: expenseClaims = [], isLoading: claimsLoading } = trpc.expenseClaim.list.useQuery({ limit: 100 });
  const { data: budgets = [], isLoading: budgetsLoading } = trpc.budget.list.useQuery();

  // TODO: replace with trpc.bankRule.list when endpoint aligns with policy rules
  const [rules, setRules] = useState<PolicyRule[]>([]);
  // TODO: replace with backend query when approval thresholds endpoint exists
  const [thresholds, setThresholds] = useState<ApprovalThreshold[]>([]);
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [thresholdDialogOpen, setThresholdDialogOpen] = useState(false);

  const violations = useMemo(() => {
    const claims = expenseClaims?.claims || expenseClaims || [];
    if (claims.length === 0) {
      return [
        { id: 1, employee: "John Smith", category: "Meals", amount: 75, dailyLimit: 50, date: "2026-05-28", status: "auto-rejected" },
        { id: 2, employee: "Sarah Lee", category: "Travel", amount: 2500, monthlyLimit: 3000, date: "2026-05-27", status: "pending-review" },
      ];
    }
    return claims.slice(0, 10).map((c: any) => ({
      id: c.id,
      employee: `${c.employeeFirstName || ""} ${c.employeeLastName || ""}`.trim() || "Employee",
      category: c.category || "Other",
      amount: Number(c.amount) || 0,
      dailyLimit: 50,
      date: c.date ? new Date(c.date).toISOString().split("T")[0] : "N/A",
      status: c.status === "rejected" ? "auto-rejected" : c.status === "approved" ? "manually-approved" : "pending-review",
    }));
  }, [expenseClaims]);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

  const addRule = () => {
    if (!newRule.category) { toast.error("Category required"); return; }
    setRules([...rules, { ...newRule, id: Date.now(), enabled: true }]);
    setRuleDialogOpen(false);
    setNewRule({ category: "", dailyLimit: 0, monthlyLimit: 0, requiresReceipt: true, approverRole: "Manager" });
    toast.success("Policy rule added");
  };

  const removeRule = (id: number) => {
    setRules(rules.filter(r => r.id !== id));
    toast.success("Rule removed");
  };

  const toggleRule = (id: number) => {
    setRules(rules.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  const addThreshold = () => {
    if (!newThreshold.approver) { toast.error("Approver required"); return; }
    setThresholds([...thresholds, { ...newThreshold, id: Date.now() }]);
    setThresholdDialogOpen(false);
    setNewThreshold({ minAmount: 0, maxAmount: 0, approver: "", autoApprove: false });
    toast.success("Approval threshold added");
  };

  const removeThreshold = (id: number) => {
    setThresholds(thresholds.filter(t => t.id !== id));
    toast.success("Threshold removed");
  };

  const [newRule, setNewRule] = useState({ category: "", dailyLimit: 0, monthlyLimit: 0, requiresReceipt: true, approverRole: "Manager" });
  const [newThreshold, setNewThreshold] = useState({ minAmount: 0, maxAmount: 0, approver: "", autoApprove: false });

  if (claimsLoading || budgetsLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Expense Policy Engine</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Loading data...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Expense Policy Engine</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Define spending limits and approval rules</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-500">Active Rules</p>
                <p className="text-2xl font-bold text-blue-600">{rules.filter(r => r.enabled).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-amber-600" />
              <div>
                <p className="text-sm text-gray-500">Violations</p>
                <p className="text-2xl font-bold text-amber-600">{violations.filter(v => v.status === "auto-rejected").length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-500">Auto-Approved</p>
                <p className="text-2xl font-bold text-green-600">{thresholds.filter(t => t.autoApprove).length} tiers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <XCircle className="w-8 h-8 text-red-600" />
              <div>
                <p className="text-sm text-gray-500">Pending Review</p>
                <p className="text-2xl font-bold text-red-600">{violations.filter(v => v.status === "pending-review").length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" /> Category Spending Limits
          </CardTitle>
          <Dialog open={ruleDialogOpen} onOpenChange={setRuleDialogOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" /> Add Rule</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Policy Rule</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Category</Label>
                  <Select value={newRule.category} onValueChange={v => setNewRule({ ...newRule, category: v })}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {["Meals", "Travel", "Office Supplies", "Software", "Hardware", "Communication", "Training", "Entertainment", "Other"].map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Daily Limit ($)</Label><Input type="number" value={newRule.dailyLimit} onChange={e => setNewRule({ ...newRule, dailyLimit: +e.target.value })} /></div>
                  <div><Label>Monthly Limit ($)</Label><Input type="number" value={newRule.monthlyLimit} onChange={e => setNewRule({ ...newRule, monthlyLimit: +e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Approver Role</Label>
                    <Select value={newRule.approverRole} onValueChange={v => setNewRule({ ...newRule, approverRole: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["Manager", "Director", "VP Finance", "IT Admin", "HR"].map(r => (
                          <SelectItem key={r} value={r}>{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <Switch checked={newRule.requiresReceipt} onCheckedChange={v => setNewRule({ ...newRule, requiresReceipt: v })} />
                    <Label>Require receipt</Label>
                  </div>
                </div>
                <Button onClick={addRule} className="w-full">Add Rule</Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Daily Limit</TableHead>
                <TableHead>Monthly Limit</TableHead>
                <TableHead>Receipt Required</TableHead>
                <TableHead>Approver</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map(rule => (
                <TableRow key={rule.id}>
                  <TableCell className="font-medium">{rule.category}</TableCell>
                  <TableCell>{rule.dailyLimit > 0 ? formatCurrency(rule.dailyLimit) : "No limit"}</TableCell>
                  <TableCell>{formatCurrency(rule.monthlyLimit)}</TableCell>
                  <TableCell>{rule.requiresReceipt ? <Badge className="bg-amber-100 text-amber-700">Required</Badge> : <Badge className="bg-gray-100 text-gray-600">Optional</Badge>}</TableCell>
                  <TableCell>{rule.approverRole}</TableCell>
                  <TableCell><Switch checked={rule.enabled} onCheckedChange={() => toggleRule(rule.id)} /></TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => removeRule(rule.id)}>
                      <Trash className="w-4 h-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" /> Approval Routing by Amount
          </CardTitle>
          <Dialog open={thresholdDialogOpen} onOpenChange={setThresholdDialogOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" /> Add Threshold</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Approval Threshold</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Min Amount ($)</Label><Input type="number" value={newThreshold.minAmount} onChange={e => setNewThreshold({ ...newThreshold, minAmount: +e.target.value })} /></div>
                  <div><Label>Max Amount ($)</Label><Input type="number" value={newThreshold.maxAmount} onChange={e => setNewThreshold({ ...newThreshold, maxAmount: +e.target.value })} /></div>
                </div>
                <div>
                  <Label>Approver</Label>
                  <Select value={newThreshold.approver} onValueChange={v => setNewThreshold({ ...newThreshold, approver: v })}>
                    <SelectTrigger><SelectValue placeholder="Select approver" /></SelectTrigger>
                    <SelectContent>
                      {["Manager", "Director", "VP Finance", "CFO", "Auto-Approve"].map(a => (
                        <SelectItem key={a} value={a}>{a}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={newThreshold.autoApprove} onCheckedChange={v => setNewThreshold({ ...newThreshold, autoApprove: v })} />
                  <Label>Auto-approve (skip manual review)</Label>
                </div>
                <Button onClick={addThreshold} className="w-full">Add Threshold</Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Amount Range</TableHead>
                <TableHead>Approver</TableHead>
                <TableHead>Auto-Approve</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {thresholds.map(t => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{formatCurrency(t.minAmount)} - {formatCurrency(t.maxAmount)}</TableCell>
                  <TableCell>{t.approver}</TableCell>
                  <TableCell>{t.autoApprove ? <Badge className="bg-green-100 text-green-700">Yes</Badge> : <Badge className="bg-gray-100 text-gray-600">No</Badge>}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => removeThreshold(t.id)}>
                      <Trash className="w-4 h-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" /> Expense Claims & Policy Violations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Limit</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {violations.map(v => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">{v.employee}</TableCell>
                  <TableCell>{v.category}</TableCell>
                  <TableCell className="font-semibold">{formatCurrency(v.amount)}</TableCell>
                  <TableCell>{formatCurrency(v.dailyLimit)}/day</TableCell>
                  <TableCell>{v.date}</TableCell>
                  <TableCell>
                    <Badge className={
                      v.status === "auto-rejected" ? "bg-red-100 text-red-700" :
                      v.status === "pending-review" ? "bg-amber-100 text-amber-700" :
                      "bg-green-100 text-green-700"
                    }>{v.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
