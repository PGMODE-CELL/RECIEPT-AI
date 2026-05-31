import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, FileText, Receipt, UserCircle, Building2, Mail, Phone, MapPin, Calendar, DollarSign } from "lucide-react";
import { toast } from "sonner";

export default function ContactDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const contactId = Number(id);

  const { data: contact, isLoading } = trpc.contact.getById.useQuery({ id: contactId });
  const { data: statement } = trpc.contact.statement.useQuery({ id: contactId });

  const formatCurrency = (v: string | number | null) =>
    v ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(v)) : "—";

  if (isLoading) return <div className="p-6 text-center">Loading...</div>;
  if (!contact) return <div className="p-6 text-center text-gray-500">Contact not found</div>;

  const totalInvoiced = statement?.invoices?.reduce((s, i) => s + parseFloat(i.total || "0"), 0) || 0;
  const totalBilled = statement?.bills?.reduce((s, b) => s + parseFloat(b.total || "0"), 0) || 0;
  const totalDue = statement?.invoices?.reduce((s, i) => s + parseFloat(i.amountDue || "0"), 0) || 0;

  const typeIcon = contact.type === "customer" ? <UserCircle className="w-5 h-5 text-blue-500" /> :
    contact.type === "vendor" ? <Building2 className="w-5 h-5 text-amber-500" /> :
    <UserCircle className="w-5 h-5 text-purple-500" />;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/contacts")}><ArrowLeft className="w-5 h-5" /></Button>
          <div className="flex items-center gap-3">
            {typeIcon}
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{contact.name}</h1>
              <Badge variant="outline">{contact.type}</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Info & Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Contact Details</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {contact.companyName && (
              <div className="flex items-center gap-3">
                <Building2 className="w-4 h-4 text-gray-400" />
                <span>{contact.companyName}</span>
              </div>
            )}
            {contact.email && (
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-gray-400" />
                <span>{contact.email}</span>
              </div>
            )}
            {contact.phone && (
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-gray-400" />
                <span>{contact.phone}</span>
              </div>
            )}
            {contact.address && (
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span>{contact.address}{contact.city ? `, ${contact.city}` : ""}{contact.country ? `, ${contact.country}` : ""}</span>
              </div>
            )}
            {contact.taxId && (
              <div className="flex items-center gap-3">
                <span className="text-gray-400 text-sm">Tax ID:</span>
                <span className="font-mono">{contact.taxId}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Total Invoiced</span>
              <span className="font-medium">{formatCurrency(totalInvoiced)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Total Billed</span>
              <span className="font-medium">{formatCurrency(totalBilled)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Balance Due</span>
              <span className={`font-bold ${Number(contact.balance) > 0 ? "text-amber-600" : "text-green-600"}`}>{formatCurrency(contact.balance)}</span>
            </div>
            <div className="pt-3 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Payment Terms</span>
                <span>{contact.paymentTerms || 30} days</span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm text-gray-500">Currency</span>
                <span>{contact.currency || "USD"}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Statements */}
      <Tabs defaultValue="invoices">
        <TabsList>
          <TabsTrigger value="invoices"><FileText className="w-4 h-4 mr-1" /> Invoices ({statement?.invoices?.length || 0})</TabsTrigger>
          <TabsTrigger value="bills"><Receipt className="w-4 h-4 mr-1" /> Bills ({statement?.bills?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices">
          <Card>
            <CardHeader><CardTitle>Invoice History</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Due</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {statement?.invoices?.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-500">No invoices for this contact</TableCell></TableRow>
                  )}
                  {statement?.invoices?.map((inv) => (
                    <TableRow key={inv.id} className="cursor-pointer hover:bg-gray-50" onClick={() => navigate(`/invoices/${inv.id}`)}>
                      <TableCell className="font-medium">{inv.invoiceNumber}</TableCell>
                      <TableCell>{inv.issueDate ? new Date(inv.issueDate).toLocaleDateString() : "—"}</TableCell>
                      <TableCell>{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "—"}</TableCell>
                      <TableCell><Badge variant={inv.status === "paid" ? "default" : "outline"}>{inv.status}</Badge></TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(inv.total)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(inv.amountDue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {statement?.invoices && statement.invoices.length > 0 && (
                <div className="mt-4 pt-4 border-t flex justify-between font-medium">
                  <span>Total</span>
                  <span>{formatCurrency(totalInvoiced)}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bills">
          <Card>
            <CardHeader><CardTitle>Bill History</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bill #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Due</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {statement?.bills?.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-500">No bills for this contact</TableCell></TableRow>
                  )}
                  {statement?.bills?.map((bill) => (
                    <TableRow key={bill.id}>
                      <TableCell className="font-medium">{bill.billNumber}</TableCell>
                      <TableCell>{bill.billDate ? new Date(bill.billDate).toLocaleDateString() : "—"}</TableCell>
                      <TableCell>{bill.dueDate ? new Date(bill.dueDate).toLocaleDateString() : "—"}</TableCell>
                      <TableCell><Badge variant={bill.status === "paid" ? "default" : "outline"}>{bill.status}</Badge></TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(bill.total)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(bill.amountDue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {statement?.bills && statement.bills.length > 0 && (
                <div className="mt-4 pt-4 border-t flex justify-between font-medium">
                  <span>Total</span>
                  <span>{formatCurrency(totalBilled)}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
