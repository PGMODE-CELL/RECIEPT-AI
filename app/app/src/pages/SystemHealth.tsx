import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Activity, Database, Server, Users, HardDrive, Clock, CheckCircle, XCircle, AlertTriangle, RefreshCw, Wifi, Cpu, MemoryStick, Timer } from "lucide-react";
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

const responseTimeData: MetricPoint[] = [
  { time: "00:00", value: 120 },
  { time: "04:00", value: 95 },
  { time: "08:00", value: 180 },
  { time: "12:00", value: 210 },
  { time: "16:00", value: 195 },
  { time: "20:00", value: 140 },
  { time: "23:59", value: 110 },
];

const errorRateData = [
  { time: "Mon", errors: 12, requests: 4500 },
  { time: "Tue", errors: 8, requests: 5200 },
  { time: "Wed", errors: 22, requests: 4800 },
  { time: "Thu", errors: 5, requests: 6100 },
  { time: "Fri", errors: 15, requests: 5800 },
  { time: "Sat", errors: 3, requests: 2100 },
  { time: "Sun", errors: 2, requests: 1800 },
];

const activeUsersData = [
  { hour: "6am", users: 12 },
  { hour: "8am", users: 45 },
  { hour: "10am", users: 78 },
  { hour: "12pm", users: 65 },
  { hour: "2pm", users: 82 },
  { hour: "4pm", users: 71 },
  { hour: "6pm", users: 38 },
  { hour: "8pm", users: 15 },
];

const defaultServices: ServiceStatus[] = [
  { name: "API Server", status: "healthy", uptime: "99.98%", responseTime: 45, lastChecked: "2026-05-31 09:00:00" },
  { name: "PostgreSQL Database", status: "healthy", uptime: "99.99%", responseTime: 12, lastChecked: "2026-05-31 09:00:00" },
  { name: "Redis Cache", status: "healthy", uptime: "100%", responseTime: 2, lastChecked: "2026-05-31 09:00:00" },
  { name: "File Storage (S3)", status: "healthy", uptime: "99.95%", responseTime: 85, lastChecked: "2026-05-31 09:00:00" },
  { name: "Email Service (SES)", status: "degraded", uptime: "99.20%", responseTime: 340, lastChecked: "2026-05-31 09:00:00" },
  { name: "Payment Gateway", status: "healthy", uptime: "99.97%", responseTime: 220, lastChecked: "2026-05-31 09:00:00" },
  { name: "Background Jobs", status: "healthy", uptime: "99.90%", responseTime: 0, lastChecked: "2026-05-31 09:00:00" },
  { name: "CDN", status: "healthy", uptime: "99.99%", responseTime: 15, lastChecked: "2026-05-31 09:00:00" },
];

const recentErrors = [
  { id: 1, level: "error", message: "Connection timeout to payment gateway", service: "Payment Gateway", timestamp: "2026-05-31 08:45:12", count: 3 },
  { id: 2, level: "warning", message: "Email delivery delay > 5s", service: "Email Service", timestamp: "2026-05-31 08:30:00", count: 12 },
  { id: 3, level: "error", message: "Database connection pool exhausted", service: "PostgreSQL", timestamp: "2026-05-30 22:15:00", count: 1 },
  { id: 4, level: "warning", message: "Memory usage above 80%", service: "API Server", timestamp: "2026-05-30 14:20:00", count: 2 },
  { id: 5, level: "info", message: "Scheduled backup completed", service: "Background Jobs", timestamp: "2026-05-31 02:00:00", count: 1 },
];

const dbMetrics = [
  { metric: "Connections", value: "42/100", percentage: 42 },
  { metric: "Query Time (avg)", value: "8ms", percentage: 8 },
  { metric: "Cache Hit Ratio", value: "98.5%", percentage: 98.5 },
  { metric: "Disk Usage", value: "124 GB / 500 GB", percentage: 24.8 },
  { metric: "Replication Lag", value: "0.2s", percentage: 2 },
];

export default function SystemHealth() {
  const [services, setServices] = useState<ServiceStatus[]>(defaultServices);
  const [activeTab, setActiveTab] = useState("overview");
  const [refreshing, setRefreshing] = useState(false);

  const healthyCount = services.filter(s => s.status === "healthy").length;
  const degradedCount = services.filter(s => s.status === "degraded").length;
  const downCount = services.filter(s => s.status === "down").length;

  const overallStatus = downCount > 0 ? "down" : degradedCount > 0 ? "degraded" : "healthy";

  const storageUsed = 67.5;
  const storageTotal = 256;
  const storagePercentage = (storageUsed / storageTotal) * 100;

  const cpuUsage = 34;
  const memoryUsage = 62;

  const refresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setServices(services.map(s => ({
        ...s,
        responseTime: s.responseTime + Math.floor(Math.random() * 20) - 10,
        lastChecked: new Date().toISOString().replace("T", " ").slice(0, 19),
      })));
      setRefreshing(false);
      toast.success("Health data refreshed");
    }, 1000);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">System Health</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Database, API, errors, and performance metrics</p>
        </div>
        <Button variant="outline" onClick={refresh} disabled={refreshing}>
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {/* Overall Status */}
      <Card className={`border-2 ${overallStatus === "healthy" ? "border-green-200 bg-green-50 dark:bg-green-950" : overallStatus === "degraded" ? "border-amber-200 bg-amber-50 dark:bg-amber-950" : "border-red-200 bg-red-50 dark:bg-red-950"}`}>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-full ${overallStatus === "healthy" ? "bg-green-100" : overallStatus === "degraded" ? "bg-amber-100" : "bg-red-100"}`}>
              <Activity className={`w-8 h-8 ${overallStatus === "healthy" ? "text-green-600" : overallStatus === "degraded" ? "text-amber-600" : "text-red-600"}`} />
            </div>
            <div>
              <h2 className={`text-xl font-bold ${overallStatus === "healthy" ? "text-green-700" : overallStatus === "degraded" ? "text-amber-700" : "text-red-700"}`}>
                System {overallStatus === "healthy" ? "Operational" : overallStatus === "degraded" ? "Degraded" : "Down"}
              </h2>
              <p className="text-sm text-gray-500">{healthyCount} services healthy • {degradedCount} degraded • {downCount} down</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg"><Timer className="w-6 h-6 text-blue-600" /></div>
              <div>
                <p className="text-sm text-gray-500">Avg Response Time</p>
                <p className="text-xl font-bold text-blue-600">148ms</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg"><CheckCircle className="w-6 h-6 text-green-600" /></div>
              <div>
                <p className="text-sm text-gray-500">Uptime (30d)</p>
                <p className="text-xl font-bold text-green-600">99.97%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg"><Users className="w-6 h-6 text-purple-600" /></div>
              <div>
                <p className="text-sm text-gray-500">Active Users</p>
                <p className="text-xl font-bold text-purple-600">82</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900 rounded-lg"><AlertTriangle className="w-6 h-6 text-amber-600" /></div>
              <div>
                <p className="text-sm text-gray-500">Errors (24h)</p>
                <p className="text-xl font-bold text-amber-600">25</p>
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
            <CardHeader><CardTitle>Service Status</CardTitle></CardHeader>
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
                  {services.map(service => (
                    <TableRow key={service.name}>
                      <TableCell className="font-medium">{service.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${service.status === "healthy" ? "bg-green-500" : service.status === "degraded" ? "bg-amber-500" : "bg-red-500"}`} />
                          <Badge className={service.status === "healthy" ? "bg-green-100 text-green-700" : service.status === "degraded" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}>
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
                  <span className="ml-auto font-bold text-blue-600">{cpuUsage}%</span>
                </div>
                <Progress value={cpuUsage} className="h-3" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <MemoryStick className="w-5 h-5 text-purple-500" />
                  <span className="font-medium">Memory</span>
                  <span className="ml-auto font-bold text-purple-600">{memoryUsage}%</span>
                </div>
                <Progress value={memoryUsage} className="h-3" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <HardDrive className="w-5 h-5 text-green-500" />
                  <span className="font-medium">Storage</span>
                  <span className="ml-auto font-bold text-green-600">{storageUsed}GB / {storageTotal}GB</span>
                </div>
                <Progress value={storagePercentage} className="h-3" />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>API Response Times (Today)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={responseTimeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis label={{ value: "ms", angle: -90, position: "insideLeft" }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="#3b82f630" name="Response Time (ms)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Active Users Today</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={activeUsersData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="users" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Active Users" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="database">
          <Card>
            <CardHeader><CardTitle>Database Metrics</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
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
            <CardHeader><CardTitle>Error Rate (7 Days)</CardTitle></CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
          <Card className="mt-4">
            <CardHeader><CardTitle>Recent Errors & Warnings</CardTitle></CardHeader>
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
                  {recentErrors.map(err => (
                    <TableRow key={err.id}>
                      <TableCell>
                        <Badge className={err.level === "error" ? "bg-red-100 text-red-700" : err.level === "warning" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}>
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
