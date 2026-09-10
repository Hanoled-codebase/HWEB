"use client";

import { useState, useEffect, useCallback } from "react";
import { useOrganization } from "@/hooks/useOrganization";
import { usePermissions } from "@/hooks/usePermissions";
import { apiFetch, isForbiddenError } from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Clock, RefreshCcw, CheckCircle2, XCircle, AlertTriangle,
  ChevronLeft, ChevronRight, Users, Loader2, Save,
} from "lucide-react";

type StaffRecord = {
  id: string;
  memberId: string;
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  status: string;
  notes: string | null;
  member: {
    id: string;
    role: string;
    user: { name: string; email: string };
  };
  markedBy: { id: string; user: { name: string } } | null;
};

type MemberSummary = {
  id: string;
  role: string;
  user: { name: string; email: string };
  staffAttendanceMember: StaffRecord[];
};

type ApiResponse<T> = { success: boolean; data: T; date?: string };

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  present: { label: "Present", color: "text-emerald-700", bg: "bg-emerald-100", icon: <CheckCircle2 className="h-3 w-3" /> },
  absent: { label: "Absent", color: "text-red-700", bg: "bg-red-100", icon: <XCircle className="h-3 w-3" /> },
  late: { label: "Late", color: "text-amber-700", bg: "bg-amber-100", icon: <AlertTriangle className="h-3 w-3" /> },
  "half-day": { label: "Half Day", color: "text-blue-700", bg: "bg-blue-100", icon: <Clock className="h-3 w-3" /> },
  "on-leave": { label: "On Leave", color: "text-purple-700", bg: "bg-purple-100", icon: <ChevronRight className="h-3 w-3" /> },
};

function todayString() {
  return new Date().toISOString().split("T")[0];
}

export default function StaffAttendancePage() {
  const { currentOrg } = useOrganization();
  const { can, isPrivileged } = usePermissions();
  const canManageStaffAttendance = can("attendance.mark") || isPrivileged;
  const [dateStr, setDateStr] = useState(todayString());
  const [members, setMembers] = useState<MemberSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMap, setStatusMap] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<StaffRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [tab, setTab] = useState<"mark" | "history">("mark");

  const fetchSummary = useCallback(async () => {
    if (!currentOrg) return;
    setLoading(true);
    try {
      const data = await apiFetch<ApiResponse<MemberSummary[]>>(
        `/staff-attendance/${currentOrg.slug}/summary/${dateStr}`
      );
      if (data.success) {
        setMembers(data.data);
        const initialStatus: Record<string, string> = {};
        data.data.forEach((m: MemberSummary) => {
          if (m.staffAttendanceMember.length > 0) {
            initialStatus[m.id] = m.staffAttendanceMember[0].status;
          } else {
            initialStatus[m.id] = "present";
          }
        });
        setStatusMap(initialStatus);
      }
    } catch (error) {
      toast.error(isForbiddenError(error) ? "You don't have access to staff attendance here" : "Failed to load staff list");
    } finally {
      setLoading(false);
    }
  }, [currentOrg, dateStr]);

  const fetchHistory = useCallback(async () => {
    if (!currentOrg) return;
    setHistoryLoading(true);
    try {
      const data = await apiFetch<ApiResponse<StaffRecord[]>>(`/staff-attendance/${currentOrg.slug}`);
      if (data.success) setHistory(data.data);
    } catch (error) {
      toast.error(isForbiddenError(error) ? "You don't have access to attendance history here" : "Failed to load history");
    } finally {
      setHistoryLoading(false);
    }
  }, [currentOrg]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    if (tab === "history") fetchHistory();
  }, [tab, fetchHistory]);

  const handleBulkSave = async () => {
    if (!currentOrg) return;
    setSaving(true);
    try {
      const records = members.map((m) => ({
        memberId: m.id,
        status: statusMap[m.id] || "present",
      }));
      const data = await apiFetch<{ success: boolean; count?: number; error?: { message: string } }>(
        `/staff-attendance/${currentOrg.slug}/bulk`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date: dateStr, records }),
        }
      );
      if (data.success) {
        toast.success(`Saved attendance for ${data.count ?? members.length} staff`);
        fetchSummary();
      } else {
        toast.error(data.error?.message || "Failed to save");
      }
    } catch {
      toast.error("Failed to save attendance");
    } finally {
      setSaving(false);
    }
  };

  const shiftDate = (dir: number) => {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + dir);
    setDateStr(d.toISOString().split("T")[0]);
  };

  const stats = {
    present: Object.values(statusMap).filter((s) => s === "present").length,
    absent: Object.values(statusMap).filter((s) => s === "absent").length,
    late: Object.values(statusMap).filter((s) => s === "late").length,
    leave: Object.values(statusMap).filter((s) => s === "on-leave").length,
  };

  const historyGrouped = history.reduce<Record<string, StaffRecord[]>>((acc, r) => {
    const d = r.date.split("T")[0];
    if (!acc[d]) acc[d] = [];
    acc[d].push(r);
    return acc;
  }, {});

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Clock className="h-6 w-6 text-blue-600" />
            Staff Attendance
          </h1>
          <p className="text-sm text-slate-500 mt-1">Track daily staff presence and punctuality</p>
        </div>
        {/* Tab Switcher */}
        <div className="flex rounded-lg border overflow-hidden">
          <button
            className={`px-4 py-2 text-sm font-medium transition-colors ${tab === "mark" ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
            onClick={() => setTab("mark")}
          >
            Mark Attendance
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium transition-colors ${tab === "history" ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
            onClick={() => setTab("history")}
          >
            History
          </button>
        </div>
      </div>

      {tab === "mark" && (
        <>
          {/* Date Navigator */}
          <div className="flex items-center gap-3 flex-wrap">
            <Button variant="outline" size="icon" onClick={() => shiftDate(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Input
              type="date"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="w-44"
            />
            <Button variant="outline" size="icon" onClick={() => shiftDate(1)} disabled={dateStr >= todayString()}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={fetchSummary} disabled={loading}>
              <RefreshCcw className="h-4 w-4 mr-1" />
              Reload
            </Button>
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white ml-auto"
              onClick={handleBulkSave}
              disabled={saving || members.length === 0 || !canManageStaffAttendance}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save Attendance
            </Button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Present", val: stats.present, color: "text-emerald-700", bg: "bg-emerald-50" },
              { label: "Absent", val: stats.absent, color: "text-red-700", bg: "bg-red-50" },
              { label: "Late", val: stats.late, color: "text-amber-700", bg: "bg-amber-50" },
              { label: "On Leave", val: stats.leave, color: "text-purple-700", bg: "bg-purple-50" },
            ].map((s) => (
              <Card key={s.label} className={`${s.bg} border-0 shadow-sm`}>
                <CardContent className="p-3 text-center">
                  <p className={`text-xl font-bold ${s.color}`}>{s.val}</p>
                  <p className="text-xs text-slate-500">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Staff List */}
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No staff members found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {members.map((m) => {
                const status = statusMap[m.id] || "present";
                const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.present;
                return (
                  <div
                    key={m.id}
                    className="flex items-center gap-2 sm:gap-4 p-3 bg-white rounded-xl border border-slate-200 hover:border-blue-300 transition-colors"
                  >
                    <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-blue-700">
                        {m.user.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 text-sm truncate">{m.user.name}</p>
                      <p className="text-xs text-slate-500 capitalize">{m.role}</p>
                    </div>
                    <Select
                      value={statusMap[m.id] || "present"}
                      disabled={!canManageStaffAttendance}
                      onValueChange={(val) => {
                          const next: Record<string, string> = Object.assign({}, statusMap) as Record<string, string>;
                          next[m.id] = String(val);
                          setStatusMap(next);
                        }}
                    >
                      <SelectTrigger className={`w-28 sm:w-36 h-8 text-xs font-medium ${cfg.bg} ${cfg.color} border-0 rounded-lg`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_CONFIG).map(([val, sc]) => (
                          <SelectItem key={val} value={val}>
                            <span className="flex items-center gap-2">
                              {sc.icon} {sc.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === "history" && (
        <>
          {historyLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
            </div>
          ) : Object.keys(historyGrouped).length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Clock className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No attendance records yet</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(historyGrouped)
                .sort((a, b) => b[0].localeCompare(a[0]))
                .slice(0, 30)
                .map(([date, recs]) => {
                  const presentCount = recs.filter((r) => r.status === "present").length;
                  const total = recs.length;
                  return (
                    <div key={date}>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-slate-700">
                          {format(new Date(date), "EEEE, dd MMMM yyyy")}
                        </h3>
                        <span className="text-xs text-slate-500">{presentCount}/{total} present</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                        {recs.map((r) => {
                          const cfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.present;
                          return (
                            <div key={r.id} className={`flex items-center gap-2 p-2 rounded-lg ${cfg.bg}`}>
                              <span className={cfg.color}>{cfg.icon}</span>
                              <div className="min-w-0">
                                <p className={`text-xs font-medium truncate ${cfg.color}`}>
                                  {r.member.user.name}
                                </p>
                                <p className={`text-xs ${cfg.color} opacity-70`}>{cfg.label}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
