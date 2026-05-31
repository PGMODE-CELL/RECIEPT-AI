"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import {
  ShieldCheck,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  Bell,
  Download,
  ExternalLink,
  Flag,
  Building2,
  AlertOctagon,
} from "lucide-react";

interface TaxDeadline {
  id: string;
  jurisdiction: string;
  filingType: string;
  dueDate: string;
  status: "upcoming" | "overdue" | "filed" | "extension";
  daysUntilDue: number;
  estimatedAmount: number;
  formNumber: string;
}

interface ComplianceDocument {
  id: string;
  name: string;
  type: string;
  status: "ready" | "pending" | "missing" | "expired";
  lastUpdated: string;
  expiryDate?: string;
  jurisdiction: string;
}

interface FilingStatus {
  jurisdiction: string;
  federal: "compliant" | "non_compliant" | "pending";
  state: "compliant" | "non_compliant" | "pending";
  local: "compliant" | "non_compliant" | "pending";
  overallScore: number;
}

const TAX_DEADLINES: TaxDeadline[] = [
  { id: "td1", jurisdiction: "Federal", filingType: "Quarterly Estimated Tax", dueDate: "2025-04-15", status: "upcoming", daysUntilDue: 90, estimatedAmount: 45000, formNumber: "Form 1040-ES" },
  { id: "td2", jurisdiction: "California", filingType: "State Income Tax Return", dueDate: "2025-04-15", status: "upcoming", daysUntilDue: 90, estimatedAmount: 28000, formNumber: "Form 540" },
  { id: "td3", jurisdiction: "Federal", filingType: "W-2 Filing", dueDate: "2025-01-31", status: "upcoming", daysUntilDue: 16, estimatedAmount: 0, formNumber: "W-2" },
  { id: "td4", jurisdiction: "Federal", filingType: "1099-NEC Filing", dueDate: "2025-01-31", status: "upcoming", daysUntilDue: 16, estimatedAmount: 0, formNumber: "1099-NEC" },
  { id: "td5", jurisdiction: "California", filingType: "Sales Tax Return", dueDate: "2025-01-31", status: "upcoming", daysUntilDue: 16, estimatedAmount: 12500, formNumber: "BOE-401-A" },
  { id: "td6", jurisdiction: "New York", filingType: "State Income Tax Return", dueDate: "2025-04-15", status: "upcoming", daysUntilDue: 90, estimatedAmount: 18000, formNumber: "IT-201" },
  { id: "td7", jurisdiction: "Federal", filingType: "Quarterly Payroll Tax", dueDate: "2025-01-31", status: "filed", daysUntilDue: 0, estimatedAmount: 35000, formNumber: "Form 941" },
];

const COMPLIANCE_DOCUMENTS: ComplianceDocument[] = [
  { id: "doc1", name: "Business License", type: "License", status: "ready", lastUpdated: "2024-06-15", expiryDate: "2025-06-15", jurisdiction: "Federal" },
  { id: "doc2", name: "W-9 Form", type: "Tax Form", status: "ready", lastUpdated: "2024-01-10", jurisdiction: "Federal" },
  { id: "doc3", name: "State Tax Registration", type: "Registration", status: "ready", lastUpdated: "2023-03-20", jurisdiction: "California" },
  { id: "doc4", name: "Sales Tax Permit", type: "Permit", status: "expired", lastUpdated: "2023-12-01", expiryDate: "2024-12-01", jurisdiction: "California" },
  { id: "doc5", name: "Workers Compensation Insurance", type: "Insurance", status: "ready", lastUpdated: "2024-09-01", expiryDate: "2025-09-01", jurisdiction: "Federal" },
  { id: "doc6", name: "Business Entity Filing", type: "Registration", status: "pending", lastUpdated: "2024-01-15", jurisdiction: "New York" },
  { id: "doc7", name: "DBA Registration", type: "Registration", status: "missing", lastUpdated: "", jurisdiction: "Local" },
  { id: "doc8", name: "EIN Confirmation Letter", type: "Tax Form", status: "ready", lastUpdated: "2022-05-10", jurisdiction: "Federal" },
];

const FILING_STATUS: FilingStatus[] = [
  { jurisdiction: "Federal (IRS)", federal: "compliant", state: "compliant", local: "compliant", overallScore: 95 },
  { jurisdiction: "California (FTB)", federal: "compliant", state: "compliant", local: "pending", overallScore: 88 },
  { jurisdiction: "New York (DTF)", federal: "compliant", state: "pending", local: "non_compliant", overallScore: 72 },
  { jurisdiction: "Texas (Comptroller)", federal: "compliant", state: "compliant", local: "compliant", overallScore: 100 },
];

export default function ComplianceDashboard() {
  const [deadlines, setDeadlines] = useState<TaxDeadline[]>(TAX_DEADLINES);
  const [documents] = useState<ComplianceDocument[]>(COMPLIANCE_DOCUMENTS);
  const [filingStatuses] = useState<FilingStatus[]>(FILING_STATUS);

  const stats = useMemo(() => {
    const upcomingCount = deadlines.filter((d) => d.status === "upcoming").length;
    const overdueCount = deadlines.filter((d) => d.status === "overdue").length;
    const upcomingAmount = deadlines
      .filter((d) => d.status === "upcoming")
      .reduce((acc, d) => acc + d.estimatedAmount, 0);
    const avgScore = filingStatuses.reduce((acc, f) => acc + f.overallScore, 0) / filingStatuses.length;
    const readyDocs = documents.filter((d) => d.status === "ready").length;
    const missingDocs = documents.filter((d) => d.status === "missing" || d.status === "expired").length;
    return { upcomingCount, overdueCount, upcomingAmount, avgScore, readyDocs, missingDocs };
  }, [deadlines, documents, filingStatuses]);

  const markFiled = (id: string) => {
    setDeadlines((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: "filed" as const, daysUntilDue: 0 } : d))
    );
    toast.success("Filing marked as complete");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "upcoming": return "bg-yellow-100 text-yellow-800";
      case "overdue": return "bg-red-100 text-red-800";
      case "filed": return "bg-green-100 text-green-800";
      case "extension": return "bg-blue-100 text-blue-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getDocStatusBadge = (status: string) => {
    switch (status) {
      case "ready": return "bg-green-100 text-green-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "missing": return "bg-red-100 text-red-800";
      case "expired": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getComplianceBadge = (status: string) => {
    switch (status) {
      case "compliant": return "bg-green-100 text-green-800";
      case "non_compliant": return "bg-red-100 text-red-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <ShieldCheck className="h-8 w-8 text-green-600" />
          Compliance Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Tax filing deadlines, compliance scores, and required document tracking
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Overall Score</CardDescription>
            <CardTitle className="text-2xl">{stats.avgScore.toFixed(0)}%</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={stats.avgScore} className="h-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Upcoming Filings</CardDescription>
            <CardTitle className="text-2xl text-yellow-600">{stats.upcomingCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className="bg-yellow-100 text-yellow-800">
              <Calendar className="mr-1 h-3 w-3" /> Due soon
            </Badge>
          </CardContent>
        </Card>
        <Card className={stats.overdueCount > 0 ? "border-red-200" : ""}>
          <CardHeader className="pb-2">
            <CardDescription>Overdue</CardDescription>
            <CardTitle className="text-2xl text-red-600">{stats.overdueCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={stats.overdueCount > 0 ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}>
              {stats.overdueCount > 0 ? <AlertTriangle className="mr-1 h-3 w-3" /> : <CheckCircle2 className="mr-1 h-3 w-3" />}
              {stats.overdueCount > 0 ? "Action needed" : "All clear"}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Estimated Tax</CardDescription>
            <CardTitle className="text-2xl">${stats.upcomingAmount.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline">Total upcoming</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Documents Ready</CardDescription>
            <CardTitle className="text-2xl text-green-600">{stats.readyDocs}</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className="bg-green-100 text-green-800">of {documents.length} total</Badge>
          </CardContent>
        </Card>
        <Card className={stats.missingDocs > 0 ? "border-red-200" : ""}>
          <CardHeader className="pb-2">
            <CardDescription>Missing/Expired</CardDescription>
            <CardTitle className="text-2xl text-red-600">{stats.missingDocs}</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={stats.missingDocs > 0 ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}>
              <AlertOctagon className="mr-1 h-3 w-3" />
              {stats.missingDocs > 0 ? "Action needed" : "All complete"}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="deadlines">
        <TabsList>
          <TabsTrigger value="deadlines" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Tax Deadlines
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="filing" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Filing Status
          </TabsTrigger>
          <TabsTrigger value="reminders" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Reminders
          </TabsTrigger>
        </TabsList>

        <TabsContent value="deadlines" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tax Filing Deadlines</CardTitle>
              <CardDescription>Upcoming and recent tax filing obligations</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Filing Type</TableHead>
                    <TableHead>Form</TableHead>
                    <TableHead>Jurisdiction</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Est. Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deadlines.map((deadline) => (
                    <TableRow key={deadline.id}>
                      <TableCell className="font-medium">{deadline.filingType}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{deadline.formNumber}</Badge>
                      </TableCell>
                      <TableCell>{deadline.jurisdiction}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{deadline.dueDate}</span>
                          {deadline.status === "upcoming" && (
                            <Badge className={deadline.daysUntilDue <= 14 ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}>
                              {deadline.daysUntilDue} days
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusBadge(deadline.status)}>{deadline.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {deadline.estimatedAmount > 0
                          ? `$${deadline.estimatedAmount.toLocaleString()}`
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {deadline.status === "upcoming" && (
                          <div className="flex gap-1 justify-end">
                            <Button size="sm" className="h-8" onClick={() => markFiled(deadline.id)}>
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              Mark Filed
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8">
                              <Download className="mr-1 h-3 w-3" />
                              Forms
                            </Button>
                          </div>
                        )}
                        {deadline.status === "filed" && (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle2 className="mr-1 h-3 w-3" /> Complete
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Required Documents Checklist</CardTitle>
                  <CardDescription>Track compliance documents by jurisdiction</CardDescription>
                </div>
                <Button size="sm">
                  <FileText className="mr-2 h-3 w-3" />
                  Upload Document
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Jurisdiction</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">{doc.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{doc.type}</Badge>
                      </TableCell>
                      <TableCell>{doc.jurisdiction}</TableCell>
                      <TableCell>
                        <Badge className={getDocStatusBadge(doc.status)}>
                          {doc.status === "ready" && <CheckCircle2 className="mr-1 h-3 w-3" />}
                          {(doc.status === "missing" || doc.status === "expired") && (
                            <AlertTriangle className="mr-1 h-3 w-3" />
                          )}
                          {doc.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{doc.lastUpdated || "Never"}</TableCell>
                      <TableCell className="text-muted-foreground">{doc.expiryDate || "N/A"}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" className="h-8">
                          <ExternalLink className="mr-1 h-3 w-3" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="filing" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filingStatuses.map((fs) => (
              <Card key={fs.jurisdiction}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{fs.jurisdiction}</CardTitle>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">{fs.overallScore}%</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Progress value={fs.overallScore} className="h-2" />
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 border rounded-lg">
                      <div className="text-xs text-muted-foreground">Federal</div>
                      <Badge className={`mt-1 ${getComplianceBadge(fs.federal)}`}>{fs.federal}</Badge>
                    </div>
                    <div className="p-2 border rounded-lg">
                      <div className="text-xs text-muted-foreground">State</div>
                      <Badge className={`mt-1 ${getComplianceBadge(fs.state)}`}>{fs.state}</Badge>
                    </div>
                    <div className="p-2 border rounded-lg">
                      <div className="text-xs text-muted-foreground">Local</div>
                      <Badge className={`mt-1 ${getComplianceBadge(fs.local)}`}>{fs.local}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="reminders" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Active Reminders</CardTitle>
                <Button size="sm">
                  <Bell className="mr-2 h-3 w-3" />
                  Add Reminder
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { title: "W-2 Filing Deadline", date: "Jan 31, 2025", daysLeft: 16, priority: "high" },
                { title: "1099-NEC Filing Deadline", date: "Jan 31, 2025", daysLeft: 16, priority: "high" },
                { title: "Sales Tax Return - CA", date: "Jan 31, 2025", daysLeft: 16, priority: "medium" },
                { title: "Q4 Estimated Tax Payment", date: "Jan 15, 2025", daysLeft: 0, priority: "high" },
                { title: "Annual Report Filing - NY", date: "Mar 1, 2025", daysLeft: 45, priority: "low" },
                { title: "Workers Comp Insurance Renewal", date: "Sep 1, 2025", daysLeft: 229, priority: "low" },
              ].map((reminder, i) => (
                <div key={i} className={`flex items-center justify-between p-4 border rounded-lg ${reminder.daysLeft <= 7 ? "border-red-200 bg-red-50/50" : ""}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${reminder.priority === "high" ? "bg-red-500" : reminder.priority === "medium" ? "bg-yellow-500" : "bg-green-500"}`} />
                    <div>
                      <div className="font-medium text-sm">{reminder.title}</div>
                      <div className="text-xs text-muted-foreground">Due: {reminder.date}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={reminder.daysLeft <= 7 ? "bg-red-100 text-red-800" : reminder.daysLeft <= 30 ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"}>
                      {reminder.daysLeft === 0 ? "Due today" : `${reminder.daysLeft} days left`}
                    </Badge>
                    <Button size="sm" variant="ghost" className="h-8">
                      <Flag className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
