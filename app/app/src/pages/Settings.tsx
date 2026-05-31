import { useState, useEffect } from "react";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Settings as SettingsIcon, Building2, Percent, Globe, Plus, Trash, Save, Users, Shield } from "lucide-react";
import { toast } from "sonner";

export default function Settings() {
  const { data: company, refetch: refetchCompany } = trpc.settings.getCompany.useQuery();
  const { data: taxRates, refetch: refetchTax } = trpc.settings.listTaxRates.useQuery();
  const { data: currencies } = trpc.settings.listCurrencies.useQuery();

  const saveCompany = trpc.settings.saveCompany.useMutation({
    onSuccess: () => { refetchCompany(); toast.success("Company saved"); },
    onError: (error) => toast.error(error.message),
  });
  const createTax = trpc.settings.createTaxRate.useMutation({
    onSuccess: () => { refetchTax(); toast.success("Tax rate added"); },
    onError: (error) => toast.error(error.message),
  });
  const deleteTax = trpc.settings.deleteTaxRate.useMutation({
    onSuccess: () => { refetchTax(); toast.success("Tax rate deleted"); },
  });

  const [companyForm, setCompanyForm] = useState<any>({});

  useEffect(() => {
    if (company) setCompanyForm(company);
  }, [company]);

  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    saveCompany.mutate(companyForm);
  };

  const handleAddTax = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    createTax.mutate({
      name: form.get("name") as string,
      rate: (form.get("rate") as string) || "0",
      type: form.get("type") as any,
      country: form.get("country") as string || undefined,
      region: form.get("region") as string || undefined,
    });
    (e.target as HTMLFormElement).reset();
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <SettingsIcon className="w-6 h-6 text-gray-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Configure your organization</p>
        </div>
      </div>

      <Tabs defaultValue="company">
        <TabsList>
          <TabsTrigger value="company"><Building2 className="w-4 h-4 mr-1" /> Company</TabsTrigger>
          <TabsTrigger value="tax"><Percent className="w-4 h-4 mr-1" /> Tax Rates</TabsTrigger>
          <TabsTrigger value="currency"><Globe className="w-4 h-4 mr-1" /> Currencies</TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Company Profile</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleSaveCompany} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Company Name *</Label><Input value={companyForm.name || ""} onChange={e => setCompanyForm({ ...companyForm, name: e.target.value })} required /></div>
                  <div className="space-y-2"><Label>Legal Name</Label><Input value={companyForm.legalName || ""} onChange={e => setCompanyForm({ ...companyForm, legalName: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Tax ID</Label><Input value={companyForm.taxId || ""} onChange={e => setCompanyForm({ ...companyForm, taxId: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Registration #</Label><Input value={companyForm.registrationNumber || ""} onChange={e => setCompanyForm({ ...companyForm, registrationNumber: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Phone</Label><Input value={companyForm.phone || ""} onChange={e => setCompanyForm({ ...companyForm, phone: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Email</Label><Input value={companyForm.email || ""} onChange={e => setCompanyForm({ ...companyForm, email: e.target.value })} type="email" /></div>
                </div>
                <div className="space-y-2"><Label>Website</Label><Input value={companyForm.website || ""} onChange={e => setCompanyForm({ ...companyForm, website: e.target.value })} /></div>
                <div className="space-y-2"><Label>Address</Label><Input value={companyForm.address || ""} onChange={e => setCompanyForm({ ...companyForm, address: e.target.value })} /></div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2"><Label>City</Label><Input value={companyForm.city || ""} onChange={e => setCompanyForm({ ...companyForm, city: e.target.value })} /></div>
                  <div className="space-y-2"><Label>State</Label><Input value={companyForm.state || ""} onChange={e => setCompanyForm({ ...companyForm, state: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Country</Label><Input value={companyForm.country || ""} onChange={e => setCompanyForm({ ...companyForm, country: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Postal Code</Label><Input value={companyForm.postalCode || ""} onChange={e => setCompanyForm({ ...companyForm, postalCode: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Base Currency</Label><Input value={companyForm.baseCurrency || "USD"} onChange={e => setCompanyForm({ ...companyForm, baseCurrency: e.target.value })} /></div>
                </div>
                <div className="space-y-2"><Label>Fiscal Year Start</Label><Input type="date" value={companyForm.fiscalYearStart ? new Date(companyForm.fiscalYearStart).toISOString().split("T")[0] : ""} onChange={e => setCompanyForm({ ...companyForm, fiscalYearStart: e.target.value })} /></div>
                <Button type="submit" disabled={saveCompany.isPending}>
                  <Save className="w-4 h-4 mr-2" />
                  {saveCompany.isPending ? "Saving..." : "Save Company"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tax" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Tax Rates</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleAddTax} className="flex gap-3 items-end">
                <div className="flex-1 space-y-2"><Label className="text-xs">Name</Label><Input name="name" placeholder="GST 18%" required /></div>
                <div className="w-24 space-y-2"><Label className="text-xs">Rate %</Label><Input name="rate" type="number" step="0.01" required /></div>
                <div className="w-32 space-y-2"><Label className="text-xs">Type</Label>
                  <select name="type" className="w-full px-3 py-2 border rounded-lg text-sm">
                    <option value="vat">VAT</option><option value="gst">GST</option><option value="sales_tax">Sales Tax</option><option value="withholding">Withholding</option><option value="custom">Custom</option>
                  </select>
                </div>
                <div className="w-32 space-y-2"><Label className="text-xs">Country</Label><Input name="country" placeholder="IN" /></div>
                <Button type="submit"><Plus className="w-4 h-4" /></Button>
              </form>
              <Table>
                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Rate</TableHead><TableHead>Type</TableHead><TableHead>Country</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>
                  {taxRates?.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-4 text-gray-500">No tax rates configured</TableCell></TableRow>}
                  {taxRates?.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell>{t.rate}%</TableCell>
                      <TableCell><Badge variant="outline">{t.type}</Badge></TableCell>
                      <TableCell>{t.country || "—"}</TableCell>
                      <TableCell><Button variant="ghost" size="icon" onClick={() => deleteTax.mutate({ id: t.id })}><Trash className="w-4 h-4 text-red-500" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="currency" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Currencies</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-4">Exchange rates are used for multi-currency transactions.</p>
              <Table>
                <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Symbol</TableHead><TableHead className="text-right">Exchange Rate</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {currencies?.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono font-medium">{c.code}</TableCell>
                      <TableCell>{c.name}</TableCell>
                      <TableCell>{c.symbol}</TableCell>
                      <TableCell className="text-right">{c.exchangeRate}</TableCell>
                      <TableCell><Badge className={c.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}>{c.isActive ? "Active" : "Inactive"}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
