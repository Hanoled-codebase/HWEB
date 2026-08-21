"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAdmin } from "../layout";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MessageSquare,
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";
const ADMIN_API = `${API_BASE}/admin`;

type TicketStatus = "open" | "in_progress" | "resolved" | "closed";
type TicketPriority = "low" | "medium" | "high" | "urgent";

type OrgInfo = { id: string; name: string; slug: string };

type Ticket = {
  id: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  isDevTicket: boolean;
  createdAt: string;
  updatedAt: string;
  organization: OrgInfo | null;
  member?: { id: string; user: { name?: string; email?: string }; role?: string } | null;
  adminReply?: { id: string; name: string; email: string } | null;
  messages?: TicketMessage[];
};

type TicketMessage = {
  id: string;
  ticketId: string;
  message: string;
  createdAt: string;
  sender: { id: string; user: { name?: string; email?: string } } | null;
  adminSender: { id: string; name: string; email: string } | null;
};

const STATUS_CONFIG: Record<TicketStatus, { label: string; className: string }> = {
  open: { label: "Open", className: "bg-amber-100 text-amber-800 border-amber-200" },
  in_progress: { label: "In Progress", className: "bg-blue-100 text-blue-800 border-blue-200" },
  resolved: { label: "Resolved", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  closed: { label: "Closed", className: "bg-slate-100 text-slate-600 border-slate-200" },
};

const PRIORITY_CONFIG: Record<TicketPriority, { label: string; className: string }> = {
  low: { label: "Low", className: "bg-slate-50 text-slate-600 border-slate-200" },
  medium: { label: "Medium", className: "bg-blue-50 text-blue-700 border-blue-200" },
  high: { label: "High", className: "bg-amber-50 text-amber-700 border-amber-200" },
  urgent: { label: "Urgent", className: "bg-red-50 text-red-700 border-red-200" },
};

async function adminFetch<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${ADMIN_API}${url}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...opts?.headers },
    ...opts,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export default function AdminSupportPage() {
  const { admin } = useAdmin();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [showMobileList, setShowMobileList] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchTickets = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await adminFetch<Ticket[]>("/support-tickets");
      setTickets(data);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (admin) fetchTickets();
  }, [admin, fetchTickets]);

  useEffect(() => {
    let result = tickets;
    if (statusFilter !== "all") result = result.filter(t => t.status === statusFilter);
    if (priorityFilter !== "all") result = result.filter(t => t.priority === priorityFilter);
    setFilteredTickets(result);
  }, [tickets, statusFilter, priorityFilter]);

  useEffect(() => {
    if (selectedTicket) {
      setMessages(selectedTicket.messages || []);
    }
  }, [selectedTicket]);

  async function handleReply() {
    if (!selectedTicket || !messageInput.trim()) return;
    setIsSending(true);
    try {
      const msg = await adminFetch<TicketMessage>(
        `/support-tickets/${selectedTicket.id}/reply`,
        {
          method: "POST",
          body: JSON.stringify({ message: messageInput.trim() }),
        },
      );
      setMessages([...messages, msg]);
      setMessageInput("");
      fetchTickets();
      toast.success("Reply sent");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSending(false);
    }
  }

  async function handleUpdateStatus(ticketId: string, status: TicketStatus) {
    try {
      const updated = await adminFetch<Ticket>(`/support-tickets/${ticketId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setTickets(tickets.map(t => (t.id === ticketId ? updated : t)));
      setSelectedTicket(updated);
      toast.success(`Ticket ${status === "resolved" ? "resolved" : status === "closed" ? "closed" : "reopened"}`);
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  function handleSelectTicket(ticket: Ticket) {
    setSelectedTicket(ticket);
    setShowMobileList(false);
  }

  function handleBackToList() {
    setShowMobileList(true);
  }

  function isMyMessage(msg: TicketMessage): boolean {
    if (!admin) return false;
    return msg.adminSender?.email === admin.email;
  }

  function senderName(msg: TicketMessage): string {
    if (msg.adminSender) return `${msg.adminSender.name} (Dev Team)`;
    return msg.sender?.user?.name || "School User";
  }

  const unreadCount = tickets.filter(t => t.status === "open").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Support Tickets
          </h1>
          <p className="text-slate-500">
            Manage dev-team support tickets from schools.
            {unreadCount > 0 && (
              <span className="ml-2 text-amber-600 font-medium">
                {unreadCount} open
              </span>
            )}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchTickets}>
          <RefreshCw className="mr-2 h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as string)}>
          <SelectTrigger className="w-[140px] bg-white">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as string)}>
          <SelectTrigger className="w-[140px] bg-white">
            <SelectValue placeholder="All Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr]">
        {/* ── Ticket List ─────────────────────────────────────── */}
        <div className={cn("lg:block", !showMobileList && "hidden")}>
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="bg-slate-50/50">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-blue-500" />
                Tickets
                {tickets.length > 0 && (
                  <Badge variant="outline" className="ml-1 rounded-full border-slate-200 bg-white px-2 py-0 text-xs font-medium text-slate-600">
                    {tickets.length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[calc(100vh-420px)]">
                {isLoading ? (
                  <div className="space-y-2 p-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="space-y-2 rounded-lg border border-slate-200 p-4">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                        <div className="flex gap-2 pt-1">
                          <Skeleton className="h-5 w-16" />
                          <Skeleton className="h-5 w-14" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredTickets.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 p-10 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                      <MessageSquare className="h-6 w-6 text-slate-400" />
                    </div>
                    <p className="text-sm font-semibold text-slate-700">
                      No tickets found
                    </p>
                    <p className="text-xs text-slate-400">
                      {tickets.length === 0 ? "No dev-team tickets yet." : "Try changing the filters."}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {filteredTickets.map((ticket) => {
                      const statusCfg = STATUS_CONFIG[ticket.status];
                      const priorityCfg = PRIORITY_CONFIG[ticket.priority];
                      const isSelected = selectedTicket?.id === ticket.id;
                      const msgCount = ticket.messages?.length || 0;
                      return (
                        <button
                          key={ticket.id}
                          type="button"
                          onClick={() => handleSelectTicket(ticket)}
                          className={cn(
                            "w-full text-left p-4 transition-colors hover:bg-slate-50",
                            isSelected && "bg-blue-50/50",
                            ticket.status === "open" && "bg-amber-50/30",
                          )}
                        >
                          <p className="truncate text-sm font-semibold text-slate-800">
                            {ticket.subject}
                          </p>
                          <p className="mt-1 truncate text-xs text-slate-400">
                            {ticket.organization?.name && (
                              <span className="font-medium text-slate-500">{ticket.organization.name} · </span>
                            )}
                            {format(new Date(ticket.createdAt), "MMM d, yyyy")}
                          </p>
                          {ticket.member?.user?.name && (
                            <p className="mt-0.5 truncate text-[11px] text-slate-400">
                              {ticket.member.user.name}
                              {ticket.member.role && ` · ${ticket.member.role}`}
                            </p>
                          )}
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <Badge variant="outline" className={cn("px-2 py-0 text-[11px] font-medium", statusCfg.className)}>
                              {statusCfg.label}
                            </Badge>
                            <Badge variant="outline" className={cn("px-2 py-0 text-[11px] font-medium", priorityCfg.className)}>
                              {priorityCfg.label}
                            </Badge>
                            {msgCount > 0 && (
                              <span className="flex items-center gap-0.5 text-[11px] text-slate-400">
                                <MessageSquare className="h-3 w-3" />
                                {msgCount}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* ── Chat / Detail View ────────────────────────────────── */}
        <div className={cn("lg:block", showMobileList && "hidden")}>
          {selectedTicket ? (
            <Card className="flex h-[calc(100vh-420px)] flex-col border-slate-200 shadow-sm">
              {/* Header */}
              <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
                <button
                  type="button"
                  onClick={handleBackToList}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 lg:hidden"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-sm font-bold text-slate-900">
                      {selectedTicket.subject}
                    </h3>
                    <Badge variant="outline" className={cn("shrink-0 px-2 py-0 text-[11px] font-medium", STATUS_CONFIG[selectedTicket.status].className)}>
                      {STATUS_CONFIG[selectedTicket.status].label}
                    </Badge>
                    <Badge variant="outline" className={cn("shrink-0 px-2 py-0 text-[11px] font-medium", PRIORITY_CONFIG[selectedTicket.priority].className)}>
                      {PRIORITY_CONFIG[selectedTicket.priority].label}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {selectedTicket.organization?.name && (
                      <span className="font-medium">{selectedTicket.organization.name}</span>
                    )}
                    {selectedTicket.member?.user?.name && ` — ${selectedTicket.member.user.name}`}
                    {selectedTicket.member?.role && ` (${selectedTicket.member.role})`}
                    <span className="ml-1">
                      · {format(new Date(selectedTicket.createdAt), "MMM d, yyyy h:mm a")}
                    </span>
                  </p>
                </div>
                {selectedTicket.status !== "closed" && (
                  <div className="flex shrink-0 gap-2">
                    <Select
                      value={selectedTicket.status}
                      onValueChange={(v) => handleUpdateStatus(selectedTicket.id, v as TicketStatus)}
                    >
                      <SelectTrigger className="w-[130px] bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                    {selectedTicket.status !== "resolved" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                        onClick={() => handleUpdateStatus(selectedTicket.id, "resolved")}
                      >
                        <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                        Resolve
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 px-5 py-4">
                {messages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                      <MessageSquare className="h-6 w-6 text-slate-400" />
                    </div>
                    <p className="text-sm font-semibold text-slate-700">No messages yet</p>
                    <p className="max-w-xs text-xs text-slate-400">
                      Reply below to start the conversation with the school.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((msg) => {
                      const mine = isMyMessage(msg);
                      return (
                        <div key={msg.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                          <div className={cn(
                            "max-w-[80%] rounded-2xl px-4 py-3",
                            mine
                              ? "bg-blue-600 text-white"
                              : "border border-slate-200 bg-white text-slate-800",
                          )}>
                            <p className="mb-1 text-[11px] font-semibold" style={mine ? { color: "rgba(255,255,255,0.7)" } : { color: "rgb(100,116,139)" }}>
                              {senderName(msg)}
                            </p>
                            <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.message}</p>
                            <p className={cn("mt-1 text-[11px]", mine ? "text-blue-200" : "text-slate-400")}>
                              {format(new Date(msg.createdAt), "h:mm a")}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              {/* Input */}
              <div className="border-t border-slate-200 px-5 py-4">
                <form
                  onSubmit={(e) => { e.preventDefault(); handleReply(); }}
                  className="flex gap-3"
                >
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder="Type your reply..."
                    disabled={isSending || selectedTicket.status === "closed"}
                    className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm ring-offset-white placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <Button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={isSending || !messageInput.trim() || selectedTicket.status === "closed"}
                  >
                    {isSending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </form>
                {selectedTicket.status === "closed" && (
                  <p className="mt-2 text-xs text-slate-400">
                    This ticket is closed. Reopen it to send messages.
                  </p>
                )}
              </div>
            </Card>
          ) : (
            <Card className="flex h-[calc(100vh-420px)] items-center justify-center border-slate-200 shadow-sm">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                  <MessageSquare className="h-8 w-8 text-slate-400" />
                </div>
                <div>
                  <p className="text-base font-semibold text-slate-700">Select a ticket</p>
                  <p className="mt-1 text-sm text-slate-400">
                    Choose a ticket from the list to view and reply.
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
