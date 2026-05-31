import { useState } from "react";
import { useNavigate } from "react-router";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wallet, Shield, BarChart3, Users, Loader2, Mail, Lock, UserPlus } from "lucide-react";
import { setDemoUser } from "@/hooks/useAuth";
import { useApi, ApiError } from "@/providers/ApiProvider";
import { toast } from "sonner";

export default function Login() {
  const navigate = useNavigate();
  const { login, register } = useApi();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  const handleDemoLogin = () => {
    setLoading(true);
    setDemoUser({
      id: 1,
      unionId: "demo-user-001",
      name: "Demo User",
      email: "demo@ledgerai.app",
      avatar: null,
      role: "admin",
    });
    toast.success("Logged in as Demo User");
    window.location.href = "/";
  };

  const handleRealLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Logged in successfully");
      navigate("/org-setup");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(email, password, fullName);
      toast.success("Account created successfully");
      navigate("/org-setup");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-white dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Wallet className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">LedgerAI</h1>
          <p className="text-gray-500 mt-2">Modern Accounting Software</p>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <CardTitle>Welcome</CardTitle>
            <CardDescription>Sign in or create an account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="w-full">
                <TabsTrigger value="login" className="flex-1">Sign In</TabsTrigger>
                <TabsTrigger value="register" className="flex-1">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleRealLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input id="email" type="email" placeholder="you@company.com" className="pl-9" value={email} onChange={e => setEmail(e.target.value)} required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input id="password" type="password" placeholder="••••••••" className="pl-9" value={password} onChange={e => setPassword(e.target.value)} required />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    {loading ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <div className="relative">
                      <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input id="name" placeholder="John Doe" className="pl-9" value={fullName} onChange={e => setFullName(e.target.value)} required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input id="reg-email" type="email" placeholder="you@company.com" className="pl-9" value={email} onChange={e => setEmail(e.target.value)} required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input id="reg-password" type="password" placeholder="Min 6 characters" className="pl-9" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    {loading ? "Creating account..." : "Create Account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">or continue as guest</span>
              </div>
            </div>

            <Button variant="outline" className="w-full" onClick={handleDemoLogin} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Demo Login
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">Features</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center mx-auto">
                  <BarChart3 className="w-5 h-5 text-green-600" />
                </div>
                <p className="text-xs text-gray-600">Financial Reports</p>
              </div>
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center mx-auto">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-xs text-gray-600">Team Management</p>
              </div>
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center mx-auto">
                  <Shield className="w-5 h-5 text-purple-600" />
                </div>
                <p className="text-xs text-gray-600">Secure & Private</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-gray-500">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
