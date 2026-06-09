import { useState, useMemo } from "react";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Activity,
  Database,
  Server,
  Users,
  HardDrive,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Wifi,
  Cpu,
  MemoryStick,
  Timer,
} from "lucide-react";
import { toast } from "sonner";

interface ServiceStatus {
  name: string;
  status: "healthy" | "degraded" | "down";
  uptime: string;
  responseTime: number;
  lastChecked: string;
}

interface MetricPoint {
  time: string;
  value: number;
}

// Time-series telemetry (response times, error rates, active users, audit logs)
// requires a monitoring backend that is not wired yet, so these are empty until then.
const responseTimeData: MetricPoint[] = [];
const errorRateData: { time: string; errors: number; requests: number }[] = [];
const activeUsersData: { hour: string; users: number }[] = [];
const recentErrors: {
  id: number;
  level: string;
  message: string;
  service: string;
  timestamp: string;
  count: number;
}[] = [];
const dbMetrics: { metric: string; value: string; percentage: number }[] = [];

export default function SystemHealth() {
  const { data: health, isFetching, refetch } = trpc.health.useQuery(undefined, { refetchInterval: 30000 });
  const [activeTab, setActiveTab] = useState("overview");

  // Real service status derived from the backend /api/health endpoint.
  const services: ServiceStatus[] = useMemo(() => {
    if (!health) return [];
    const checked = String(health.timestamp || new Date().toISOString())
      .replace("T", " ")
      .slice(0, 19);
    const list: ServiceStatus[] = [
      { name: "API Server", status: "healthy", uptime: "\u2014", responseTime: 0, lastChecked: checked },
      {
        name: "Database",
        status: health.database === "ok" ? "healthy" : "down",
        uptime: "\u2014",
        responseTime: 0,
        lastChecked: checked,
      },
    ];
    if (health.redis && health.redis !== "not_configured") {
      list.push({
        name: "Redis Cache",
        status: health.redis === "ok" ? "healthy" : "down",
        uptime: "\u2014",
        responseTime: 0,
        lastChecked: checked,
      });
    }
    return list;
  }, [health]);
  const refreshing = isFetching;

  const healthyCount = services.filter(s => s.status === "healthy").length;
  const degradedCount = services.filter(s => s.status === "degraded").length;
  const downCount = services.filter(s => s.status === "down").length;

  const overallStatus = !health ? "degraded" : downCount > 0 ? "down" : degradedCount > 0 ? "degraded" : "healthy";

  const refresh = () => {
    refetch();
    toast.success("Refreshing health data");
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">System Health</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Database, API, errors, and performance metrics
          </p>
        </div>
        <Button variant="outline" onClick={refresh} disabled={refreshing}>
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {/* Overall Status */}
      <Card
        className={`border-2 ${
          overallStatus === "healthy"
            ? "border-green-200 bg-green-50 dark:bg-green-950"
            : overallStatus === "degraded"
              ? "border-amber-200 bg-amber-50 dark:bg-amber-950"
              : "border-red-200 bg-red-50 dark:bg-red-950"
        }`}
      >
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div
              className={`p-3 rounded-full ${
                overallStatus === "healthy"
                  ? "bg-green-100"
                  : overallStatus === "degraded"
                    ? "bg-amber-100"
                    : "bg-red-100"
              }`}
            >
              <Activity
                className={`w-8 h-8 ${
                  overallStatus === "healthy"
                    ? "text-green-600"
                    : overallStatus === "degraded"
                      ? "text-amber-600"
                      : "text-red-600"
                }`}
              />
            </div>
            <div>
              <h2
                className={`text-xl font-bold ${
                  overallStatus === "healthy"
                    ? "text-green-700"
                    : overallStatus === "degraded"
                      ? "text-amber-700"
                      : "text-red-700"
                }`}
              >
                System{" "}
                {overallStatus === "healthy" ? "Operational" : overallStatus === "degraded" ? "Degraded" : "Down"}
              </h2>
              <p className="text-sm text-gray-500">
                {healthyCount} services healthy • {degradedCount} degraded • {downCount} down
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Timer className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Avg Response Time</p>
                <p className="text-xl font-bold text-blue-600">—</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Uptime (30d)</p>
                <p className="text-xl font-bold text-green-600">—</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Active Users</p>
                <p className="text-xl font-bold text-purple-600">—</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Errors (24h)</p>
                <p className="text-xl font-bold text-amber-600">—</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Services</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Services */}
          <Card>
            <CardHeader>
              <CardTitle>Service Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Uptime</TableHead>
                    <TableHead>Response Time</TableHead>
                    <TableHead>Last Checked</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {services.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                        Checking services…
                      </TableCell>
                    </TableRow>
                  )}
                  {services.map(service => (
                    <TableRow key={service.name}>
                      <TableCell className="font-medium">{service.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              service.status === "healthy"
                                ? "bg-green-500"
                                : service.status === "degraded"
                                  ? "bg-amber-500"
                                  : "bg-red-500"
                            }`}
                          />
                          <Badge
                            className={
                              service.status === "healthy"
                                ? "bg-green-100 text-green-700"
                                : service.status === "degraded"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-red-100 text-red-700"
                            }
                          >
                            {service.status}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>{service.uptime}</TableCell>
                      <TableCell>
                        <span className={service.responseTime > 200 ? "text-amber-600 font-medium" : ""}>
                          {service.responseTime > 0 ? `${service.responseTime}ms` : "—"}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">{service.lastChecked}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* System Resources */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Cpu className="w-5 h-5 text-blue-500" />
                  <span className="font-medium">CPU Usage</span>
                  <span className="ml-auto font-bold text-blue-600">—</span>
                </div>
                <Progress value={0} className="h-3" />
                <p className="text-xs text-gray-400 mt-2">Host metrics not available</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <MemoryStick className="w-5 h-5 text-purple-500" />
                  <span className="font-medium">Memory</span>
                  <span className="ml-auto font-bold text-purple-600">—</span>
                </div>
                <Progress value={0} className="h-3" />
                <p className="text-xs text-gray-400 mt-2">Host metrics not available</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <HardDrive className="w-5 h-5 text-green-500" />
                  <span className="font-medium">Storage</span>
                  <span className="ml-auto font-bold text-green-600">—</span>
                </div>
                <Progress value={0} className="h-3" />
                <p className="text-xs text-gray-400 mt-2">Host metrics not available</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API Response Times (Today)</CardTitle>
            </CardHeader>
            <CardContent>
              {responseTimeData.length === 0 ? (
                <div className="h-[300px] flex items-center justify-center text-sm text-gray-500">
                  No response-time history available yet.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={responseTimeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis label={{ value: "ms", angle: -90, position: "insideLeft" }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="#3b82f630" name="Response Time (ms)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Active Users Today</CardTitle>
            </CardHeader>
            <CardContent>
              {activeUsersData.length === 0 ? (
                <div className="h-[250px] flex items-center justify-center text-sm text-gray-500">
                  No active-user history available yet.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={activeUsersData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="users" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Active Users" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="database">
          <Card>
            <CardHeader>
              <CardTitle>Database Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dbMetrics.length === 0 && (
                  <p className="text-center text-gray-500 py-8">Detailed database metrics are not available.</p>
                )}
                {dbMetrics.map(m => (
                  <div key={m.metric} className="flex items-center gap-4">
                    <span className="w-48 text-sm font-medium">{m.metric}</span>
                    <div className="flex-1">
                      <Progress value={m.percentage} className="h-3" />
                    </div>
                    <span className="w-32 text-sm text-right font-mono">{m.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors">
          <Card>
            <CardHeader>
              <CardTitle>Error Rate (7 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              {errorRateData.length === 0 ? (
                <div className="h-[250px] flex items-center justify-center text-sm text-gray-500">
                  No error-rate history available yet.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={errorRateData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="errors" fill="#ef4444" name="Errors" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Recent Errors & Warnings</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Level</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Count</TableHead>
                    <TableHead>Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentErrors.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                        No recent errors or warnings.
                      </TableCell>
                    </TableRow>
                  )}
                  {recentErrors.map(err => (
                    <TableRow key={err.id}>
                      <TableCell>
                        <Badge
                          className={
                            err.level === "error"
                              ? "bg-red-100 text-red-700"
                              : err.level === "warning"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-blue-100 text-blue-700"
                          }
                        >
                          {err.level}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium max-w-[300px] truncate">{err.message}</TableCell>
                      <TableCell>{err.service}</TableCell>
                      <TableCell>{err.count}</TableCell>
                      <TableCell className="text-sm text-gray-500">{err.timestamp}</TableCell>
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
