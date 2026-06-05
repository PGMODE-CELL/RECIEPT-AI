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
  Building2,
  CheckCircle2,
  ArrowRightLeft,
} from "lucide-react";
import { toast } from "sonner";

interface Company {
  id: number;
  name: string;
  code: string;
  currency: string;
  parentId: number | null;
  parentName: string | null;
  status: string;
}

const mockCompanies: Company[] = []

export default function MultiCompany() {
  const [companies] = useState<Company[]>(mockCompanies);
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [activeCompanyId, setActiveCompanyId] = useState(1);
  const [search, setSearch] = useState("");
  const [showConsolidated, setShowConsolidated] = useState(false);

  const [newCompany, setNewCompany] = useState({
    name: "",
    code: "",
    currency: "USD",
    parentId: "",
  });

  const filtered = companies.filter(
    (c) =>
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = () => {
    if (!newCompany.name || !newCompany.code) {
      toast.error("Name and code are required");
      return;
    }
    toast.success("Company created successfully");
    setOpen(false);
    setNewCompany({ name: "", code: "", currency: "USD", parentId: "" });
  };

  const handleDelete = () => {
    if (deleteId) {
      toast.success("Company deleted");
      setDeleteId(null);
    }
  };

  const handleSwitch = (id: number) => {
    setActiveCompanyId(id);
    toast.success(`Switched to ${companies.find((c) => c.id === id)?.name}`);
  };

  const totalCompanies = companies.length;
  const activeCount = companies.filter((c) => c.status === "active").length;
  const totalCurrencies = new Set(companies.map((c) => c.currency)).size;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Multi-Company
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage company entities and consolidated views
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={showConsolidated ? "default" : "outline"}
            onClick={() => setShowConsolidated(!showConsolidated)}
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Consolidated P&L
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" /> Add Company
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Company</DialogTitle>
                <DialogDescription>
                  Add a new company entity to your organization.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Company Name *</Label>
                    <Input
                      placeholder="Acme Corp"
                      value={newCompany.name}
                      onChange={(e) =>
                        setNewCompany((p) => ({ ...p, name: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Code *</Label>
                    <Input
                      placeholder="ACME"
                      value={newCompany.code}
                      onChange={(e) =>
                        setNewCompany((p) => ({ ...p, code: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Select
                      value={newCompany.currency}
                      onValueChange={(v) =>
                        setNewCompany((p) => ({ ...p, currency: v }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD - US Dollar</SelectItem>
                        <SelectItem value="EUR">EUR - Euro</SelectItem>
                        <SelectItem value="GBP">GBP - British Pound</SelectItem>
                        <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                        <SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Parent Company</Label>
                    <Select
                      value={newCompany.parentId}
                      onValueChange={(v) =>
                        setNewCompany((p) => ({ ...p, parentId: v }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="None (Root)" />
                      </SelectTrigger>
                      <SelectContent>
                        {companies
                          .filter((c) => c.status === "active")
                          .map((c) => (
                            <SelectItem key={c.id} value={String(c.id)}>
                              {c.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate}>Create Company</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Companies</p>
                <p className="text-2xl font-bold">{totalCompanies}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Entities</p>
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
                <p className="text-sm text-gray-500">Currencies</p>
                <p className="text-2xl font-bold">{totalCurrencies}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-purple-50 flex items-center justify-center">
                <ArrowRightLeft className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Company</p>
                <p className="text-lg font-bold">
                  {companies.find((c) => c.id === activeCompanyId)?.name || "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Company Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Company Entities</CardTitle>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search companies..."
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
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead>Parent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Active</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="font-mono text-sm">{c.code}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{c.currency}</Badge>
                  </TableCell>
                  <TableCell>{c.parentName || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={c.status === "active" ? "default" : "outline"}>
                      {c.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Switch
                      checked={activeCompanyId === c.id}
                      onCheckedChange={() => handleSwitch(c.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(c.id)}
                      >
                        <Trash className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    No companies found
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
            <DialogTitle>Delete Company</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this company? This action cannot be undone.
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
