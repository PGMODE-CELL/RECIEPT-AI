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
  Globe,
  Percent,
  MapPin,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

interface TaxRule {
  id: number;
  jurisdiction: string;
  jurisdictionType: "federal" | "state" | "county" | "city" | "country";
  taxType: "sales" | "vat" | "gst" | "withholding" | "excise";
  rate: number;
  appliesTo: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
}

const mockRules: TaxRule[] = []

export default function TaxRules() {
  const [rules] = useState<TaxRule[]>(mockRules);
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterJurisdiction, setFilterJurisdiction] = useState("all");

  const [newRule, setNewRule] = useState({
    jurisdiction: "",
    jurisdictionType: "state",
    taxType: "sales",
    rate: "",
    appliesTo: "",
    effectiveFrom: "",
  });

  const filtered = rules.filter(
    (r) =>
      (!search ||
        r.jurisdiction.toLowerCase().includes(search.toLowerCase()) ||
        r.appliesTo.toLowerCase().includes(search.toLowerCase())) &&
      (filterType === "all" || r.taxType === filterType) &&
      (filterJurisdiction === "all" || r.jurisdictionType === filterJurisdiction)
  );

  const handleCreate = () => {
    if (!newRule.jurisdiction || !newRule.rate) {
      toast.error("Jurisdiction and rate are required");
      return;
    }
    toast.success("Tax rule created");
    setOpen(false);
    setNewRule({
      jurisdiction: "",
      jurisdictionType: "state",
      taxType: "sales",
      rate: "",
      appliesTo: "",
      effectiveFrom: "",
    });
  };

  const handleDelete = () => {
    if (deleteId) {
      toast.success("Tax rule deleted");
      setDeleteId(null);
    }
  };

  const activeCount = rules.filter((r) => r.isActive).length;
  const uniqueJurisdictions = new Set(rules.map((r) => r.jurisdiction)).size;

  const jurisdictionTypeLabels: Record<string, string> = {
    federal: "Federal",
    state: "State",
    county: "County",
    city: "City",
    country: "Country",
  };

  const taxTypeLabels: Record<string, string> = {
    sales: "Sales Tax",
    vat: "VAT",
    gst: "GST",
    withholding: "Withholding",
    excise: "Excise",
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Tax Rules
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure tax rules per jurisdiction and tax type
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" /> New Tax Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Tax Rule</DialogTitle>
              <DialogDescription>
                Define a tax rule for a specific jurisdiction and tax type.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Jurisdiction *</Label>
                  <Input
                    placeholder="California"
                    value={newRule.jurisdiction}
                    onChange={(e) =>
                      setNewRule((p) => ({ ...p, jurisdiction: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Jurisdiction Type</Label>
                  <Select
                    value={newRule.jurisdictionType}
                    onValueChange={(v) =>
                      setNewRule((p) => ({ ...p, jurisdictionType: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="federal">Federal</SelectItem>
                      <SelectItem value="state">State</SelectItem>
                      <SelectItem value="county">County</SelectItem>
                      <SelectItem value="city">City</SelectItem>
                      <SelectItem value="country">Country</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tax Type</Label>
                  <Select
                    value={newRule.taxType}
                    onValueChange={(v) =>
                      setNewRule((p) => ({ ...p, taxType: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sales">Sales Tax</SelectItem>
                      <SelectItem value="vat">VAT</SelectItem>
                      <SelectItem value="gst">GST</SelectItem>
                      <SelectItem value="withholding">Withholding</SelectItem>
                      <SelectItem value="excise">Excise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Rate (%) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="7.25"
                    value={newRule.rate}
                    onChange={(e) =>
                      setNewRule((p) => ({ ...p, rate: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Applies To</Label>
                <Input
                  placeholder="Tangible personal property"
                  value={newRule.appliesTo}
                  onChange={(e) =>
                    setNewRule((p) => ({ ...p, appliesTo: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Effective From</Label>
                <Input
                  type="date"
                  value={newRule.effectiveFrom}
                  onChange={(e) =>
                    setNewRule((p) => ({ ...p, effectiveFrom: e.target.value }))
                  }
                />
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
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Rules</p>
                <p className="text-2xl font-bold">{rules.length}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
                <Globe className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Rules</p>
                <p className="text-2xl font-bold text-green-600">{activeCount}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-50 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Jurisdictions</p>
                <p className="text-2xl font-bold">{uniqueJurisdictions}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-purple-50 flex items-center justify-center">
                <MapPin className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Tax Types</p>
                <p className="text-2xl font-bold">
                  {new Set(rules.map((r) => r.taxType)).size}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-amber-50 flex items-center justify-center">
                <Percent className="w-6 h-6 text-amber-600" />
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
                placeholder="Search jurisdictions..."
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
                <SelectItem value="all">All Tax Types</SelectItem>
                <SelectItem value="sales">Sales Tax</SelectItem>
                <SelectItem value="vat">VAT</SelectItem>
                <SelectItem value="gst">GST</SelectItem>
                <SelectItem value="withholding">Withholding</SelectItem>
                <SelectItem value="excise">Excise</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filterJurisdiction}
              onValueChange={setFilterJurisdiction}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Jurisdiction Types</SelectItem>
                <SelectItem value="federal">Federal</SelectItem>
                <SelectItem value="state">State</SelectItem>
                <SelectItem value="county">County</SelectItem>
                <SelectItem value="city">City</SelectItem>
                <SelectItem value="country">Country</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Rules Table */}
      <Card>
        <CardHeader>
          <CardTitle>Tax Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Jurisdiction</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Tax Type</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead>Applies To</TableHead>
                <TableHead>Effective From</TableHead>
                <TableHead>Effective To</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[40px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.jurisdiction}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {jurisdictionTypeLabels[r.jurisdictionType]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{taxTypeLabels[r.taxType]}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {r.rate.toFixed(2)}%
                  </TableCell>
                  <TableCell className="text-sm text-gray-500 max-w-[200px] truncate">
                    {r.appliesTo}
                  </TableCell>
                  <TableCell className="text-sm">
                    {new Date(r.effectiveFrom).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-sm">
                    {r.effectiveTo
                      ? new Date(r.effectiveTo).toLocaleDateString()
                      : "Ongoing"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={r.isActive ? "default" : "secondary"}>
                      {r.isActive ? "Active" : "Inactive"}
                    </Badge>
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
                    No tax rules found
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
            <DialogTitle>Delete Tax Rule</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this tax rule? It will no longer apply
              to transactions.
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
