import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Download, Eye, Printer, File, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface DocumentTemplate {
  id: number;
  name: string;
  type: string;
  description: string;
}

const documentTypes = ["invoice", "bill", "report", "receipt", "statement", "purchase_order"];

const templates: DocumentTemplate[] = [
  { id: 1, name: "Standard Invoice", type: "invoice", description: "Clean, professional invoice layout" },
  { id: 2, name: "Detailed Invoice", type: "invoice", description: "Invoice with itemized breakdown" },
  { id: 3, name: "Simple Bill", type: "bill", description: "Minimal bill layout" },
  { id: 4, name: "Monthly Report", type: "report", description: "Financial summary report" },
  { id: 5, name: "Payment Receipt", type: "receipt", description: "Payment confirmation receipt" },
  { id: 6, name: "Account Statement", type: "statement", description: "Account balance statement" },
];

const recentGenerations = [
  { id: 1, document: "Invoice #INV-001", type: "invoice", generated: "2026-05-30 14:30", size: "245 KB" },
  { id: 2, document: "Monthly Report - May", type: "report", generated: "2026-05-29 10:00", size: "1.2 MB" },
  { id: 3, document: "Invoice #INV-002", type: "invoice", generated: "2026-05-28 16:15", size: "238 KB" },
  { id: 4, document: "Payment Receipt", type: "receipt", generated: "2026-05-27 09:30", size: "120 KB" },
];

export default function PDFGenerator() {
  const [docType, setDocType] = useState("invoice");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [batchCount, setBatchCount] = useState("1");

  const filteredTemplates = templates.filter((t) => t.type === docType);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

  const handleGenerate = () => {
    if (!selectedTemplate) { toast.error("Please select a template"); return; }
    toast.success("PDF generated successfully");
  };

  const handleBatchGenerate = () => {
    const count = parseInt(batchCount) || 1;
    toast.success(`${count} PDF${count > 1 ? "s" : ""} queued for generation`);
  };

  const handleDownload = () => {
    toast.success("PDF downloaded");
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-600" /> PDF Generator
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Generate, preview, and download PDF documents</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg"><FileText className="w-5 h-5 text-blue-600" /></div>
              <div>
                <p className="text-sm text-gray-500">Templates</p>
                <p className="text-xl font-bold">{templates.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg"><CheckCircle className="w-5 h-5 text-green-600" /></div>
              <div>
                <p className="text-sm text-gray-500">Generated Today</p>
                <p className="text-xl font-bold">4</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg"><File className="w-5 h-5 text-purple-600" /></div>
              <div>
                <p className="text-sm text-gray-500">Total Files</p>
                <p className="text-xl font-bold">156</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg"><Download className="w-5 h-5 text-amber-600" /></div>
              <div>
                <p className="text-sm text-gray-500">This Month</p>
                <p className="text-xl font-bold">89</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="generate">
        <TabsList>
          <TabsTrigger value="generate">Generate PDF</TabsTrigger>
          <TabsTrigger value="batch">Batch Generate</TabsTrigger>
          <TabsTrigger value="history">Recent Files</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Document Settings</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Document Type</Label>
                  <Select value={docType} onValueChange={(v) => { setDocType(v); setSelectedTemplate(""); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {documentTypes.map((dt) => <SelectItem key={dt} value={dt}>{dt.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Template</Label>
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                    <SelectTrigger><SelectValue placeholder="Choose template..." /></SelectTrigger>
                    <SelectContent>
                      {filteredTemplates.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {selectedTemplate && (
                  <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <p className="text-sm font-medium">{filteredTemplates.find(t => t.id === Number(selectedTemplate))?.name}</p>
                    <p className="text-xs text-gray-500 mt-1">{filteredTemplates.find(t => t.id === Number(selectedTemplate))?.description}</p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Document Reference</Label>
                  <Input placeholder="e.g., INV-001, RPT-052026" />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setPreviewOpen(true)}><Eye className="w-4 h-4 mr-2" /> Preview</Button>
                  <Button onClick={handleGenerate}><Download className="w-4 h-4 mr-2" /> Generate PDF</Button>
                </div>
              </CardContent>
            </Card>

            {/* Preview */}
            <Card>
              <CardHeader><CardTitle>Preview</CardTitle></CardHeader>
              <CardContent>
                <div className="border-2 border-dashed rounded-lg p-8 bg-gray-50 dark:bg-gray-800/30 min-h-[400px] flex flex-col">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <div className="w-16 h-3 bg-gray-300 rounded mb-2" />
                      <div className="w-24 h-2 bg-gray-200 rounded" />
                    </div>
                    <div className="text-right">
                      <div className="w-20 h-2 bg-gray-300 rounded mb-2 ml-auto" />
                      <div className="w-16 h-2 bg-gray-200 rounded ml-auto" />
                    </div>
                  </div>
                  <div className="flex-1 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="w-12 h-2 bg-gray-200 rounded" />
                        <div className="w-24 h-2 bg-gray-300 rounded" />
                        <div className="w-20 h-2 bg-gray-300 rounded" />
                      </div>
                      <div className="space-y-2">
                        <div className="w-12 h-2 bg-gray-200 rounded" />
                        <div className="w-28 h-2 bg-gray-300 rounded" />
                        <div className="w-16 h-2 bg-gray-300 rounded" />
                      </div>
                    </div>
                    <div className="border-t pt-4 space-y-3">
                      <div className="grid grid-cols-4 gap-2">
                        <div className="w-full h-2 bg-gray-200 rounded" />
                        <div className="w-full h-2 bg-gray-200 rounded" />
                        <div className="w-full h-2 bg-gray-200 rounded" />
                        <div className="w-full h-2 bg-gray-200 rounded" />
                      </div>
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="grid grid-cols-4 gap-2">
                          <div className="w-3/4 h-2 bg-gray-100 rounded" />
                          <div className="w-full h-2 bg-gray-100 rounded" />
                          <div className="w-full h-2 bg-gray-100 rounded" />
                          <div className="w-full h-2 bg-gray-100 rounded" />
                        </div>
                      ))}
                    </div>
                    <div className="border-t pt-4 mt-auto">
                      <div className="flex justify-end">
                        <div className="w-32 h-3 bg-gray-300 rounded" />
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 text-center mt-4">PDF preview placeholder</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="batch" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Batch Generate PDFs</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Document Type</Label>
                  <Select value={docType} onValueChange={setDocType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {documentTypes.map((dt) => <SelectItem key={dt} value={dt}>{dt.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Template</Label>
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                    <SelectTrigger><SelectValue placeholder="Choose..." /></SelectTrigger>
                    <SelectContent>
                      {filteredTemplates.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Number of Documents</Label>
                  <Input type="number" min="1" max="100" value={batchCount} onChange={(e) => setBatchCount(e.target.value)} />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button onClick={handleBatchGenerate}><Download className="w-4 h-4 mr-2" /> Generate {batchCount} PDF{parseInt(batchCount) > 1 ? "s" : ""}</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Recent Generations</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Generated</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentGenerations.map((gen) => (
                    <TableRow key={gen.id}>
                      <TableCell className="font-medium">{gen.document}</TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{gen.type}</Badge></TableCell>
                      <TableCell className="font-mono text-sm">{gen.generated}</TableCell>
                      <TableCell>{gen.size}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon"><Eye className="w-4 h-4 text-gray-400" /></Button>
                          <Button variant="ghost" size="icon" onClick={handleDownload}><Download className="w-4 h-4 text-gray-400" /></Button>
                          <Button variant="ghost" size="icon"><Printer className="w-4 h-4 text-gray-400" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
