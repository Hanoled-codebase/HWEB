"use client";

import { useState, useEffect, useCallback } from "react";
import { useOrganization } from "@/hooks/useOrganization";
import { usePermissions } from "@/hooks/usePermissions";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card, CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Stethoscope, Plus, Search, X, CheckCircle2,
  Phone, ArrowUpRight, Loader2, Trash2, RefreshCcw, User, Thermometer,
} from "lucide-react";

type HealthLog = {
  id: string;
  visitDate: string;
  complaint: string;
  temperature: string | null;
  bloodPressure: string | null;
  diagnosis: string | null;
  treatment: string | null;
  drugsGiven: string | null;
  referredOut: boolean;
  parentNotified: boolean;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    admissionNumber: string | null;
    classLevel: { name: string } | null;
  };
  attendedBy: {
    id: string;
    user: { name: string; email: string };
  };
};

type Student = {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string | null;
  classLevel: { name: string } | null;
};

type ApiResponse<T> = { success: boolean; data: T; error?: { message: string } };

const EMPTY_FORM = {
  studentId: "",
  visitDate: new Date().toISOString().slice(0, 16),
  complaint: "",
  temperature: "",
  bloodPressure: "",
  diagnosis: "",
  treatment: "",
  drugsGiven: "",
  referredOut: false,
  parentNotified: false,
};

export default function ClinicPage() {
  const { currentOrg, currentMember } = useOrganization();
  const [logs, setLogs] = useState<HealthLog[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewLog, setViewLog] = useState<HealthLog | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleting, setDeleting] = useState<string | null>(null);

  const { isPrivileged } = usePermissions();

  const fetchLogs = useCallback(async () => {
    if (!currentOrg) return;
    setLoading(true);
    try {
      const data = await apiFetch<ApiResponse<HealthLog[]>>(`/clinic/${currentOrg.slug}`);
      if (data.success) setLogs(data.data);
    } catch {
      toast.error("Failed to load clinic logs");
    } finally {
      setLoading(false);
    }
  }, [currentOrg]);

  const fetchStudents = useCallback(async () => {
    if (!currentOrg) return;
    try {
      const data = await apiFetch<Student[] | { data: Student[] }>(`/students/${currentOrg.slug}`);
      if (Array.isArray(data)) setStudents(data);
      else if ((data as { data: Student[] }).data) setStudents((data as { data: Student[] }).data);
    } catch {
      // silent
    }
  }, [currentOrg]);

  useEffect(() => {
    fetchLogs();
    fetchStudents();
  }, [fetchLogs, fetchStudents]);

  const handleSave = async () => {
    if (!currentOrg) return;
    if (!form.studentId || !form.complaint) {
      toast.error("Student and complaint are required");
      return;
    }
    setSaving(true);
    try {
      const data = await apiFetch<ApiResponse<HealthLog>>(`/clinic/${currentOrg.slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (data.success) {
        toast.success("Clinic log recorded");
        setDialogOpen(false);
        setForm(EMPTY_FORM);
        fetchLogs();
      } else {
        toast.error(data.error?.message || "Failed to save log");
      }
    } catch {
      toast.error("Failed to save log");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!currentOrg) return;
    if (!confirm("Delete this health log?")) return;
    setDeleting(id);
    try {
      const data = await apiFetch<{ success: boolean }>(`/clinic/${currentOrg.slug}/${id}`, { method: "DELETE" });
      if (data.success) {
        toast.success("Log deleted");
        setLogs((prev) => prev.filter((l) => l.id !== id));
        if (viewLog?.id === id) setViewLog(null);
      } else {
        toast.error("Failed to delete");
      }
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeleting(null);
    }
  };

  const filteredLogs = logs.filter((l) => {
    const term = search.toLowerCase();
    const name = `${l.student.firstName} ${l.student.lastName}`.toLowerCase();
    return (
      name.includes(term) ||
      l.complaint.toLowerCase().includes(term) ||
      (l.student.admissionNumber || "").toLowerCase().includes(term)
    );
  });

  const filteredStudents = students.filter((s) => {
    const term = studentSearch.toLowerCase();
    return (
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(term) ||
      (s.admissionNumber || "").toLowerCase().includes(term)
    );
  });

  const stats = {
    total: logs.length,
    today: logs.filter((l) => {
      const d = new Date(l.visitDate);
      const t = new Date();
      return (
        d.getFullYear() === t.getFullYear() &&
        d.getMonth() === t.getMonth() &&
        d.getDate() === t.getDate()
      );
    }).length,
    referred: logs.filter((l) => l.referredOut).length,
    notified: logs.filter((l) => l.parentNotified).length,
  };

  const selectedStudent = students.find((s) => s.id === form.studentId);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Stethoscope className="h-6 w-6 text-emerald-600" />
            Clinic Log
          </h1>
          <p className="text-sm text-slate-500 mt-1">Track student medical visits and health records</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
            <RefreshCcw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => { setForm(EMPTY_FORM); setDialogOpen(true); }}
          >
            <Plus className="h-4 w-4 mr-1" />
            New Visit
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Visits", value: stats.total, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Today", value: stats.today, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Referred Out", value: stats.referred, color: "text-red-600", bg: "bg-red-50" },
          { label: "Parent Notified", value: stats.notified, color: "text-amber-600", bg: "bg-amber-50" },
        ].map((s) => (
          <Card key={s.label} className={`${s.bg} border-0 shadow-sm`}>
            <CardContent className="p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color} mt-1`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          className="pl-9"
          placeholder="Search by student name or complaint..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Log List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Stethoscope className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No clinic logs found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLogs.map((log) => (
            <Card
              key={log.id}
              className="cursor-pointer hover:shadow-md transition-all border-slate-200 hover:border-emerald-300"
              onClick={() => setViewLog(log)}
            >
              <CardContent className="p-4 flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <User className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-900">
                        {log.student.firstName} {log.student.lastName}
                      </p>
                      {log.student.admissionNumber && (
                        <span className="text-xs text-slate-400">#{log.student.admissionNumber}</span>
                      )}
                      {log.student.classLevel && (
                        <Badge variant="outline" className="text-xs">{log.student.classLevel.name}</Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 mt-0.5 line-clamp-1">{log.complaint}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {format(new Date(log.visitDate), "dd MMM yyyy, h:mm a")} · Attended by {log.attendedBy.user.name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {log.referredOut && (
                    <Badge className="bg-red-100 text-red-700 border-0 text-xs">Referred</Badge>
                  )}
                  {log.parentNotified && (
                    <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">
                      <Phone className="h-3 w-3 mr-1" />
                      Notified
                    </Badge>
                  )}
                  <ArrowUpRight className="h-4 w-4 text-slate-400" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* New Visit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-emerald-600" />
              Record Clinic Visit
            </DialogTitle>
            <DialogDescription>Document a student&apos;s medical visit</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* Student selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Student *</label>
              {form.studentId && selectedStudent ? (
                <div className="flex items-center gap-2 p-2 bg-emerald-50 rounded-lg border border-emerald-200">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm text-emerald-800">
                    {selectedStudent.firstName} {selectedStudent.lastName}
                    {selectedStudent.classLevel && ` · ${selectedStudent.classLevel.name}`}
                  </span>
                  <button onClick={() => { setForm((f) => ({ ...f, studentId: "" })); setStudentSearch(""); }} className="ml-auto">
                    <X className="h-4 w-4 text-emerald-600" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      className="pl-9"
                      placeholder="Search student..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                    />
                  </div>
                  {studentSearch && (
                    <div className="border rounded-lg max-h-40 overflow-y-auto divide-y">
                      {filteredStudents.slice(0, 20).map((s) => (
                        <button
                          key={s.id}
                          className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm flex items-center justify-between"
                          onClick={() => { setForm((f) => ({ ...f, studentId: s.id })); setStudentSearch(""); }}
                        >
                          <span>{s.firstName} {s.lastName}</span>
                          <span className="text-xs text-slate-400">
                            {s.classLevel?.name} {s.admissionNumber ? `· #${s.admissionNumber}` : ""}
                          </span>
                        </button>
                      ))}
                      {filteredStudents.length === 0 && (
                        <p className="px-3 py-2 text-sm text-slate-400">No students found</p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Visit Date *</label>
                <Input
                  type="datetime-local"
                  value={form.visitDate}
                  onChange={(e) => setForm((f) => ({ ...f, visitDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
                  <Thermometer className="h-4 w-4" />
                  Temperature (°C)
                </label>
                <Input
                  placeholder="e.g. 37.5"
                  value={form.temperature}
                  onChange={(e) => setForm((f) => ({ ...f, temperature: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Blood Pressure</label>
                <Input
                  placeholder="e.g. 120/80"
                  value={form.bloodPressure}
                  onChange={(e) => setForm((f) => ({ ...f, bloodPressure: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Drugs Given</label>
                <Input
                  placeholder="e.g. Paracetamol 500mg"
                  value={form.drugsGiven}
                  onChange={(e) => setForm((f) => ({ ...f, drugsGiven: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Complaint / Presenting Complaint *</label>
              <Textarea
                placeholder="Describe what the student presented with..."
                rows={2}
                value={form.complaint}
                onChange={(e) => setForm((f) => ({ ...f, complaint: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Diagnosis</label>
              <Textarea
                placeholder="Clinical diagnosis..."
                rows={2}
                value={form.diagnosis}
                onChange={(e) => setForm((f) => ({ ...f, diagnosis: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Treatment / Management</label>
              <Textarea
                placeholder="Treatment given..."
                rows={2}
                value={form.treatment}
                onChange={(e) => setForm((f) => ({ ...f, treatment: e.target.value }))}
              />
            </div>

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded"
                  checked={form.referredOut}
                  onChange={(e) => setForm((f) => ({ ...f, referredOut: e.target.checked }))}
                />
                <span className="text-sm text-slate-700">Referred to hospital</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded"
                  checked={form.parentNotified}
                  onChange={(e) => setForm((f) => ({ ...f, parentNotified: e.target.checked }))}
                />
                <span className="text-sm text-slate-700">Parent notified</span>
              </label>
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">Cancel</Button>
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Record
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Log Dialog */}
      {viewLog && (
        <Dialog open={!!viewLog} onOpenChange={() => setViewLog(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-emerald-600" />
                {viewLog.student.firstName} {viewLog.student.lastName}
              </DialogTitle>
              <DialogDescription>
                {format(new Date(viewLog.visitDate), "dd MMM yyyy, h:mm a")}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-2">
              <div className="flex gap-2 flex-wrap">
                {viewLog.student.classLevel && <Badge variant="outline">{viewLog.student.classLevel.name}</Badge>}
                {viewLog.student.admissionNumber && <Badge variant="outline">#{viewLog.student.admissionNumber}</Badge>}
                {viewLog.referredOut && <Badge className="bg-red-100 text-red-700 border-0">Referred Out</Badge>}
                {viewLog.parentNotified && <Badge className="bg-amber-100 text-amber-700 border-0">Parent Notified</Badge>}
              </div>

              <Separator />

              {([
                { label: "Complaint", value: viewLog.complaint },
                { label: "Temperature", value: viewLog.temperature },
                { label: "Blood Pressure", value: viewLog.bloodPressure },
                { label: "Diagnosis", value: viewLog.diagnosis },
                { label: "Treatment", value: viewLog.treatment },
                { label: "Drugs Given", value: viewLog.drugsGiven },
              ] as { label: string; value: string | null }[]).map(({ label, value }) =>
                value ? (
                  <div key={label}>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</p>
                    <p className="text-sm text-slate-800 mt-1">{value}</p>
                  </div>
                ) : null
              )}

              <Separator />
              <p className="text-xs text-slate-400">Attended by: {viewLog.attendedBy.user.name}</p>

              {isPrivileged && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full"
                  onClick={() => handleDelete(viewLog.id)}
                  disabled={deleting === viewLog.id}
                >
                  {deleting === viewLog.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                  Delete Record
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
