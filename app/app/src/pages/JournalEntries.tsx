import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Check, X, Trash } from "lucide-react";
import { toast } from "sonner";

export default function JournalEntries() {
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<{ accountId: number; description: string; debit: string; credit: string }[]>([
    { accountId: 0, description: "", debit: "", credit: "" },
  ]);
  const { data: entries, isLoading, refetch } = trpc.journalEntry.list.useQuery();
  const { data: accounts } = trpc.account.list.useQuery();
  const { data: nextNumber } = trpc.journalEntry.nextNumber.useQuery();

  const createEntry = trpc.journalEntry.create.useMutation({
    onSuccess: () => {
      setOpen(false);
      refetch();
      setLines([{ accountId: 0, description: "", debit: "", credit: "" }]);
      toast.success("Journal entry created");
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteEntry = trpc.journalEntry.delete.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Journal entry deleted");
    },
  });

  const formatCurrency = (v: string | number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(v));

  const addLine = () => setLines([...lines, { accountId: 0, description: "", debit: "", credit: "" }]);
  const removeLine = (i: number) => setLines(lines.filter((_, idx) => idx !== i));
  const updateLine = (i: number, field: string, value: string | number) => {
    const newLines = [...lines];
    newLines[i] = { ...newLines[i], [field]: value };
    setLines(newLines);
  };

  const totalDebits = lines.reduce((s, l) => s + parseFloat(l.debit || "0"), 0);
  const totalCredits = lines.reduce((s, l) => s + parseFloat(l.credit || "0"), 0);
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01 && totalDebits > 0;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const validLines = lines.filter((l) => l.accountId > 0 && (parseFloat(l.debit || "0") > 0 || parseFloat(l.credit || "0") > 0));

    if (validLines.length < 2) {
      toast.error("At least 2 lines required");
      return;
    }

    createEntry.mutate({
      entryNumber: form.get("entryNumber") as string || nextNumber || "JE-0001",
      date: form.get("date") as string,
      reference: form.get("reference") as string || undefined,
      description: form.get("description") as string,
      lines: validLines.map((l) => ({
        accountId: l.accountId,
        description: l.description || undefined,
        debit: l.debit || "0",
        credit: l.credit || "0",
      })),
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Journal Entries</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">General ledger transactions</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" /> New Entry</Button></DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Journal Entry</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2"><Label>Entry #</Label><Input name="entryNumber" defaultValue={nextNumber || ""} /></div>
                <div className="space-y-2"><Label>Date</Label><Input name="date" type="date" defaultValue={new Date().toISOString().split("T")[0]} required /></div>
                <div className="space-y-2"><Label>Reference</Label><Input name="reference" placeholder="Optional" /></div>
              </div>
              <div className="space-y-2"><Label>Description</Label><Input name="description" placeholder="Journal entry description" required /></div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>Account</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Debit</TableHead><TableHead className="text-right">Credit</TableHead><TableHead></TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {lines.map((line, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Select value={String(line.accountId || "")} onValueChange={(v) => updateLine(i, "accountId", Number(v))}>
                            <SelectTrigger className="w-48"><SelectValue placeholder="Select account" /></SelectTrigger>
                            <SelectContent>{accounts?.filter(a => a.isActive).map(a => <SelectItem key={a.id} value={String(a.id)}>{a.code} - {a.name}</SelectItem>)}</SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell><Input value={line.description} onChange={(e) => updateLine(i, "description", e.target.value)} className="w-40" /></TableCell>
                        <TableCell><Input value={line.debit} onChange={(e) => updateLine(i, "debit", e.target.value)} type="number" step="0.01" min="0" className="w-28 text-right" /></TableCell>
                        <TableCell><Input value={line.credit} onChange={(e) => updateLine(i, "credit", e.target.value)} type="number" step="0.01" min="0" className="w-28 text-right" /></TableCell>
                        <TableCell>{lines.length > 1 && <Button variant="ghost" size="icon" type="button" onClick={() => removeLine(i)}><X className="w-4 h-4" /></Button>}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <Button type="button" variant="outline" onClick={addLine} className="w-full">+ Add Line</Button>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  {isBalanced ? <Check className="w-5 h-5 text-green-600" /> : <X className="w-5 h-5 text-red-600" />}
                  <span className={isBalanced ? "text-green-700" : "text-red-700"}>{isBalanced ? "Balanced" : `Difference: ${formatCurrency(Math.abs(totalDebits - totalCredits))}`}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm">Total Debits: <span className="font-medium">{formatCurrency(totalDebits)}</span></p>
                  <p className="text-sm">Total Credits: <span className="font-medium">{formatCurrency(totalCredits)}</span></p>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={!isBalanced || createEntry.isPending}>
                {createEntry.isPending ? "Posting..." : "Post Entry"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>Journal Entries</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow><TableHead>Entry #</TableHead><TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead>Reference</TableHead><TableHead className="text-right">Debits</TableHead><TableHead className="text-right">Credits</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={8} className="text-center py-8">Loading...</TableCell></TableRow>}
              {entries?.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-8 text-gray-500">No journal entries</TableCell></TableRow>}
              {entries?.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-mono text-sm">{e.entryNumber}</TableCell>
                  <TableCell>{e.date ? new Date(e.date).toLocaleDateString() : "—"}</TableCell>
                  <TableCell className="font-medium">{e.description}</TableCell>
                  <TableCell className="text-gray-500">{e.reference || "—"}</TableCell>
                  <TableCell className="text-right text-green-600">{formatCurrency(e.totalDebits ?? "0")}</TableCell>
                  <TableCell className="text-right text-red-600">{formatCurrency(e.totalCredits ?? "0")}</TableCell>
                  <TableCell><Badge variant={e.isPosted ? "default" : "outline"}>{e.isPosted ? "Posted" : "Draft"}</Badge></TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => deleteEntry.mutate({ id: e.id })} disabled={deleteEntry.isPending}>
                      <Trash className="w-4 h-4 text-red-500" />
                    </Button>
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
