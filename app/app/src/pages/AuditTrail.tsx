import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Shield, Activity } from "lucide-react";

export default function AuditTrail() {
  const { data: logs, isLoading } = trpc.audit.list.useQuery({ limit: 100 });
  const { data: stats } = trpc.audit.getStats.useQuery();

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">Audit Trail</h1><p className="text-sm text-gray-500">Track all system changes</p></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-500">Total Actions</p><p className="text-2xl font-bold">{stats?.total || 0}</p></div><Shield className="w-8 h-8 text-blue-500" /></div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-500">Today's Actions</p><p className="text-2xl font-bold">{stats?.todayCount || 0}</p></div><Activity className="w-8 h-8 text-green-500" /></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Time</TableHead><TableHead>Action</TableHead><TableHead>Entity</TableHead><TableHead>ID</TableHead><TableHead>Details</TableHead></TableRow></TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={5} className="text-center py-8">Loading...</TableCell></TableRow>}
              {logs?.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm">{log.createdAt ? new Date(log.createdAt).toLocaleString() : "—"}</TableCell>
                  <TableCell><Badge variant="outline">{log.action}</Badge></TableCell>
                  <TableCell>{log.entityType}</TableCell>
                  <TableCell className="font-mono text-sm">{log.entityId || "—"}</TableCell>
                  <TableCell className="text-sm text-gray-500 max-w-xs truncate">{log.oldValues ? "Modified" : log.newValues ? "Created" : "—"}</TableCell>
                </TableRow>
              ))}
              {logs?.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-gray-500">No audit logs yet. Actions will appear here as you use the system.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
