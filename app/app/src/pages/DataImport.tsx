import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface ImportHistory {
  id: string;
  source: string;
  fileName: string;
  date: string;
  totalRows: number;
  successCount: number;
  errorCount: string[];
}

interface MappedColumn {
  source: string;
  target: string;
}

const sourceTemplates = {
  quickbooks: {
    name: "QuickBooks",
    headers: ["Date", "Transaction Type", "Num", "Name", "Memo/Description", "Account", "Debit", "Credit"],
    targets: ["date", "transactionType", "reference", "payee", "description", "account", "debit", "credit"],
  },
  xero: {
    name: "Xero",
    headers: ["Date", "Transaction Type", "Reference", "Payee", "Description", "Account Code", "Debit", "Credit"],
    targets: ["date", "transactionType", "reference", "payee", "description", "account", "debit", "credit"],
  },
  wave: {
    name: "Wave",
    headers: ["Date", "Account", "Description", "Category", "Amount"],
    targets: ["date", "account", "description", "category", "amount"],
  },
  csv: {
    name: "Generic CSV",
    headers: [],
    targets: ["date", "description", "amount", "account", "reference", "payee"],
  },
};

const initialHistory: ImportHistory[] = [];

export default function DataImport() {
  const [history, setHistory] = useState<ImportHistory[]>(initialHistory);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedSource, setSelectedSource] = useState<string>("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<string[][]>([]);
  const [mappedColumns, setMappedColumns] = useState<MappedColumn[]>([]);
  const [importing, setImporting] = useState(false);

  const template = selectedSource ? sourceTemplates[selectedSource as keyof typeof sourceTemplates] : null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFile(file);

    const reader = new FileReader();
    reader.onload = event => {
      const text = event.target?.result as string;
      const lines = text.split("\n").slice(0, 6);
      const data = lines.map(line => line.split(",").map(cell => cell.trim()));
      setPreviewData(data);

      if (template && template.headers.length > 0) {
        const mappings: MappedColumn[] = template.headers.map((header, i) => ({
          source: header,
          target: template.targets[i] || "",
        }));
        setMappedColumns(mappings);
      } else {
        const headers = data[0] || [];
        const mappings: MappedColumn[] = headers.map(header => ({
          source: header,
          target: "",
        }));
        setMappedColumns(mappings);
      }
    };
    reader.readAsText(file);
  };

  const updateMapping = (index: number, target: string) => {
    setMappedColumns(prev => prev.map((col, i) => (i === index ? { ...col, target } : col)));
  };

  const handleImport = async () => {
    const unmapped = mappedColumns.filter(col => !col.target);
    if (unmapped.length > 0) {
      toast.error("Please map all columns before importing");
      return;
    }

    setImporting(true);
    await new Promise(resolve => setTimeout(resolve, 2000));

    const totalRows = Math.max(0, previewData.length - 1);
    const newEntry: ImportHistory = {
      id: Date.now().toString(),
      source: template?.name || "Generic CSV",
      fileName: uploadedFile?.name || "unknown.csv",
      date: new Date().toISOString().split("T")[0],
      totalRows,
      successCount: totalRows,
      errorCount: [],
    };

    setHistory(prev => [newEntry, ...prev]);
    setImporting(false);
    setImportDialogOpen(false);
    setUploadedFile(null);
    setPreviewData([]);
    setMappedColumns([]);
    setSelectedSource("");
    toast.success(`Imported ${newEntry.successCount} rows successfully`);
  };

  const resetDialog = () => {
    setUploadedFile(null);
    setPreviewData([]);
    setMappedColumns([]);
    setSelectedSource("");
    setImportDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Data Import</h1>
        <Dialog
          open={importDialogOpen}
          onOpenChange={open => {
            if (!open) resetDialog();
            else setImportDialogOpen(true);
          }}
        >
          <DialogTrigger asChild>
            <Button>Import Data</Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Import from Software</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Select Source</label>
                <Select value={selectedSource} onValueChange={setSelectedSource}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose import source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quickbooks">QuickBooks (CSV)</SelectItem>
                    <SelectItem value="xero">Xero (CSV)</SelectItem>
                    <SelectItem value="wave">Wave (CSV)</SelectItem>
                    <SelectItem value="csv">Generic CSV</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedSource && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Upload File</label>
                  <Input type="file" accept=".csv" onChange={handleFileUpload} />
                </div>
              )}

              {previewData.length > 0 && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Preview (first 5 rows)</label>
                  <div className="border rounded-md overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {previewData[0]?.map((header, i) => <TableHead key={i}>{header}</TableHead>)}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewData.slice(1).map((row, rowIdx) => (
                          <TableRow key={rowIdx}>
                            {row.map((cell, cellIdx) => (
                              <TableCell key={cellIdx}>{cell}</TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {mappedColumns.length > 0 && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Map Columns</label>
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Source Column</TableHead>
                          <TableHead>Map To Field</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {mappedColumns.map((col, i) => (
                          <TableRow key={i}>
                            <TableCell>{col.source}</TableCell>
                            <TableCell>
                              <Select value={col.target} onValueChange={val => updateMapping(i, val)}>
                                <SelectTrigger className="w-48">
                                  <SelectValue placeholder="Select field" />
                                </SelectTrigger>
                                <SelectContent>
                                  {template?.targets.map(t => (
                                    <SelectItem key={t} value={t}>
                                      {t}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {uploadedFile && (
                <Button onClick={handleImport} disabled={importing} className="w-full">
                  {importing ? "Importing..." : "Start Import"}
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Imports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{history.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Rows Imported</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{history.reduce((sum, h) => sum + h.successCount, 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Errors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {history.reduce((sum, h) => sum + h.errorCount.length, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Import History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>File</TableHead>
                <TableHead>Total Rows</TableHead>
                <TableHead>Success</TableHead>
                <TableHead>Errors</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map(entry => (
                <TableRow key={entry.id}>
                  <TableCell>{entry.date}</TableCell>
                  <TableCell>{entry.source}</TableCell>
                  <TableCell className="font-mono text-sm">{entry.fileName}</TableCell>
                  <TableCell>{entry.totalRows}</TableCell>
                  <TableCell className="text-green-600 font-medium">{entry.successCount}</TableCell>
                  <TableCell className="text-red-600 font-medium">{entry.errorCount.length}</TableCell>
                  <TableCell>
                    <Badge variant={entry.errorCount.length === 0 ? "default" : "destructive"}>
                      {entry.errorCount.length === 0 ? "Complete" : "With Errors"}
                    </Badge>
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
