"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  GitBranch, Play, Pause, Trash2, Plus, Zap, CheckCircle2, XCircle,
  Clock, Settings, ArrowRight, Workflow, Copy, History, ToggleLeft, ToggleRight,
} from "lucide-react";

interface WorkflowNode {
  id: string;
  type: "trigger" | "condition" | "action";
  label: string;
  description: string;
  config: Record<string, string>;
}

interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  nodes: WorkflowNode[];
  enabled: boolean;
  createdBy: string;
  lastRun: string;
  runCount: number;
  successRate: number;
}

interface WorkflowExecution {
  id: string;
  workflowId: string;
  workflowName: string;
  status: "success" | "failed" | "running" | "pending";
  triggeredAt: string;
  completedAt: string;
  duration: string;
  stepsCompleted: number;
  totalSteps: number;
}



function WorkflowNodeCard({ node, index, total }: { node: WorkflowNode; index: number; total: number }) {
  const typeConfig = {
    trigger: { color: "bg-blue-100 border-blue-300 text-blue-800", icon: Zap },
    condition: { color: "bg-yellow-100 border-yellow-300 text-yellow-800", icon: GitBranch },
    action: { color: "bg-green-100 border-green-300 text-green-800", icon: Play },
  };
  const config = typeConfig[node.type];
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-2">
      <div className={`p-3 rounded-lg border-2 ${config.color} min-w-[200px]`}>
        <div className="flex items-center gap-2 mb-1">
          <Icon className="h-4 w-4" />
          <span className="text-xs font-medium uppercase">{node.type}</span>
        </div>
        <div className="font-medium text-sm">{node.label}</div>
        <div className="text-xs opacity-75 mt-1">{node.description}</div>
      </div>
      {index < total - 1 && (
        <ArrowRight className="h-5 w-5 text-gray-400 shrink-0" />
      )}
    </div>
  );
}

export default function WorkflowDesigner() {
  // TODO: replace with trpc.audit.list when workflow definitions endpoint exists
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([]);
  const [executions] = useState<WorkflowExecution[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newWorkflowName, setNewWorkflowName] = useState("");
  const [newWorkflowDesc, setNewWorkflowDesc] = useState("");

  const { data: invoiceData } = trpc.invoice.list.useQuery({ limit: 10 });
  const { data: billData } = trpc.bill.list.useQuery({ limit: 10 });

  const toggleWorkflow = (id: string) => {
    setWorkflows((prev) =>
      prev.map((wf) => (wf.id === id ? { ...wf, enabled: !wf.enabled } : wf))
    );
    const wf = workflows.find((w) => w.id === id);
    toast.success(`${wf?.name} ${wf?.enabled ? "disabled" : "enabled"}`);
  };

  const deleteWorkflow = (id: string) => {
    setWorkflows((prev) => prev.filter((wf) => wf.id !== id));
    toast.info("Workflow deleted");
  };

  const duplicateWorkflow = (id: string) => {
    const original = workflows.find((wf) => wf.id === id);
    if (!original) return;
    const copy: WorkflowDefinition = {
      ...original,
      id: `wf${Date.now()}`,
      name: `${original.name} (Copy)`,
      enabled: false,
      runCount: 0,
      lastRun: "Never",
    };
    setWorkflows((prev) => [...prev, copy]);
    toast.success("Workflow duplicated");
  };

  const createWorkflow = () => {
    if (!newWorkflowName.trim()) {
      toast.error("Please enter a workflow name");
      return;
    }
    const newWf: WorkflowDefinition = {
      id: `wf${Date.now()}`,
      name: newWorkflowName,
      description: newWorkflowDesc,
      enabled: false,
      createdBy: "You",
      lastRun: "Never",
      runCount: 0,
      successRate: 0,
      nodes: [
        { id: "n1", type: "trigger", label: "New Trigger", description: "Configure trigger", config: {} },
      ],
    };
    setWorkflows((prev) => [...prev, newWf]);
    setNewWorkflowName("");
    setNewWorkflowDesc("");
    setCreateDialogOpen(false);
    toast.success("Workflow created");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success": return "bg-green-100 text-green-800";
      case "failed": return "bg-red-100 text-red-800";
      case "running": return "bg-blue-100 text-blue-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Workflow className="h-8 w-8 text-indigo-600" />
            Workflow Designer
          </h1>
          <p className="text-muted-foreground mt-1">
            Design and automate approval workflows with visual drag-and-drop
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="mr-2 h-4 w-4" />
              New Workflow
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Workflow</DialogTitle>
              <DialogDescription>Define a new automation workflow for your team.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Workflow Name</Label>
                <Input placeholder="e.g. Purchase Order Approval" value={newWorkflowName} onChange={(e) => setNewWorkflowName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input placeholder="What does this workflow do?" value={newWorkflowDesc} onChange={(e) => setNewWorkflowDesc(e.target.value)} />
              </div>
              <Button onClick={createWorkflow} className="w-full">Create Workflow</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Workflows</CardDescription>
            <CardTitle className="text-2xl">{workflows.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline">{workflows.filter((w) => w.enabled).length} active</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Executions</CardDescription>
            <CardTitle className="text-2xl">{workflows.reduce((acc, w) => acc + w.runCount, 0)}</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className="bg-blue-100 text-blue-800"><Play className="mr-1 h-3 w-3" /> This month</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg Success Rate</CardDescription>
            <CardTitle className="text-2xl">
              {workflows.length > 0 ? (workflows.reduce((acc, w) => acc + w.successRate, 0) / workflows.length).toFixed(1) : "0"}%
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="mr-1 h-3 w-3" /> Healthy</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Available Invoices</CardDescription>
            <CardTitle className="text-2xl text-blue-600">{invoiceData?.total || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className="bg-blue-100 text-blue-800"><Clock className="mr-1 h-3 w-3" /> In system</Badge>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="workflows">
        <TabsList>
          <TabsTrigger value="workflows" className="flex items-center gap-2"><Workflow className="h-4 w-4" /> Workflows</TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2"><History className="h-4 w-4" /> Execution History</TabsTrigger>
        </TabsList>

        <TabsContent value="workflows" className="space-y-4">
          {workflows.map((workflow) => (
            <Card key={workflow.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle>{workflow.name}</CardTitle>
                    <Badge variant={workflow.enabled ? "default" : "secondary"}>{workflow.enabled ? "Active" : "Disabled"}</Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => toggleWorkflow(workflow.id)}>
                      {workflow.enabled ? <ToggleRight className="h-5 w-5 text-green-600" /> : <ToggleLeft className="h-5 w-5 text-gray-400" />}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => duplicateWorkflow(workflow.id)}><Copy className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" className="text-red-600" onClick={() => deleteWorkflow(workflow.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
                <CardDescription>{workflow.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>Created by {workflow.createdBy}</span>
                  <span>Last run: {workflow.lastRun}</span>
                  <span>{workflow.runCount} runs</span>
                  <span>{workflow.successRate}% success</span>
                </div>
                <div className="flex items-center gap-1 overflow-x-auto py-2">
                  {workflow.nodes.map((node, i) => (
                    <WorkflowNodeCard key={node.id} node={node} index={i} total={workflow.nodes.length} />
                  ))}
                </div>
                <Button size="sm" variant="outline" className="mt-2">
                  <Settings className="mr-2 h-3 w-3" />
                  Edit Workflow
                </Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Executions</CardTitle>
            </CardHeader>
            <CardContent>
              {executions.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">No workflow executions yet</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Workflow</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Triggered At</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Progress</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {executions.map((exec) => (
                      <TableRow key={exec.id}>
                        <TableCell className="font-medium">{exec.workflowName}</TableCell>
                        <TableCell>
                          <Badge className={getStatusBadge(exec.status)}>
                            {exec.status === "success" && <CheckCircle2 className="mr-1 h-3 w-3" />}
                            {exec.status === "failed" && <XCircle className="mr-1 h-3 w-3" />}
                            {exec.status === "running" && <Clock className="mr-1 h-3 w-3" />}
                            {exec.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{exec.triggeredAt}</TableCell>
                        <TableCell>{exec.duration}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{exec.stepsCompleted}/{exec.totalSteps}</span>
                            <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${(exec.stepsCompleted / exec.totalSteps) * 100}%` }} />
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
