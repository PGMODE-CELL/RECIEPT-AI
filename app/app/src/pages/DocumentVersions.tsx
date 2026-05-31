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
  FileText,
  GitBranch,
  RotateCcw,
  Eye,
} from "lucide-react";
import { toast } from "sonner";

interface DocumentVersion {
  id: number;
  documentName: string;
  versionNumber: number;
  fileName: string;
  fileSize: string;
  uploadedBy: string;
  uploadedAt: string;
  changes: string;
  isCurrent: boolean;
}

const mockVersions: DocumentVersion[] = [
  { id: 1, documentName: "Business Plan 2026", versionNumber: 4, fileName: "business_plan_2026_v4.pdf", fileSize: "2.4 MB", uploadedBy: "Admin", uploadedAt: "2026-05-30 14:00", changes: "Updated financial projections", isCurrent: true },
  { id: 2, documentName: "Business Plan 2026", versionNumber: 3, fileName: "business_plan_2026_v3.pdf", fileSize: "2.1 MB", uploadedBy: "Admin", uploadedAt: "2026-05-20 09:30", changes: "Added market analysis section", isCurrent: false },
  { id: 3, documentName: "Business Plan 2026", versionNumber: 2, fileName: "business_plan_2026_v2.pdf", fileSize: "1.8 MB", uploadedBy: "John Doe", uploadedAt: "2026-05-10 16:15", changes: "Initial draft with team bios", isCurrent: false },
  { id: 4, documentName: "Business Plan 2026", versionNumber: 1, fileName: "business_plan_2026_v1.pdf", fileSize: "1.2 MB", uploadedBy: "John Doe", uploadedAt: "2026-05-01 11:00", changes: "First version", isCurrent: false },
  { id: 5, documentName: "Vendor Contract - Acme", versionNumber: 2, fileName: "vendor_contract_acme_v2.docx", fileSize: "450 KB", uploadedBy: "Jane Smith", uploadedAt: "2026-05-25 10:00", changes: "Updated payment terms to Net 30", isCurrent: true },
  { id: 6, documentName: "Vendor Contract - Acme", versionNumber: 1, fileName: "vendor_contract_acme_v1.docx", fileSize: "420 KB", uploadedBy: "Jane Smith", uploadedAt: "2026-05-15 14:30", changes: "Original contract", isCurrent: false },
  { id: 7, documentName: "Privacy Policy", versionNumber: 1, fileName: "privacy_policy_v1.pdf", fileSize: "180 KB", uploadedBy: "Admin", uploadedAt: "2026-04-01 09:00", changes: "Initial privacy policy", isCurrent: true },
];

export default function DocumentVersions() {
  const [versions] = useState<DocumentVersion[]>(mockVersions);
  const [search, setSearch] = useState("");
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  const documentNames = [...new Set(versions.map((v) => v.documentName))];

  const filteredDocuments = documentNames.filter(
    (d) => !search || d.toLowerCase().includes(search.toLowerCase())
  );

  const documentVersions = selectedDocument
    ? versions
        .filter((v) => v.documentName === selectedDocument)
        .sort((a, b) => b.versionNumber - a.versionNumber)
    : [];

  const handleUpload = () => {
    toast.success("New version uploaded successfully");
    setUploadOpen(false);
  };

  const handleRestore = (versionNumber: number) => {
    toast.success(`Restored to version ${versionNumber}`);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Document Versions
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Track document version history and restore previous versions
          </p>
        </div>
        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" /> Upload New Version
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Upload New Version</DialogTitle>
              <DialogDescription>
                Upload a new version of an existing document or create a new one.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Document *</Label>
                <Input placeholder="Document name" />
              </div>
              <div className="space-y-2">
                <Label>Changes *</Label>
                <Input placeholder="Describe changes in this version" />
              </div>
              <div className="space-y-2">
                <Label>File</Label>
                <div className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-gray-50">
                  <FileText className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    PDF, DOCX, XLSX up to 50MB
                  </p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setUploadOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpload}>Upload</Button>
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
                <p className="text-sm text-gray-500">Total Documents</p>
                <p className="text-2xl font-bold">{documentNames.length}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Versions</p>
                <p className="text-2xl font-bold">{versions.length}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-50 flex items-center justify-center">
                <GitBranch className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Latest Upload</p>
                <p className="text-lg font-bold">
                  {versions[0]?.uploadedAt.split(" ")[0] || "—"}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-purple-50 flex items-center justify-center">
                <RotateCcw className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Document List */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Documents</CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search documents..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {filteredDocuments.map((doc) => {
                  const docVersions = versions.filter(
                    (v) => v.documentName === doc
                  );
                  const isSelected = selectedDocument === doc;
                  return (
                    <button
                      key={doc}
                      onClick={() => setSelectedDocument(doc)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        isSelected
                          ? "bg-blue-50 border border-blue-200"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-medium">{doc}</span>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          v{docVersions[0]?.versionNumber || 0}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 ml-6">
                        {docVersions.length} version
                        {docVersions.length !== 1 ? "s" : ""}
                      </p>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Version History */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>
                {selectedDocument
                  ? `Version History - ${selectedDocument}`
                  : "Select a Document"}
              </CardTitle>
              <CardDescription>
                {selectedDocument
                  ? "View all versions and compare changes"
                  : "Choose a document from the list to view its version history"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedDocument ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Version</TableHead>
                      <TableHead>File</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Changes</TableHead>
                      <TableHead>Uploaded By</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="w-[100px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documentVersions.map((v) => (
                      <TableRow key={v.id}>
                        <TableCell>
                          <Badge variant={v.isCurrent ? "default" : "outline"}>
                            v{v.versionNumber}
                            {v.isCurrent && " (Current)"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {v.fileName}
                        </TableCell>
                        <TableCell>{v.fileSize}</TableCell>
                        <TableCell className="text-sm">{v.changes}</TableCell>
                        <TableCell>{v.uploadedBy}</TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {v.uploadedAt}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 justify-end">
                            <Button variant="ghost" size="icon" title="View">
                              <Eye className="w-4 h-4 text-gray-400" />
                            </Button>
                            {!v.isCurrent && (
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Restore"
                                onClick={() => handleRestore(v.versionNumber)}
                              >
                                <RotateCcw className="w-4 h-4 text-blue-500" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                  <p>Select a document to view version history</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
