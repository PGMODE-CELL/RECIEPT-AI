"use client";

import { useState, useCallback } from "react";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Upload, FileText, CheckCircle, AlertTriangle, Clock, Brain,
  Eye, ArrowRight, DollarSign, Calendar, Building, Trash, RotateCcw
} from "lucide-react";

interface ExtractedDoc {
  id: string;
  fileName: string;
  type: "invoice" | "receipt" | "bill";
  uploadDate: string;
  status: "processing" | "completed" | "failed" | "review";
  vendor?: string;
  amount?: number;
  date?: string;
  tax?: number;
  confidence: number;
  rawData?: Record<string, string>;
}

// TODO: Replace with trpc.document.list.useQuery() when backend endpoint supports AI extraction fields
const MOCK_DOCS: ExtractedDoc[] = [
  {
    id: "1", fileName: "acme-invoice-001.pdf", type: "invoice", uploadDate: "2026-01-25", status: "completed",
    vendor: "Acme Corporation", amount: 5000, date: "2026-01-15", tax: 400, confidence: 95,
    rawData: { "Invoice Number": "INV-2026-001", "PO Number": "PO-1234", "Payment Terms": "Net 30", "Due Date": "2026-02-15" },
  },
  {
    id: "2", fileName: "office-supplies-receipt.jpg", type: "receipt", uploadDate: "2026-01-26", status: "completed",
    vendor: "Office Depot", amount: 285.50, date: "2026-01-24", tax: 22.84, confidence: 88,
    rawData: { "Store": "Office Depot #4521", "Cashier": "Maria S.", "Payment": "Visa *4242" },
  },
  {
    id: "3", fileName: "cloud-host-monthly.pdf", type: "bill", uploadDate: "2026-01-27", status: "completed",
    vendor: "CloudHost Pro", amount: 450, date: "2026-01-27", tax: 0, confidence: 92,
    rawData: { "Account": "CH-88921", "Period": "January 2026", "Plan": "Business Pro" },
  },
  {
    id: "4", fileName: "blurry-receipt.png", type: "receipt", uploadDate: "2026-01-28", status: "review",
    vendor: "Restaurant", amount: 85.00, date: "2026-01-27", tax: 7.65, confidence: 45,
  },
  {
    id: "5", fileName: "corrupted-file.pdf", type: "invoice", uploadDate: "2026-01-28", status: "failed",
    confidence: 0,
  },
];

export default function DocumentAI() {
  const [documents, setDocuments] = useState<ExtractedDoc[]>(MOCK_DOCS);
  const [selectedDoc, setSelectedDoc] = useState<ExtractedDoc | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const completedCount = documents.filter((d) => d.status === "completed").length;
  const reviewCount = documents.filter((d) => d.status === "review").length;
  const totalExtracted = documents.filter((d) => d.status === "completed").reduce((s, d) => s + (d.amount || 0), 0);

  const simulateUpload = (fileName: string) => {
    const newDoc: ExtractedDoc = {
      id: String(Date.now()),
      fileName,
      type: fileName.includes("receipt") ? "receipt" : fileName.includes("bill") ? "bill" : "invoice",
      uploadDate: new Date().toISOString().split("T")[0],
      status: "processing",
      confidence: 0,
    };
    setDocuments((prev) => [newDoc, ...prev]);
    setProcessingId(newDoc.id);
    setUploading(true);

    setTimeout(() => {
      const vendors = ["Acme Corp", "TechStart Inc", "Global Services", "Office Basics"];
      const amount = Math.round(Math.random() * 5000 + 100);
      const confidence = Math.round(Math.random() * 40 + 60);
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === newDoc.id
            ? {
                ...d,
                status: confidence > 60 ? "completed" : "review",
                vendor: vendors[Math.floor(Math.random() * vendors.length)],
                amount,
                date: new Date().toISOString().split("T")[0],
                tax: Math.round(amount * 0.08),
                confidence,
                rawData: { "Invoice #": `INV-${Date.now()}`, "Payment": "Credit Card" },
              }
            : d
        )
      );
      setProcessingId(null);
      setUploading(false);
      toast.success("Document processed");
    }, 2500);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    files.forEach((f) => simulateUpload(f.name));
    if (files.length === 0) simulateUpload("uploaded-document.pdf");
  }, []);

  const handleFileSelect = () => {
    simulateUpload("selected-document.pdf");
  };

  const createTransaction = (doc: ExtractedDoc) => {
    toast.success(`Transaction created from ${doc.fileName}`);
    setSelectedDoc(null);
  };

  const formatCurrency = (v: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

  const confidenceColor = (c: number) => {
    if (c >= 80) return "text-green-600 bg-green-100";
    if (c >= 60) return "text-yellow-600 bg-yellow-100";
    return "text-red-600 bg-red-100";
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Document AI</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">AI-powered receipt and invoice data extraction</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg"><FileText className="w-5 h-5 text-blue-600" /></div>
            <div><p className="text-xs text-gray-500">Documents</p><p className="text-2xl font-bold">{documents.length}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg"><CheckCircle className="w-5 h-5 text-green-600" /></div>
            <div><p className="text-xs text-gray-500">Processed</p><p className="text-2xl font-bold text-green-600">{completedCount}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg"><AlertTriangle className="w-5 h-5 text-yellow-600" /></div>
            <div><p className="text-xs text-gray-500">Needs Review</p><p className="text-2xl font-bold text-yellow-600">{reviewCount}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg"><DollarSign className="w-5 h-5 text-purple-600" /></div>
            <div><p className="text-xs text-gray-500">Total Extracted</p><p className="text-2xl font-bold">{formatCurrency(totalExtracted)}</p></div>
          </CardContent>
        </Card>
      </div>

      <Card
        className={`border-2 border-dashed transition-colors ${
          isDragging ? "border-blue-500 bg-blue-50 dark:bg-blue-950" : "border-gray-300 dark:border-gray-700"
        }`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <CardContent className="p-12 text-center">
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-lg font-medium">Drop receipts, invoices, or bills here</p>
          <p className="text-sm text-gray-500 mt-1">or</p>
          <Button onClick={handleFileSelect} disabled={uploading} className="mt-4">
            <Upload className="w-4 h-4 mr-2" /> Browse Files
          </Button>
          <p className="text-xs text-gray-400 mt-3">Supports PDF, JPG, PNG. AI will extract vendor, amount, date, and tax data.</p>
        </CardContent>
      </Card>

      {processingId && (
        <Card className="border-blue-200 dark:border-blue-800">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-blue-600 animate-pulse" />
              <span className="text-sm font-medium">AI is analyzing document...</span>
            </div>
            <Progress value={65} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-lg">Processed Documents</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Tax</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium max-w-[200px] truncate">
                    <FileText className="w-4 h-4 inline mr-2 text-gray-400" />
                    {doc.fileName}
                  </TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{doc.type}</Badge></TableCell>
                  <TableCell>{doc.vendor || "-"}</TableCell>
                  <TableCell className="text-sm">{doc.date || "-"}</TableCell>
                  <TableCell className="text-right font-semibold">{doc.amount ? formatCurrency(doc.amount) : "-"}</TableCell>
                  <TableCell className="text-right">{doc.tax ? formatCurrency(doc.tax) : "-"}</TableCell>
                  <TableCell>
                    {doc.confidence > 0 ? (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${confidenceColor(doc.confidence)}`}>
                        {doc.confidence}%
                      </span>
                    ) : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge className={
                      doc.status === "completed" ? "bg-green-100 text-green-800" :
                      doc.status === "processing" ? "bg-blue-100 text-blue-800" :
                      doc.status === "review" ? "bg-yellow-100 text-yellow-800" :
                      "bg-red-100 text-red-800"
                    }>
                      {doc.status === "processing" && <Clock className="w-3 h-3 mr-1 animate-spin" />}
                      {doc.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {doc.status === "completed" && (
                        <Button size="sm" onClick={() => createTransaction(doc)}>
                          <ArrowRight className="w-3 h-3 mr-1" /> Create
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => setSelectedDoc(doc)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={selectedDoc !== null} onOpenChange={() => setSelectedDoc(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Extracted Data: {selectedDoc?.fileName}</DialogTitle>
          </DialogHeader>
          {selectedDoc && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-xs text-gray-500">Vendor</p>
                  <p className="font-medium">{selectedDoc.vendor || "Not detected"}</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-xs text-gray-500">Amount</p>
                  <p className="font-medium">{selectedDoc.amount ? formatCurrency(selectedDoc.amount) : "Not detected"}</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-xs text-gray-500">Date</p>
                  <p className="font-medium">{selectedDoc.date || "Not detected"}</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-xs text-gray-500">Tax</p>
                  <p className="font-medium">{selectedDoc.tax ? formatCurrency(selectedDoc.tax) : "Not detected"}</p>
                </div>
              </div>
              {selectedDoc.rawData && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">Additional Fields</h4>
                  <div className="space-y-1">
                    {Object.entries(selectedDoc.rawData).map(([key, val]) => (
                      <div key={key} className="flex justify-between text-sm p-2 bg-gray-50 dark:bg-gray-800 rounded">
                        <span className="text-gray-500">{key}</span>
                        <span className="font-medium">{val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Confidence:</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${confidenceColor(selectedDoc.confidence)}`}>
                  {selectedDoc.confidence}%
                </span>
              </div>
              {selectedDoc.status === "completed" && (
                <Button className="w-full" onClick={() => createTransaction(selectedDoc)}>
                  <ArrowRight className="w-4 h-4 mr-2" /> Create Transaction from Extracted Data
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
