import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { useNavigate } from "react-router";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Users, Building2, UserCircle, Trash, Pencil, Eye } from "lucide-react";
import { toast } from "sonner";
import { trackContactCreated } from "@/lib/analytics";

export default function Contacts() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const { data: contacts, isLoading, refetch } = trpc.contact.list.useQuery();
  const createContact = trpc.contact.create.useMutation({
    onSuccess: (result) => { setOpen(false); refetch(); trackContactCreated(result.id); toast.success("Contact created"); },
    onError: (error) => toast.error(error.message),
  });
  const updateContact = trpc.contact.update.useMutation({
    onSuccess: () => { setEditId(null); refetch(); toast.success("Contact updated"); },
  });
  const deleteContact = trpc.contact.delete.useMutation({
    onSuccess: () => { setDeleteId(null); refetch(); toast.success("Contact deleted"); },
    onError: (error) => toast.error(error.message),
  });

  const formatCurrency = (v: string | number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(v));

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    createContact.mutate({
      type: form.get("type") as any,
      name: form.get("name") as string,
      companyName: form.get("company") as string || undefined,
      email: form.get("email") as string || undefined,
      phone: form.get("phone") as string || undefined,
      taxId: form.get("taxId") as string || undefined,
      address: form.get("address") as string || undefined,
      city: form.get("city") as string || undefined,
      country: form.get("country") as string || undefined,
      paymentTerms: Number(form.get("terms")) || undefined,
      notes: form.get("notes") as string || undefined,
    });
  };

  const filtered = contacts?.filter((c) => {
    if (filter !== "all" && c.type !== filter) return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.email?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const typeIcon = (type: string) => {
    if (type === "customer") return <UserCircle className="w-4 h-4 text-blue-500" />;
    if (type === "vendor") return <Building2 className="w-4 h-4 text-amber-500" />;
    return <Users className="w-4 h-4 text-purple-500" />;
  };

  const editingContact = contacts?.find(c => c.id === editId);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Contacts</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Customers, vendors, and employees</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" /> Add Contact</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Add Contact</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Type</Label>
                  <Select name="type" required><SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="customer">Customer</SelectItem><SelectItem value="vendor">Vendor</SelectItem><SelectItem value="both">Both</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Name *</Label><Input name="name" required /></div>
              </div>
              <div className="space-y-2"><Label>Company</Label><Input name="company" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Email</Label><Input name="email" type="email" /></div>
                <div className="space-y-2"><Label>Phone</Label><Input name="phone" /></div>
              </div>
              <div className="space-y-2"><Label>Tax ID</Label><Input name="taxId" /></div>
              <div className="space-y-2"><Label>Address</Label><Input name="address" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>City</Label><Input name="city" /></div>
                <div className="space-y-2"><Label>Country</Label><Input name="country" /></div>
              </div>
              <div className="space-y-2"><Label>Payment Terms (days)</Label><Input name="terms" type="number" defaultValue="30" /></div>
              <div className="space-y-2"><Label>Notes</Label><Input name="notes" /></div>
              <Button type="submit" className="w-full" disabled={createContact.isPending}>{createContact.isPending ? "Adding..." : "Add Contact"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Search contacts..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="All Types" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="customer">Customers</SelectItem><SelectItem value="vendor">Vendors</SelectItem><SelectItem value="both">Both</SelectItem></SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Company</TableHead><TableHead>Email</TableHead><TableHead>Phone</TableHead><TableHead className="text-right">Balance</TableHead><TableHead className="w-[100px]"></TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow>}
              {filtered?.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-gray-500">No contacts</TableCell></TableRow>}
              {filtered?.map((c) => (
                <TableRow key={c.id} className="cursor-pointer hover:bg-gray-50" onClick={() => navigate(`/contacts/${c.id}`)}>
                  <TableCell className="font-medium flex items-center gap-2">{typeIcon(c.type)} {c.name}</TableCell>
                  <TableCell><Badge variant="outline">{c.type}</Badge></TableCell>
                  <TableCell>{c.companyName || "—"}</TableCell>
                  <TableCell>{c.email || "—"}</TableCell>
                  <TableCell>{c.phone || "—"}</TableCell>
                  <TableCell className="text-right">{formatCurrency(c.balance ?? "0")}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" onClick={() => navigate(`/contacts/${c.id}`)}><Eye className="w-4 h-4 text-gray-400" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setEditId(c.id)}><Pencil className="w-4 h-4 text-gray-400" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(c.id)}><Trash className="w-4 h-4 text-red-500" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editId !== null} onOpenChange={() => setEditId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Contact</DialogTitle></DialogHeader>
          {editingContact && (
            <form onSubmit={(e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              updateContact.mutate({
                id: editId!,
                type: form.get("type") as any || editingContact.type,
                name: form.get("name") as string,
                companyName: form.get("company") as string || undefined,
                email: form.get("email") as string || undefined,
                phone: form.get("phone") as string || undefined,
                taxId: form.get("taxId") as string || undefined,
                address: form.get("address") as string || undefined,
                city: form.get("city") as string || undefined,
                country: form.get("country") as string || undefined,
                paymentTerms: Number(form.get("terms")) || undefined,
                notes: form.get("notes") as string || undefined,
              });
            }} className="space-y-4">
              <div className="space-y-2"><Label>Type</Label>
                <Select name="type" defaultValue={editingContact.type}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="customer">Customer</SelectItem><SelectItem value="vendor">Vendor</SelectItem><SelectItem value="both">Both</SelectItem></SelectContent>
                </Select></div>
              <div className="space-y-2"><Label>Name *</Label><Input name="name" defaultValue={editingContact.name} required /></div>
              <div className="space-y-2"><Label>Company</Label><Input name="company" defaultValue={editingContact.companyName || ""} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Email</Label><Input name="email" type="email" defaultValue={editingContact.email || ""} /></div>
                <div className="space-y-2"><Label>Phone</Label><Input name="phone" defaultValue={editingContact.phone || ""} /></div>
              </div>
              <div className="space-y-2"><Label>Tax ID</Label><Input name="taxId" defaultValue={editingContact.taxId || ""} /></div>
              <div className="space-y-2"><Label>Address</Label><Input name="address" defaultValue={editingContact.address || ""} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>City</Label><Input name="city" defaultValue={editingContact.city || ""} /></div>
                <div className="space-y-2"><Label>Country</Label><Input name="country" defaultValue={editingContact.country || ""} /></div>
              </div>
              <div className="space-y-2"><Label>Payment Terms (days)</Label><Input name="terms" type="number" defaultValue={editingContact.paymentTerms || 30} /></div>
              <div className="space-y-2"><Label>Notes</Label><Input name="notes" defaultValue={editingContact.notes || ""} /></div>
              <Button type="submit" className="w-full" disabled={updateContact.isPending}>{updateContact.isPending ? "Saving..." : "Save Changes"}</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Contact</DialogTitle>
            <DialogDescription>Are you sure you want to delete this contact? This will fail if they have linked invoices or bills.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && deleteContact.mutate({ id: deleteId })} disabled={deleteContact.isPending}>
              {deleteContact.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
