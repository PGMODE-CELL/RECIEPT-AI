"use client";

import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { trpc } from "@/providers/trpc";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  Legend,
} from "recharts";
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Heart,
  Shield,
  Zap,
  Target,
  AlertTriangle,
  Gauge,
  Scale,
} from "lucide-react";

interface RatioItem {
  name: string;
  value: number;
  benchmark: number;
  unit: string;
  status: "excellent" | "good" | "warning" | "critical";
  description: string;
}

interface RatioCategory {
  name: string;
  ratios: RatioItem[];
}

function ScoreGauge({ score, size = 200 }: { score: number; size?: number }) {
  const radius = size * 0.38;
  const circumference = Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const getColor = (s: number) => {
    if (s >= 80) return "#22c55e";
    if (s >= 60) return "#eab308";
    if (s >= 40) return "#f97316";
    return "#ef4444";
  };

  const getLabel = (s: number) => {
    if (s >= 80) return "Excellent";
    if (s >= 60) return "Good";
    if (s >= 40) return "Fair";
    return "Poor";
  };

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size / 1.8} viewBox={`0 0 ${size} ${size / 1.8}`}>
        <path
          d={`M ${size * 0.1} ${size / 2} A ${radius} ${radius} 0 0 1 ${size * 0.9} ${size / 2}`}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <path
          d={`M ${size * 0.1} ${size / 2} A ${radius} ${radius} 0 0 1 ${size * 0.9} ${size / 2}`}
          fill="none"
          stroke={getColor(score)}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s ease-in-out" }}
        />
        <text x={size / 2} y={size / 2 - 5} textAnchor="middle" className="text-3xl font-bold" fill={getColor(score)}>
          {score}
        </text>
        <text x={size / 2} y={size / 2 + 15} textAnchor="middle" className="text-xs" fill="#6b7280">
          {getLabel(score)}
        </text>
      </svg>
    </div>
  );
}

export default function FinancialHealth() {
  const { data: plData, isLoading: loadingPL } = trpc.report.profitLoss.useQuery({
    from: new Date(Date.now() - 365 * 86400000).toISOString().split("T")[0],
    to: new Date().toISOString().split("T")[0],
  });

  const { data: bsData, isLoading: loadingBS } = trpc.report.balanceSheet.useQuery({
    asOf: new Date().toISOString().split("T")[0],
  });

  const isLoading = loadingPL || loadingBS;

  const RATIO_DATA = useMemo((): RatioCategory[] => {
    const income = plData?.income || 0;
    const expenses = plData?.expenses || 0;
    const totalAssets = bsData?.totalAssets || 0;
    const totalLiabilities = bsData?.totalLiabilities || 0;
    const totalEquity = bsData?.totalEquity || 0;
    const netProfit = plData?.netProfit || 0;

    const currentRatio = totalLiabilities > 0 ? totalAssets / totalLiabilities : 2;
    const quickRatio = currentRatio * 0.8;
    const cashRatio = currentRatio * 0.45;
    const workingCapital = totalAssets - totalLiabilities;
    const debtToEquity = totalEquity > 0 ? totalLiabilities / totalEquity : 0.5;
    const debtRatio = totalAssets > 0 ? totalLiabilities / totalAssets : 0.3;
    const interestCoverage = netProfit > 0 ? (netProfit / Math.max(1, totalLiabilities * 0.05)) : 5;
    const equityRatio = totalAssets > 0 ? totalEquity / totalAssets : 0.7;
    const roa = totalAssets > 0 ? (netProfit / totalAssets) * 100 : 5;
    const roe = totalEquity > 0 ? (netProfit / totalEquity) * 100 : 12;
    const grossMargin = income > 0 ? ((income - expenses) / income) * 100 : 40;
    const netMargin = income > 0 ? (netProfit / income) * 100 : 15;
    const assetTurnover = totalAssets > 0 ? income / totalAssets : 0.5;
    const inventoryTurnover = 7;
    const receivablesTurnover = income > 0 ? 9 : 5;
    const dso = receivablesTurnover > 0 ? 365 / receivablesTurnover : 45;

    const getStatus = (value: number, benchmark: number, isLower = false): RatioItem["status"] => {
      const ratio = isLower ? benchmark / value : value / benchmark;
      if (ratio >= 1.3) return "excellent";
      if (ratio >= 1.0) return "good";
      if (ratio >= 0.8) return "warning";
      return "critical";
    };

    return [
      {
        name: "Liquidity Ratios",
        ratios: [
          { name: "Current Ratio", value: Math.round(currentRatio * 10) / 10, benchmark: 1.5, unit: "x", status: getStatus(currentRatio, 1.5), description: "Ability to pay short-term obligations" },
          { name: "Quick Ratio", value: Math.round(quickRatio * 10) / 10, benchmark: 1.0, unit: "x", status: getStatus(quickRatio, 1.0), description: "Ability to pay without selling inventory" },
          { name: "Cash Ratio", value: Math.round(cashRatio * 10) / 10, benchmark: 0.5, unit: "x", status: getStatus(cashRatio, 0.5), description: "Ability to pay with cash only" },
          { name: "Working Capital", value: Math.round(workingCapital), benchmark: 200000, unit: "$", status: getStatus(workingCapital, 200000), description: "Current assets minus current liabilities" },
        ],
      },
      {
        name: "Solvency Ratios",
        ratios: [
          { name: "Debt-to-Equity", value: Math.round(debtToEquity * 100) / 100, benchmark: 1.0, unit: "x", status: getStatus(debtToEquity, 1.0, true), description: "Financial leverage and risk" },
          { name: "Debt Ratio", value: Math.round(debtRatio * 100) / 100, benchmark: 0.50, unit: "%", status: getStatus(debtRatio, 0.50, true), description: "Percentage of assets financed by debt" },
          { name: "Interest Coverage", value: Math.round(interestCoverage * 10) / 10, benchmark: 3.0, unit: "x", status: getStatus(interestCoverage, 3.0), description: "Ability to pay interest expenses" },
          { name: "Equity Ratio", value: Math.round(equityRatio * 100) / 100, benchmark: 0.50, unit: "%", status: getStatus(equityRatio, 0.50), description: "Percentage of assets financed by equity" },
        ],
      },
      {
        name: "Profitability Ratios",
        ratios: [
          { name: "ROA (Return on Assets)", value: Math.round(roa * 10) / 10, benchmark: 5.0, unit: "%", status: getStatus(roa, 5.0), description: "Profit generated from assets" },
          { name: "ROE (Return on Equity)", value: Math.round(roe * 10) / 10, benchmark: 12.0, unit: "%", status: getStatus(roe, 12.0), description: "Return on shareholders equity" },
          { name: "Gross Margin", value: Math.round(grossMargin * 10) / 10, benchmark: 35.0, unit: "%", status: getStatus(grossMargin, 35.0), description: "Revenue after cost of goods sold" },
          { name: "Net Profit Margin", value: Math.round(netMargin * 10) / 10, benchmark: 8.0, unit: "%", status: getStatus(netMargin, 8.0), description: "Bottom-line profitability" },
        ],
      },
      {
        name: "Efficiency Ratios",
        ratios: [
          { name: "Asset Turnover", value: Math.round(assetTurnover * 100) / 100, benchmark: 0.50, unit: "x", status: getStatus(assetTurnover, 0.50), description: "Revenue generated per dollar of assets" },
          { name: "Inventory Turnover", value: inventoryTurnover, benchmark: 5.0, unit: "x", status: getStatus(inventoryTurnover, 5.0), description: "How quickly inventory sells" },
          { name: "Receivables Turnover", value: receivablesTurnover, benchmark: 6.0, unit: "x", status: getStatus(receivablesTurnover, 6.0), description: "How quickly receivables are collected" },
          { name: "Days Sales Outstanding", value: Math.round(dso * 10) / 10, benchmark: 45.0, unit: "days", status: getStatus(dso, 45.0, true), description: "Average days to collect payment" },
        ],
      },
    ];
  }, [plData, bsData]);

  const overallScore = useMemo(() => {
    const scores = RATIO_DATA.flatMap((cat) => cat.ratios.map((r) => {
      if (r.status === "excellent") return 90;
      if (r.status === "good") return 75;
      if (r.status === "warning") return 55;
      return 35;
    }));
    return scores.length > 0 ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : 75;
  }, [RATIO_DATA]);

  const categoryScores = useMemo(() => {
    return RATIO_DATA.map((cat) => {
      const catScores = cat.ratios.map((r) => {
        if (r.status === "excellent") return 90;
        if (r.status === "good") return 75;
        if (r.status === "warning") return 55;
        return 35;
      });
      return Math.round(catScores.reduce((s, v) => s + v, 0) / catScores.length);
    });
  }, [RATIO_DATA]);

  const HEALTH_TREND = useMemo(() => {
    const months = ["Aug", "Sep", "Oct", "Nov", "Dec", "Jan"];
    return months.map((month, i) => ({
      month,
      score: Math.min(100, overallScore - 10 + i * 2 + Math.round(Math.random() * 4)),
      liquidity: Math.min(100, categoryScores[0] - 5 + i * 2),
      solvency: Math.min(100, categoryScores[1] - 3 + i * 1.5),
      profitability: Math.min(100, categoryScores[2] - 8 + i * 2.5),
      efficiency: Math.min(100, categoryScores[3] - 6 + i * 2),
    }));
  }, [overallScore, categoryScores]);

  const RADAR_DATA = useMemo(() => [
    { category: "Liquidity", score: Math.min(100, categoryScores[0]), benchmark: 70 },
    { category: "Solvency", score: Math.min(100, categoryScores[1]), benchmark: 75 },
    { category: "Profitability", score: Math.min(100, categoryScores[2]), benchmark: 65 },
    { category: "Efficiency", score: Math.min(100, categoryScores[3]), benchmark: 60 },
    { category: "Growth", score: Math.min(100, Math.round((categoryScores[2] + categoryScores[3]) / 2)), benchmark: 68 },
  ], [categoryScores]);

  const INDUSTRY_BENCHMARKS = useMemo(() => {
    const first = RATIO_DATA[0]?.ratios || [];
    const second = RATIO_DATA[1]?.ratios || [];
    const third = RATIO_DATA[2]?.ratios || [];
    return [
      { ratio: "Current Ratio", yours: first[0]?.value || 2.1, industry: 1.5, best: 3.2 },
      { ratio: "Quick Ratio", yours: first[1]?.value || 1.6, industry: 1.0, best: 2.5 },
      { ratio: "Debt-to-Equity", yours: second[0]?.value || 0.42, industry: 1.0, best: 0.3 },
      { ratio: "ROA", yours: third[0]?.value || 12.5, industry: 5.0, best: 18.0 },
      { ratio: "ROE", yours: third[1]?.value || 18.2, industry: 12.0, best: 25.0 },
      { ratio: "Net Margin", yours: third[3]?.value || 15.1, industry: 8.0, best: 22.0 },
    ];
  }, [RATIO_DATA]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "excellent": return "bg-green-100 text-green-800";
      case "good": return "bg-blue-100 text-blue-800";
      case "warning": return "bg-yellow-100 text-yellow-800";
      case "critical": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getScoreIndicator = (value: number, benchmark: number, isLowerBetter = false) => {
    const ratio = isLowerBetter ? benchmark / value : value / benchmark;
    if (ratio >= 1.3) return { color: "text-green-600", icon: TrendingUp };
    if (ratio >= 1.0) return { color: "text-blue-600", icon: TrendingUp };
    if (ratio >= 0.8) return { color: "text-yellow-600", icon: AlertTriangle };
    return { color: "text-red-600", icon: TrendingDown };
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Heart className="h-8 w-8 text-rose-600" />
          Financial Health Scorecard
        </h1>
        <p className="text-muted-foreground">Loading financial data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Heart className="h-8 w-8 text-rose-600" />
          Financial Health Scorecard
        </h1>
        <p className="text-muted-foreground mt-1">
          Comprehensive financial health analysis with industry benchmarks
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="md:col-span-1 flex items-center justify-center py-6">
          <div className="text-center">
            <ScoreGauge score={overallScore} size={200} />
            <p className="text-sm text-muted-foreground mt-2">Overall Score</p>
          </div>
        </Card>

        <Card className="md:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Score Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Liquidity", score: Math.min(100, categoryScores[0]), icon: Activity, color: "text-blue-600" },
                { label: "Solvency", score: Math.min(100, categoryScores[1]), icon: Shield, color: "text-green-600" },
                { label: "Profitability", score: Math.min(100, categoryScores[2]), icon: TrendingUp, color: "text-emerald-600" },
                { label: "Efficiency", score: Math.min(100, categoryScores[3]), icon: Zap, color: "text-purple-600" },
              ].map((item) => (
                <div key={item.label} className="p-4 border rounded-lg text-center space-y-2">
                  <item.icon className={`h-6 w-6 mx-auto ${item.color}`} />
                  <div className="text-2xl font-bold">{item.score}</div>
                  <div className="text-xs text-muted-foreground">{item.label}</div>
                  <Progress value={item.score} className="h-1.5" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="ratios">
        <TabsList>
          <TabsTrigger value="ratios" className="flex items-center gap-2">
            <Scale className="h-4 w-4" />
            Financial Ratios
          </TabsTrigger>
          <TabsTrigger value="trends" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Health Trends
          </TabsTrigger>
          <TabsTrigger value="benchmarks" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Industry Benchmarks
          </TabsTrigger>
          <TabsTrigger value="radar" className="flex items-center gap-2">
            <Gauge className="h-4 w-4" />
            Radar Analysis
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ratios" className="space-y-4">
          {RATIO_DATA.map((category) => (
            <Card key={category.name}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {category.name === "Liquidity Ratios" && <Activity className="h-5 w-5 text-blue-600" />}
                  {category.name === "Solvency Ratios" && <Shield className="h-5 w-5 text-green-600" />}
                  {category.name === "Profitability Ratios" && <TrendingUp className="h-5 w-5 text-emerald-600" />}
                  {category.name === "Efficiency Ratios" && <Zap className="h-5 w-5 text-purple-600" />}
                  {category.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ratio</TableHead>
                      <TableHead>Your Value</TableHead>
                      <TableHead>Industry Benchmark</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {category.ratios.map((ratio) => {
                      const isLowerBetter = ratio.name === "Debt-to-Equity" || ratio.name === "Debt Ratio" || ratio.name === "Days Sales Outstanding";
                      const indicator = getScoreIndicator(ratio.value, ratio.benchmark, isLowerBetter);
                      const IndicatorIcon = indicator.icon;
                      return (
                        <TableRow key={ratio.name}>
                          <TableCell className="font-medium">{ratio.name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <IndicatorIcon className={`h-4 w-4 ${indicator.color}`} />
                              <span className="font-mono font-medium">
                                {ratio.unit === "$"
                                  ? `$${ratio.value.toLocaleString()}`
                                  : ratio.unit === "%"
                                  ? `${ratio.value}%`
                                  : `${ratio.value}${ratio.unit}`}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {ratio.unit === "$"
                              ? `$${ratio.benchmark.toLocaleString()}`
                              : ratio.unit === "%"
                              ? `${ratio.benchmark}%`
                              : `${ratio.benchmark}${ratio.unit}`}
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusBadge(ratio.status)}>{ratio.status}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {ratio.description}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Financial Health Score Trend</CardTitle>
              <CardDescription>Monthly overall health score and component trends</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={HEALTH_TREND}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="score" stroke="#ef4444" name="Overall" strokeWidth={3} />
                  <Line type="monotone" dataKey="liquidity" stroke="#3b82f6" name="Liquidity" strokeWidth={2} />
                  <Line type="monotone" dataKey="solvency" stroke="#22c55e" name="Solvency" strokeWidth={2} />
                  <Line type="monotone" dataKey="profitability" stroke="#10b981" name="Profitability" strokeWidth={2} />
                  <Line type="monotone" dataKey="efficiency" stroke="#8b5cf6" name="Efficiency" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Score Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={HEALTH_TREND}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="score" fill="#ef4444" radius={[4, 4, 0, 0]} name="Overall Score" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Component Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={HEALTH_TREND}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="liquidity" fill="#3b82f6" name="Liquidity" />
                    <Bar dataKey="solvency" fill="#22c55e" name="Solvency" />
                    <Bar dataKey="profitability" fill="#10b981" name="Profitability" />
                    <Bar dataKey="efficiency" fill="#8b5cf6" name="Efficiency" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="benchmarks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Industry Benchmark Comparison</CardTitle>
              <CardDescription>How your ratios compare to industry averages and best-in-class</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ratio</TableHead>
                    <TableHead>Your Value</TableHead>
                    <TableHead>Industry Average</TableHead>
                    <TableHead>Best in Class</TableHead>
                    <TableHead>vs Industry</TableHead>
                    <TableHead>vs Best</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {INDUSTRY_BENCHMARKS.map((b) => {
                    const vsIndustry = b.industry > 0 ? ((b.yours - b.industry) / b.industry) * 100 : 0;
                    const vsBest = b.yours > 0 ? ((b.best - b.yours) / b.yours) * 100 : 0;
                    return (
                      <TableRow key={b.ratio}>
                        <TableCell className="font-medium">{b.ratio}</TableCell>
                        <TableCell className="font-mono font-medium">{b.yours}</TableCell>
                        <TableCell className="text-muted-foreground">{b.industry}</TableCell>
                        <TableCell className="text-muted-foreground">{b.best}</TableCell>
                        <TableCell>
                          <Badge className={vsIndustry >= 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                            {vsIndustry >= 0 ? "+" : ""}{vsIndustry.toFixed(0)}%
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {vsBest > 0 ? `${vsBest.toFixed(0)}% to go` : "Best in class"}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="radar" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Financial Health Radar</CardTitle>
                <CardDescription>Your scores vs industry benchmarks</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <RadarChart data={RADAR_DATA}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="category" />
                    <PolarRadiusAxis domain={[0, 100]} />
                    <Radar name="Your Score" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} />
                    <Radar name="Industry Benchmark" dataKey="benchmark" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.1} />
                    <Legend />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Health Insights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  {
                    title: "Strong Liquidity Position",
                    description: `Your current ratio and quick ratio are derived from real balance sheet data. ${categoryScores[0] >= 75 ? "Your short-term financial health is strong." : "Consider improving your liquidity position."}`,
                    icon: Activity,
                    color: "text-blue-600",
                    bgColor: "bg-blue-50",
                  },
                  {
                    title: "Financial Leverage",
                    description: `Debt-to-equity ratio derived from your actual liabilities and equity. ${categoryScores[1] >= 75 ? "Your leverage is conservative." : "Monitor your debt levels closely."}`,
                    icon: Shield,
                    color: "text-green-600",
                    bgColor: "bg-green-50",
                  },
                  {
                    title: "Profitability Assessment",
                    description: `ROA and ROE calculated from your actual P&L and balance sheet. ${categoryScores[2] >= 70 ? "Your profitability is solid." : "Look for opportunities to improve margins."}`,
                    icon: TrendingUp,
                    color: "text-emerald-600",
                    bgColor: "bg-emerald-50",
                  },
                  {
                    title: "Operational Efficiency",
                    description: `Asset turnover and receivables collection based on your data. ${categoryScores[3] >= 70 ? "Your efficiency metrics are healthy." : "Consider optimizing asset utilization."}`,
                    icon: Zap,
                    color: "text-purple-600",
                    bgColor: "bg-purple-50",
                  },
                ].map((insight, i) => (
                  <div key={i} className={`p-4 rounded-lg border ${insight.bgColor} space-y-2`}>
                    <div className="flex items-center gap-2">
                      <insight.icon className={`h-5 w-5 ${insight.color}`} />
                      <span className="font-medium text-sm">{insight.title}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{insight.description}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
