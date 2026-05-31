"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  MessageSquare, Send, Paperclip, AtSign, Bell, Users, FileText,
  CheckSquare, Clock, Pin, Plus, Search, Filter,
} from "lucide-react";

interface Activity {
  id: string;
  user: { name: string; initials: string };
  action: string;
  target: string;
  timestamp: string;
  type: "comment" | "approval" | "edit" | "upload" | "assignment";
}

interface Task {
  id: string;
  title: string;
  assignee: { name: string; initials: string };
  assigner: string;
  dueDate: string;
  status: "pending" | "in_progress" | "completed";
  priority: "high" | "medium" | "low";
  relatedTo: string;
}

export default function CollaborationHub() {
  const { data: notificationsData, isLoading: notifLoading } = trpc.notification.list.useQuery({ limit: 50 });
  const { data: documents } = trpc.document.list.useQuery();
  const { data: invoiceData } = trpc.invoice.list.useQuery({ limit: 50 });
  const { data: billData } = trpc.bill.list.useQuery({ limit: 50 });

  const [tasks, setTasks] = useState<Task[]>([]);
  const [newComment, setNewComment] = useState("");
  const [chatMessages, setChatMessages] = useState<{ user: string; message: string; time: string }[]>([
    { user: "Team", message: "Let's make sure we close out all pending items before EOD Friday.", time: "09:15" },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const activities = useMemo<Activity[]>(() => {
    const acts: Activity[] = [];
    if (notificationsData?.notifications) {
      notificationsData.notifications.forEach((n) => {
        acts.push({
          id: `notif-${n.id}`,
          user: { name: "System", initials: "SY" },
          action: n.type || "updated",
          target: n.title || "item",
          timestamp: n.createdAt?.toString?.() || "",
          type: n.type === "approval" ? "approval" : n.type === "comment" ? "comment" : "edit",
        });
      });
    }
    return acts;
  }, [notificationsData]);

  const comments = useMemo(() => {
    return activities.filter((a) => a.type === "comment");
  }, [activities]);

  const onlineTeam = [
    { id: "tm1", name: "Finance Team", role: "Finance Director", initials: "FT", status: "online" as const },
    { id: "tm2", name: "Accounting", role: "Accountant", initials: "AC", status: "online" as const },
  ];

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    toast.success("Comment posted");
    setNewComment("");
  };

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    setChatMessages((prev) => [
      ...prev,
      { user: "You", message: chatInput, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) },
    ]);
    setChatInput("");
  };

  const toggleTaskStatus = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const nextStatus = t.status === "completed" ? "pending" : t.status === "pending" ? "in_progress" : "completed";
        return { ...t, status: nextStatus };
      })
    );
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-100 text-red-800";
      case "medium": return "bg-yellow-100 text-yellow-800";
      case "low": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800";
      case "in_progress": return "bg-blue-100 text-blue-800";
      case "pending": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "comment": return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case "approval": return <CheckSquare className="h-4 w-4 text-green-500" />;
      case "edit": return <FileText className="h-4 w-4 text-orange-500" />;
      case "upload": return <Paperclip className="h-4 w-4 text-purple-500" />;
      case "assignment": return <AtSign className="h-4 w-4 text-indigo-500" />;
      default: return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online": return "bg-green-500";
      case "away": return "bg-yellow-500";
      case "offline": return "bg-gray-400";
      default: return "bg-gray-400";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Users className="h-8 w-8 text-blue-600" />
          Collaboration Hub
        </h1>
        <p className="text-muted-foreground mt-1">
          Team collaboration on invoices, bills, and financial documents
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Documents</CardDescription>
            <CardTitle className="text-2xl">{documents?.length || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className="bg-green-100 text-green-800">Available</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Notifications</CardDescription>
            <CardTitle className="text-2xl">{notificationsData?.total || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className="bg-blue-100 text-blue-800">
              <MessageSquare className="mr-1 h-3 w-3" /> Recent updates
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending Tasks</CardDescription>
            <CardTitle className="text-2xl">{tasks.filter((t) => t.status !== "completed").length}</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className="bg-orange-100 text-orange-800">
              <Clock className="mr-1 h-3 w-3" /> Due this week
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Today's Activity</CardDescription>
            <CardTitle className="text-2xl">{activities.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className="bg-purple-100 text-purple-800">
              <Bell className="mr-1 h-3 w-3" /> {activities.filter((a) => a.type === "approval").length} approvals
            </Badge>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="feed">
        <TabsList>
          <TabsTrigger value="feed" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Activity Feed
          </TabsTrigger>
          <TabsTrigger value="comments" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Comments
          </TabsTrigger>
          <TabsTrigger value="tasks" className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4" />
            Tasks
          </TabsTrigger>
          <TabsTrigger value="chat" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Team Chat
          </TabsTrigger>
        </TabsList>

        <TabsContent value="feed" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {notifLoading && <p className="text-sm text-gray-500">Loading...</p>}
                  {!notifLoading && activities.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">No recent activity</p>
                  )}
                  {activities.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">{activity.user.initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="text-sm">
                          <span className="font-medium">{activity.user.name}</span>{" "}
                          <span className="text-muted-foreground">{activity.action}</span>{" "}
                          <span className="font-medium text-blue-600">{activity.target}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">{activity.timestamp}</div>
                      </div>
                      {getActivityIcon(activity.type)}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Team Members</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {onlineTeam.map((member) => (
                    <div key={member.id} className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">{member.initials}</AvatarFallback>
                        </Avatar>
                        <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${getStatusColor(member.status)}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{member.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{member.role}</div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Recent Documents</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {documents?.slice(0, 5).map((doc) => (
                    <div key={doc.id} className="p-2 border rounded-lg space-y-1">
                      <div className="flex items-center gap-1">
                        <FileText className="h-3 w-3 text-blue-500" />
                        <span className="text-xs font-medium text-blue-600">{doc.name}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{doc.category || "General"}</p>
                    </div>
                  ))}
                  {(!documents || documents.length === 0) && (
                    <p className="text-xs text-gray-500">No documents yet</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="comments" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Document Comments</CardTitle>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search comments..." className="pl-8 w-64" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Add a comment... Use @ to mention someone"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleAddComment}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              {comments.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No comments yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Task Board</CardTitle>
                <Button size="sm">
                  <Plus className="mr-2 h-3 w-3" />
                  New Task
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {tasks.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">No tasks yet. Create one to get started.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead>Task</TableHead>
                      <TableHead>Assignee</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Related To</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => toggleTaskStatus(task.id)}>
                            <CheckSquare className={`h-4 w-4 ${task.status === "completed" ? "text-green-600 fill-green-100" : task.status === "in_progress" ? "text-blue-600 fill-blue-100" : "text-gray-400"}`} />
                          </Button>
                        </TableCell>
                        <TableCell className={`font-medium ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}>{task.title}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6"><AvatarFallback className="text-[10px]">{task.assignee.initials}</AvatarFallback></Avatar>
                            <span className="text-sm">{task.assignee.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{task.dueDate}</TableCell>
                        <TableCell><Badge className={getPriorityBadge(task.priority)}>{task.priority}</Badge></TableCell>
                        <TableCell><Badge className={getStatusBadge(task.status)}>{task.status.replace("_", " ")}</Badge></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{task.relatedTo}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chat" className="space-y-4">
          <Card className="h-[500px] flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Team Chat - #finance-general</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto space-y-3">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.user === "You" ? "justify-end" : ""}`}>
                  {msg.user !== "You" && (
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="text-xs">{msg.user[0]}</AvatarFallback>
                    </Avatar>
                  )}
                  <div className={`max-w-[70%] ${msg.user === "You" ? "text-right" : ""}`}>
                    <div className="flex items-center gap-2 mb-0.5">
                      {msg.user !== "You" && <span className="text-xs font-medium">{msg.user}</span>}
                      <span className="text-xs text-muted-foreground">{msg.time}</span>
                    </div>
                    <div className={`inline-block px-3 py-2 rounded-lg text-sm ${msg.user === "You" ? "bg-blue-600 text-white rounded-br-none" : "bg-muted rounded-bl-none"}`}>
                      {msg.message}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
            <div className="p-4 border-t flex gap-2">
              <Button size="sm" variant="ghost"><Paperclip className="h-4 w-4" /></Button>
              <Input placeholder="Type a message..." className="flex-1" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSendMessage()} />
              <Button onClick={handleSendMessage}><Send className="h-4 w-4" /></Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
