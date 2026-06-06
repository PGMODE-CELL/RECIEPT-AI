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
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  Trash,
  Search,
  Zap,
  ArrowUpDown,
  ToggleLeft,
} from "lucide-react";
import { toast } from "sonner";

interface BankRule {
  id: number;
  name: string;
  matchType: "contains" | "exact" | "regex" | "amount";
  matchValue: string;
  action: "categorize" | "assign_account" | "skip";
  actionValue: string;
  priority: number;
  enabled: boolean;
  lastTriggered: string | null;
  matchCount: number;
}

export default function BankRules() {
  const { data: rules = [], isLoading, refetch } = trpc.bankRule.list.useQuery();
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const [newRule, setNewRule] = useState({
    name: "",
    matchType: "contains",
    matchValue: "",
    action: "categorize",
    actionValue: "",
  });

  const createRule = trpc.bankRule.create.useMutation({
    onSuccess: () => {
      setOpen(false);
      refetch();
      toast.success("Rule created");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteRule = trpc.bankRule.delete.useMutation({
    onSuccess: () => {
      setDeleteId(null);
      refetch();
      toast.success("Rule deleted");
    },
    onError: (e) => toast.error(e.message),
  });

  const filtered = rules.filter(
    (r) =>
      !search ||
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.matchValue.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = () => {
    if (!newRule.name || !newRule.matchValue) {
      toast.error("Name and match value are required");
      return;
    }
    createRule.mutate(newRule as any);
    setNewRule({
      name: "",
      matchType: "contains",
      matchValue: "",
      action: "categorize",
      actionValue: "",
    });
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteRule.mutate({ id: deleteId });
    }
  };

  const activeCount = rules.filter((r) => r.enabled).length;
  const totalMatches = rules.reduce((s, r) => s + r.matchCount, 0);

  const matchTypeLabels: Record<string, string> = {
    contains: "Contains",
    exact: "Exact Match",
    regex: "Regex",
    amount: "Amount Match",
  };

  const actionLabels: Record<string, string> = {
    categorize: "Categorize",
    assign_account: "Assign Account",
    skip: "Skip",
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Bank Rules
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Auto-categorize bank transactions with matching rules
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" /> New Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Bank Rule</DialogTitle>
              <DialogDescription>
                Define a rule to automatically categorize bank transactions.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Rule Name *</Label>
                <Input
                  placeholder="Uber Charges"
                  value={newRule.name}
                  onChange={(e) =>
                    setNewRule((p) => ({ ...p, name: e.target.value }))
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Match Type</Label>
                  <Select
                    value={newRule.matchType}
                    onValueChange={(v) =>
                      setNewRule((p) => ({ ...p, matchType: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contains">Contains</SelectItem>
                      <SelectItem value="exact">Exact Match</SelectItem>
                      <SelectItem value="regex">Regex</SelectItem>
                      <SelectItem value="amount">Amount Match</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Match Value *</Label>
                  <Input
                    placeholder={
                      newRule.matchType === "amount"
                        ? "25000.00"
                        : newRule.matchType === "regex"
                        ? "PAYROLL\\s+\\w+"
                        : "uber"
                    }
                    value={newRule.matchValue}
                    onChange={(e) =>
                      setNewRule((p) => ({ ...p, matchValue: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Action</Label>
                  <Select
                    value={newRule.action}
                    onValueChange={(v) =>
                      setNewRule((p) => ({ ...p, action: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="categorize">Categorize</SelectItem>
                      <SelectItem value="assign_account">Assign Account</SelectItem>
                      <SelectItem value="skip">Skip</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Category / Account</Label>
                  <Input
                    placeholder="Travel - Transportation"
                    value={newRule.actionValue}
                    onChange={(e) =>
                      setNewRule((p) => ({ ...p, actionValue: e.target.value }))
                    }
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate}>Create Rule</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Rules</p>
                <p className="text-2xl font-bold">{activeCount}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
                <Zap className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Matches</p>
                <p className="text-2xl font-bold">{totalMatches}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-50 flex items-center justify-center">
                <ArrowUpDown className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Disabled Rules</p>
                <p className="text-2xl font-bold text-gray-400">
                  {rules.length - activeCount}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-gray-50 flex items-center justify-center">
                <ToggleLeft className="w-6 h-6 text-gray-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rules Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Bank Rules</CardTitle>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search rules..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">Order</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Match Type</TableHead>
                <TableHead>Match Value</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Action Value</TableHead>
                <TableHead className="text-right">Matches</TableHead>
                <TableHead className="text-right">Enabled</TableHead>
                <TableHead className="w-[40px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={9} className="text-center py-8">Loading...</TableCell></TableRow>}
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-sm text-gray-400">
                    {r.priority}
                  </TableCell>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{matchTypeLabels[r.matchType]}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{r.matchValue}</TableCell>
                  <TableCell>{actionLabels[r.action]}</TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {r.actionValue || "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary">{r.matchCount}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Switch checked={r.enabled} />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteId(r.id)}
                    >
                      <Trash className="w-4 h-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                    No rules found
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
            <DialogTitle>Delete Rule</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this bank rule?
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
