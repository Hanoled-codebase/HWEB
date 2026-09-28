"use client";

import { useState, useEffect } from "react";
import { useOrganization } from "@/hooks/useOrganization";
import { DataStateCard } from "@/components/dashboard/shared";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Users, CheckCircle2, XCircle, Search, ExternalLink, Eye, Calendar, FileEdit,
  Share2,
} from "lucide-react";

type Admission = {
  id: string;
  firstName: string; lastName: string; email: string; phone: string;
  gender: string | null; dateOfBirth: string | null; address: string | null;
  previousSchool: string | null; status: string; feePaid: boolean;
  classLevel: { name: string } | null;
  documents: any; notes: string | null; createdAt: string;
  examDate: string | null; examScore: number | null; examPassMark: number | null;
};

export default function AdmissionsAdminPage() {
  const { currentOrg, currentMember } = useOrganization();
  const isPrivileged = currentMember?.role === "owner" || currentMember?.role === "admin";
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [selected, setSelected] = useState<Admission | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [scheduleExamId, setScheduleExamId] = useState<string | null>(null);
  const [examDate, setExamDate] = useState("");
  const [scheduling, setScheduling] = useState(false);
  const [recordResultId, setRecordResultId] = useState<string | null>(null);
  const [examScore, setExamScore] = useState("");
  const [examPassMark, setExamPassMark] = useState("50");
  const [recording, setRecording] = useState(false);

  useEffect(() => {
    if (!currentOrg) return;
    fetchAdmissions();
  }, [currentOrg, filterStatus]);

  async function fetchAdmissions() {
    if (!currentOrg) return;
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set("status", filterStatus);
      const res = await apiFetch<Admission[]>(`/admissions/admin/${currentOrg.slug}?${params}`);
      setAdmissions(Array.isArray(res) ? res : (res as any).data ?? []);
    } catch { /* */ } finally { setLoading(false); }
  }

  async function updateStatus(id: string, status: string) {
    if (!currentOrg) return;
    setProcessing(id);
    try {
      await apiFetch(`/admissions/admin/${currentOrg.slug}/${id}/status`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });
      toast.success(`Status updated to ${status}`);
      fetchAdmissions();
    } catch { /* */ } finally { setProcessing(null); }
  }

  async function acceptAndGenerate(id: string) {
    if (!currentOrg) return;
    setProcessing(id);
    try {
      const res = await apiFetch(`/admissions/admin/${currentOrg.slug}/${id}/letter`, { method: "POST" });
      toast.success("Application accepted");
      fetchAdmissions();
    } catch { /* */ } finally { setProcessing(null); }
  }

  const statusLabel = (s: string) => ({
    pending: "Pending",
    reviewed: "Reviewed",
    accepted: "Accepted",
    scheduled_for_exam: "Scheduled for Exam",
    taken_exam: "Taken Exam",
    passed_exam: "Passed Exam",
    rejected: "Rejected",
    enrolled: "Enrolled",
  }[s] || s);

  const statusBadge = (s: string) => {
    // Note: colors are limited to the brand's blue/gold/green/red families, so
    // adjacent workflow stages within the same family are told apart with a
    // lightness ramp (per brand guide's "vary lightness, don't add new hues" rule)
    // rather than distinct hues.
    const colors: Record<string, string> = {
      pending: "border-amber-200 bg-amber-50 text-amber-700",
      reviewed: "border-blue-200 bg-blue-50 text-blue-600",
      accepted: "border-emerald-200 bg-emerald-50 text-emerald-700",
      scheduled_for_exam: "border-blue-300 bg-blue-100 text-blue-700",
      taken_exam: "border-blue-400 bg-blue-200 text-blue-800",
      passed_exam: "border-emerald-300 bg-emerald-100 text-emerald-800",
      rejected: "border-rose-200 bg-rose-50 text-rose-700",
      enrolled: "border-emerald-600 bg-emerald-600 text-white",
    };
    return <Badge variant="outline" className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", colors[s] || "")}>{statusLabel(s)}</Badge>;
  };

  if (!currentOrg) return null;

  if (!isPrivileged) {
    return (
      <div className="min-h-full bg-slate-50/60 pb-10">
        <div className="mx-auto max-w-5xl p-6">
          <DataStateCard
            variant="forbidden"
            title="Admissions isn&apos;t available to your role"
            description="This is managed by the school&apos;s admin team."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50/60 pb-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 md:gap-6 md:px-6 md:py-8 lg:px-8">
        <div className="flex items-center justify-between">
          <div className="hidden md:block">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Admissions</h1>
            <p className="mt-1 text-sm text-slate-500">Review and manage applications.</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-sm px-3 py-1">
              <Users className="mr-1.5 h-3.5 w-3.5" />
              {admissions.length} total
            </Badge>
          </div>
        </div>

        <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
          <Select value={filterStatus} onValueChange={(v: unknown) => setFilterStatus(v as string)}>
            <SelectTrigger aria-label="Filter by status" className="w-full md:w-[180px]"><SelectValue placeholder="All status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="reviewed">Reviewed</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="scheduled_for_exam">Scheduled for Exam</SelectItem>
              <SelectItem value="taken_exam">Taken Exam</SelectItem>
              <SelectItem value="passed_exam">Passed Exam</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="enrolled">Enrolled</SelectItem>
            </SelectContent>
          </Select>
          {/* Parents apply through this link: on a phone, share it rather than read it */}
          <div className="flex items-center gap-2">
            <p className="hidden text-xs text-slate-500 md:block">Public form: <a href={`/admissions/${currentOrg.slug}`} target="_blank" className="text-blue-600 underline underline-offset-2">/admissions/{currentOrg.slug} <ExternalLink className="inline h-3 w-3" /></a></p>
            <Button
              type="button"
              variant="outline"
              className="flex-1 border-slate-200 bg-white font-semibold md:hidden"
              onClick={async () => {
                const url = `${window.location.origin}/admissions/${currentOrg.slug}`;
                try {
                  if (navigator.share) {
                    await navigator.share({ title: `${currentOrg.name} admissions`, url });
                  } else {
                    await navigator.clipboard.writeText(url);
                    toast.success("Application link copied");
                  }
                } catch {
                  /* share sheet dismissed */
                }
              }}
            >
              <Share2 className="mr-2 h-4 w-4" /> Share application form
            </Button>
            <Button asChild variant="outline" size="icon" aria-label="Open application form" className="border-slate-200 bg-white md:hidden">
              <a href={`/admissions/${currentOrg.slug}`} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
        ) : admissions.length === 0 ? (
          <Card className="border-dashed border-slate-300"><CardContent className="flex flex-col items-center gap-3 py-12 text-center"><Users className="h-10 w-10 text-slate-300" /><p className="text-sm text-slate-500">No applications yet.</p></CardContent></Card>
        ) : (
          <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
            {admissions.map((a) => (
              <div 
                key={a.id} 
                className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between md:gap-4 md:px-6 md:py-4 hover:bg-slate-50/50 transition-colors"
              >
                {/* Left Section: Eye button + Name */}
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <button 
                    type="button" 
                    onClick={() => setSelected(a)} 
                    className="shrink-0 text-slate-300 hover:text-blue-600 mt-0.5 p-1 rounded-md hover:bg-slate-100 transition-colors"
                    title="View Details"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {a.firstName} {a.lastName}
                    </p>
                    {/* Mobile-only contact info */}
                    <div className="md:hidden mt-1 space-y-0.5 text-xs text-slate-500">
                      <p className="truncate">{a.email}</p>
                      <p>{a.phone}</p>
                      <p className="font-medium text-slate-600 mt-1">
                        Class: {a.classLevel?.name || "—"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Middle Section: Desktop-only contact info */}
                <div className="hidden md:block min-w-0 flex-1 max-w-xs">
                  <p className="text-xs font-medium text-slate-900 truncate">{a.email}</p>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{a.phone}</p>
                </div>

                {/* Middle Section 2: Desktop-only Class Level */}
                <div className="hidden md:block text-xs font-medium text-slate-600 min-w-[120px]">
                  {a.classLevel?.name || "—"}
                </div>

                {/* Right Section: Status Badge & Actions */}
                <div className="flex items-center justify-between md:justify-end gap-3 mt-1 md:mt-0 pt-3 md:pt-0 border-t border-slate-100 md:border-t-0">
                  <div className="shrink-0 md:order-last md:ml-3">
                    {statusBadge(a.status)}
                  </div>
                  
                  <div className="flex gap-2 shrink-0 flex-wrap justify-end">
                    {a.status === "pending" && (
                      <Button variant="outline" size="sm" className="h-8 text-xs px-3" onClick={() => updateStatus(a.id, "reviewed")} disabled={processing === a.id}>Mark Reviewed</Button>
                    )}
                    {a.status === "reviewed" && (
                      <Button variant="outline" size="sm" className="h-8 text-xs px-3 text-emerald-700 border-emerald-300 hover:bg-emerald-50" onClick={() => acceptAndGenerate(a.id)} disabled={processing === a.id}>Accept</Button>
                    )}
                    {a.status === "accepted" && (
                      <Button variant="outline" size="sm" className="h-8 text-xs px-3" onClick={() => { setScheduleExamId(a.id); setExamDate(""); }} disabled={processing === a.id}>
                        <Calendar className="mr-1 h-3 w-3" /> Schedule Exam
                      </Button>
                    )}
                    {a.status === "scheduled_for_exam" && (
                      <Button variant="outline" size="sm" className="h-8 text-xs px-3" onClick={() => updateStatus(a.id, "taken_exam")} disabled={processing === a.id}>
                        <FileEdit className="mr-1 h-3 w-3" /> Mark Taken
                      </Button>
                    )}
                    {a.status === "taken_exam" && (
                      <Button variant="outline" size="sm" className="h-8 text-xs px-3" onClick={() => { setRecordResultId(a.id); setExamScore(""); setExamPassMark(String(a.examPassMark || 50)); }} disabled={processing === a.id}>
                        <CheckCircle2 className="mr-1 h-3 w-3" /> Record Result
                      </Button>
                    )}
                    {(a.status === "passed_exam" || a.status === "accepted") && (
                      <Button variant="outline" size="sm" className="h-8 text-xs px-3 text-emerald-700 border-emerald-300 hover:bg-emerald-50" onClick={() => updateStatus(a.id, "enrolled")} disabled={processing === a.id}>Enroll</Button>
                    )}
                    {["pending", "reviewed", "accepted", "scheduled_for_exam", "taken_exam"].includes(a.status) && (
                      <Button variant="outline" size="sm" className="h-8 text-xs px-3 text-rose-700 border-rose-300 hover:bg-rose-50" onClick={() => updateStatus(a.id, "rejected")} disabled={processing === a.id}>Reject</Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>Application Details</DialogTitle><DialogDescription className="sr-only">Full details of the selected admission application.</DialogDescription></DialogHeader>
            {selected && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><p className="text-xs text-slate-500">Name</p><p className="font-medium">{selected.firstName} {selected.lastName}</p></div>
                  <div><p className="text-xs text-slate-500">Status</p>{statusBadge(selected.status)}</div>
                  <div><p className="text-xs text-slate-500">Email</p><p>{selected.email}</p></div>
                  <div><p className="text-xs text-slate-500">Phone</p><p>{selected.phone}</p></div>
                  <div><p className="text-xs text-slate-500">Gender</p><p>{selected.gender || "—"}</p></div>
                  <div><p className="text-xs text-slate-500">Fee Paid</p><p>{selected.feePaid ? "Yes" : "No"}</p></div>
                  <div><p className="text-xs text-slate-500">Class</p><p>{selected.classLevel?.name || "—"}</p></div>
                  <div><p className="text-xs text-slate-500">Date of Birth</p><p>{selected.dateOfBirth ? new Date(selected.dateOfBirth).toLocaleDateString() : "—"}</p></div>
                  <div className="col-span-2"><p className="text-xs text-slate-500">Previous School</p><p>{selected.previousSchool || "—"}</p></div>
                  {selected.examDate && <div><p className="text-xs text-slate-500">Exam Date</p><p>{new Date(selected.examDate).toLocaleDateString()}</p></div>}
                  {selected.examScore !== null && selected.examScore !== undefined && <div><p className="text-xs text-slate-500">Exam Score</p><p>{selected.examScore} / {selected.examPassMark || 50}</p></div>}
                  <div className="col-span-2"><p className="text-xs text-slate-500">Submitted</p><p>{new Date(selected.createdAt).toLocaleString()}</p></div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Schedule Exam Dialog */}
        <Dialog open={!!scheduleExamId} onOpenChange={() => setScheduleExamId(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Schedule Entrance Exam</DialogTitle>
              <DialogDescription>Set the date and time for the entrance examination.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="examDate">Exam Date & Time</Label>
                <Input
                  id="examDate"
                  type="datetime-local"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setScheduleExamId(null)}>Cancel</Button>
                <Button
                  onClick={async () => {
                    if (!scheduleExamId || !examDate || !currentOrg) return;
                    setScheduling(true);
                    try {
                      await apiFetch(`/admissions/admin/${currentOrg.slug}/${scheduleExamId}/schedule-exam`, {
                        method: "PUT",
                        body: JSON.stringify({ examDate }),
                      });
                      toast.success("Exam scheduled");
                      setScheduleExamId(null);
                      fetchAdmissions();
                    } catch { toast.error("Failed to schedule exam"); }
                    finally { setScheduling(false); }
                  }}
                  disabled={scheduling || !examDate}
                >
                  {scheduling ? "Scheduling..." : "Schedule Exam"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Record Exam Result Dialog */}
        <Dialog open={!!recordResultId} onOpenChange={() => setRecordResultId(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Record Entrance Exam Result</DialogTitle>
              <DialogDescription>Enter the student's score. Scores below the pass mark will reject the application.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="examScore">Score</Label>
                <Input
                  id="examScore"
                  type="number"
                  min="0"
                  max="100"
                  placeholder="e.g. 65"
                  value={examScore}
                  onChange={(e) => setExamScore(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="examPassMark">Pass Mark</Label>
                <Input
                  id="examPassMark"
                  type="number"
                  min="0"
                  max="100"
                  value={examPassMark}
                  onChange={(e) => setExamPassMark(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setRecordResultId(null)}>Cancel</Button>
                <Button
                  onClick={async () => {
                    if (!recordResultId || examScore === "" || !currentOrg) return;
                    setRecording(true);
                    try {
                      const res = await apiFetch<any>(`/admissions/admin/${currentOrg.slug}/${recordResultId}/exam-result`, {
                        method: "PUT",
                        body: JSON.stringify({
                          examScore: parseInt(examScore),
                          examPassMark: parseInt(examPassMark),
                        }),
                      });
                      const passed = res.data?.passed ?? examScore >= examPassMark;
                      toast.success(passed ? "Student passed the entrance exam" : "Student did not pass");
                      setRecordResultId(null);
                      fetchAdmissions();
                    } catch { toast.error("Failed to record result"); }
                    finally { setRecording(false); }
                  }}
                  disabled={recording || examScore === ""}
                >
                  {recording ? "Recording..." : "Submit Result"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
