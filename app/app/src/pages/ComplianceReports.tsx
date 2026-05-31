import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

interface ReportRow {
  id: string;
  date: string;
  description: string;
  hsn?: string;
  taxableAmount: number;
  taxAmount: number;
  totalAmount: number;
  placeOfSupply?: string;
  gstRate?: number;
  tdsRate?: number;
}

const mockData: Record<string, ReportRow[]> = {
  "gstr-1": [
    { id: "1", date: "2026-04-05", description: "Invoice to Acme Corp", hsn: "998311", taxableAmount: 50000, taxAmount: 9000, totalAmount: 59000, placeOfSupply: "Maharashtra", gstRate: 18 },
    { id: "2", date: "2026-04-12", description: "Invoice to Beta Inc", hsn: "998312", taxableAmount: 25000, taxAmount: 4500, totalAmount: 29500, placeOfSupply: "Karnataka", gstRate: 18 },
    { id: "3", date: "2026-04-20", description: "Invoice to Gamma Ltd", hsn: "998311", taxableAmount: 75000, taxAmount: 13500, totalAmount: 88500, placeOfSupply: "Delhi", gstRate: 18 },
    { id: "4", date: "2026-04-28", description: "Invoice to Delta Corp", hsn: "998313", taxableAmount: 12000, taxAmount: 2160, totalAmount: 14160, placeOfSupply: "Tamil Nadu", gstRate: 18 },
  ],
  "gstr-3b": [
    { id: "1", date: "2026-04-30", description: "Outward taxable supplies", taxableAmount: 162000, taxAmount: 29160, totalAmount: 191160 },
    { id: "2", date: "2026-04-30", description: "Inward supplies (reverse charge)", taxableAmount: 10000, taxAmount: 1800, totalAmount: 11800 },
    { id: "3", date: "2026-04-30", description: "ITC available", taxableAmount: 0, taxAmount: 5400, totalAmount: 5400 },
  ],
  "vat": [
    { id: "1", date: "2026-04-01", description: "Sales - Domestic", taxableAmount: 80000, taxAmount: 6400, totalAmount: 86400 },
    { id: "2", date: "2026-04-15", description: "Sales - Export", taxableAmount: 45000, taxAmount: 0, totalAmount: 45000 },
    { id: "3", date: "2026-04-30", description: "Purchase - Input VAT", taxableAmount: 30000, taxAmount: 2400, totalAmount: 32400 },
  ],
  "sales-tax": [
    { id: "1", date: "2026-04-05", description: "Retail Sales", taxableAmount: 120000, taxAmount: 8400, totalAmount: 128400 },
    { id: "2", date: "2026-04-18", description: "Wholesale Sales", taxableAmount: 200000, taxAmount: 14000, totalAmount: 214000 },
  ],
  "withholding-tax": [
    { id: "1", date: "2026-04-10", description: "Contractor Payment - ABC Services", taxableAmount: 50000, taxAmount: 5000, totalAmount: 45000, tdsRate: 10 },
    { id: "2", date: "2026-04-22", description: "Freight Payment - XYZ Logistics", taxableAmount: 30000, taxAmount: 3000, totalAmount: 27000, tdsRate: 10 },
  ],
  "tds": [
    { id: "1", date: "2026-04-08", description: "Salary - Employee A", taxableAmount: 80000, taxAmount: 8000, totalAmount: 72000, tdsRate: 10 },
    { id: "2", date: "2026-04-15", description: "Professional Fees - Consultant B", taxableAmount: 40000, taxAmount: 4000, totalAmount: 36000, tdsRate: 10 },
    { id: "3", date: "2026-04-25", description: "Commission - Agent C", taxableAmount: 25000, taxAmount: 2500, totalAmount: 22500, tdsRate: 10 },
  ],
};

const reportLabels: Record<string, string> = {
  "gstr-1": "GSTR-1 (Outward Supplies)",
  "gstr-3b": "GSTR-3B (Summary Return)",
  "vat": "VAT Return",
  "sales-tax": "Sales Tax Report",
  "withholding-tax": "Withholding Tax Report",
  "tds": "TDS Report",
};

export default function ComplianceReports() {
  const [activeTab, setActiveTab] = useState("gstr-1");
  const [dateFrom, setDateFrom] = useState("2026-04-01");
  const [dateTo, setDateTo] = useState("2026-04-30");

  const data = mockData[activeTab] || [];
  const filteredData = data.filter((row) => {
    if (!dateFrom || !dateTo) return true;
    return row.date >= dateFrom && row.date <= dateTo;
  });

  const totalTaxable = filteredData.reduce((sum, r) => sum + r.taxableAmount, 0);
  const totalTax = filteredData.reduce((sum, r) => sum + r.taxAmount, 0);
  const totalAmount = filteredData.reduce((sum, r) => sum + r.totalAmount, 0);

  const exportCSV = () => {
    const headers = ["Date", "Description", "HSN", "Taxable Amount", "Tax Amount", "Total Amount"];
    const rows = filteredData.map((r) => [r.date, r.description, r.hsn || "", r.taxableAmount, r.taxAmount, r.totalAmount]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeTab}_${dateFrom}_${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported successfully");
  };

  const exportPDF = () => {
    toast.success("PDF export initiated (simulated)");
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Compliance & Tax Reports</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap">
          {Object.keys(reportLabels).map((key) => (
            <TabsTrigger key={key} value={key}>{reportLabels[key]}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="space-y-6">
          <div className="flex items-end gap-4">
            <div>
              <Label>From Date</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div>
              <Label>To Date</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <Button variant="outline" onClick={exportCSV}>Export CSV</Button>
            <Button variant="outline" onClick={exportPDF}>Export PDF</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Taxable Amount</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{totalTaxable.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Tax Amount</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{totalTax.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Amount</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{totalAmount.toLocaleString()}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{reportLabels[activeTab]}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    {activeTab === "gstr-1" && <TableHead>HSN</TableHead>}
                    {activeTab === "gstr-1" && <TableHead>Place of Supply</TableHead>}
                    {(activeTab === "withholding-tax" || activeTab === "tds") && <TableHead>Rate</TableHead>}
                    <TableHead className="text-right">Taxable</TableHead>
                    <TableHead className="text-right">Tax</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.date}</TableCell>
                      <TableCell>{row.description}</TableCell>
                      {activeTab === "gstr-1" && <TableCell><Badge variant="outline">{row.hsn}</Badge></TableCell>}
                      {activeTab === "gstr-1" && <TableCell>{row.placeOfSupply}</TableCell>}
                      {(activeTab === "withholding-tax" || activeTab === "tds") && <TableCell>{row.tdsRate}%</TableCell>}
                      <TableCell className="text-right">₹{row.taxableAmount.toLocaleString()}</TableCell>
                      <TableCell className="text-right">₹{row.taxAmount.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-medium">₹{row.totalAmount.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                  {filteredData.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No data found for the selected date range
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
