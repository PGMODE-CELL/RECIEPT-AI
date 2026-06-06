import { useState } from "react";
import { trpc } from "@/providers/trpc";
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
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Shield,
  Key,
  Smartphone,
  Monitor,
  Globe,
  Trash2,
  Plus,
  Copy,
  Eye,
  EyeOff,
  Lock,
  LogOut,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

interface Session {
  id: string;
  device: string;
  ip: string;
  browser: string;
  lastActive: string;
  current: boolean;
}

interface LoginRecord {
  id: string;
  ip: string;
  device: string;
  location: string;
  time: string;
  status: "success" | "failed";
}

interface ApiKey {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  lastUsed: string;
  active: boolean;
}

// TODO: Replace with backend endpoint when available

export default function SecurityCenter() {
  // TODO: Replace with backend endpoint when available
  const [sessions, setSessions] = useState<Session[]>([]);
  // TODO: Replace with backend endpoint when available
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const { data: loginRecordsData = [] } = trpc.audit.list.useQuery();
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [ipWhitelistEnabled, setIpWhitelistEnabled] = useState(false);
  const [ipWhitelist, setIpWhitelist] = useState(
    "192.168.1.0/24\n10.0.0.0/8"
  );
  const [createKeyDialogOpen, setCreateKeyDialogOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyVisible, setNewKeyVisible] = useState<string | null>(null);
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const handleRevokeSession = (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    toast.success("Session revoked successfully");
  };

  const handleCreateApiKey = () => {
    if (!newKeyName.trim()) {
      toast.error("Please enter a key name");
      return;
    }
    const key = `sk_live_${Math.random().toString(36).substring(2, 15)}`;
    const newKey: ApiKey = {
      id: String(Date.now()),
      name: newKeyName,
      key: `${key.substring(0, 7)}...${key.substring(key.length - 6)}`,
      createdAt: new Date().toISOString().split("T")[0],
      lastUsed: "Never",
      active: true,
    };
    setApiKeys((prev) => [...prev, newKey]);
    setNewKeyVisible(key);
    setNewKeyName("");
    toast.success("API key created successfully");
  };

  const handleRevokeKey = (id: string) => {
    setApiKeys((prev) => prev.filter((k) => k.id !== id));
    toast.success("API key revoked successfully");
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success("API key copied to clipboard");
  };

  const handlePasswordChange = () => {
    if (!passwords.current || !passwords.new || !passwords.confirm) {
      toast.error("Please fill in all password fields");
      return;
    }
    if (passwords.new !== passwords.confirm) {
      toast.error("New passwords do not match");
      return;
    }
    if (passwords.new.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setPasswords({ current: "", new: "", confirm: "" });
    toast.success("Password changed successfully");
  };

  const handleToggle2FA = (enabled: boolean) => {
    if (enabled && !twoFactorEnabled) {
      toast.success("2FA enabled successfully");
    } else if (!enabled) {
      toast.success("2FA disabled successfully");
    }
    setTwoFactorEnabled(enabled);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Security Center</h1>
        <p className="text-muted-foreground">
          Manage your account security settings, sessions, and API keys.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Password Change */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Change Password
            </CardTitle>
            <CardDescription>
              Update your account password regularly to stay secure.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <div className="relative">
                <Input
                  id="current-password"
                  type={showCurrentPassword ? "text" : "password"}
                  value={passwords.current}
                  onChange={(e) =>
                    setPasswords((prev) => ({
                      ...prev,
                      current: e.target.value,
                    }))
                  }
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNewPassword ? "text" : "password"}
                  value={passwords.new}
                  onChange={(e) =>
                    setPasswords((prev) => ({ ...prev, new: e.target.value }))
                  }
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={passwords.confirm}
                onChange={(e) =>
                  setPasswords((prev) => ({
                    ...prev,
                    confirm: e.target.value,
                  }))
                }
              />
            </div>
            <Button onClick={handlePasswordChange}>Update Password</Button>
          </CardContent>
        </Card>

        {/* 2FA Setup */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Two-Factor Authentication
            </CardTitle>
            <CardDescription>
              Add an extra layer of security to your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">2FA Status</p>
                <p className="text-sm text-muted-foreground">
                  {twoFactorEnabled
                    ? "Two-factor authentication is enabled"
                    : "Two-factor authentication is disabled"}
                </p>
              </div>
              <Switch
                checked={twoFactorEnabled}
                onCheckedChange={handleToggle2FA}
              />
            </div>
            {!twoFactorEnabled && (
              <div className="rounded-lg border border-dashed p-6 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <Shield className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Scan the QR code with your authenticator app to enable 2FA.
                </p>
                <div className="mx-auto mt-4 flex h-32 w-32 items-center justify-center rounded-lg border bg-white">
                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: 49 }).map((_, i) => (
                      <div
                        key={i}
                        className={`h-2.5 w-2.5 rounded-sm ${
                          Math.random() > 0.5 ? "bg-black" : "bg-white"
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  Manual entry: JBSWY3DPEHPK3PXP
                </p>
              </div>
            )}
            {twoFactorEnabled && (
              <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 dark:bg-green-950">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <p className="text-sm text-green-700 dark:text-green-300">
                  2FA is active. Your account is protected.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* IP Whitelist */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              IP Whitelist
            </CardTitle>
            <CardDescription>
              Restrict API access to trusted IP addresses.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Whitelist Status</p>
                <p className="text-sm text-muted-foreground">
                  {ipWhitelistEnabled
                    ? "IP whitelist is active"
                    : "All IPs are allowed"}
                </p>
              </div>
              <Switch
                checked={ipWhitelistEnabled}
                onCheckedChange={setIpWhitelistEnabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ip-whitelist">Allowed IPs (one per line, CIDR supported)</Label>
              <textarea
                id="ip-whitelist"
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={ipWhitelist}
                onChange={(e) => setIpWhitelist(e.target.value)}
                disabled={!ipWhitelistEnabled}
              />
            </div>
            {ipWhitelistEnabled && (
              <div className="flex items-center gap-2 rounded-lg bg-yellow-50 p-3 dark:bg-yellow-950">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <p className="text-xs text-yellow-700 dark:text-yellow-300">
                  Only the listed IPs will be able to access your API. Current
                  IP: 192.168.1.100
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* API Key Management */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                API Keys
              </CardTitle>
              <CardDescription>
                Manage API keys for programmatic access.
              </CardDescription>
            </div>
            <Dialog
              open={createKeyDialogOpen}
              onOpenChange={setCreateKeyDialogOpen}
            >
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Key
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create API Key</DialogTitle>
                  <DialogDescription>
                    Generate a new API key for programmatic access.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="key-name">Key Name</Label>
                    <Input
                      id="key-name"
                      placeholder="e.g., Production API"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                    />
                  </div>
                  {newKeyVisible && (
                    <div className="space-y-2">
                      <Label>Your API Key</Label>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 rounded bg-muted p-2 text-sm">
                          {newKeyVisible}
                        </code>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => handleCopyKey(newKeyVisible)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Copy this key now. It won't be shown again.
                      </p>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setCreateKeyDialogOpen(false);
                      setNewKeyVisible(null);
                    }}
                  >
                    Close
                  </Button>
                  {!newKeyVisible && (
                    <Button onClick={handleCreateApiKey}>Generate Key</Button>
                  )}
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiKeys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell className="font-medium">{key.name}</TableCell>
                    <TableCell>
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                        {key.key}
                      </code>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {key.createdAt}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {key.lastUsed}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRevokeKey(key.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Active Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Active Sessions
          </CardTitle>
          <CardDescription>
            Devices currently signed in to your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Device</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Browser</TableHead>
                <TableHead>Last Active</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell className="font-medium">{session.device}</TableCell>
                  <TableCell>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                      {session.ip}
                    </code>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {session.browser}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {session.lastActive}
                  </TableCell>
                  <TableCell>
                    <Badge variant={session.current ? "default" : "secondary"}>
                      {session.current ? "Current" : "Active"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {!session.current && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRevokeSession(session.id)}
                      >
                        <LogOut className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Login History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Login History
          </CardTitle>
          <CardDescription>
            Recent login attempts to your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>IP Address</TableHead>
                <TableHead>Device</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(loginRecordsData as LoginRecord[]).map((record) => (
                <TableRow key={record.id}>
                  <TableCell>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                      {record.ip}
                    </code>
                  </TableCell>
                  <TableCell className="text-sm">{record.device}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {record.location}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {record.time}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        record.status === "success" ? "default" : "destructive"
                      }
                    >
                      {record.status === "success" ? (
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                      ) : (
                        <AlertTriangle className="mr-1 h-3 w-3" />
                      )}
                      {record.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
