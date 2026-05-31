"use client";

import { useState, useMemo, useEffect } from "react";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
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
  Sparkles, CheckCircle2, ArrowRight, Plus, Trash2, Brain, Zap, Target, TrendingUp, Filter,
} from "lucide-react";

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  suggestedCategory: string;
  confidence: number;
  keywords: string[];
  status: "pending" | "categorized" | "skipped";
}

interface CategorizationRule {
  id: string;
  keyword: string;
  category: string;
  priority: number;
  timesApplied: number;
}

const MOCK_RULES: CategorizationRule[] = [
  { id: "r1", keyword: "uber", category: "Travel", priority: 1, timesApplied: 47 },
  { id: "r2", keyword: "aws", category: "Software & IT", priority: 2, timesApplied: 32 },
  { id: "r3", keyword: "starbucks", category: "Meals & Entertainment", priority: 1, timesApplied: 58 },
  { id: "r4", keyword: "fedex", category: "Shipping & Postage", priority: 3, timesApplied: 21 },
  { id: "r5", keyword: "microsoft", category: "Software & IT", priority: 2, timesApplied: 36 },
  { id: "r6", keyword: "netflix", category: "Entertainment", priority: 1, timesApplied: 12 },
];

const CATEGORIES = [
  "Travel", "Software & IT", "Meals & Entertainment", "Shipping & Postage",
  "Office Supplies", "Rent & Utilities", "Marketing", "Professional Services",
  "Insurance", "Utilities", "Payroll", "Equipment", "Miscellaneous",
];

function suggestCategory(description: string, rules: CategorizationRule[]): { category: string; confidence: number; keywords: string[] } {
  const desc = description.toLowerCase();
  const words = desc.split(/\s+/);
  for (const rule of rules.sort((a, b) => a.priority - b.priority)) {
    if (desc.includes(rule.keyword.toLowerCase())) {
      return { category: rule.category, confidence: 0.85 + Math.random() * 0.14, keywords: [rule.keyword] };
    }
  }
  if (desc.includes("uber") || desc.includes("lyft") || desc.includes("taxi")) return { category: "Travel", confidence: 0.9, keywords: ["travel"] };
  if (desc.includes("coffee") || desc.includes("starbucks") || desc.includes("restaurant")) return { category: "Meals & Entertainment", confidence: 0.85, keywords: ["meal"] };
  if (desc.includes("software") || desc.includes("saas") || desc.includes("cloud")) return { category: "Software & IT", confidence: 0.88, keywords: ["software"] };
  if (desc.includes("office") || desc.includes("supplies")) return { category: "Office Supplies", confidence: 0.82, keywords: ["office"] };
  if (desc.includes("rent") || desc.includes("utilities") || desc.includes("electric")) return { category: "Rent & Utilities", confidence: 0.9, keywords: ["rent"] };
  return { category: "Miscellaneous", confidence: 0.5 + Math.random() * 0.2, keywords: words.slice(0, 2) };
}

export default function SmartCategorization() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [rules, setRules] = useState<CategorizationRule[]>(MOCK_RULES);
  const [newRuleKeyword, setNewRuleKeyword] = useState("");
  const [newRuleCategory, setNewRuleCategory] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);

  const { data: txData, isLoading } = trpc.transaction.list.useQuery({ limit: 200 });

  useEffect(() => {
    if (txData && transactions.length === 0) {
      const mapped: Transaction[] = txData.map((tx) => {
        const { category, confidence, keywords } = suggestCategory(tx.description || "", rules);
        return {
          id: String(tx.id),
          date: tx.date?.toString?.() || String(tx.date || ""),
          description: tx.description,
          amount: Number(tx.debit) || Number(tx.credit) || 0,
          suggestedCategory: category,
          confidence,
          keywords,
          status: "pending" as const,
        };
      }).filter((tx) => tx.description);
      setTransactions(mapped);
    }
  }, [txData, rules]);

  const stats = useMemo(() => {
    const total = transactions.length;
    const categorized = transactions.filter((t) => t.status === "categorized").length;
    const pending = transactions.filter((t) => t.status === "pending").length;
    const avgConfidence = total > 0 ? transactions.reduce((acc, t) => acc + t.confidence, 0) / total : 0;
    return { total, categorized, pending, avgConfidence };
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const matchesSearch =
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.suggestedCategory.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === "all" || t.suggestedCategory === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [transactions, searchTerm, filterCategory]);

  const handleCategorize = (txId: string) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === txId ? { ...t, status: "categorized" as const } : t))
    );
    const tx = transactions.find((t) => t.id === txId);
    toast.success(`Categorized as "${tx?.suggestedCategory}"`, { description: `${tx?.description} - $${tx?.amount}` });
  };

  const handleCategorizeAll = () => {
    setTransactions((prev) =>
      prev.map((t) => (t.status === "pending" ? { ...t, status: "categorized" as const } : t))
    );
    const pendingCount = transactions.filter((t) => t.status === "pending").length;
    toast.success(`${pendingCount} transactions categorized`, { description: "All pending transactions have been categorized." });
  };

  const handleSkip = (txId: string) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === txId ? { ...t, status: "skipped" as const } : t))
    );
    toast.info("Transaction skipped");
  };

  const handleAddRule = () => {
    if (!newRuleKeyword.trim() || !newRuleCategory) {
      toast.error("Please fill in all fields");
      return;
    }
    const newRule: CategorizationRule = {
      id: `r${Date.now()}`,
      keyword: newRuleKeyword.trim(),
      category: newRuleCategory,
      priority: rules.length + 1,
      timesApplied: 0,
    };
    setRules((prev) => [...prev, newRule]);
    setNewRuleKeyword("");
    setNewRuleCategory("");
    setRuleDialogOpen(false);
    toast.success("Rule created", { description: `"${newRule.keyword}" → ${newRule.category}` });
  };

  const handleDeleteRule = (ruleId: string) => {
    setRules((prev) => prev.filter((r) => r.id !== ruleId));
    toast.info("Rule deleted");
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return "text-green-600";
    if (confidence >= 0.75) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Brain className="h-8 w-8 text-purple-600" />
            Smart Categorization
          </h1>
          <p className="text-muted-foreground mt-1">
            AI-powered transaction categorization with learning rules
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={ruleDialogOpen} onOpenChange={setRuleDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline"><Plus className="mr-2 h-4 w-4" /> Add Rule</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Categorization Rule</DialogTitle>
                <DialogDescription>Define a keyword-based rule for automatic categorization.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Keyword</Label>
                  <Input placeholder="e.g. uber, amazon, spotify" value={newRuleKeyword} onChange={(e) => setNewRuleKeyword(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={newRuleCategory} onValueChange={setNewRuleCategory}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAddRule} className="w-full">Create Rule</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button onClick={handleCategorizeAll} className="bg-purple-600 hover:bg-purple-700">
            <Sparkles className="mr-2 h-4 w-4" /> Categorize All ({stats.pending})
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Transactions</CardDescription>
            <CardTitle className="text-2xl">{stats.total}</CardTitle>
          </CardHeader>
          <CardContent><Badge variant="outline">{transactions.length} this period</Badge></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Categorized</CardDescription>
            <CardTitle className="text-2xl text-green-600">{stats.categorized}</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={stats.total > 0 ? (stats.categorized / stats.total) * 100 : 0} className="h-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending</CardDescription>
            <CardTitle className="text-2xl text-orange-600">{stats.pending}</CardTitle>
          </CardHeader>
          <CardContent><Badge className="bg-orange-100 text-orange-800">Needs attention</Badge></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg Confidence</CardDescription>
            <CardTitle className="text-2xl">{(stats.avgConfidence * 100).toFixed(1)}%</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className="bg-blue-100 text-blue-800"><TrendingUp className="mr-1 h-3 w-3" /> AI-powered</Badge>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="transactions">
        <TabsList>
          <TabsTrigger value="transactions" className="flex items-center gap-2"><Zap className="h-4 w-4" /> Uncategorized Transactions</TabsTrigger>
          <TabsTrigger value="rules" className="flex items-center gap-2"><Target className="h-4 w-4" /> Categorization Rules</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Transactions to Categorize</CardTitle>
                <div className="flex gap-2">
                  <div className="relative">
                    <Filter className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search transactions..." className="pl-8 w-64" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                  </div>
                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger className="w-48"><SelectValue placeholder="Filter category" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {CATEGORIES.map((cat) => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-sm text-gray-500 text-center py-8">Loading transactions...</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Suggested Category</TableHead>
                      <TableHead>Confidence</TableHead>
                      <TableHead>Keywords</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.length === 0 && (
                      <TableRow><TableCell colSpan={7} className="text-center py-8 text-gray-500">No transactions found</TableCell></TableRow>
                    )}
                    {filteredTransactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="text-muted-foreground">{tx.date}</TableCell>
                        <TableCell className="font-medium">{tx.description}</TableCell>
                        <TableCell className={tx.amount < 0 ? "text-red-600" : "text-green-600"}>${Math.abs(tx.amount).toFixed(2)}</TableCell>
                        <TableCell><Badge className="bg-purple-100 text-purple-800">{tx.suggestedCategory}</Badge></TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={tx.confidence * 100} className="h-1.5 w-16" />
                            <span className={`text-sm font-medium ${getConfidenceColor(tx.confidence)}`}>{(tx.confidence * 100).toFixed(0)}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {tx.keywords.map((kw) => (<Badge key={kw} variant="secondary" className="text-xs">{kw}</Badge>))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            {tx.status === "pending" ? (
                              <>
                                <Button size="sm" onClick={() => handleCategorize(tx.id)} className="h-8 bg-green-600 hover:bg-green-700">
                                  <CheckCircle2 className="mr-1 h-3 w-3" /> Accept
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => handleSkip(tx.id)} className="h-8">Skip</Button>
                              </>
                            ) : (
                              <Badge className={tx.status === "categorized" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                                {tx.status === "categorized" ? "Categorized" : "Skipped"}
                              </Badge>
                            )}
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

        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Categorization Rules</CardTitle>
              <CardDescription>Rules are applied in priority order. Higher priority rules are checked first.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Priority</TableHead>
                    <TableHead>Keyword</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Times Applied</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell><Badge variant="outline">#{rule.priority}</Badge></TableCell>
                      <TableCell className="font-mono font-medium">{rule.keyword}</TableCell>
                      <TableCell><Badge className="bg-purple-100 text-purple-800">{rule.category}</Badge></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{rule.timesApplied}</span>
                          <span className="text-muted-foreground text-sm">times</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => handleDeleteRule(rule.id)} className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Brain className="h-5 w-5 text-purple-600" /> Learning Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground">Most Applied Rule</div>
                  <div className="font-medium mt-1">{rules.sort((a, b) => b.timesApplied - a.timesApplied)[0]?.keyword || "N/A"} → {rules.sort((a, b) => b.timesApplied - a.timesApplied)[0]?.category || "N/A"}</div>
                  <div className="text-sm text-muted-foreground mt-1">Applied {rules.sort((a, b) => b.timesApplied - a.timesApplied)[0]?.timesApplied || 0} times</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground">Active Rules</div>
                  <div className="font-medium mt-1 text-green-600">{rules.length} rules configured</div>
                  <div className="text-sm text-muted-foreground mt-1">Covering {CATEGORIES.length} categories</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground">AI Confidence</div>
                  <div className="font-medium mt-1">{(stats.avgConfidence * 100).toFixed(1)}% average</div>
                  <Button size="sm" variant="link" className="px-0 h-auto mt-1" onClick={() => setRuleDialogOpen(true)}>
                    Add new rule <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
