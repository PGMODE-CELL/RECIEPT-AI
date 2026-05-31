"use client";

import { useState, useMemo, useEffect } from "react";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Calendar, ChevronLeft, ChevronRight, Clock, FileText, Receipt,
  DollarSign, AlertTriangle, ArrowRight
} from "lucide-react";

interface CalendarEvent {
  id: string;
  title: string;
  type: "invoice" | "bill" | "payment" | "deadline";
  date: string;
  amount?: number;
  status: string;
  color: string;
}

const TYPE_CONFIG = {
  invoice: { icon: <FileText className="w-4 h-4" />, label: "Invoice", color: "text-blue-600" },
  bill: { icon: <Receipt className="w-4 h-4" />, label: "Bill", color: "text-orange-600" },
  payment: { icon: <DollarSign className="w-4 h-4" />, label: "Payment", color: "text-green-600" },
  deadline: { icon: <AlertTriangle className="w-4 h-4" />, label: "Deadline", color: "text-purple-600" },
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export default function FinancialCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 1, 1));
  const [view, setView] = useState<"month" | "week" | "day">("month");
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  const { data: invoiceData } = trpc.invoice.list.useQuery({ limit: 500 });
  const { data: billData } = trpc.bill.list.useQuery({ limit: 500 });

  useEffect(() => {
    const newEvents: CalendarEvent[] = [];

    if (invoiceData?.invoices) {
      invoiceData.invoices.forEach((inv) => {
        if (inv.dueDate) {
          newEvents.push({
            id: `inv-${inv.id}`,
            title: `${inv.invoiceNumber} Due - ${inv.contactName || "Unknown"}`,
            type: "invoice",
            date: inv.dueDate,
            amount: Number(inv.total) || 0,
            status: inv.status === "paid" ? "completed" : inv.status === "overdue" ? "overdue" : "pending",
            color: inv.status === "paid" ? "bg-green-500" : inv.status === "overdue" ? "bg-red-500" : "bg-blue-500",
          });
        }
        if (inv.status === "paid" && inv.issueDate) {
          newEvents.push({
            id: `inv-pay-${inv.id}`,
            title: `Payment Received - ${inv.contactName || "Unknown"}`,
            type: "payment",
            date: inv.issueDate,
            amount: Number(inv.total) || 0,
            status: "completed",
            color: "bg-green-500",
          });
        }
      });
    }

    if (billData?.bills) {
      billData.bills.forEach((bill) => {
        if (bill.dueDate) {
          newEvents.push({
            id: `bill-${bill.id}`,
            title: `${bill.billNumber} Due - ${bill.contactName || "Unknown"}`,
            type: "bill",
            date: bill.dueDate,
            amount: Number(bill.total) || 0,
            status: bill.status === "paid" ? "completed" : bill.status === "overdue" ? "overdue" : "pending",
            color: bill.status === "paid" ? "bg-green-500" : bill.status === "overdue" ? "bg-red-500" : "bg-orange-500",
          });
        }
        if (bill.status === "paid" && bill.billDate) {
          newEvents.push({
            id: `bill-pay-${bill.id}`,
            title: `Payment Sent - ${bill.contactName || "Unknown"}`,
            type: "payment",
            date: bill.billDate,
            amount: Number(bill.total) || 0,
            status: "completed",
            color: "bg-green-500",
          });
        }
      });
    }

    setEvents(newEvents);
  }, [invoiceData, billData]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const today = () => setCurrentDate(new Date(2026, 1, 15));

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const calendarDays = useMemo(() => {
    const days: { date: number; isCurrentMonth: boolean; events: CalendarEvent[] }[] = [];
    const prevMonthDays = getDaysInMonth(year, month - 1);
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({ date: prevMonthDays - i, isCurrentMonth: false, events: [] });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({
        date: d,
        isCurrentMonth: true,
        events: events.filter((e) => e.date === dateStr),
      });
    }
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      days.push({ date: d, isCurrentMonth: false, events: [] });
    }
    return days;
  }, [year, month, events, firstDay, daysInMonth]);

  const upcomingEvents = events
    .filter((e) => e.status !== "completed")
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  const totalByType = (type: string) =>
    events.filter((e) => e.type === type).reduce((sum, e) => sum + (e.amount || 0), 0);

  const formatCurrency = (v: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Financial Calendar</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Track invoices, bills, payments, and deadlines</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={today}>Today</Button>
          <Button variant="outline" size="sm" onClick={prevMonth}><ChevronLeft className="w-4 h-4" /></Button>
          <span className="font-semibold min-w-[160px] text-center">{MONTHS[month]} {year}</span>
          <Button variant="outline" size="sm" onClick={nextMonth}><ChevronRight className="w-4 h-4" /></Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg"><FileText className="w-5 h-5 text-blue-600" /></div>
            <div><p className="text-xs text-gray-500">Invoices Due</p><p className="font-bold">{formatCurrency(totalByType("invoice"))}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg"><Receipt className="w-5 h-5 text-orange-600" /></div>
            <div><p className="text-xs text-gray-500">Bills Due</p><p className="font-bold">{formatCurrency(totalByType("bill"))}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg"><DollarSign className="w-5 h-5 text-green-600" /></div>
            <div><p className="text-xs text-gray-500">Payments</p><p className="font-bold">{formatCurrency(totalByType("payment"))}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg"><AlertTriangle className="w-5 h-5 text-purple-600" /></div>
            <div><p className="text-xs text-gray-500">Deadlines</p><p className="font-bold">{events.filter((e) => e.type === "deadline").length}</p></div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-3">
          <CardContent className="p-4">
            <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
              {DAYS.map((day) => (
                <div key={day} className="bg-gray-50 dark:bg-gray-800 p-2 text-center text-xs font-semibold text-gray-500">
                  {day}
                </div>
              ))}
              {calendarDays.map((day, idx) => (
                <div
                  key={idx}
                  className={`bg-white dark:bg-gray-900 p-1 min-h-[100px] ${
                    !day.isCurrentMonth ? "opacity-40" : ""
                  } ${day.date === 15 && day.isCurrentMonth ? "ring-2 ring-blue-500" : ""}`}
                >
                  <span className={`text-sm font-medium ${day.isCurrentMonth ? "" : "text-gray-400"}`}>
                    {day.date}
                  </span>
                  <div className="mt-1 space-y-1">
                    {day.events.slice(0, 3).map((event) => (
                      <button
                        key={event.id}
                        className={`w-full text-left text-xs p-1 rounded truncate ${event.color} text-white hover:opacity-80`}
                        onClick={() => setSelectedEvent(event)}
                      >
                        {event.title.split(" - ")[0]}
                      </button>
                    ))}
                    {day.events.length > 3 && (
                      <span className="text-xs text-gray-500">+{day.events.length - 3} more</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5" /> Upcoming
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingEvents.map((event) => (
              <button
                key={event.id}
                className="w-full text-left p-3 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                onClick={() => setSelectedEvent(event)}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${event.color}`} />
                  <span className="text-xs text-gray-500">{event.date}</span>
                </div>
                <p className="text-sm font-medium mt-1">{event.title}</p>
                {event.amount && <p className="text-sm font-semibold mt-1">{formatCurrency(event.amount)}</p>}
              </button>
            ))}
            {upcomingEvents.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">No upcoming events</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={selectedEvent !== null} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Event Details</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${selectedEvent.color} text-white`}>
                  {TYPE_CONFIG[selectedEvent.type].icon}
                </div>
                <div>
                  <p className="font-semibold">{selectedEvent.title}</p>
                  <p className="text-sm text-gray-500 capitalize">{selectedEvent.type}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-gray-500">Date</p><p className="font-medium">{selectedEvent.date}</p></div>
                <div><p className="text-xs text-gray-500">Status</p><Badge className="capitalize">{selectedEvent.status}</Badge></div>
                {selectedEvent.amount && (
                  <div><p className="text-xs text-gray-500">Amount</p><p className="font-bold text-lg">{formatCurrency(selectedEvent.amount)}</p></div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
