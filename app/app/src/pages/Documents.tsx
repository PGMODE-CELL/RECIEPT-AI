import { useState, useRef } from "react";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Upload, FileSpreadsheet, FileText, Image, Trash, Download, Eye } from "lucide-react";
import { toast } from "sonner";

export default function Documents() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const { data: documents, isLoading, refetch } = trpc.document.list.useQuery();
  const createDoc = trpc.document.create.useMutation({
    onSuccess: () => { refetch(); toast.success("Document uploaded"); },
  });
  const deleteDoc = trpc.document.delete.useMutation({
    onSuccess: () => { setDeleteId(null); refetch(); toast.success("Document deleted"); },
  });

  const [search, setSearch] = useState("");

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    createDoc.mutate({
      name: file.name,
      fileUrl: URL.createObjectURL(file),
      fileType: file.type,
      fileSize: file.size,
      category: "general",
    });
  };

  const filtered = documents?.filter((d) =>
    !search || d.name?.toLowerCase().includes(search.toLowerCase())
  );

  const fileIcon = (type: string | null) => {
    if (!type) return <FileText className="w-5 h-5 text-gray-400" />;
    if (type.startsWith("image/")) return <Image className="w-5 h-5 text-purple-500" />;
    if (type.includes("pdf")) return <FileText className="w-5 h-5 text-red-500" />;
    if (type.includes("spreadsheet") || type.includes("excel")) return <FileSpreadsheet className="w-5 h-5 text-green-500" />;
    return <FileText className="w-5 h-5 text-blue-500" />;
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Documents</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">File storage and management</p>
        </div>
        <input ref={fileRef} type="file" className="hidden" onChange={handleUpload} />
        <Button onClick={() => fileRef.current?.click()} disabled={createDoc.isPending}>
          <Upload className="w-4 h-4 mr-2" /> {createDoc.isPending ? "Uploading..." : "Upload"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <Input placeholder="Search documents..." className="max-w-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Category</TableHead><TableHead>Size</TableHead><TableHead>Date</TableHead><TableHead className="w-[80px]"></TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow>}
              {filtered?.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-500">No documents</TableCell></TableRow>}
              {filtered?.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="flex items-center gap-2">{fileIcon(d.fileType)} <span className="font-medium">{d.name}</span></TableCell>
                  <TableCell><Badge variant="outline">{d.fileType?.split("/")[1] || "file"}</Badge></TableCell>
                  <TableCell>{d.category || "—"}</TableCell>
                  <TableCell className="text-gray-500">{formatSize(d.fileSize)}</TableCell>
                  <TableCell className="text-gray-500">{d.createdAt ? new Date(d.createdAt).toLocaleDateString() : "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" asChild>
                        <a href={d.fileUrl} target="_blank" rel="noopener noreferrer"><Eye className="w-4 h-4 text-gray-500" /></a>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(d.id)}>
                        <Trash className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Document</DialogTitle>
            <DialogDescription>Are you sure you want to delete this document? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && deleteDoc.mutate({ id: deleteId })} disabled={deleteDoc.isPending}>
              {deleteDoc.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
