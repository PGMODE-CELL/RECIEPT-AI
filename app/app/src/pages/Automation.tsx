import { useState, useEffect } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
import { toast } from "sonner";
import {
  Plus,
  Zap,
  History,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  Edit,
} from "lucide-react";

type RuleType = "reminder" | "categorization" | "reconciliation";

interface AutomationRule {
  id: string;
  name: string;
  type: RuleType;
  enabled: boolean;
  trigger: string;
  action: string;
  createdAt: string;
  executions: number;
}

interface ExecutionLog {
  id: string;
  ruleId: string;
  ruleName: string;
  status: "success" | "failed" | "skipped";
  message: string;
  executedAt: string;
}

// TODO: Replace with backend endpoint when available

const ruleTypeLabels: Record<RuleType, string> = {
  reminder: "Reminder",
  categorization: "Categorization",
  reconciliation: "Reconciliation",
};

const ruleTypeBadgeVariant: Record<RuleType, "default" | "secondary" | "destructive" | "outline"> = {
  reminder: "default",
  categorization: "secondary",
  reconciliation: "outline",
};

export default function Automation() {
  const { data: rulesData = [], isLoading } = trpc.bankRule.list.useQuery();
  const [rules, setRules] = useState<AutomationRule[]>([]);
  // TODO: Replace with backend endpoint when available
  const [logs] = useState<ExecutionLog[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  useEffect(() => {
    if (rulesData.length > 0) {
      setRules(rulesData as AutomationRule[]);
    }
  }, [rulesData]);
  const [activeTab, setActiveTab] = useState<"rules" | "history">("rules");

  const [newRule, setNewRule] = useState({
    name: "",
    type: "reminder" as RuleType,
    trigger: "",
    action: "",
  });

  const handleToggleRule = (id: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
    toast.success("Rule updated successfully");
  };

  const handleDeleteRule = (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
    toast.success("Rule deleted successfully");
  };

  const handleCreateRule = () => {
    if (!newRule.name || !newRule.trigger || !newRule.action) {
      toast.error("Please fill in all fields");
      return;
    }
    const rule: AutomationRule = {
      id: String(Date.now()),
      name: newRule.name,
      type: newRule.type,
      enabled: true,
      trigger: newRule.trigger,
      action: newRule.action,
      createdAt: new Date().toISOString().split("T")[0],
      executions: 0,
    };
    setRules((prev) => [...prev, rule]);
    setCreateDialogOpen(false);
    setNewRule({ name: "", type: "reminder", trigger: "", action: "" });
    toast.success("Rule created successfully");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Automation</h1>
          <p className="text-muted-foreground">
            Manage automated rules for reminders, categorization, and
            reconciliation.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={activeTab === "rules" ? "default" : "outline"}
            onClick={() => setActiveTab("rules")}
          >
            <Zap className="mr-2 h-4 w-4" />
            Rules ({rules.length})
          </Button>
          <Button
            variant={activeTab === "history" ? "default" : "outline"}
            onClick={() => setActiveTab("history")}
          >
            <History className="mr-2 h-4 w-4" />
            Execution Log
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Rules</CardDescription>
            <CardTitle className="text-2xl">
              {rules.filter((r) => r.enabled).length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Executions</CardDescription>
            <CardTitle className="text-2xl">
              {rules.reduce((sum, r) => sum + r.executions, 0)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Success Rate</CardDescription>
            <CardTitle className="text-2xl">
              {(
                (logs.filter((l) => l.status === "success").length /
                  logs.length) *
                100
              ).toFixed(1)}
              %
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {activeTab === "rules" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Automation Rules</CardTitle>
              <CardDescription>
                Configure triggers and actions for your automated workflows.
              </CardDescription>
            </div>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New Rule
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Automation Rule</DialogTitle>
                  <DialogDescription>
                    Define a new rule to automate your workflows.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="rule-name">Rule Name</Label>
                    <Input
                      id="rule-name"
                      placeholder="e.g., Overdue Invoice Reminder"
                      value={newRule.name}
                      onChange={(e) =>
                        setNewRule((prev) => ({ ...prev, name: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Rule Type</Label>
                    <Select
                      value={newRule.type}
                      onValueChange={(value: RuleType) =>
                        setNewRule((prev) => ({ ...prev, type: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="reminder">Reminder</SelectItem>
                        <SelectItem value="categorization">
                          Categorization
                        </SelectItem>
                        <SelectItem value="reconciliation">
                          Reconciliation
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rule-trigger">Trigger Condition</Label>
                    <Input
                      id="rule-trigger"
                      placeholder={
                        newRule.type === "reminder"
                          ? "e.g., Invoice overdue > 7 days"
                          : newRule.type === "categorization"
                          ? "e.g., Description contains 'uber'"
                          : "e.g., Amount matches within 3 days"
                      }
                      value={newRule.trigger}
                      onChange={(e) =>
                        setNewRule((prev) => ({
                          ...prev,
                          trigger: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rule-action">Action</Label>
                    <Input
                      id="rule-action"
                      placeholder={
                        newRule.type === "reminder"
                          ? "e.g., Send email reminder"
                          : newRule.type === "categorization"
                          ? "e.g., Set category to Travel"
                          : "e.g., Auto-reconcile transaction"
                      }
                      value={newRule.action}
                      onChange={(e) =>
                        setNewRule((prev) => ({
                          ...prev,
                          action: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleCreateRule}>Create Rule</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Executions</TableHead>
                  <TableHead className="text-right">Enabled</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-medium">{rule.name}</TableCell>
                    <TableCell>
                      <Badge variant={ruleTypeBadgeVariant[rule.type]}>
                        {ruleTypeLabels[rule.type]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {rule.trigger}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <ArrowRight className="h-3 w-3" />
                        {rule.action}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{rule.executions}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Switch
                        checked={rule.enabled}
                        onCheckedChange={() => handleToggleRule(rule.id)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteRule(rule.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {activeTab === "history" && (
        <Card>
          <CardHeader>
            <CardTitle>Execution History</CardTitle>
            <CardDescription>
              Recent automation rule executions and their outcomes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rule</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Executed At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">
                      {log.ruleName}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          log.status === "success"
                            ? "default"
                            : log.status === "failed"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {log.status === "success" && (
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                        )}
                        {log.status === "failed" && (
                          <XCircle className="mr-1 h-3 w-3" />
                        )}
                        {log.status === "skipped" && (
                          <Clock className="mr-1 h-3 w-3" />
                        )}
                        {log.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {log.message}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {log.executedAt}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
