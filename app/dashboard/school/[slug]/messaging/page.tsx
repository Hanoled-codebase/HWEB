"use client";

import { useState, useEffect } from "react";
import { useOrganization } from "@/hooks/useOrganization";
import { ComingSoonCard } from "@/components/dashboard/ComingSoon";
import { DataStateCard } from "@/components/dashboard/shared";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Loader2, MessageSquare, Mail, Smartphone,
  Send, Users, Megaphone,
} from "lucide-react";

type Template = {
  id: string; name: string; channel: string; subject: string | null;
  body: string; variables: string[]; isDefault: boolean;
};

type QueueItem = {
  id: string; channel: string; recipient: string; body: string;
  status: string; error: string | null; createdAt: string;
};

type Student = { id: string; firstName: string; lastName: string };
type ClassLevel = { id: string; name: string };


// ─────────────────────────────────────────────────────────────────────────────
// MESSAGING (PARKED — always remember, agent!)
// The messaging feature — the admin's broadcast console — is parked for the
// MVP launch on purpose. NOT deleted, NOT dead code. Flip the gate below and
// search "MESSAGING_PARKED" repo-wide to find every place it was disabled.
// ─────────────────────────────────────────────────────────────────────────────
const MESSAGING_PARKED = true;
export default function MessagingPage() {
  const { currentOrg } = useOrganization();
  if (MESSAGING_PARKED) {
    return (
      <ComingSoonCard
        title="Messaging is coming soon"
        blurb="Broadcasts to parents and staff over WhatsApp, SMS and email arrive in the next release."
        backHref={currentOrg?.slug ? `/dashboard/school/${encodeURIComponent(currentOrg.slug)}` : "/dashboard"}
      />
    );
  }
  return <MessagingLive />;
}

function MessagingLive() {
  const { currentOrg, currentMember } = useOrganization();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [tab, setTab] = useState("compose");

  // Compose
  const [composeChannel, setComposeChannel] = useState("whatsapp");
  const [composeRecipient, setComposeRecipient] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [composeTemplate, setComposeTemplate] = useState("");
  const [sending, setSending] = useState(false);
  const [classLevels, setClassLevels] = useState<ClassLevel[]>([]);
  const [bulkClass, setBulkClass] = useState("");
  const [bulkTpl, setBulkTpl] = useState("");
  const [bulking, setBulking] = useState(false);

  // The compose/bulk/queue console below maps to backend routes that only
  // owner/admin can actually use (routes/messaging.js: POST /enqueue and
  // GET /queue both require isAdmin) — every other role would just get a
  // 403 on send, so don't even fetch templates/queue/class data for them.
  const isPrivileged = currentMember?.role === "owner" || currentMember?.role === "admin";

  useEffect(() => {
    if (!currentOrg || !isPrivileged) return;
    fetchTemplates(); fetchQueue(); fetchClassLevels();
  }, [currentOrg, isPrivileged]);

  async function fetchClassLevels() {
    if (!currentOrg) return;
    try { const d = await apiFetch<ClassLevel[]>(`/classes/${currentOrg.slug}`); setClassLevels(d); } catch { /* */ }
  }

  async function fetchTemplates() {
    if (!currentOrg) return;
    try {
      const res = await apiFetch(`/messaging/templates/${currentOrg.slug}`);
      setTemplates(Array.isArray(res) ? res : (res as any).data ?? []);
    } catch { /* */ } finally { setLoadingTemplates(false); }
  }

  async function fetchQueue() {
    if (!currentOrg) return;
    try {
      const res = await apiFetch(`/messaging/queue/${currentOrg.slug}`);
      setQueue(Array.isArray(res) ? res : (res as any).data ?? []);
    } catch { /* */ } finally { setLoadingQueue(false); }
  }

  async function sendSingle() {
    if (!currentOrg || !composeRecipient || !composeBody) { toast.error("Recipient and body required"); return; }
    setSending(true);
    try {
      await apiFetch(`/messaging/enqueue/${currentOrg.slug}`, {
        method: "POST",
        body: JSON.stringify({
          channel: composeChannel,
          recipient: composeRecipient,
          vars: { body: composeBody },
        }),
      });
      toast.success("Message queued");
      setComposeRecipient(""); setComposeBody("");
      fetchQueue();
    } catch { /* */ } finally { setSending(false); }
  }

  async function sendBulk() {
    if (!currentOrg || !bulkClass) { toast.error("Select a class"); return; }
    setBulking(true);
    try {
      // Get students in this class
      const students = await apiFetch<Student[]>(`/students/${currentOrg.slug}?classLevelId=${bulkClass}`);
      const studentList = Array.isArray(students) ? students : [];

      let recipients;
      if (composeChannel === "whatsapp" || composeChannel === "sms") {
        recipients = studentList.map((s) => s.firstName).join(", ");
      }

      for (const student of studentList) {
        const vars: any = { studentName: `${student.firstName} ${student.lastName}` };
        if (composeBody) vars.body = composeBody;

        await apiFetch(`/messaging/enqueue/${currentOrg.slug}`, {
          method: "POST",
          body: JSON.stringify({
            channel: composeChannel,
            recipient: student.id, // placeholder - needs phone
            templateId: bulkTpl || undefined,
            vars,
          }),
        });
      }
      toast.success(`${studentList.length} messages queued`);
      fetchQueue();
    } catch { /* */ } finally { setBulking(false); }
  }

  const channelIcon = (ch: string) => {
    switch (ch) {
      case "whatsapp": return <MessageSquare className="h-4 w-4 text-green-600" />;
      case "email": return <Mail className="h-4 w-4 text-blue-600" />;
      case "sms": return <Smartphone className="h-4 w-4 text-purple-600" />;
      default: return null;
    }
  };

  const statusBadge = (status: string) => (
    <Badge variant="outline" className={cn("rounded-full px-2 py-0 text-xs font-medium",
      status === "sent" ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "pending" ? "border-amber-200 bg-amber-50 text-amber-700"
      : "border-rose-200 bg-rose-50 text-rose-700"
    )}>{status}</Badge>
  );

  if (!currentOrg) return null;

  if (!isPrivileged) {
    return (
      <div className="min-h-full bg-slate-50/60 pb-28 md:pb-10">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 p-0 md:p-6 lg:p-8">
          <DataStateCard
            variant="forbidden"
            title="Messaging isn't available to your role"
            description="Bulk and template messaging is managed by the school's admin team."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50/60 pb-28 md:pb-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 p-0 md:p-6 lg:p-8">
        <div className="hidden md:block">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Messaging</h1>
          <p className="mt-1 text-sm text-slate-500 font-medium">Send messages and manage templates.</p>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <div className="w-full overflow-x-auto pb-1">
            <TabsList className="grid w-full grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1 md:h-11 md:grid-cols-4 md:gap-0">
              <TabsTrigger value="compose" className="flex-1 rounded-xl text-sm font-semibold md:text-xs data-active:bg-white data-active:text-slate-900 data-active:shadow-sm py-2">Compose</TabsTrigger>
              <TabsTrigger value="bulk" className="flex-1 rounded-xl text-sm font-semibold md:text-xs data-active:bg-white data-active:text-slate-900 data-active:shadow-sm py-2">Bulk</TabsTrigger>
              <TabsTrigger value="templates" className="flex-1 rounded-xl text-sm font-semibold md:text-xs data-active:bg-white data-active:text-slate-900 data-active:shadow-sm py-2">Templates</TabsTrigger>
              <TabsTrigger value="queue" className="flex-1 rounded-xl text-sm font-semibold md:text-xs data-active:bg-white data-active:text-slate-900 data-active:shadow-sm py-2">Queue</TabsTrigger>
            </TabsList>
          </div>

          {/* Compose */}
          <TabsContent value="compose" className="mt-4 space-y-4">
            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="overflow-hidden rounded-2xl border-slate-100 shadow-sm bg-white lg:col-span-2">
                <CardContent className="space-y-4 p-4 md:p-6">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700 md:text-xs md:font-semibold md:text-slate-600">Channel</label>
                    <Select value={composeChannel} onValueChange={(v: unknown) => setComposeChannel(v as string)}>
                      <SelectTrigger className="h-11 rounded-xl bg-white border-slate-200"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="whatsapp"><div className="flex items-center gap-2"><MessageSquare className="h-4 w-4 text-emerald-500" /> WhatsApp</div></SelectItem>
                        <SelectItem value="email"><div className="flex items-center gap-2"><Mail className="h-4 w-4 text-blue-600" /> Email</div></SelectItem>
                        <SelectItem value="sms"><div className="flex items-center gap-2"><Smartphone className="h-4 w-4 text-purple-600" /> SMS</div></SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {templates.length > 0 && (
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-slate-700 md:text-xs md:font-semibold md:text-slate-600">Template <span className="font-normal text-slate-500">(optional)</span></label>
                      <Select value={composeTemplate} onValueChange={(v: unknown) => {
                        setComposeTemplate(v as string);
                        const tpl = templates.find((t) => t.id === v);
                        if (tpl) { setComposeBody(tpl.body); setComposeChannel(tpl.channel); }
                      }}>
                        <SelectTrigger className="h-11 rounded-xl bg-white border-slate-200"><SelectValue placeholder="None" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">None</SelectItem>
                          {templates.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.name} ({t.channel})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label htmlFor="compose-recipient" className="text-sm font-medium text-slate-700 md:text-xs md:font-semibold md:text-slate-600">
                      {composeChannel === "email" ? "Recipient email" : "Recipient phone number"}
                    </label>
                    <Input id="compose-recipient" value={composeRecipient} onChange={(e) => setComposeRecipient(e.target.value)}
                      type={composeChannel === "email" ? "email" : "tel"}
                      inputMode={composeChannel === "email" ? "email" : "tel"}
                      autoComplete={composeChannel === "email" ? "email" : "tel"}
                      className="h-11 rounded-xl bg-white border-slate-200 placeholder:text-slate-400 md:text-sm"
                      placeholder={composeChannel === "email" ? "parent@example.com" : "0801 234 5678 or +234 801 234 5678"} />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="compose-body" className="text-sm font-medium text-slate-700 md:text-xs md:font-semibold md:text-slate-600">Message</label>
                    <Textarea id="compose-body" value={composeBody} onChange={(e) => setComposeBody(e.target.value)}
                      className="min-h-[110px] resize-y rounded-2xl bg-white border-slate-200 placeholder:text-slate-400 md:text-sm" placeholder="Type your message. A template can fill in names for you." />
                  </div>

                  <div className="pt-2 hidden md:block">
                    <Button onClick={sendSingle} disabled={sending} className="w-full rounded-2xl bg-blue-600 hover:bg-blue-700 h-12 font-semibold text-white sm:w-auto shadow-sm">
                      {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                      Send Message
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Notification Pricing Card */}
              <Card className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden h-fit">
                <CardContent className="p-4 space-y-3">
                  <h3 className="text-sm font-bold text-slate-900">Notification &amp; billing</h3>

                  <div className="space-y-2 pt-1 text-xs">
                    <div className="flex items-center justify-between text-slate-500">
                      <span>Channel</span>
                      <span className="font-semibold text-slate-700 capitalize">{composeChannel}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-500">
                      <span>Unit Rate</span>
                      <span className="font-semibold text-slate-700">
                        {composeChannel === "sms" ? "₦4.00 / SMS" : composeChannel === "whatsapp" ? "₦6.50 / msg" : "Free (Included)"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-500">
                      <span>Recipient</span>
                      <span className="font-semibold text-slate-700">
                        {composeRecipient ? "1 Destination" : "0 selected"}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-sm">Estimated Total</span>
                      <span className="text-base font-bold text-[#1447E6]">
                        {composeChannel === "sms" ? "₦4.00" : composeChannel === "whatsapp" ? "₦6.50" : "₦0.00"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Bulk */}
          <TabsContent value="bulk" className="mt-4 space-y-4">
            <Card className="border-slate-100 shadow-sm rounded-2xl bg-white">
              <CardHeader><CardTitle className="text-base font-bold">Broadcast to Class</CardTitle>
              <CardDescription className="text-xs">Send a message to all parents of students in a class.</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Class</label>
                    <Select value={bulkClass} onValueChange={(v: unknown) => setBulkClass(v as string)}>
                      <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Select class" /></SelectTrigger>
                      <SelectContent>
                        {classLevels.map((cl) => <SelectItem key={cl.id} value={cl.id}>{cl.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Channel</label>
                    <Select value={composeChannel} onValueChange={(v: unknown) => setComposeChannel(v as string)}>
                      <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="sms">SMS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Template</label>
                  <Select value={bulkTpl} onValueChange={(v: unknown) => setBulkTpl(v as string)}>
                    <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None (custom message)</SelectItem>
                      {templates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name} ({t.channel})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Message Body <span className="text-slate-400 font-normal">(&#123;&#123;studentName&#125;&#125; supported)</span></label>
                  <Textarea value={composeBody} onChange={(e) => setComposeBody(e.target.value)}
                    className="min-h-[100px] rounded-2xl" placeholder="e.g. Dear {{studentName}}, ..." />
                </div>
                <Button onClick={sendBulk} disabled={bulking || !bulkClass} className="w-full h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                  {bulking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Megaphone className="mr-2 h-4 w-4" />}
                  Broadcast to Class
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Templates */}
          <TabsContent value="templates" className="mt-4">
            {loadingTemplates ? <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}</div>
            : templates.length === 0
            ? <Card className="border-dashed border-slate-300 rounded-2xl"><CardContent className="flex flex-col items-center gap-3 py-12 text-center"><MessageSquare className="h-10 w-10 text-slate-300" /><p className="text-sm text-slate-500">No templates available.</p></CardContent></Card>
            : <div className="grid gap-4 sm:grid-cols-2">
                {templates.map((t) => (
                  <Card key={t.id} className="border-slate-100 rounded-2xl shadow-sm bg-white">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        {channelIcon(t.channel)}
                        <CardTitle className="text-sm font-semibold">{t.name}</CardTitle>
                        {t.isDefault && <Badge variant="secondary" className="text-xs px-1.5 py-0">default</Badge>}
                      </div>
                      <CardDescription className="text-xs">{t.channel} · {t.variables?.length ? t.variables.join(", ") : "no vars"}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="whitespace-pre-wrap break-words text-sm text-slate-600 line-clamp-3">{t.body}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            }
          </TabsContent>

          {/* Queue */}
          <TabsContent value="queue" className="mt-4">
            {loadingQueue ? <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)}</div>
            : queue.length === 0
            ? <Card className="border-dashed border-slate-300 rounded-2xl"><CardContent className="flex flex-col items-center gap-3 py-12 text-center"><Megaphone className="h-10 w-10 text-slate-300" /><p className="text-sm text-slate-500">No messages in queue.</p></CardContent></Card>
            : <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-white">
                {queue.map((item) => (
                  <div key={item.id} className="flex items-center justify-between px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {channelIcon(item.channel)}
                        <span className="text-sm font-medium text-slate-900">{item.recipient}</span>
                        {statusBadge(item.status)}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-slate-500">{item.body}</p>
                    </div>
                    <div className="ml-4 shrink-0 text-right text-xs text-slate-500">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            }
          </TabsContent>
        </Tabs>

        {/* Mobile Sticky Floating Send Button */}
        {tab === "compose" && (
          <div className="fixed bottom-above-nav inset-x-0 p-4 bg-gradient-to-t from-white via-white/90 to-transparent z-30 md:hidden">
            <Button
              onClick={sendSingle}
              disabled={sending}
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-2xl shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send Message
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
