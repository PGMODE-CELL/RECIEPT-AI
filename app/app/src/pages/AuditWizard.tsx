"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  CheckCircle, Circle, FileText, Download, Shield, ClipboardList,
  Calculator, ArrowRight, ChevronRight, AlertTriangle
} from "lucide-react";

interface ChecklistItem {
  id: string;
  text: string;
  category: string;
  completed: boolean;
  required: boolean;
}

interface AuditStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  status: "pending" | "in-progress" | "completed";
  items: ChecklistItem[];
}

function buildSteps(auditLogs: any[], journalEntries: any[]): AuditStep[] {
  const hasEntries = journalEntries.length > 0;
  const hasAuditLogs = auditLogs.length > 0;
  return [
    {
      id: "1", title: "Document Checklist", description: "Gather all required documents",
      icon: <ClipboardList className="w-5 h-5" />, status: hasAuditLogs ? "completed" : "in-progress",
      items: [
        { id: "c1", text: "General Ledger export", category: "Documents", completed: hasEntries, required: true },
        { id: "c2", text: "Trial Balance report", category: "Documents", completed: hasEntries, required: true },
        { id: "c3", text: "Bank statements (all accounts)", category: "Documents", completed: false, required: true },
        { id: "c4", text: "Accounts Receivable aging", category: "Documents", completed: false, required: true },
        { id: "c5", text: "Accounts Payable aging", category: "Documents", completed: false, required: true },
        { id: "c6", text: "Fixed Asset register", category: "Documents", completed: false, required: false },
        { id: "c7", text: "Inventory count sheet", category: "Documents", completed: false, required: false },
        { id: "c8", text: "Previous audit report", category: "Documents", completed: hasAuditLogs, required: false },
      ],
    },
    {
      id: "2", title: "Trial Balance Verification", description: "Verify trial balance integrity",
      icon: <Calculator className="w-5 h-5" />, status: hasEntries ? "in-progress" : "pending",
      items: [
        { id: "t1", text: "Debits equal Credits", category: "Verification", completed: hasEntries, required: true },
        { id: "t2", text: "No suspense accounts with balance", category: "Verification", completed: false, required: true },
        { id: "t3", text: "All accounts properly classified", category: "Verification", completed: false, required: true },
        { id: "t4", text: "Inter-company balances reconcile", category: "Verification", completed: false, required: false },
        { id: "t5", text: "Retained earnings balance verified", category: "Verification", completed: false, required: true },
      ],
    },
    {
      id: "3", title: "Journal Entry Sampling", description: "Review sampled journal entries",
      icon: <FileText className="w-5 h-5" />, status: hasEntries ? "in-progress" : "pending",
      items: [
        { id: "j1", text: `Review ${journalEntries.length} journal entries`, category: "Sampling", completed: journalEntries.length > 0, required: true },
        { id: "j2", text: "Verify supporting documentation", category: "Sampling", completed: false, required: true },
        { id: "j3", text: "Check proper authorization", category: "Sampling", completed: false, required: true },
        { id: "j4", text: "Review manual journal entries", category: "Sampling", completed: false, required: true },
        { id: "j5", text: "Test large/unusual entries", category: "Sampling", completed: false, required: false },
        { id: "j6", text: "Review period-end adjustments", category: "Sampling", completed: false, required: true },
      ],
    },
    {
      id: "4", title: "Compliance Checklist", description: "Verify regulatory compliance",
      icon: <Shield className="w-5 h-5" />, status: "pending",
      items: [
        { id: "x1", text: "Revenue recognition compliant with ASC 606", category: "Compliance", completed: false, required: true },
        { id: "x2", text: "Lease accounting per ASC 842", category: "Compliance", completed: false, required: true },
        { id: "x3", text: "Related party transactions disclosed", category: "Compliance", completed: false, required: true },
        { id: "x4", text: "Subsequent events reviewed", category: "Compliance", completed: false, required: true },
        { id: "x5", text: "Contingent liabilities assessed", category: "Compliance", completed: false, required: true },
        { id: "x6", text: "Going concern assessment", category: "Compliance", completed: false, required: true },
      ],
    },
    {
      id: "5", title: "Export Audit Package", description: "Generate final audit documentation",
      icon: <Download className="w-5 h-5" />, status: "pending",
      items: [
        { id: "e1", text: "Generate summary report", category: "Export", completed: false, required: true },
        { id: "e2", text: "Export supporting schedules", category: "Export", completed: false, required: true },
        { id: "e3", text: "Create management letter", category: "Export", completed: false, required: false },
        { id: "e4", text: "Archive audit working papers", category: "Export", completed: false, required: true },
      ],
    },
  ];
}

export default function AuditWizard() {
  const { data: auditLogs = [] } = trpc.audit.list.useQuery({ limit: 50 });
  const { data: journalEntries = [] } = trpc.journalEntry.list.useQuery();

  const initialSteps = useMemo(() => buildSteps(auditLogs, journalEntries), [auditLogs, journalEntries]);
  const [steps, setSteps] = useState<AuditStep[]>([]);
  const [activeStep, setActiveStep] = useState(0);

  const effectiveSteps = steps.length > 0 ? steps : initialSteps;

  const totalItems = effectiveSteps.reduce((s, st) => s + st.items.length, 0);
  const completedItems = effectiveSteps.reduce((s, st) => s + st.items.filter((i) => i.completed).length, 0);
  const overallPct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  const toggleItem = (stepId: string, itemId: string) => {
    setSteps((prev) => {
      const base = prev.length > 0 ? prev : initialSteps;
      return base.map((s) => {
        if (s.id !== stepId) return s;
        return {
          ...s,
          items: s.items.map((i) => (i.id === itemId ? { ...i, completed: !i.completed } : i)),
        };
      });
    });
  };

  const getStepProgress = (step: AuditStep) => {
    const done = step.items.filter((i) => i.completed).length;
    return Math.round((done / step.items.length) * 100);
  };

  const currentStep = effectiveSteps[activeStep];
  const currentProgress = getStepProgress(currentStep);

  const requiredIncomplete = effectiveSteps[activeStep].items.filter((i) => i.required && !i.completed).length;

  const exportPackage = () => {
    toast.success("Audit package exported successfully");
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Audit Wizard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Step-by-step audit preparation guide</p>
        </div>
        <Button onClick={exportPackage} disabled={overallPct < 100}>
          <Download className="w-4 h-4 mr-2" /> Export Audit Package
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-sm text-gray-500">{completedItems}/{totalItems} items &middot; {overallPct}%</span>
          </div>
          <Progress value={overallPct} />
        </CardContent>
      </Card>

      <div className="flex gap-1 overflow-x-auto pb-2">
        {effectiveSteps.map((step, idx) => {
          const prog = getStepProgress(step);
          return (
            <button
              key={step.id}
              onClick={() => setActiveStep(idx)}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-all min-w-fit ${
                idx === activeStep
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                  : prog === 100
                  ? "border-green-300 bg-green-50 dark:bg-green-950"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                prog === 100 ? "bg-green-500 text-white" : idx === activeStep ? "bg-blue-500 text-white" : "bg-gray-200 dark:bg-gray-700"
              }`}>
                {prog === 100 ? <CheckCircle className="w-4 h-4" /> : idx + 1}
              </div>
              <div className="text-left">
                <p className="text-sm font-medium">{step.title}</p>
                <p className="text-xs text-gray-500">{prog}%</p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">{currentStep.icon}</div>
                <div>
                  <CardTitle>{currentStep.title}</CardTitle>
                  <p className="text-sm text-gray-500">{currentStep.description}</p>
                </div>
              </div>
              <Badge>{currentProgress}%</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {currentStep.items.map((item) => (
                <label
                  key={item.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    item.completed ? "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800" : "hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                >
                  <Checkbox checked={item.completed} onCheckedChange={() => toggleItem(currentStep.id, item.id)} />
                  <div className="flex-1">
                    <span className={item.completed ? "line-through text-gray-500" : ""}>{item.text}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{item.category}</Badge>
                    {item.required && <Badge className="bg-red-100 text-red-800 text-xs">Required</Badge>}
                  </div>
                </label>
              ))}
            </div>
            <div className="flex justify-between mt-4">
              <Button
                variant="outline"
                disabled={activeStep === 0}
                onClick={() => setActiveStep((p) => p - 1)}
              >Previous</Button>
              <Button
                disabled={activeStep === effectiveSteps.length - 1}
                onClick={() => setActiveStep((p) => p + 1)}
              >Next Step <ChevronRight className="w-4 h-4 ml-1" /></Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Summary</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {effectiveSteps.map((step, idx) => {
              const prog = getStepProgress(step);
              const reqDone = step.items.filter((i) => i.required && i.completed).length;
              const reqTotal = step.items.filter((i) => i.required).length;
              return (
                <button
                  key={step.id}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    idx === activeStep ? "border-blue-300 bg-blue-50 dark:bg-blue-950" : "hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                  onClick={() => setActiveStep(idx)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{step.title}</span>
                    <span className="text-xs text-gray-500">{prog}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                    <div className={`h-1.5 rounded-full transition-all ${prog === 100 ? "bg-green-500" : "bg-blue-500"}`} style={{ width: `${prog}%` }} />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{reqDone}/{reqTotal} required items</p>
                </button>
              );
            })}

            {requiredIncomplete > 0 && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
                <p className="text-sm text-yellow-800 dark:text-yellow-300">
                  {requiredIncomplete} required item{requiredIncomplete > 1 ? "s" : ""} incomplete in current step
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
