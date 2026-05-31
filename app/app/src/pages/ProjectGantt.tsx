import { useState, useMemo } from "react";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Calendar, Link2, AlertCircle, Flag, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import { toast } from "sonner";

interface Task {
  id: number;
  name: string;
  start: string;
  end: string;
  progress: number;
  dependencies: number[];
  isMilestone: boolean;
  isCritical: boolean;
  assignee: string;
  color: string;
}

const generateDates = (start: string, days: number) => {
  const dates: string[] = [];
  const d = new Date(start);
  for (let i = 0; i < days; i++) {
    dates.push(d.toISOString().split("T")[0]);
    d.setDate(d.getDate() + 1);
  }
  return dates;
};

const calculateCriticalPath = (tasks: Task[]): number[] => {
  const critical: number[] = [];
  const endDates = tasks.map(t => ({ id: t.id, end: new Date(t.end).getTime() }));
  endDates.sort((a, b) => b.end - a.end);
  const longestEnd = endDates[0]?.end || 0;
  tasks.forEach(t => {
    if (new Date(t.end).getTime() === longestEnd) critical.push(t.id);
  });
  return critical;
};

function mapProjectToTasks(projects: any[]): Task[] {
  if (projects.length === 0) {
    return [
      { id: 1, name: "Requirements Gathering", start: "2026-05-01", end: "2026-05-08", progress: 100, dependencies: [], isMilestone: false, isCritical: true, assignee: "Alice", color: "#3b82f6" },
      { id: 2, name: "UI/UX Design", start: "2026-05-09", end: "2026-05-18", progress: 80, dependencies: [1], isMilestone: false, isCritical: true, assignee: "Bob", color: "#8b5cf6" },
      { id: 3, name: "Design Review", start: "2026-05-18", end: "2026-05-18", progress: 60, dependencies: [2], isMilestone: true, isCritical: true, assignee: "Team", color: "#f59e0b" },
      { id: 4, name: "Backend Development", start: "2026-05-19", end: "2026-06-05", progress: 40, dependencies: [3], isMilestone: false, isCritical: true, assignee: "Charlie", color: "#10b981" },
      { id: 5, name: "Frontend Development", start: "2026-05-19", end: "2026-06-02", progress: 50, dependencies: [3], isMilestone: false, isCritical: false, assignee: "Diana", color: "#06b6d4" },
      { id: 6, name: "API Integration", start: "2026-06-03", end: "2026-06-10", progress: 0, dependencies: [4, 5], isMilestone: false, isCritical: true, assignee: "Charlie", color: "#ec4899" },
      { id: 7, name: "Testing", start: "2026-06-11", end: "2026-06-18", progress: 0, dependencies: [6], isMilestone: false, isCritical: true, assignee: "Eve", color: "#ef4444" },
      { id: 8, name: "Deployment", start: "2026-06-19", end: "2026-06-19", progress: 0, dependencies: [7], isMilestone: true, isCritical: true, assignee: "DevOps", color: "#f97316" },
    ];
  }
  return projects.map((p, idx) => {
    const startDate = p.startDate ? new Date(p.startDate) : new Date();
    const endDate = p.endDate ? new Date(p.endDate) : new Date(startDate.getTime() + 14 * 86400000);
    const colors = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#06b6d4", "#f97316"];
    return {
      id: p.id || idx,
      name: p.name || `Project ${idx + 1}`,
      start: startDate.toISOString().split("T")[0],
      end: endDate.toISOString().split("T")[0],
      progress: p.status === "completed" ? 100 : p.status === "active" ? 50 : 0,
      dependencies: idx > 0 ? [projects[idx - 1]?.id || idx] : [],
      isMilestone: false,
      isCritical: idx < 3,
      assignee: p.contactName || "Unassigned",
      color: colors[idx % colors.length],
    };
  });
}

export default function ProjectGantt() {
  const { data: projects = [] } = trpc.project.list.useQuery();
  const projectStart = "2026-05-01";
  const projectDays = 60;
  const dates = useMemo(() => generateDates(projectStart, projectDays), []);

  const initialTasks = useMemo(() => mapProjectToTasks(projects), [projects]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState<number | null>(null);

  const effectiveTasks = tasks.length > 0 ? tasks : initialTasks;
  const criticalPath = useMemo(() => calculateCriticalPath(effectiveTasks), [effectiveTasks]);

  const dayWidth = 24 * zoom;
  const rowHeight = 40;

  const getBarStyle = (task: Task) => {
    const startIdx = dates.indexOf(task.start);
    const endIdx = dates.indexOf(task.end);
    if (startIdx === -1 || endIdx === -1) return {};
    const width = (endIdx - startIdx + 1) * dayWidth;
    return {
      left: startIdx * dayWidth,
      width: Math.max(width, dayWidth),
    };
  };

  const [newTask, setNewTask] = useState({ name: "", start: "", end: "", assignee: "" });

  const addTask = () => {
    if (!newTask.name || !newTask.start || !newTask.end) { toast.error("Fill all fields"); return; }
    setTasks([...effectiveTasks, {
      id: Date.now(),
      name: newTask.name,
      start: newTask.start,
      end: newTask.end,
      progress: 0,
      dependencies: [],
      isMilestone: false,
      isCritical: false,
      assignee: newTask.assignee || "Unassigned",
      color: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0")}`,
    }]);
    setDialogOpen(false);
    setNewTask({ name: "", start: "", end: "", assignee: "" });
    toast.success("Task added");
  };

  const updateProgress = (id: number, progress: number) => {
    setTasks(effectiveTasks.map(t => t.id === id ? { ...t, progress } : t));
  };

  const todayIdx = dates.indexOf(new Date().toISOString().split("T")[0]);

  return (
    <TooltipProvider>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Project Gantt Chart</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Visual timeline with dependencies and critical path</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}><ZoomOut className="w-4 h-4" /></Button>
            <Button variant="outline" size="sm" onClick={() => setZoom(z => Math.min(2, z + 0.25))}><ZoomIn className="w-4 h-4" /></Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" /> Add Task</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add Task</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div><Label>Task Name</Label><Input value={newTask.name} onChange={e => setNewTask({ ...newTask, name: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Start Date</Label><Input type="date" value={newTask.start} onChange={e => setNewTask({ ...newTask, start: e.target.value })} /></div>
                    <div><Label>End Date</Label><Input type="date" value={newTask.end} onChange={e => setNewTask({ ...newTask, end: e.target.value })} /></div>
                  </div>
                  <div><Label>Assignee</Label><Input value={newTask.assignee} onChange={e => setNewTask({ ...newTask, assignee: e.target.value })} /></div>
                  <Button onClick={addTask} className="w-full">Add Task</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-red-500" /> Critical Path</div>
          <div className="flex items-center gap-1"><Flag className="w-3 h-3 text-amber-500" /> Milestone</div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-blue-400" /> Task</div>
          <div className="flex items-center gap-1"><div className="w-px h-4 bg-red-500 border-dashed" /> Today</div>
        </div>

        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="flex">
              <div className="w-56 flex-shrink-0 border-r bg-gray-50 dark:bg-gray-900">
                <div className="h-10 border-b px-3 flex items-center font-semibold text-sm">Task</div>
                {effectiveTasks.map(task => (
                  <div key={task.id} className="border-b px-3 flex items-center gap-2" style={{ height: rowHeight }}>
                    {task.isMilestone && <Flag className="w-3 h-3 text-amber-500 flex-shrink-0" />}
                    <span className="text-sm truncate">{task.name}</span>
                    {task.isCritical && <AlertCircle className="w-3 h-3 text-red-500 flex-shrink-0" />}
                  </div>
                ))}
              </div>

              <div className="flex-1 overflow-x-auto">
                <div className="flex h-10 border-b bg-gray-50 dark:bg-gray-900 sticky top-0">
                  {dates.map((d, i) => (
                    <div key={d} className={`flex-shrink-0 border-r px-1 flex flex-col items-center justify-center text-xs ${i === todayIdx ? "bg-blue-100 dark:bg-blue-900 font-bold" : ""}`} style={{ width: dayWidth }}>
                      <span>{new Date(d).getDate()}</span>
                      <span className="text-[10px] text-gray-400">{new Date(d).toLocaleDateString("en", { month: "short" })}</span>
                    </div>
                  ))}
                </div>

                <div className="relative">
                  {effectiveTasks.map((task) => {
                    const style = getBarStyle(task);
                    const isOnCritical = criticalPath.includes(task.id);
                    return (
                      <div key={task.id} className="border-b relative" style={{ height: rowHeight }}>
                        {todayIdx >= 0 && (
                          <div className="absolute top-0 bottom-0 w-px bg-red-400 border-l border-dashed z-10" style={{ left: todayIdx * dayWidth }} />
                        )}
                        {task.dependencies.map(depId => {
                          const dep = effectiveTasks.find(t => t.id === depId);
                          if (!dep) return null;
                          const depStyle = getBarStyle(dep);
                          return (
                            <svg key={depId} className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ zIndex: 5 }}>
                              <line
                                x1={(depStyle.left || 0) + (depStyle.width || 0)}
                                y1={rowHeight / 2}
                                x2={style.left || 0}
                                y2={rowHeight / 2}
                                stroke="#94a3b8"
                                strokeWidth="1.5"
                                strokeDasharray="4 2"
                              />
                            </svg>
                          );
                        })}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className={`absolute top-1.5 rounded cursor-pointer transition-all ${isOnCritical ? "ring-2 ring-red-500" : ""}`}
                              style={{
                                left: style.left,
                                width: style.width,
                                height: rowHeight - 12,
                                backgroundColor: task.color,
                                opacity: task.progress === 100 ? 1 : 0.85,
                              }}
                            >
                              <div className="h-full rounded-l" style={{ width: `${task.progress}%`, backgroundColor: "rgba(0,0,0,0.2)" }} />
                              <span className="absolute inset-0 flex items-center justify-center text-xs text-white font-medium truncate px-2">
                                {task.isMilestone ? "◆" : `${task.progress}%`}
                              </span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="font-semibold">{task.name}</p>
                            <p className="text-xs">{task.start} → {task.end}</p>
                            <p className="text-xs">Assigned: {task.assignee}</p>
                            <p className="text-xs">Progress: {task.progress}%</p>
                            {isOnCritical && <p className="text-xs text-red-500 font-bold">Critical Path</p>}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Task Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {effectiveTasks.filter(t => !t.isMilestone).map(task => (
                <div key={task.id} className="flex items-center gap-4">
                  <span className="w-48 text-sm truncate">{task.name}</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={task.progress}
                    onChange={e => updateProgress(task.id, +e.target.value)}
                    className="flex-1"
                  />
                  <span className="w-12 text-sm text-right">{task.progress}%</span>
                  {criticalPath.includes(task.id) && <Badge className="bg-red-100 text-red-700 text-xs">Critical</Badge>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
