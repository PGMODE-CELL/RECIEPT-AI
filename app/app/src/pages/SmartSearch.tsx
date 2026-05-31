"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Search, X, Clock, Star, FileText, Users, Receipt, Package,
  ArrowRight, History, Bookmark, Command, CornerDownLeft
} from "lucide-react";

interface SearchResult {
  id: string;
  type: "invoice" | "bill" | "contact" | "product" | "transaction" | "account";
  title: string;
  subtitle: string;
  amount?: number;
  date?: string;
  relevance: number;
}

interface SavedSearch {
  id: string;
  name: string;
  query: string;
  count: number;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  invoice: <FileText className="w-4 h-4" />,
  bill: <Receipt className="w-4 h-4" />,
  contact: <Users className="w-4 h-4" />,
  product: <Package className="w-4 h-4" />,
  transaction: <ArrowRight className="w-4 h-4" />,
  account: <FileText className="w-4 h-4" />,
};

const TYPE_COLORS: Record<string, string> = {
  invoice: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  bill: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  contact: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  product: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  transaction: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300",
  account: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
};

export default function SmartSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [history, setHistory] = useState<string[]>(["Acme Corp", "INV-001", "office supplies", "John Smith", "5000"]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([
    { id: "1", name: "Overdue Invoices", query: "overdue", count: 3 },
    { id: "2", name: "High Value Bills", query: "bill > 500", count: 5 },
    { id: "3", name: "Active Contacts", query: "contact active", count: 12 },
  ]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: invoiceData } = trpc.invoice.list.useQuery({ limit: 200 });
  const { data: billData } = trpc.bill.list.useQuery({ limit: 200 });
  const { data: contacts } = trpc.contact.list.useQuery();
  const { data: products } = trpc.product.list.useQuery();
  const { data: transactions } = trpc.transaction.list.useQuery({ limit: 200 });

  const allData = useMemo<SearchResult[]>(() => {
    const results: SearchResult[] = [];

    if (invoiceData?.invoices) {
      invoiceData.invoices.forEach((inv) => {
        results.push({
          id: `inv-${inv.id}`,
          type: "invoice",
          title: `${inv.invoiceNumber} - ${inv.contactName || "Unknown"}`,
          subtitle: `${inv.status} invoice`,
          amount: Number(inv.total) || 0,
          date: inv.issueDate || "",
          relevance: inv.status === "overdue" ? 90 : inv.status === "sent" ? 80 : 70,
        });
      });
    }

    if (billData?.bills) {
      billData.bills.forEach((bill) => {
        results.push({
          id: `bill-${bill.id}`,
          type: "bill",
          title: `${bill.billNumber} - ${bill.contactName || "Unknown"}`,
          subtitle: `${bill.status} bill`,
          amount: Number(bill.total) || 0,
          date: bill.billDate || "",
          relevance: bill.status === "overdue" ? 88 : bill.status === "pending" ? 78 : 68,
        });
      });
    }

    if (contacts) {
      contacts.forEach((c) => {
        results.push({
          id: `contact-${c.id}`,
          type: "contact",
          title: `${c.name}${c.companyName ? ` - ${c.companyName}` : ""}`,
          subtitle: c.email || c.phone || "No contact info",
          relevance: 65,
        });
      });
    }

    if (products) {
      products.forEach((p) => {
        results.push({
          id: `product-${p.id}`,
          type: "product",
          title: p.name,
          subtitle: `${p.type} - ${p.category || "Uncategorized"}`,
          amount: Number(p.salePrice) || 0,
          relevance: 60,
        });
      });
    }

    if (transactions) {
      transactions.forEach((t) => {
        results.push({
          id: `tx-${t.id}`,
          type: "transaction",
          title: t.description,
          subtitle: `${t.type} - ${t.accountName || ""}`,
          amount: Number(t.debit) || Number(t.credit) || 0,
          date: t.date?.toString?.() || String(t.date || ""),
          relevance: 55,
        });
      });
    }

    return results;
  }, [invoiceData, billData, contacts, products, transactions]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const q = query.toLowerCase();
    const scored = allData.map((r) => {
      let score = r.relevance;
      if (r.title.toLowerCase().includes(q)) score += 50;
      if (r.subtitle.toLowerCase().includes(q)) score += 30;
      if (r.type.toLowerCase().includes(q)) score += 20;
      return { ...r, relevance: Math.min(100, score) };
    })
      .filter((r) => r.relevance > 30)
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 10);
    setResults(scored);
    setSelectedIndex(0);
  }, [query, allData]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(results.length - 1, prev + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(0, prev - 1));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      toast.success(`Opening: ${results[selectedIndex].title}`);
      if (query && !history.includes(query)) {
        setHistory((prev) => [query, ...prev].slice(0, 10));
      }
    }
  };

  const saveSearch = () => {
    if (!query.trim()) return;
    const newSaved: SavedSearch = {
      id: String(Date.now()),
      name: query,
      query,
      count: results.length,
    };
    setSavedSearches((prev) => [newSaved, ...prev]);
    toast.success("Search saved");
  };

  const formatCurrency = (v: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Smart Search</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Universal search across all data with fuzzy matching</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono">Ctrl+K</kbd>
          <span>to search</span>
        </div>
      </div>

      <div className="relative">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsOpen(true)}
            placeholder="Search invoices, bills, contacts, products, transactions..."
            className="pl-12 pr-24 py-6 text-lg"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {query && (
              <Button size="sm" variant="ghost" onClick={() => setQuery("")}>
                <X className="w-4 h-4" />
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={saveSearch}>
              <Star className="w-4 h-4 mr-1" /> Save
            </Button>
          </div>
        </div>
      </div>

      {results.length > 0 && (
        <Card>
          <CardContent className="p-2">
            <div className="space-y-1">
              {results.map((result, idx) => (
                <button
                  key={result.id}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                    idx === selectedIndex
                      ? "bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800"
                      : "hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                  onClick={() => toast.success(`Opening: ${result.title}`)}
                >
                  <div className={`p-2 rounded-lg ${TYPE_COLORS[result.type]}`}>
                    {TYPE_ICONS[result.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{result.title}</p>
                      <Badge variant="outline" className="capitalize text-xs">{result.type}</Badge>
                    </div>
                    <p className="text-sm text-gray-500 truncate">{result.subtitle}</p>
                  </div>
                  <div className="text-right">
                    {result.amount && <p className="font-semibold">{formatCurrency(result.amount)}</p>}
                    {result.date && <p className="text-xs text-gray-500">{result.date}</p>}
                    <div className="flex items-center gap-1 mt-1">
                      <div className="w-8 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full"
                          style={{ width: `${result.relevance}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400">{result.relevance}%</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {query && results.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No results found for "{query}"</p>
            <p className="text-sm text-gray-400 mt-1">Try different keywords or check spelling</p>
          </CardContent>
        </Card>
      )}

      {!query && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <History className="w-5 h-5" /> Recent Searches
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {history.map((h, i) => (
                <button
                  key={i}
                  className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-left"
                  onClick={() => setQuery(h)}
                >
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-sm">{h}</span>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Bookmark className="w-5 h-5" /> Saved Searches
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {savedSearches.map((s) => (
                <button
                  key={s.id}
                  className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-left"
                  onClick={() => setQuery(s.query)}
                >
                  <div className="flex items-center gap-3">
                    <Star className="w-4 h-4 text-yellow-500" />
                    <div>
                      <p className="text-sm font-medium">{s.name}</p>
                      <p className="text-xs text-gray-500">{s.count} results</p>
                    </div>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {!query && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Search Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {["invoice", "bill", "contact", "product", "transaction", "account"].map((type) => (
                <button
                  key={type}
                  className={`p-4 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600 transition-colors text-center`}
                  onClick={() => setQuery(type)}
                >
                  <div className={`p-2 rounded-lg ${TYPE_COLORS[type]} mx-auto w-fit mb-2`}>
                    {TYPE_ICONS[type]}
                  </div>
                  <p className="text-sm font-medium capitalize">{type}s</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
