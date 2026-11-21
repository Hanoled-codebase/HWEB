"use client";

import { useState, useEffect, useRef } from "react";
import { useOrganization } from "@/hooks/useOrganization";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

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
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MessageSquare,
  Send,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
} from "lucide-react";

type TicketStatus = "open" | "in_progress" | "resolved" | "closed";
type TicketPriority = "low" | "medium" | "high" | "urgent";

type Ticket = {
  id: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: string;
  updatedAt: string;
  student?: { id: string; firstName: string; lastName: string } | null;
  member?: { id: string; user: { name?: string; email?: string }; role?: string } | null;
  messages?: TicketMessage[];
};

type TicketMessage = {
  id: string;
  ticketId: string;
  message: string;
  createdAt: string;
  senderId: string;
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

export default function SupportPage() {
  const { currentOrg, currentMember, currentStudent, isStudent } = useOrganization();
  const [mode, setMode] = useState<"school" | "dev">("school");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createSubject, setCreateSubject] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createPriority, setCreatePriority] = useState<TicketPriority>("medium");
  const [isCreating, setIsCreating] = useState(false);
  const [showMobileList, setShowMobileList] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isAdmin =
    currentMember?.role === "owner" || currentMember?.role === "admin";

  const currentUserId = currentMember?.user?.id;

  useEffect(() => {
    if (!isAdmin && mode === "dev") {
      setMode("school");
    }
  }, [isAdmin, mode]);

  useEffect(() => {
    if (!currentOrg) return;
    setSelectedTicket(null);
    setMessages([]);
    fetchTickets();
  }, [currentOrg, mode]);

  useEffect(() => {
    if (selectedTicket) {
      fetchMessages(selectedTicket.id);
    }
  }, [selectedTicket?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function fetchTickets() {
    if (!currentOrg) return;
    try {
      setIsLoading(true);
      const data = await apiFetch<Ticket[]>(
        `/support-tickets?orgSlug=${currentOrg.slug}&isDevTicket=${mode === "dev"}`,
      );
      setTickets(data);
    } catch {
      // apiFetch already toasts
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchMessages(ticketId: string) {
    if (!currentOrg) return;
    try {
      setIsLoadingMessages(true);
      const data = await apiFetch<TicketMessage[]>(
        `/support-tickets/${ticketId}/messages?orgSlug=${currentOrg.slug}`,
      );
      setMessages(data);
    } catch {
      // apiFetch already toasts
    } finally {
      setIsLoadingMessages(false);
    }
  }

  async function handleCreateTicket() {
    if (!currentOrg) return;
    if (!createSubject.trim()) {
      toast.error("Subject is required");
      return;
    }
    if (!createDescription.trim()) {
      toast.error("Description is required");
      return;
    }

    setIsCreating(true);
    try {
      const newTicket = await apiFetch<Ticket>("/support-tickets", {
        method: "POST",
        body: JSON.stringify({
          orgSlug: currentOrg.slug,
          subject: createSubject.trim(),
          description: createDescription.trim(),
          priority: createPriority,
          isDevTicket: mode === "dev",
        }),
      });
      setTickets([newTicket, ...tickets]);
      setDialogOpen(false);
      setCreateSubject("");
      setCreateDescription("");
      setCreatePriority("medium");
      setSelectedTicket(newTicket);
      setShowMobileList(false);
      toast.success("Ticket created");
    } catch {
      // apiFetch already toasts
    } finally {
      setIsCreating(false);
    }
  }

  async function handleSendMessage() {
    if (!selectedTicket || !messageInput.trim() || !currentOrg) return;
    setIsSending(true);
    try {
      const newMessage = await apiFetch<TicketMessage>(
        `/support-tickets/${selectedTicket.id}/messages`,
        {
          method: "POST",
          body: JSON.stringify({
            message: messageInput.trim(),
            orgSlug: currentOrg.slug,
          }),
        },
      );
      setMessages([...messages, newMessage]);
      setMessageInput("");
      fetchTickets();
    } catch {
      // apiFetch already toasts
    } finally {
      setIsSending(false);
    }
  }

  async function handleUpdateStatus(ticketId: string, status: TicketStatus) {
    if (!currentOrg) return;
    try {
      const updated = await apiFetch<Ticket>(`/support-tickets/${ticketId}`, {
        method: "PATCH",
        body: JSON.stringify({ status, orgSlug: currentOrg.slug }),
      });
      setTickets(tickets.map((t) => (t.id === ticketId ? updated : t)));
      setSelectedTicket(updated);
      toast.success(
        status === "resolved"
          ? "Ticket resolved"
          : status === "closed"
            ? "Ticket closed"
            : "Ticket reopened",
      );
    } catch {
      // apiFetch already toasts
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
    if (msg.adminSender) return false;
    if (!currentUserId) return false;
    return msg.sender?.user?.email === currentMember?.user?.email;
  }

  function senderName(msg: TicketMessage): string {
    if (msg.adminSender) return `Hanoled Dev Team (${msg.adminSender.name})`;
    return msg.sender?.user?.name || "Unknown";
  }

  const selectedTicketMessages = messages;

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-stretch justify-between gap-4 md:flex-row md:items-center">
        <div className="hidden md:block">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            {mode === "dev" ? "Hanoled support" : "Support Tickets"}
          </h1>
          <p className="text-slate-500">
            {mode === "dev"
              ? "Report a problem or ask for a feature. It goes straight to the Hanoled team."
              : "Submit and manage support requests for your school."}
          </p>
        </div>
        <Button
          className="h-11 w-full shrink-0 bg-blue-600 font-semibold hover:bg-blue-700 md:h-9 md:w-auto md:px-4"
          onClick={() => setDialogOpen(true)}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" />
          {mode === "dev" ? "New Report" : "New Ticket"}
        </Button>
      </div>

      {/* ── Mode Toggle (Only visible for Admins and Owners) ──────── */}
      {isAdmin && (
        <div role="group" aria-label="Who the ticket is for" className="grid grid-cols-2 gap-1 rounded-lg border border-slate-200 bg-slate-50/50 p-1 md:flex md:w-fit md:items-center">
          <button
            type="button"
            onClick={() => setMode("school")}
            aria-pressed={mode === "school"}
            className={`min-h-11 rounded-md px-4 text-sm font-medium transition-all md:min-h-9 ${
              mode === "school"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Our school
          </button>
          <button
            type="button"
            onClick={() => setMode("dev")}
            aria-pressed={mode === "dev"}
            className={`min-h-11 rounded-md px-4 text-sm font-medium transition-all md:min-h-9 ${
              mode === "dev"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Hanoled support
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr]">
        {/* ── Ticket List ─────────────────────────────────────── */}
        <div className={cn("lg:block", !showMobileList && "hidden")}>
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="bg-slate-50/50">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-blue-500" />
                Tickets
                {tickets.length > 0 && (
                  <Badge
                    variant="outline"
                    className="ml-1 rounded-full border-slate-200 bg-white px-2 py-0 text-xs font-medium text-slate-600"
                  >
                    {tickets.length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[calc(100vh-320px)]">
                {isLoading ? (
                  <div className="space-y-2 p-4">
                    {Array.from({ length: 4 }).map((_, i) => (
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
                ) : tickets.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 p-10 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                      <MessageSquare className="h-6 w-6 text-slate-400" />
                    </div>
                    <p className="text-sm font-semibold text-slate-700">
                      No tickets yet
                    </p>
                    <p className="text-xs text-slate-500">
                      Create a new ticket to get help.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {tickets.map((ticket) => {
                      const statusCfg = STATUS_CONFIG[ticket.status];
                      const priorityCfg = PRIORITY_CONFIG[ticket.priority];
                      const isSelected = selectedTicket?.id === ticket.id;
                      return (
                        <button
                          key={ticket.id}
                          type="button"
                          onClick={() => handleSelectTicket(ticket)}
                          className={cn(
                            "w-full text-left p-4 transition-colors hover:bg-slate-50",
                            isSelected && "bg-blue-50/50",
                          )}
                        >
                          <p className="truncate text-sm font-semibold text-slate-800">
                            {ticket.subject}
                          </p>
                          <p className="mt-1 truncate text-xs text-slate-500">
                            {format(new Date(ticket.createdAt), "MMM d, yyyy")}
                          </p>
                          {isAdmin && ticket.member?.user?.name && (
                            <p className="mt-0.5 truncate text-xs text-slate-500">
                              {ticket.member.user.name}
                              {ticket.member.role && ` · ${ticket.member.role}`}
                            </p>
                          )}
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <Badge
                              variant="outline"
                              className={cn(
                                "px-2 py-0 text-xs font-medium",
                                statusCfg.className,
                              )}
                            >
                              {statusCfg.label}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={cn(
                                "px-2 py-0 text-xs font-medium",
                                priorityCfg.className,
                              )}
                            >
                              {priorityCfg.label}
                            </Badge>
                            {ticket.messages && ticket.messages.length > 0 && (
                              <span className="flex items-center gap-0.5 text-xs text-slate-500">
                                <MessageSquare className="h-3 w-3" />
                                {ticket.messages.length}
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
            <Card className="flex min-h-[60dvh] h-[calc(100dvh-260px)] flex-col border-slate-200 shadow-sm">
              {/* Header */}
              <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3 sm:px-5 sm:py-4">
                <button
                  type="button"
                  onClick={handleBackToList}
                  aria-label="Back to ticket list"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 lg:hidden"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-sm font-bold text-slate-900">
                      {selectedTicket.subject}
                    </h3>
                    <Badge
                      variant="outline"
                      className={cn(
                        "shrink-0 px-2 py-0 text-xs font-medium",
                        STATUS_CONFIG[selectedTicket.status].className,
                      )}
                    >
                      {STATUS_CONFIG[selectedTicket.status].label}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Created {format(new Date(selectedTicket.createdAt), "MMM d, yyyy h:mm a")}
                    {selectedTicket.member?.user?.name && ` by ${selectedTicket.member.user.name}`}
                    {selectedTicket.member?.role && ` (${selectedTicket.member.role})`}
                    {selectedTicket.student && ` — ${selectedTicket.student.firstName} ${selectedTicket.student.lastName}`}
                  </p>
                </div>
                {isAdmin && selectedTicket.status !== "closed" && (
                  <div className="flex shrink-0 gap-2">
                    {selectedTicket.status !== "resolved" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                        onClick={() => handleUpdateStatus(selectedTicket.id, "resolved")}
                      >
                        <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                        Resolve
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-amber-200 text-amber-700 hover:bg-amber-50"
                        onClick={() => handleUpdateStatus(selectedTicket.id, "open")}
                      >
                        <AlertCircle className="mr-1.5 h-3.5 w-3.5" />
                        Reopen
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 px-5 py-4">
                {isLoadingMessages ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div
                        key={i}
                        className={cn(
                          "flex",
                          i % 2 === 0 ? "justify-start" : "justify-end",
                        )}
                      >
                        <div className="w-3/4 space-y-2">
                          <Skeleton className="h-4 w-1/4" />
                          <Skeleton className="h-16 w-full rounded-xl" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                      <MessageSquare className="h-6 w-6 text-slate-400" />
                    </div>
                    <p className="text-sm font-semibold text-slate-700">
                      No messages yet
                    </p>
                    <p className="max-w-xs text-xs text-slate-500">
                      Send a message to start the conversation with the support team.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((msg) => {
                      const mine = isMyMessage(msg);
                      return (
                        <div
                          key={msg.id}
                          className={cn("flex", mine ? "justify-end" : "justify-start")}
                        >
                          <div
                            className={cn(
                              "max-w-[80%] rounded-2xl px-4 py-3",
                              mine
                                ? "bg-blue-600 text-white"
                                : "border border-slate-200 bg-white text-slate-800",
                            )}
                          >
                            {(!mine || msg.adminSender) && (
                              <p className="mb-1 text-xs font-semibold text-slate-500">
                                {senderName(msg)}
                              </p>
                            )}
                            <p className="whitespace-pre-wrap text-sm leading-relaxed">
                              {msg.message}
                            </p>
                            <p
                              className={cn(
                                "mt-1 text-xs",
                                mine ? "text-blue-200" : "text-slate-400",
                              )}
                            >
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

              {/* Input — admin only */}
              {isAdmin ? (
                <div className="border-t border-slate-200 px-5 py-4">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendMessage();
                    }}
                    className="flex gap-3"
                  >
                    <input
                      type="text"
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      placeholder="Type your message..."
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
                    <p className="mt-2 text-xs text-slate-500">
                      This ticket is closed. New messages cannot be sent.
                    </p>
                  )}
                </div>
              ) : (
                <div className="border-t border-slate-200 px-5 py-3 text-center text-xs text-slate-500">
                  {mode === "dev"
                    ? "Your report has been sent to the Hanoled dev team. We'll respond here."
                    : "Your ticket has been submitted. A school admin will respond shortly."}
                </div>
              )}
            </Card>
          ) : (
            <Card className="flex h-[calc(100vh-320px)] items-center justify-center border-slate-200 shadow-sm">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                  <MessageSquare className="h-8 w-8 text-slate-400" />
                </div>
                <div>
                  <p className="text-base font-semibold text-slate-700">
                    Select a ticket
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Choose a ticket from the list or create a new one to get started.
                  </p>
                </div>
                <Button
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => setDialogOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  New Ticket
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* ── Create Ticket Dialog ─────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[540px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              {mode === "dev" ? "Report to Dev Team" : "New Support Ticket"}
            </DialogTitle>
            <DialogDescription>
              {mode === "dev"
                ? "Report a bug or request a feature from the Hanoled development team."
                : "Describe your issue and our support team will get back to you."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">
                Subject
              </label>
              <input
                type="text"
                value={createSubject}
                onChange={(e) => setCreateSubject(e.target.value)}
                placeholder="Brief title for your issue"
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">
                Description
              </label>
              <Textarea
                value={createDescription}
                onChange={(e) => setCreateDescription(e.target.value)}
                placeholder="Describe your issue in detail..."
                rows={4}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">
                Priority
              </label>
              <Select
                value={createPriority}
                onValueChange={(v) => setCreatePriority(v as TicketPriority)}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700"
                disabled={isCreating}
                onClick={handleCreateTicket}
              >
                {isCreating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Create Ticket
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
