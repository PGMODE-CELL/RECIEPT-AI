import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wallet, Loader2, Building2, Globe } from "lucide-react";
import { useApi, ApiError } from "@/providers/ApiProvider";
import { getToken } from "@/lib/api";
import { toast } from "sonner";

export default function OrgSetup() {
  const navigate = useNavigate();
  const { api, orgId, setOrg } = useApi();
  const [name, setName] = useState("");
  const [country, setCountry] = useState("US");
  const [taxId, setTaxId] = useState("");
  const [loading, setLoading] = useState(false);
  const [countries, setCountries] = useState<any[]>([]);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      navigate("/login");
      return;
    }
    api.setup.countries().then(c => {
      setCountries(c);
      if (c.length > 0) setCountry(c[0].code);
    }).catch(() => {}).finally(() => setChecking(false));
  }, [api, navigate]);

  useEffect(() => {
    if (orgId) navigate("/dashboard");
  }, [orgId, navigate]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await api.setup.create({ name, country, tax_id: taxId || undefined });
      setOrg(result.org_id);
      toast.success(result.message);
navigate("/dashboard");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to create organization");
    } finally {
      setLoading(false);
    }
  };

  if (checking) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-white dark:from-gray-900 dark:to-gray-800">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-white dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Wallet className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Set Up Your Company</h1>
          <p className="text-gray-500 mt-2">Create your organization to get started</p>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Company Details
            </CardTitle>
            <CardDescription>We'll set up your chart of accounts based on your country</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Company Name</Label>
                <Input id="name" placeholder="My Company" value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger>
                    <Globe className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((c: any) => (
                      <SelectItem key={c.code} value={c.code}>{c.name} ({c.currency})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="taxId">Tax ID (optional)</Label>
                <Input id="taxId" placeholder="TAX-12345" value={taxId} onChange={e => setTaxId(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {loading ? "Setting up..." : "Create Company"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
