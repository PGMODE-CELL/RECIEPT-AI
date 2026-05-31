import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, FolderKanban, CheckCircle2, Circle, Clock, AlertCircle, Trash, Pencil } from "lucide-react";
import { toast } from "sonner";

const statusConfig: Record<string, { color: string; icon: any }> = {
  active: { color: "bg-blue-100 text-blue-700", icon: Clock },
  completed: { color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  on_hold: { color: "bg-amber-100 text-amber-700", icon: AlertCircle },
  cancelled: { color: "bg-gray-100 text-gray-500", icon: Circle },
};

export default function Projects() {
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const { data: projectsRaw, isLoading, refetch } = trpc.project.list.useQuery();
  const projects = projectsRaw?.map(p => ({ ...p, tasks: (p as any).tasks }));
  const { data: contacts } = trpc.contact.list.useQuery();

  const createProject = trpc.project.create.useMutation({
    onSuccess: () => { setOpen(false); refetch(); toast.success("Project created"); },
    onError: (error) => toast.error(error.message),
  });
  const updateProject = trpc.project.update.useMutation({
    onSuccess: () => { setEditId(null); refetch(); toast.success("Project updated"); },
  });
  const deleteProject = trpc.project.delete.useMutation({
    onSuccess: () => { setDeleteId(null); refetch(); toast.success("Project deleted"); },
  });
  const createTask = trpc.project.createTask.useMutation({ onSuccess: () => { refetch(); toast.success("Task added"); } });
  const updateTask = trpc.project.updateTask.useMutation({ onSuccess: () => refetch() });
  const deleteTask = trpc.project.deleteTask.useMutation({ onSuccess: () => { refetch(); toast.success("Task deleted"); } });

  const formatCurrency = (v: string | number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(v));

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    createProject.mutate({
      name: form.get("name") as string,
      description: form.get("description") as string || undefined,
      startDate: form.get("start") as string || undefined,
      endDate: form.get("end") as string || undefined,
      budget: (form.get("budget") as string) || undefined,
      contactId: form.get("contact") ? Number(form.get("contact")) : undefined,
    });
  };

  const handleAddTask = (projectId: number, e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    createTask.mutate({
      projectId,
      title: form.get("title") as string,
      description: form.get("desc") as string || undefined,
      priority: (form.get("priority") as "low" | "medium" | "high" | "urgent") || "medium",
      dueDate: form.get("due") as string || undefined,
    });
  };

  const editingProject = projects?.find(p => p.id === editId);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Projects</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Track projects and tasks</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" /> New Project</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Create Project</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2"><Label>Name</Label><Input name="name" required /></div>
              <div className="space-y-2"><Label>Description</Label><Input name="description" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Start Date</Label><Input name="start" type="date" /></div>
                <div className="space-y-2"><Label>End Date</Label><Input name="end" type="date" /></div>
              </div>
              <div className="space-y-2"><Label>Budget</Label><Input name="budget" type="number" step="0.01" /></div>
              <div className="space-y-2"><Label>Client</Label>
                <Select name="contact"><SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                  <SelectContent>{contacts?.filter(c => c.type === "customer" || c.type === "both").map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={createProject.isPending}>{createProject.isPending ? "Creating..." : "Create Project"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading && Array.from({ length: 3 }).map((_, i) => <Card key={i}><CardContent className="p-6"><div className="animate-pulse h-32 bg-gray-200 rounded" /></CardContent></Card>)}
        {projects?.length === 0 && <Card className="col-span-full"><CardContent className="p-8 text-center text-gray-500">No projects yet</CardContent></Card>}
        {projects?.map((p) => {
          const cfg = statusConfig[p.status || "active"] || statusConfig.active;
          const StatusIcon = cfg.icon;
          const budgetPct = p.budget && Number(p.budget) > 0 ? Math.min(100, (Number(p.actualCost) / Number(p.budget)) * 100) : 0;
          return (
            <Card key={p.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FolderKanban className="w-5 h-5 text-indigo-500" />
                    <h3 className="font-semibold text-gray-900 dark:text-white">{p.name}</h3>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge className={cfg.color}><StatusIcon className="w-3 h-3 mr-1" />{p.status}</Badge>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditId(p.id)}><Pencil className="w-3 h-3" /></Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setDeleteId(p.id)}><Trash className="w-3 h-3 text-red-500" /></Button>
                  </div>
                </div>
                {p.description && <p className="text-sm text-gray-500 line-clamp-2">{p.description}</p>}
                {p.budget && Number(p.budget) > 0 && (
                  <div>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Budget Used</span><span>{budgetPct.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-indigo-500 h-2 rounded-full transition-all" style={{ width: `${budgetPct}%` }} />
                    </div>
                    <div className="flex justify-between text-xs mt-1">
                      <span className="text-gray-500">{formatCurrency(p.actualCost || 0)}</span>
                      <span className="text-gray-500">{formatCurrency(p.budget)}</span>
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{p.tasks?.length || 0} tasks</span>
                  <span>{p.startDate ? new Date(p.startDate).toLocaleDateString() : "—"} - {p.endDate ? new Date(p.endDate).toLocaleDateString() : "—"}</span>
                </div>
                {/* Quick add task */}
                <Dialog>
                  <DialogTrigger asChild><Button variant="ghost" size="sm" className="w-full"><Plus className="w-3 h-3 mr-1" /> Add Task</Button></DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader><DialogTitle>Add Task to {p.name}</DialogTitle></DialogHeader>
                    <form onSubmit={(e) => handleAddTask(p.id, e)} className="space-y-3">
                      <div className="space-y-2"><Label>Title</Label><Input name="title" required /></div>
                      <div className="space-y-2"><Label>Description</Label><Input name="desc" /></div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Priority</Label>
                          <Select name="priority" defaultValue="medium"><SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="urgent">Urgent</SelectItem></SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2"><Label>Due Date</Label><Input name="due" type="date" /></div>
                      </div>
                      <Button type="submit" className="w-full">Add Task</Button>
                    </form>
                  </DialogContent>
                </Dialog>
                {/* Tasks */}
                {p.tasks && p.tasks.length > 0 && (
                  <div className="space-y-1 pt-2 border-t">
                    {p.tasks.slice(0, 5).map((t: any) => (
                      <div key={t.id} className="flex items-center justify-between text-sm group">
                        <div className="flex items-center gap-2">
                          <button onClick={() => updateTask.mutate({ id: t.id, status: t.status === "done" ? "todo" : "done" })}>
                            {t.status === "done" ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Circle className="w-4 h-4 text-gray-300" />}
                          </button>
                          <span className={t.status === "done" ? "line-through text-gray-400" : ""}>{t.title}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="text-xs">{t.priority}</Badge>
                          <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100" onClick={() => deleteTask.mutate({ id: t.id })}>
                            <Trash className="w-3 h-3 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editId !== null} onOpenChange={() => setEditId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Project</DialogTitle></DialogHeader>
          {editingProject && (
            <form onSubmit={(e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              updateProject.mutate({
                id: editId!,
                name: form.get("name") as string,
                description: form.get("description") as string || undefined,
                status: form.get("status") as any || undefined,
                budget: (form.get("budget") as string) || undefined,
              });
            }} className="space-y-4">
              <div className="space-y-2"><Label>Name</Label><Input name="name" defaultValue={editingProject.name} required /></div>
              <div className="space-y-2"><Label>Description</Label><Input name="description" defaultValue={editingProject.description || ""} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Status</Label>
                  <Select name="status" defaultValue={editingProject.status || "active"}><SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="on_hold">On Hold</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Budget</Label><Input name="budget" type="number" step="0.01" defaultValue={editingProject.budget || ""} /></div>
              </div>
              <Button type="submit" className="w-full" disabled={updateProject.isPending}>{updateProject.isPending ? "Saving..." : "Save Changes"}</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>Are you sure you want to delete this project and all its tasks? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && deleteProject.mutate({ id: deleteId })} disabled={deleteProject.isPending}>
              {deleteProject.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
