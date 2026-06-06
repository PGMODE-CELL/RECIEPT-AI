import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { trpc } from "@/providers/trpc";
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  FileText,
  Download,
  Save,
  Filter,
  ArrowUpDown,
  Eye,
  Plus,
  Trash2,
  RotateCcw,
} from "lucide-react";

type DataSource = "invoices" | "bills" | "transactions" | "contacts" | "products";

interface ColumnDef {
  id: string;
  label: string;
  selected: boolean;
}

interface FilterDef {
  id: string;
  field: string;
  operator: string;
  value: string;
}

interface SortDef {
  field: string;
  direction: "asc" | "desc";
}

interface SavedTemplate {
  id: string;
  name: string;
  source: DataSource;
  columns: string[];
  filters: FilterDef[];
  createdAt: string;
}

const dataSourceColumns: Record<DataSource, ColumnDef[]> = {
  invoices: [
    { id: "number", label: "Invoice #", selected: true },
    { id: "client", label: "Client", selected: true },
    { id: "date", label: "Date", selected: true },
    { id: "dueDate", label: "Due Date", selected: true },
    { id: "amount", label: "Amount", selected: true },
    { id: "status", label: "Status", selected: true },
    { id: "tax", label: "Tax", selected: false },
    { id: "total", label: "Total", selected: false },
    { id: "notes", label: "Notes", selected: false },
  ],
  bills: [
    { id: "number", label: "Bill #", selected: true },
    { id: "vendor", label: "Vendor", selected: true },
    { id: "date", label: "Date", selected: true },
    { id: "dueDate", label: "Due Date", selected: true },
    { id: "amount", label: "Amount", selected: true },
    { id: "status", label: "Status", selected: true },
    { id: "category", label: "Category", selected: false },
    { id: "paymentMethod", label: "Payment Method", selected: false },
  ],
  transactions: [
    { id: "id", label: "Transaction ID", selected: true },
    { id: "date", label: "Date", selected: true },
    { id: "description", label: "Description", selected: true },
    { id: "amount", label: "Amount", selected: true },
    { id: "category", label: "Category", selected: true },
    { id: "account", label: "Account", selected: false },
    { id: "type", label: "Type", selected: false },
  ],
  contacts: [
    { id: "name", label: "Name", selected: true },
    { id: "email", label: "Email", selected: true },
    { id: "phone", label: "Phone", selected: true },
    { id: "company", label: "Company", selected: false },
    { id: "type", label: "Type", selected: true },
    { id: "balance", label: "Balance", selected: false },
  ],
  products: [
    { id: "name", label: "Product Name", selected: true },
    { id: "sku", label: "SKU", selected: true },
    { id: "price", label: "Price", selected: true },
    { id: "quantity", label: "Quantity", selected: true },
    { id: "category", label: "Category", selected: false },
    { id: "status", label: "Status", selected: false },
  ],
};

// TODO: Replace with trpc.report.*.useQuery() when backend endpoints exist for generic report data
const sampleData: Record<DataSource, Record<string, string>[]> = {
  invoices: [
    { number: "INV-2026-001", client: "Acme Corp", date: "2026-05-01", dueDate: "2026-05-31", amount: "$2,500.00", status: "Paid", tax: "$250.00", total: "$2,750.00", notes: "Consulting services" },
    { number: "INV-2026-002", client: "TechStart Inc", date: "2026-05-05", dueDate: "2026-06-04", amount: "$4,800.00", status: "Pending", tax: "$480.00", total: "$5,280.00", notes: "Development" },
    { number: "INV-2026-003", client: "Global Solutions", date: "2026-05-10", dueDate: "2026-05-25", amount: "$1,200.00", status: "Overdue", tax: "$120.00", total: "$1,320.00", notes: "Design work" },
    { number: "INV-2026-004", client: "Digital Agency", date: "2026-05-15", dueDate: "2026-06-14", amount: "$3,750.00", status: "Paid", tax: "$375.00", total: "$4,125.00", notes: "Marketing" },
    { number: "INV-2026-005", client: "StartUp Labs", date: "2026-05-20", dueDate: "2026-06-19", amount: "$950.00", status: "Draft", tax: "$95.00", total: "$1,045.00", notes: "Support" },
  ],
  bills: [
    { number: "BILL-2026-001", vendor: "AWS", date: "2026-05-01", dueDate: "2026-05-31", amount: "$1,234.56", status: "Paid", category: "Cloud Services", paymentMethod: "Credit Card" },
    { number: "BILL-2026-002", vendor: "WeWork", date: "2026-05-05", dueDate: "2026-05-20", amount: "$2,500.00", status: "Paid", category: "Rent", paymentMethod: "Bank Transfer" },
    { number: "BILL-2026-003", vendor: "Slack", date: "2026-05-10", dueDate: "2026-06-09", amount: "$250.00", status: "Pending", category: "Software", paymentMethod: "Credit Card" },
  ],
  transactions: [
    { id: "TX-8901", date: "2026-05-30", description: "Uber ride to office", amount: "$45.00", category: "Travel", account: "Business Checking", type: "Expense" },
    { id: "TX-8900", date: "2026-05-29", description: "Client payment - Acme Corp", amount: "$2,500.00", category: "Revenue", account: "Business Checking", type: "Income" },
    { id: "TX-8899", date: "2026-05-28", description: "Office supplies - Staples", amount: "$156.32", category: "Office Supplies", account: "Credit Card", type: "Expense" },
  ],
  contacts: [
    { name: "John Smith", email: "john@acme.com", phone: "+1 555-0101", company: "Acme Corp", type: "Client", balance: "$2,500.00" },
    { name: "Jane Doe", email: "jane@techstart.io", phone: "+1 555-0102", company: "TechStart Inc", type: "Client", balance: "$4,800.00" },
    { name: "Bob Wilson", email: "bob@supplier.com", phone: "+1 555-0103", company: "Supply Co", type: "Vendor", balance: "$0.00" },
  ],
  products: [
    { name: "Web Development", sku: "SVC-WEB-001", price: "$150.00", quantity: "N/A", category: "Services", status: "Active" },
    { name: "Logo Design", sku: "SVC-DES-001", price: "$500.00", quantity: "N/A", category: "Services", status: "Active" },
    { name: "Business Card", sku: "PRD-PRN-001", price: "$25.00", quantity: "500", category: "Print", status: "Active" },
  ],
};

const mockTemplates: SavedTemplate[] = []

const filterOperators = [
  { value: "equals", label: "Equals" },
  { value: "contains", label: "Contains" },
  { value: "greaterThan", label: "Greater than" },
  { value: "lessThan", label: "Less than" },
  { value: "between", label: "Between" },
];

const sourceLabels: Record<DataSource, string> = {
  invoices: "Invoices",
  bills: "Bills",
  transactions: "Transactions",
  contacts: "Contacts",
  products: "Products",
};

export default function CustomReports() {
  const [source, setSource] = useState<DataSource>("invoices");
  const [columns, setColumns] = useState<ColumnDef[]>(dataSourceColumns.invoices);
  const [filters, setFilters] = useState<FilterDef[]>([]);
  const [sort, setSort] = useState<SortDef>({ field: "", direction: "asc" });
  const [showPreview, setShowPreview] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templates, setTemplates] = useState<SavedTemplate[]>(mockTemplates);

  const handleSourceChange = (newSource: DataSource) => {
    setSource(newSource);
    setColumns(dataSourceColumns[newSource]);
    setFilters([]);
    setSort({ field: "", direction: "asc" });
  };

  const handleToggleColumn = (columnId: string) => {
    setColumns((prev) =>
      prev.map((col) =>
        col.id === columnId ? { ...col, selected: !col.selected } : col
      )
    );
  };

  const handleSelectAllColumns = () => {
    setColumns((prev) => prev.map((col) => ({ ...col, selected: true })));
  };

  const handleAddFilter = () => {
    const newFilter: FilterDef = {
      id: String(Date.now()),
      field: columns[0]?.id || "",
      operator: "equals",
      value: "",
    };
    setFilters((prev) => [...prev, newFilter]);
  };

  const handleRemoveFilter = (id: string) => {
    setFilters((prev) => prev.filter((f) => f.id !== id));
  };

  const handleUpdateFilter = (
    id: string,
    updates: Partial<FilterDef>
  ) => {
    setFilters((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  };

  const handleExportCSV = () => {
    const selectedColumns = columns.filter((c) => c.selected);
    if (selectedColumns.length === 0) {
      toast.error("Please select at least one column");
      return;
    }

    const headers = selectedColumns.map((c) => c.label).join(",");
    const rows = sampleData[source].map((row) =>
      selectedColumns
        .map((c) => `"${row[c.id] || ""}"`)
        .join(",")
    );
    const csv = [headers, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${source}-report-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Report exported successfully");
  };

  const handleSaveTemplate = () => {
    if (!templateName.trim()) {
      toast.error("Please enter a template name");
      return;
    }
    const template: SavedTemplate = {
      id: String(Date.now()),
      name: templateName,
      source,
      columns: columns.filter((c) => c.selected).map((c) => c.id),
      filters: [...filters],
      createdAt: new Date().toISOString().split("T")[0],
    };
    setTemplates((prev) => [...prev, template]);
    setSaveDialogOpen(false);
    setTemplateName("");
    toast.success("Template saved successfully");
  };

  const handleLoadTemplate = (template: SavedTemplate) => {
    setSource(template.source);
    setColumns(
      dataSourceColumns[template.source].map((col) => ({
        ...col,
        selected: template.columns.includes(col.id),
      }))
    );
    setFilters(template.filters);
    toast.success(`Loaded template: ${template.name}`);
  };

  const handleDeleteTemplate = (id: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    toast.success("Template deleted");
  };

  const selectedColumns = columns.filter((c) => c.selected);
  const previewData = sampleData[source];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Custom Reports</h1>
          <p className="text-muted-foreground">
            Build custom reports by selecting data sources, columns, and filters.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Save className="mr-2 h-4 w-4" />
                Save Template
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Save Report Template</DialogTitle>
                <DialogDescription>
                  Save your current report configuration for later use.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="template-name">Template Name</Label>
                  <Input
                    id="template-name"
                    placeholder="e.g., Monthly Revenue Report"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                  />
                </div>
                <div className="rounded-lg bg-muted p-3 text-sm">
                  <p>
                    <strong>Source:</strong> {sourceLabels[source]}
                  </p>
                  <p>
                    <strong>Columns:</strong> {selectedColumns.map((c) => c.label).join(", ")}
                  </p>
                  <p>
                    <strong>Filters:</strong> {filters.length} active
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setSaveDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleSaveTemplate}>Save Template</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button onClick={() => setShowPreview(!showPreview)}>
            <Eye className="mr-2 h-4 w-4" />
            {showPreview ? "Hide Preview" : "Preview"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Configuration Panel */}
        <div className="space-y-6 lg:col-span-1">
          {/* Data Source */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Data Source</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={source} onValueChange={(v: DataSource) => handleSourceChange(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="invoices">Invoices</SelectItem>
                  <SelectItem value="bills">Bills</SelectItem>
                  <SelectItem value="transactions">Transactions</SelectItem>
                  <SelectItem value="contacts">Contacts</SelectItem>
                  <SelectItem value="products">Products</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Columns */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Columns</CardTitle>
              <Button variant="ghost" size="sm" onClick={handleSelectAllColumns}>
                Select All
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {columns.map((col) => (
                <div key={col.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={col.id}
                    checked={col.selected}
                    onCheckedChange={() => handleToggleColumn(col.id)}
                  />
                  <Label htmlFor={col.id} className="cursor-pointer text-sm">
                    {col.label}
                  </Label>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Filters */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Filters</CardTitle>
              <Button variant="ghost" size="sm" onClick={handleAddFilter}>
                <Plus className="mr-1 h-3 w-3" />
                Add
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {filters.length === 0 && (
                <p className="text-sm text-muted-foreground">No filters applied</p>
              )}
              {filters.map((filter) => (
                <div key={filter.id} className="space-y-2 rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">
                      Filter
                    </Label>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleRemoveFilter(filter.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <Select
                    value={filter.field}
                    onValueChange={(v) => handleUpdateFilter(filter.id, { field: v })}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {columns.map((col) => (
                        <SelectItem key={col.id} value={col.id}>
                          {col.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={filter.operator}
                    onValueChange={(v) =>
                      handleUpdateFilter(filter.id, { operator: v })
                    }
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {filterOperators.map((op) => (
                        <SelectItem key={op.value} value={op.value}>
                          {op.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Value"
                    className="h-8"
                    value={filter.value}
                    onChange={(e) =>
                      handleUpdateFilter(filter.id, { value: e.target.value })
                    }
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Sort */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Sort By</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select
                value={sort.field}
                onValueChange={(v) => setSort((prev) => ({ ...prev, field: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select field" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {selectedColumns.map((col) => (
                    <SelectItem key={col.id} value={col.id}>
                      {col.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {sort.field && sort.field !== "none" && (
                <Select
                  value={sort.direction}
                  onValueChange={(v: "asc" | "desc") =>
                    setSort((prev) => ({ ...prev, direction: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">Ascending</SelectItem>
                    <SelectItem value="desc">Descending</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Preview Panel */}
        <div className="space-y-6 lg:col-span-2">
          {showPreview && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Report Preview</CardTitle>
                  <CardDescription>
                    {selectedColumns.length} columns selected • {filters.length}{" "}
                    filters applied • {previewData.length} rows
                  </CardDescription>
                </div>
                <Badge variant="outline">{sourceLabels[source]}</Badge>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {selectedColumns.map((col) => (
                          <TableHead key={col.id}>
                            <div className="flex items-center gap-1">
                              {col.label}
                              {sort.field === col.id && (
                                <ArrowUpDown className="h-3 w-3" />
                              )}
                            </div>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.map((row, i) => (
                        <TableRow key={i}>
                          {selectedColumns.map((col) => (
                            <TableCell key={col.id} className="text-sm">
                              {row[col.id] || "—"}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {!showPreview && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-lg font-medium">No Preview</p>
                <p className="text-sm text-muted-foreground">
                  Click "Preview" to see your report data
                </p>
              </CardContent>
            </Card>
          )}

          {/* Saved Templates */}
          <Card>
            <CardHeader>
              <CardTitle>Saved Templates</CardTitle>
              <CardDescription>Quick access to your saved report configurations.</CardDescription>
            </CardHeader>
            <CardContent>
              {templates.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No templates saved yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <p className="font-medium">{template.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {sourceLabels[template.source]} • Created{" "}
                          {template.createdAt}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleLoadTemplate(template)}
                        >
                          <RotateCcw className="mr-1 h-3 w-3" />
                          Load
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteTemplate(template.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
