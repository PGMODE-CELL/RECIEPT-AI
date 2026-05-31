"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Calendar, AlertTriangle, CheckCircle, Clock, FileText,
  Bell, ChevronLeft, ChevronRight, Shield
} from "lucide-react";

interface TaxDeadline {
  id: string;
  name: string;
  jurisdiction: string;
  type: string;
  dueDate: string;
  status: "pending" | "filed" | "overdue" | "extension";
  reminders: number;
  checklist: { item: string; completed: boolean }[];
}

const JURISDICTION_COLORS: Record<string, string> = {
  Federal: "bg-blue-100 text-blue-800",
  California: "bg-purple-100 text-purple-800",
  Texas: "bg-green-100 text-green-800",
  UK: "bg-red-100 text-red-800",
};

function computeDeadlines(taxRates: any[]): TaxDeadline[] {
  const today = new Date();
  return taxRates.map((rate: any, idx: number) => {
    const dueDate = new Date(today);
    dueDate.setMonth(dueDate.getMonth() + 3);
    const isOverdue = dueDate < today;
    return {
      id: String(rate.id || idx),
      name: `${rate.name || "Tax"} Filing`,
      jurisdiction: rate.jurisdiction || "Federal",
      type: rate.type || rate.name || "Tax",
      dueDate: dueDate.toISOString().split("T")[0],
      status: isOverdue ? "overdue" as const : "pending" as const,
      reminders: 0,
      checklist: [
        { item: `Calculate ${rate.name || "tax"} liability`, completed: false },
        { item: "Prepare filing form", completed: false },
        { item: "Submit payment", completed: false },
      ],
    };
  });
}

export default function TaxCalendar() {
  const { data: taxRates = [] } = trpc.settings.listTaxRates.useQuery();
  const deadlines = useMemo(() => {
    const computed = computeDeadlines(taxRates);
    if (computed.length === 0) {
      return [
        { id: "1", name: "Q4 Sales Tax", jurisdiction: "Federal", type: "Sales Tax", dueDate: "2026-01-31", status: "filed" as const, reminders: 2, checklist: [{ item: "Reconcile sales transactions", completed: true }, { item: "Calculate tax liability", completed: true }, { item: "Prepare filing form", completed: true }, { item: "Submit payment", completed: true }] },
        { id: "2", name: "W-2 Filing", jurisdiction: "Federal", type: "Payroll Tax", dueDate: "2026-01-31", status: "pending" as const, reminders: 1, checklist: [{ item: "Verify employee information", completed: true }, { item: "Calculate total wages", completed: true }, { item: "Prepare W-2 forms", completed: false }, { item: "Submit to SSA", completed: false }, { item: "Distribute to employees", completed: false }] },
        { id: "3", name: "State Income Tax", jurisdiction: "California", type: "Income Tax", dueDate: "2026-04-15", status: "pending" as const, reminders: 0, checklist: [{ item: "Gather financial records", completed: false }, { item: "Prepare Schedule C", completed: false }, { item: "Calculate deductions", completed: false }, { item: "File state return", completed: false }, { item: "Make estimated payment", completed: false }] },
        { id: "4", name: "Q1 Estimated Tax", jurisdiction: "Federal", type: "Estimated Tax", dueDate: "2026-04-15", status: "pending" as const, reminders: 0, checklist: [{ item: "Project annual income", completed: false }, { item: "Calculate quarterly estimate", completed: false }, { item: "Submit Form 1040-ES", completed: false }, { item: "Make payment", completed: false }] },
        { id: "5", name: "Property Tax", jurisdiction: "Texas", type: "Property Tax", dueDate: "2026-02-01", status: "overdue" as const, reminders: 3, checklist: [{ item: "Review property assessment", completed: true }, { item: "Verify exemptions", completed: true }, { item: "Calculate tax due", completed: true }, { item: "Submit payment", completed: false }] },
      ] as TaxDeadline[];
    }
    return computed;
  }, [taxRates]);

  const [localDeadlines, setLocalDeadlines] = useState<TaxDeadline[]>([]);
  const [selectedDeadline, setSelectedDeadline] = useState<TaxDeadline | null>(null);
  const [filterJurisdiction, setFilterJurisdiction] = useState<string>("all");

  const effectiveDeadlines = localDeadlines.length > 0 ? localDeadlines : deadlines;

  const filtered = filterJurisdiction === "all"
    ? effectiveDeadlines
    : effectiveDeadlines.filter((d) => d.jurisdiction === filterJurisdiction);

  const pendingCount = effectiveDeadlines.filter((d) => d.status === "pending").length;
  const overdueCount = effectiveDeadlines.filter((d) => d.status === "overdue").length;
  const filedCount = effectiveDeadlines.filter((d) => d.status === "filed").length;

  const statusColor = (s: string) => {
    switch (s) {
      case "filed": return "bg-green-100 text-green-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "overdue": return "bg-red-100 text-red-800";
      case "extension": return "bg-blue-100 text-blue-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const toggleChecklist = (deadlineId: string, checklistIdx: number) => {
    setLocalDeadlines((prev) => {
      const base = prev.length > 0 ? prev : deadlines;
      return base.map((d) => {
        if (d.id !== deadlineId) return d;
        const newChecklist = [...d.checklist];
        newChecklist[checklistIdx] = { ...newChecklist[checklistIdx], completed: !newChecklist[checklistIdx].completed };
        return { ...d, checklist: newChecklist };
      });
    });
  };

  const setReminder = (deadline: TaxDeadline) => {
    toast.success(`Reminder set for ${deadline.name}`);
  };

  const markFiled = (deadlineId: string) => {
    setLocalDeadlines((prev) => {
      const base = prev.length > 0 ? prev : deadlines;
      return base.map((d) => (d.id === deadlineId ? { ...d, status: "filed" as const } : d));
    });
    toast.success("Marked as filed");
    setSelectedDeadline(null);
  };

  const jurisdictions = [...new Set(effectiveDeadlines.map((d) => d.jurisdiction))];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tax Calendar</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Track tax deadlines and filing requirements</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg"><Calendar className="w-5 h-5 text-gray-600" /></div>
            <div><p className="text-xs text-gray-500">Total</p><p className="text-2xl font-bold">{effectiveDeadlines.length}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg"><Clock className="w-5 h-5 text-yellow-600" /></div>
            <div><p className="text-xs text-gray-500">Pending</p><p className="text-2xl font-bold text-yellow-600">{pendingCount}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg"><AlertTriangle className="w-5 h-5 text-red-600" /></div>
            <div><p className="text-xs text-gray-500">Overdue</p><p className="text-2xl font-bold text-red-600">{overdueCount}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg"><CheckCircle className="w-5 h-5 text-green-600" /></div>
            <div><p className="text-xs text-gray-500">Filed</p><p className="text-2xl font-bold text-green-600">{filedCount}</p></div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant={filterJurisdiction === "all" ? "default" : "outline"}
          onClick={() => setFilterJurisdiction("all")}
        >All</Button>
        {jurisdictions.map((j) => (
          <Button
            key={j}
            size="sm"
            variant={filterJurisdiction === j ? "default" : "outline"}
            onClick={() => setFilterJurisdiction(j)}
          >{j}</Button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tax Filing</TableHead>
                <TableHead>Jurisdiction</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Checklist</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.sort((a, b) => a.dueDate.localeCompare(b.dueDate)).map((d) => {
                const completedItems = d.checklist.filter((c) => c.completed).length;
                const pct = Math.round((completedItems / d.checklist.length) * 100);
                return (
                  <TableRow key={d.id} className={d.status === "overdue" ? "bg-red-50 dark:bg-red-950" : ""}>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell><Badge className={JURISDICTION_COLORS[d.jurisdiction] || "bg-gray-100 text-gray-800"}>{d.jurisdiction}</Badge></TableCell>
                    <TableCell className="text-sm text-gray-500">{d.type}</TableCell>
                    <TableCell className={d.status === "overdue" ? "text-red-600 font-semibold" : ""}>{d.dueDate}</TableCell>
                    <TableCell><Badge className={statusColor(d.status)}>{d.status}</Badge></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                          <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-gray-500">{completedItems}/{d.checklist.length}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setSelectedDeadline(d)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setReminder(d)}>
                          <Bell className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={selectedDeadline !== null} onOpenChange={() => setSelectedDeadline(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedDeadline?.name}</DialogTitle>
          </DialogHeader>
          {selectedDeadline && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div><p className="text-gray-500">Jurisdiction</p><p className="font-medium">{selectedDeadline.jurisdiction}</p></div>
                <div><p className="text-gray-500">Type</p><p className="font-medium">{selectedDeadline.type}</p></div>
                <div><p className="text-gray-500">Due Date</p><p className="font-medium">{selectedDeadline.dueDate}</p></div>
              </div>
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4" /> Compliance Checklist
                </h3>
                <div className="space-y-2">
                  {selectedDeadline.checklist.map((item, idx) => (
                    <label key={idx} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                      <Checkbox
                        checked={item.completed}
                        onCheckedChange={() => toggleChecklist(selectedDeadline.id, idx)}
                      />
                      <span className={item.completed ? "line-through text-gray-500" : ""}>{item.item}</span>
                    </label>
                  ))}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedDeadline(null)}>Close</Button>
                {selectedDeadline.status !== "filed" && (
                  <Button onClick={() => markFiled(selectedDeadline.id)}>
                    <CheckCircle className="w-4 h-4 mr-2" /> Mark as Filed
                  </Button>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
