import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Trash, Pencil } from "lucide-react";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  inactive: "bg-gray-100 text-gray-500",
  terminated: "bg-red-100 text-red-700",
  on_leave: "bg-amber-100 text-amber-700",
};

export default function Employees() {
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const { data: employees, isLoading, refetch } = trpc.employee.list.useQuery();
  const createEmployee = trpc.employee.create.useMutation({
    onSuccess: () => { setOpen(false); refetch(); toast.success("Employee added"); },
    onError: (error) => toast.error(error.message),
  });
  const updateEmployee = trpc.employee.update.useMutation({
    onSuccess: () => { setEditId(null); refetch(); toast.success("Employee updated"); },
  });
  const deleteEmployee = trpc.employee.delete.useMutation({
    onSuccess: () => { setDeleteId(null); refetch(); toast.success("Employee deleted"); },
  });

  const formatCurrency = (v: string | number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(v));

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    createEmployee.mutate({
      employeeCode: form.get("code") as string,
      firstName: form.get("firstName") as string,
      lastName: form.get("lastName") as string,
      email: form.get("email") as string || undefined,
      phone: form.get("phone") as string || undefined,
      hireDate: form.get("hireDate") as string || undefined,
      department: form.get("department") as string || undefined,
      designation: form.get("designation") as string || undefined,
      salary: (form.get("salary") as string) || "0.00",
      payFrequency: (form.get("frequency") as any) || "monthly",
      bankName: form.get("bank") as string || undefined,
      bankAccount: form.get("account") as string || undefined,
      taxCode: form.get("tax") as string || undefined,
      address: form.get("address") as string || undefined,
    });
  };

  const filtered = employees?.filter((e) =>
    !search || e.firstName.toLowerCase().includes(search.toLowerCase()) || e.lastName.toLowerCase().includes(search.toLowerCase()) || e.employeeCode.toLowerCase().includes(search.toLowerCase())
  );

  const editingEmployee = employees?.find(e => e.id === editId);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Employees</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Team and HR management</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" /> Add Employee</Button></DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Add Employee</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Employee Code</Label><Input name="code" required /></div>
                <div className="space-y-2"><Label>First Name</Label><Input name="firstName" required /></div>
              </div>
              <div className="space-y-2"><Label>Last Name</Label><Input name="lastName" required /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Email</Label><Input name="email" type="email" /></div>
                <div className="space-y-2"><Label>Phone</Label><Input name="phone" /></div>
              </div>
              <div className="space-y-2"><Label>Hire Date</Label><Input name="hireDate" type="date" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Department</Label><Input name="department" /></div>
                <div className="space-y-2"><Label>Designation</Label><Input name="designation" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Salary</Label><Input name="salary" type="number" step="0.01" /></div>
                <div className="space-y-2"><Label>Pay Frequency</Label>
                  <Select name="frequency" defaultValue="monthly"><SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="weekly">Weekly</SelectItem><SelectItem value="biweekly">Bi-weekly</SelectItem><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="quarterly">Quarterly</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Bank Name</Label><Input name="bank" /></div>
                <div className="space-y-2"><Label>Account #</Label><Input name="account" /></div>
              </div>
              <div className="space-y-2"><Label>Tax Code</Label><Input name="tax" /></div>
              <div className="space-y-2"><Label>Address</Label><Input name="address" /></div>
              <Button type="submit" className="w-full" disabled={createEmployee.isPending}>{createEmployee.isPending ? "Adding..." : "Add Employee"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input placeholder="Search employees..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow><TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Department</TableHead><TableHead>Designation</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Salary</TableHead><TableHead className="w-[80px]"></TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow>}
              {filtered?.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-gray-500">No employees</TableCell></TableRow>}
              {filtered?.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-mono text-sm">{e.employeeCode}</TableCell>
                  <TableCell className="font-medium">{e.firstName} {e.lastName}</TableCell>
                  <TableCell>{e.department || "—"}</TableCell>
                  <TableCell>{e.designation || "—"}</TableCell>
                  <TableCell><Badge className={statusColors[e.status || "active"] || ""}>{e.status}</Badge></TableCell>
                  <TableCell className="text-right">{formatCurrency(e.salary ?? "0")}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" onClick={() => setEditId(e.id)}><Pencil className="w-4 h-4 text-gray-400" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(e.id)}><Trash className="w-4 h-4 text-red-500" /></Button>
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Employee</DialogTitle></DialogHeader>
          {editingEmployee && (
            <form onSubmit={(e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              updateEmployee.mutate({
                id: editId!,
                firstName: form.get("firstName") as string,
                lastName: form.get("lastName") as string,
                department: form.get("department") as string || undefined,
                designation: form.get("designation") as string || undefined,
                salary: (form.get("salary") as string) || "0.00",
                status: form.get("status") as any || undefined,
              });
            }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>First Name</Label><Input name="firstName" defaultValue={editingEmployee.firstName} required /></div>
                <div className="space-y-2"><Label>Last Name</Label><Input name="lastName" defaultValue={editingEmployee.lastName} required /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Department</Label><Input name="department" defaultValue={editingEmployee.department || ""} /></div>
                <div className="space-y-2"><Label>Designation</Label><Input name="designation" defaultValue={editingEmployee.designation || ""} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Salary</Label><Input name="salary" type="number" step="0.01" defaultValue={editingEmployee.salary || ""} /></div>
                <div className="space-y-2"><Label>Status</Label>
                  <Select name="status" defaultValue={editingEmployee.status || "active"}><SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem><SelectItem value="on_leave">On Leave</SelectItem><SelectItem value="terminated">Terminated</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={updateEmployee.isPending}>{updateEmployee.isPending ? "Saving..." : "Save Changes"}</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Employee</DialogTitle>
            <DialogDescription>Are you sure you want to delete this employee? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && deleteEmployee.mutate({ id: deleteId })} disabled={deleteEmployee.isPending}>
              {deleteEmployee.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
