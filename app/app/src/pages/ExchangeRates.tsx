import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  RefreshCw,
  Calculator,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  Pencil,
  Check,
  X,
  Globe,
} from "lucide-react";

interface Currency {
  code: string;
  name: string;
  symbol: string;
  rate: number;
  change24h: number;
  lastUpdated: string;
}

const mockCurrencies: Currency[] = [
  { code: "USD", name: "US Dollar", symbol: "$", rate: 1.0, change24h: 0, lastUpdated: "2026-05-31 12:00" },
  { code: "EUR", name: "Euro", symbol: "€", rate: 0.923, change24h: -0.15, lastUpdated: "2026-05-31 12:00" },
  { code: "GBP", name: "British Pound", symbol: "£", rate: 0.791, change24h: 0.22, lastUpdated: "2026-05-31 12:00" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥", rate: 157.23, change24h: -0.45, lastUpdated: "2026-05-31 12:00" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$", rate: 1.368, change24h: 0.08, lastUpdated: "2026-05-31 12:00" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$", rate: 1.512, change24h: -0.32, lastUpdated: "2026-05-31 12:00" },
  { code: "CHF", name: "Swiss Franc", symbol: "Fr", rate: 0.887, change24h: 0.11, lastUpdated: "2026-05-31 12:00" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥", rate: 7.245, change24h: -0.07, lastUpdated: "2026-05-31 12:00" },
  { code: "INR", name: "Indian Rupee", symbol: "₹", rate: 83.42, change24h: 0.19, lastUpdated: "2026-05-31 12:00" },
  { code: "BRL", name: "Brazilian Real", symbol: "R$", rate: 4.97, change24h: -0.55, lastUpdated: "2026-05-31 12:00" },
  { code: "MXN", name: "Mexican Peso", symbol: "MX$", rate: 17.15, change24h: 0.34, lastUpdated: "2026-05-31 12:00" },
  { code: "KRW", name: "South Korean Won", symbol: "₩", rate: 1368.5, change24h: -0.21, lastUpdated: "2026-05-31 12:00" },
];

const historicalData = [
  { date: "May 25", EUR: 0.921, GBP: 0.789, JPY: 156.8, CAD: 1.371 },
  { date: "May 26", EUR: 0.924, GBP: 0.790, JPY: 157.0, CAD: 1.369 },
  { date: "May 27", EUR: 0.922, GBP: 0.792, JPY: 157.1, CAD: 1.370 },
  { date: "May 28", EUR: 0.925, GBP: 0.788, JPY: 157.3, CAD: 1.367 },
  { date: "May 29", EUR: 0.920, GBP: 0.791, JPY: 157.5, CAD: 1.372 },
  { date: "May 30", EUR: 0.923, GBP: 0.793, JPY: 157.0, CAD: 1.365 },
  { date: "May 31", EUR: 0.923, GBP: 0.791, JPY: 157.2, CAD: 1.368 },
];

export default function ExchangeRates() {
  const [currencies, setCurrencies] = useState<Currency[]>(mockCurrencies);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [autoUpdate, setAutoUpdate] = useState(false);
  const [autoUpdateInterval, setAutoUpdateInterval] = useState("60");
  const [isUpdating, setIsUpdating] = useState(false);

  // Converter state
  const [convertFrom, setConvertFrom] = useState("USD");
  const [convertTo, setConvertTo] = useState("EUR");
  const [convertAmount, setConvertAmount] = useState("1000");
  const [convertResult, setConvertResult] = useState<number | null>(null);

  // Chart state
  const [selectedCurrency, setSelectedCurrency] = useState("EUR");

  const handleEditStart = (code: string, rate: number) => {
    setEditingCode(code);
    setEditValue(rate.toString());
  };

  const handleEditSave = (code: string) => {
    const newRate = parseFloat(editValue);
    if (isNaN(newRate) || newRate <= 0) {
      toast.error("Please enter a valid rate");
      return;
    }
    setCurrencies((prev) =>
      prev.map((c) =>
        c.code === code
          ? { ...c, rate: newRate, lastUpdated: new Date().toISOString().slice(0, 16).replace("T", " ") }
          : c
      )
    );
    setEditingCode(null);
    toast.success(`Updated ${code} rate to ${newRate}`);
  };

  const handleEditCancel = () => {
    setEditingCode(null);
    setEditValue("");
  };

  const handleAutoUpdate = () => {
    setIsUpdating(true);
    toast.info("Fetching latest exchange rates...");
    setTimeout(() => {
      setCurrencies((prev) =>
        prev.map((c) => ({
          ...c,
          rate: c.code === "USD" ? 1.0 : c.rate * (1 + (Math.random() - 0.5) * 0.002),
          change24h: parseFloat(((Math.random() - 0.5) * 2).toFixed(2)),
          lastUpdated: new Date().toISOString().slice(0, 16).replace("T", " "),
        }))
      );
      setIsUpdating(false);
      toast.success("Exchange rates updated successfully");
    }, 1500);
  };

  const handleConvert = () => {
    const amount = parseFloat(convertAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    const fromCurrency = currencies.find((c) => c.code === convertFrom);
    const toCurrency = currencies.find((c) => c.code === convertTo);
    if (!fromCurrency || !toCurrency) return;

    const result = (amount / fromCurrency.rate) * toCurrency.rate;
    setConvertResult(result);
  };

  const handleSwapCurrencies = () => {
    setConvertFrom(convertTo);
    setConvertTo(convertFrom);
    if (convertResult !== null) {
      handleConvert();
    }
  };

  const topCurrencies = currencies
    .filter((c) => c.code !== "USD")
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Exchange Rates</h1>
          <p className="text-muted-foreground">
            Manage currency exchange rates and convert between currencies.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={autoUpdate ? "default" : "outline"}
            onClick={() => setAutoUpdate(!autoUpdate)}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isUpdating ? "animate-spin" : ""}`}
            />
            Auto-Update {autoUpdate ? "On" : "Off"}
          </Button>
          <Button onClick={handleAutoUpdate} disabled={isUpdating}>
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isUpdating ? "animate-spin" : ""}`}
            />
            Update Now
          </Button>
        </div>
      </div>

      {autoUpdate && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Label className="whitespace-nowrap">Update Interval:</Label>
              <select
                className="flex h-9 w-[200px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={autoUpdateInterval}
                onChange={(e) => setAutoUpdateInterval(e.target.value)}
              >
                <option value="15">Every 15 minutes</option>
                <option value="30">Every 30 minutes</option>
                <option value="60">Every hour</option>
                <option value="360">Every 6 hours</option>
                <option value="1440">Every 24 hours</option>
              </select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Base Currency</CardDescription>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              USD
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Currencies</CardDescription>
            <CardTitle className="text-2xl">{currencies.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Biggest Gainer</CardDescription>
            <CardTitle className="flex items-center gap-1 text-green-600">
              <TrendingUp className="h-4 w-4" />
              {currencies
                .filter((c) => c.code !== "USD")
                .sort((a, b) => b.change24h - a.change24h)[0]
                ?.code || "—"}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Biggest Loser</CardDescription>
            <CardTitle className="flex items-center gap-1 text-red-600">
              <TrendingDown className="h-4 w-4" />
              {currencies
                .filter((c) => c.code !== "USD")
                .sort((a, b) => a.change24h - b.change24h)[0]
                ?.code || "—"}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Currency Table */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Exchange Rates (Base: USD)</CardTitle>
              <CardDescription>
                Click the edit icon to manually update a rate.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Currency</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">24h Change</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currencies.map((currency) => (
                    <TableRow key={currency.code}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{currency.symbol}</span>
                          <span className="font-medium">{currency.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{currency.code}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {editingCode === currency.code ? (
                          <div className="flex items-center justify-end gap-1">
                            <Input
                              className="h-7 w-24 text-right font-mono text-sm"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleEditSave(currency.code);
                                if (e.key === "Escape") handleEditCancel();
                              }}
                              autoFocus
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => handleEditSave(currency.code)}
                            >
                              <Check className="h-3 w-3 text-green-600" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={handleEditCancel}
                            >
                              <X className="h-3 w-3 text-red-600" />
                            </Button>
                          </div>
                        ) : (
                          currency.rate.toFixed(currency.rate > 100 ? 1 : 4)
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={
                            currency.change24h >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }
                        >
                          {currency.change24h >= 0 ? "+" : ""}
                          {currency.change24h.toFixed(2)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {currency.lastUpdated}
                      </TableCell>
                      <TableCell className="text-right">
                        {editingCode !== currency.code && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              handleEditStart(currency.code, currency.rate)
                            }
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Currency Converter */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Currency Converter
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>From</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={convertFrom}
                  onChange={(e) => setConvertFrom(e.target.value)}
                >
                  {currencies.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} - {c.name}
                    </option>
                  ))}
                </select>
                <Input
                  placeholder="Amount"
                  type="number"
                  value={convertAmount}
                  onChange={(e) => setConvertAmount(e.target.value)}
                />
              </div>

              <div className="flex justify-center">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSwapCurrencies}
                >
                  <ArrowRightLeft className="h-4 w-4 rotate-90" />
                </Button>
              </div>

              <div className="space-y-2">
                <Label>To</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={convertTo}
                  onChange={(e) => setConvertTo(e.target.value)}
                >
                  {currencies.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} - {c.name}
                    </option>
                  ))}
                </select>
                {convertResult !== null && (
                  <div className="rounded-lg bg-muted p-3 text-center">
                    <p className="text-2xl font-bold">
                      {currencies.find((c) => c.code === convertTo)?.symbol}
                      {convertResult.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      1 {convertFrom} ={" "}
                      {(
                        currencies.find((c) => c.code === convertFrom)!.rate /
                        currencies.find((c) => c.code === convertTo)!.rate
                      ).toFixed(4)}{" "}
                      {convertTo}
                    </p>
                  </div>
                )}
              </div>

              <Button className="w-full" onClick={handleConvert}>
                <Calculator className="mr-2 h-4 w-4" />
                Convert
              </Button>
            </CardContent>
          </Card>

          {/* Historical Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Historical Rates (7 Days)</CardTitle>
              <CardDescription>Select currency to view trend</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value)}
              >
                {topCurrencies.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} - {c.name}
                  </option>
                ))}
              </select>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={historicalData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey={selectedCurrency}
                      stroke="#2563eb"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      name={selectedCurrency}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
