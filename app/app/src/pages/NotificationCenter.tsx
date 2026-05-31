import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Check, CheckCheck } from "lucide-react";
import { toast } from "sonner";

export default function NotificationCenter() {
  const { data: notifications, isLoading, refetch } = trpc.notification.list.useQuery();

  const markAsRead = trpc.notification.markAsRead.useMutation({
    onSuccess: () => refetch(),
  });
  const markAllAsRead = trpc.notification.markAllAsRead.useMutation({
    onSuccess: () => { refetch(); toast.success("All notifications marked as read"); },
  });

  const unreadCount = notifications?.filter(n => !n.read).length || 0;

  const handleClick = (id: number) => {
    markAsRead.mutate({ id });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notifications</h1>
          {unreadCount > 0 && <Badge className="bg-red-100 text-red-700">{unreadCount}</Badge>}
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={() => markAllAsRead.mutate()} disabled={markAllAsRead.isPending}>
            <CheckCheck className="w-4 h-4 mr-2" /> Mark all as read
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading && <div className="p-8 text-center text-gray-500">Loading...</div>}
          {!isLoading && notifications?.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              <Bell className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p>No notifications</p>
            </div>
          )}
          {notifications?.map((n) => (
            <div
              key={n.id}
              className={`flex items-start gap-3 p-4 border-b last:border-b-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${!n.read ? "bg-blue-50/50 dark:bg-blue-900/10" : ""}`}
              onClick={() => !n.read && handleClick(n.id)}
            >
              <div className="mt-1">
                {!n.read ? (
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                ) : (
                  <Check className="w-4 h-4 text-gray-300" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${!n.read ? "font-medium text-gray-900 dark:text-white" : "text-gray-600 dark:text-gray-400"}`}>
                  {n.message}
                </p>
                {n.createdAt && (
                  <p className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
