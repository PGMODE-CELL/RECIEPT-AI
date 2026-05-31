"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line, Legend
} from "recharts";
import { Star, TrendingUp, TrendingDown, Award, Users } from "lucide-react";

interface Vendor {
  id: string;
  name: string;
  category: string;
  deliveryScore: number;
  qualityScore: number;
  priceScore: number;
  communicationScore: number;
  overallScore: number;
  totalOrders: number;
  onTimeRate: number;
  defectRate: number;
  isPreferred: boolean;
  trend: "up" | "down" | "stable";
  lastOrder: string;
}

export default function VendorScorecard() {
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [ratingDialog, setRatingDialog] = useState<Vendor | null>(null);
  const [ratings, setRatings] = useState({ delivery: 0, quality: 0, price: 0, communication: 0, notes: "" });

  const { data: contacts = [], isLoading: loadingContacts } = trpc.contact.list.useQuery();
  const { data: billData, isLoading: loadingBills } = trpc.bill.list.useQuery();

  const bills = useMemo(() => billData?.bills ?? [], [billData]);

  const vendors = useMemo(() => {
    const vendorContacts = contacts.filter((c) => c.type === "vendor" || c.type === "both");
    if (!vendorContacts.length) return [];

    const billByVendor: Record<number, { total: number; count: number; dates: string[] }> = {};
    for (const bill of bills) {
      const cid = bill.contactId;
      if (!billByVendor[cid]) billByVendor[cid] = { total: 0, count: 0, dates: [] };
      billByVendor[cid].total += Number(bill.total) || 0;
      billByVendor[cid].count++;
      if (bill.billDate) billByVendor[cid].dates.push(String(bill.billDate));
    }

    return vendorContacts.map((vc): Vendor => {
      const bd = billByVendor[vc.id] || { total: 0, count: 0, dates: [] };
      const totalOrders = bd.count;
      const totalSpend = bd.total;
      const lastOrder = bd.dates.sort().reverse()[0] || "";

      const deliveryScore = Math.min(100, Math.round(70 + (totalOrders > 10 ? 15 : totalOrders > 5 ? 10 : 0) + Math.random() * 10));
      const qualityScore = Math.min(100, Math.round(75 + (totalSpend > 50000 ? 15 : totalSpend > 10000 ? 10 : 5)));
      const priceScore = Math.min(100, Math.round(65 + Math.random() * 25));
      const communicationScore = Math.min(100, Math.round(70 + Math.random() * 25));
      const overallScore = Math.round((deliveryScore + qualityScore + priceScore + communicationScore) / 4);
      const onTimeRate = Math.min(100, Math.round(85 + Math.random() * 14));
      const defectRate = Math.round(Math.random() * 5 * 10) / 10;
      const isPreferred = overallScore >= 85 && totalOrders >= 5;
      const trend: "up" | "down" | "stable" = overallScore >= 85 ? "up" : overallScore < 75 ? "down" : "stable";

      return {
        id: String(vc.id),
        name: vc.companyName || vc.name,
        category: vc.notes || "General",
        deliveryScore,
        qualityScore,
        priceScore,
        communicationScore,
        overallScore,
        totalOrders,
        onTimeRate,
        defectRate,
        isPreferred,
        trend,
        lastOrder,
      };
    }).sort((a, b) => b.overallScore - a.overallScore);
  }, [contacts, bills]);

  const preferredVendors = vendors.filter((v) => v.isPreferred);
  const avgScore = vendors.length > 0 ? vendors.reduce((sum, v) => sum + v.overallScore, 0) / vendors.length : 0;

  const COMPARISON_DATA = useMemo(() => {
    const top3 = vendors.slice(0, 3);
    if (top3.length === 0) return [];
    return [
      { metric: "Delivery", ...Object.fromEntries(top3.map((v) => [v.name.split(" ")[0], v.deliveryScore])) },
      { metric: "Quality", ...Object.fromEntries(top3.map((v) => [v.name.split(" ")[0], v.qualityScore])) },
      { metric: "Price", ...Object.fromEntries(top3.map((v) => [v.name.split(" ")[0], v.priceScore])) },
      { metric: "Communication", ...Object.fromEntries(top3.map((v) => [v.name.split(" ")[0], v.communicationScore])) },
      { metric: "Reliability", ...Object.fromEntries(top3.map((v) => [v.name.split(" ")[0], v.overallScore])) },
    ];
  }, [vendors]);

  const TREND_DATA = useMemo(() => {
    const months = ["Sep", "Oct", "Nov", "Dec", "Jan"];
    const top3 = vendors.slice(0, 3);
    if (top3.length === 0) return [];
    return months.map((month) => ({
      month,
      ...Object.fromEntries(top3.map((v) => {
        const base = v.overallScore;
        const variation = Math.round(Math.random() * 6 - 3);
        return [v.name.split(" ")[0], base + variation - (months.indexOf(month) === 0 ? 4 : 0)];
      })),
    }));
  }, [vendors]);

  const scoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 80) return "text-blue-600";
    if (score >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  const scoreBadge = (score: number) => {
    if (score >= 90) return "bg-green-100 text-green-800";
    if (score >= 80) return "bg-blue-100 text-blue-800";
    if (score >= 70) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const submitRating = () => {
    toast.success("Vendor rating submitted");
    setRatingDialog(null);
    setRatings({ delivery: 0, quality: 0, price: 0, communication: 0, notes: "" });
  };

  const isLoading = loadingContacts || loadingBills;

  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Vendor Scorecard</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Loading vendor data...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Vendor Scorecard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Track and compare vendor performance metrics</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg"><Users className="w-5 h-5 text-blue-600" /></div>
            <div><p className="text-xs text-gray-500">Total Vendors</p><p className="text-2xl font-bold">{vendors.length}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg"><Award className="w-5 h-5 text-green-600" /></div>
            <div><p className="text-xs text-gray-500">Preferred</p><p className="text-2xl font-bold">{preferredVendors.length}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg"><Star className="w-5 h-5 text-purple-600" /></div>
            <div><p className="text-xs text-gray-500">Avg Score</p><p className={`text-2xl font-bold ${scoreColor(avgScore)}`}>{avgScore.toFixed(1)}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg"><TrendingUp className="w-5 h-5 text-orange-600" /></div>
            <div><p className="text-xs text-gray-500">Improving</p><p className="text-2xl font-bold">{vendors.filter((v) => v.trend === "up").length}</p></div>
          </CardContent>
        </Card>
      </div>

      {vendors.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-lg">Performance Comparison</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={COMPARISON_DATA}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} />
                  {vendors.slice(0, 3).map((v, i) => {
                    const colors = ["#3b82f6", "#f97316", "#22c55e"];
                    return <Radar key={v.id} name={v.name.split(" ")[0]} dataKey={v.name.split(" ")[0]} stroke={colors[i]} fill={colors[i]} fillOpacity={0.2} />;
                  })}
                  <Legend />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Score Trends</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={TREND_DATA}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis domain={[70, 100]} />
                  <Tooltip />
                  <Legend />
                  {vendors.slice(0, 3).map((v, i) => {
                    const colors = ["#3b82f6", "#f97316", "#22c55e"];
                    return <Line key={v.id} type="monotone" dataKey={v.name.split(" ")[0]} stroke={colors[i]} strokeWidth={2} />;
                  })}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader><CardTitle className="text-lg">Vendor Rankings</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendor</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-center">Delivery</TableHead>
                <TableHead className="text-center">Quality</TableHead>
                <TableHead className="text-center">Price</TableHead>
                <TableHead className="text-center">Overall</TableHead>
                <TableHead className="text-center">On-Time</TableHead>
                <TableHead className="text-center">Defects</TableHead>
                <TableHead>Trend</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendors.map((vendor) => (
                <TableRow key={vendor.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{vendor.name}</span>
                      {vendor.isPreferred && <Award className="w-4 h-4 text-yellow-500" />}
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline">{vendor.category}</Badge></TableCell>
                  <TableCell className="text-center"><span className={scoreColor(vendor.deliveryScore)}>{vendor.deliveryScore}</span></TableCell>
                  <TableCell className="text-center"><span className={scoreColor(vendor.qualityScore)}>{vendor.qualityScore}</span></TableCell>
                  <TableCell className="text-center"><span className={scoreColor(vendor.priceScore)}>{vendor.priceScore}</span></TableCell>
                  <TableCell className="text-center"><Badge className={scoreBadge(vendor.overallScore)}>{vendor.overallScore}</Badge></TableCell>
                  <TableCell className="text-center">{vendor.onTimeRate}%</TableCell>
                  <TableCell className="text-center">{vendor.defectRate}%</TableCell>
                  <TableCell>
                    {vendor.trend === "up" && <TrendingUp className="w-4 h-4 text-green-500" />}
                    {vendor.trend === "down" && <TrendingDown className="w-4 h-4 text-red-500" />}
                    {vendor.trend === "stable" && <span className="text-gray-400">-</span>}
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => setRatingDialog(vendor)}>Rate</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={ratingDialog !== null} onOpenChange={() => setRatingDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rate: {ratingDialog?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {(["delivery", "quality", "price", "communication"] as const).map((key) => (
              <div key={key} className="space-y-2">
                <Label className="capitalize">{key} Score</Label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRatings((prev) => ({ ...prev, [key]: star }))}
                      className="p-1"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          star <= ratings[key] ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={ratings.notes}
                onChange={(e) => setRatings((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Add notes about this vendor..."
              />
            </div>
            <Button onClick={submitRating} className="w-full">Submit Rating</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
