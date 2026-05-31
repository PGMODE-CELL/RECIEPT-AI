import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Download, Upload, Shield, Clock, CheckCircle, AlertTriangle, RefreshCw, Calendar, HardDrive, Lock, Unlock, Play, Trash } from "lucide-react";
import { toast } from "sonner";

interface BackupRecord {
  id: number;
  name: string;
  type: "full" | "incremental" | "differential";
  size: string;
  createdAt: string;
  duration: string;
  status: "completed" | "in-progress" | "failed" | "scheduled";
  encrypted: boolean;
  checksum: string;
  location: string;
}

interface BackupSchedule {
  id: number;
  name: string;
  frequency: string;
  time: string;
  type: "full" | "incremental" | "differential";
  retention: number;
  encrypted: boolean;
  enabled: boolean;
  lastRun: string;
  nextRun: string;
}

const defaultBackups: BackupRecord[] = [
  { id: 1, name: "Daily Full Backup", type: "full", size: "2.4 GB", createdAt: "2026-05-31 02:00", duration: "12m 34s", status: "completed", encrypted: true, checksum: "sha256:a1b2c3d4e5f6", location: "AWS S3 (us-east-1)" },
  { id: 2, name: "Incremental - May 30", type: "incremental", size: "340 MB", createdAt: "2026-05-30 02:00", duration: "3m 12s", status: "completed", encrypted: true, checksum: "sha256:f6e5d4c3b2a1", location: "AWS S3 (us-east-1)" },
  { id: 3, name: "Incremental - May 29", type: "incremental", size: "280 MB", createdAt: "2026-05-29 02:00", duration: "2m 45s", status: "completed", encrypted: true, checksum: "sha256:b2a1f6e5d4c3", location: "AWS S3 (us-east-1)" },
  { id: 4, name: "Weekly Full Backup", type: "full", size: "2.3 GB", createdAt: "2026-05-26 03:00", duration: "11m 58s", status: "completed", encrypted: true, checksum: "sha256:c3d4e5f6a1b2", location: "AWS S3 (us-east-1)" },
  { id: 5, name: "Manual Export", type: "full", size: "2.4 GB", createdAt: "2026-05-25 15:30", duration: "13m 02s", status: "completed", encrypted: false, checksum: "sha256:d4e5f6a1b2c3", location: "Local Download" },
];

const defaultSchedules: BackupSchedule[] = [
  { id: 1, name: "Daily Nightly Backup", frequency: "Daily", time: "02:00", type: "full", retention: 30, encrypted: true, enabled: true, lastRun: "2026-05-31 02:00", nextRun: "2026-06-01 02:00" },
  { id: 2, name: "Hourly Incremental", frequency: "Hourly", time: "Every hour", type: "incremental", retention: 7, encrypted: true, enabled: true, lastRun: "2026-05-31 08:00", nextRun: "2026-05-31 09:00" },
  { id: 3, name: "Weekly Archive", frequency: "Weekly", time: "Sunday 03:00", type: "full", retention: 90, encrypted: true, enabled: true, lastRun: "2026-05-26 03:00", nextRun: "2026-06-02 03:00" },
  { id: 4, name: "Monthly Compliance Backup", frequency: "Monthly", time: "1st 04:00", type: "full", retention: 365, encrypted: true, enabled: false, lastRun: "2026-05-01 04:00", nextRun: "2026-06-01 04:00" },
];

export default function DataBackup() {
  const [backups, setBackups] = useState<BackupRecord[]>(defaultBackups);
  const [schedules, setSchedules] = useState<BackupSchedule[]>(defaultSchedules);
  const [activeTab, setActiveTab] = useState("history");
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [backupInProgress, setBackupInProgress] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);

  const [newSchedule, setNewSchedule] = useState({ name: "", frequency: "Daily", time: "02:00", type: "full" as BackupSchedule["type"], retention: 30, encrypted: true });

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      completed: "bg-green-100 text-green-700",
      "in-progress": "bg-blue-100 text-blue-700",
      failed: "bg-red-100 text-red-700",
      scheduled: "bg-gray-100 text-gray-700",
    };
    return colors[status] || "bg-gray-100 text-gray-700";
  };

  const addSchedule = () => {
    if (!newSchedule.name) { toast.error("Schedule name required"); return; }
    setSchedules([...schedules, {
      id: Date.now(),
      ...newSchedule,
      enabled: true,
      lastRun: "Never",
      nextRun: new Date(Date.now() + 86400000).toISOString().split("T")[0] + " " + newSchedule.time,
    }]);
    setScheduleDialogOpen(false);
    setNewSchedule({ name: "", frequency: "Daily", time: "02:00", type: "full", retention: 30, encrypted: true });
    toast.success("Backup schedule created");
  };

  const toggleSchedule = (id: number) => {
    setSchedules(schedules.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s));
    toast.success("Schedule updated");
  };

  const deleteSchedule = (id: number) => {
    setSchedules(schedules.filter(s => s.id !== id));
    toast.success("Schedule removed");
  };

  const startBackup = () => {
    setBackupInProgress(true);
    setBackupProgress(0);
    const interval = setInterval(() => {
      setBackupProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setBackupInProgress(false);
          setBackups([{
            id: Date.now(),
            name: "Manual Backup",
            type: "full",
            size: "2.4 GB",
            createdAt: new Date().toISOString().replace("T", " ").slice(0, 16),
            duration: "12m 15s",
            status: "completed",
            encrypted: true,
            checksum: "sha256:" + Math.random().toString(36).slice(2, 14),
            location: "AWS S3 (us-east-1)",
          }, ...backups]);
          toast.success("Backup completed successfully");
          return 100;
        }
        return prev + 2;
      });
    }, 100);
  };

  const downloadBackup = (backup: BackupRecord) => {
    toast.success(`Downloading ${backup.name} (${backup.size})`);
  };

  const totalSize = "6.0 GB";
  const encryptedCount = backups.filter(b => b.encrypted).length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Data Backup & Restore</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Schedule, download, and restore backups</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => toast.success("Backup data refreshed")}>
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
          <Button onClick={startBackup} disabled={backupInProgress} className="bg-blue-600 hover:bg-blue-700">
            <Download className="w-4 h-4 mr-2" /> {backupInProgress ? "Backing up..." : "Backup Now"}
          </Button>
        </div>
      </div>

      {/* Backup Progress */}
      {backupInProgress && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-blue-700">Backup in progress...</span>
              <span className="text-sm text-blue-600">{backupProgress}%</span>
            </div>
            <Progress value={backupProgress} className="h-3" />
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <HardDrive className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-500">Total Backups</p>
                <p className="text-2xl font-bold text-blue-600">{backups.length}</p>
                <p className="text-xs text-gray-400">{totalSize} stored</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-50 dark:bg-green-950 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-500">Successful</p>
                <p className="text-2xl font-bold text-green-600">{backups.filter(b => b.status === "completed").length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-purple-50 dark:bg-purple-950 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Lock className="w-8 h-8 text-purple-600" />
              <div>
                <p className="text-sm text-gray-500">Encrypted</p>
                <p className="text-2xl font-bold text-purple-600">{encryptedCount}/{backups.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 dark:bg-amber-950 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-8 h-8 text-amber-600" />
              <div>
                <p className="text-sm text-gray-500">Active Schedules</p>
                <p className="text-2xl font-bold text-amber-600">{schedules.filter(s => s.enabled).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="history">Backup History</TabsTrigger>
          <TabsTrigger value="schedules">Schedules</TabsTrigger>
        </TabsList>

        <TabsContent value="history">
          <Card>
            <CardHeader><CardTitle>Backup History</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Encrypted</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {backups.map(backup => (
                    <TableRow key={backup.id}>
                      <TableCell className="font-medium">{backup.name}</TableCell>
                      <TableCell><Badge className="bg-indigo-100 text-indigo-700">{backup.type}</Badge></TableCell>
                      <TableCell>{backup.size}</TableCell>
                      <TableCell className="text-sm">{backup.createdAt}</TableCell>
                      <TableCell>{backup.duration}</TableCell>
                      <TableCell>{backup.encrypted ? <Lock className="w-4 h-4 text-green-500" /> : <Unlock className="w-4 h-4 text-gray-400" />}</TableCell>
                      <TableCell><Badge className={getStatusColor(backup.status)}>{backup.status}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => downloadBackup(backup)}><Download className="w-4 h-4 text-blue-500" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => setRestoreDialogOpen(true)}><Upload className="w-4 h-4 text-green-500" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedules">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Backup Schedules</CardTitle>
              <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
                <DialogTrigger asChild><Button size="sm"><Play className="w-4 h-4 mr-1" /> New Schedule</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Create Backup Schedule</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div><Label>Schedule Name</Label><Input value={newSchedule.name} onChange={e => setNewSchedule({ ...newSchedule, name: e.target.value })} /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Frequency</Label>
                        <Select value={newSchedule.frequency} onValueChange={v => setNewSchedule({ ...newSchedule, frequency: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {["Hourly", "Daily", "Weekly", "Monthly"].map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Backup Type</Label>
                        <Select value={newSchedule.type} onValueChange={v => setNewSchedule({ ...newSchedule, type: v as BackupSchedule["type"] })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="full">Full</SelectItem>
                            <SelectItem value="incremental">Incremental</SelectItem>
                            <SelectItem value="differential">Differential</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label>Time</Label><Input value={newSchedule.time} onChange={e => setNewSchedule({ ...newSchedule, time: e.target.value })} /></div>
                      <div><Label>Retention (days)</Label><Input type="number" value={newSchedule.retention} onChange={e => setNewSchedule({ ...newSchedule, retention: +e.target.value })} /></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={newSchedule.encrypted} onCheckedChange={v => setNewSchedule({ ...newSchedule, encrypted: v })} />
                      <Label>Encrypt backup</Label>
                    </div>
                    <Button onClick={addSchedule} className="w-full">Create Schedule</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Retention</TableHead>
                    <TableHead>Encrypted</TableHead>
                    <TableHead>Last Run</TableHead>
                    <TableHead>Next Run</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedules.map(schedule => (
                    <TableRow key={schedule.id}>
                      <TableCell className="font-medium">{schedule.name}</TableCell>
                      <TableCell>{schedule.frequency}</TableCell>
                      <TableCell><Badge className="bg-indigo-100 text-indigo-700">{schedule.type}</Badge></TableCell>
                      <TableCell>{schedule.retention} days</TableCell>
                      <TableCell>{schedule.encrypted ? <Lock className="w-4 h-4 text-green-500" /> : <Unlock className="w-4 h-4 text-gray-400" />}</TableCell>
                      <TableCell className="text-sm">{schedule.lastRun}</TableCell>
                      <TableCell className="text-sm">{schedule.nextRun}</TableCell>
                      <TableCell>
                        <Switch checked={schedule.enabled} onCheckedChange={() => toggleSchedule(schedule.id)} />
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => deleteSchedule(schedule.id)}>
                          <Trash className="w-4 h-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Restore Dialog */}
      <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Restore from Backup</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 p-4 rounded-lg flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
              <div>
                <p className="font-medium text-amber-700">Warning</p>
                <p className="text-sm text-amber-600">Restoring a backup will overwrite current data. This action cannot be undone.</p>
              </div>
            </div>
            <div>
              <Label>Select Backup to Restore</Label>
              <Select>
                <SelectTrigger><SelectValue placeholder="Choose a backup" /></SelectTrigger>
                <SelectContent>
                  {backups.filter(b => b.status === "completed").map(b => (
                    <SelectItem key={b.id} value={String(b.id)}>{b.name} ({b.createdAt})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Input placeholder="Type 'RESTORE' to confirm" />
            </div>
            <Button className="w-full bg-red-600 hover:bg-red-700" onClick={() => { setRestoreDialogOpen(false); toast.success("Restore initiated"); }}>
              <Upload className="w-4 h-4 mr-2" /> Restore Backup
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
