"use client";

import { useState, useEffect } from "react";
import { useOrganization } from "@/hooks/useOrganization";
import { usePermissions } from "@/hooks/usePermissions";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Loader2,
  CalendarDays,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  HelpCircle,
  ClipboardCheck,
  Fingerprint,
  ShoppingBag,
} from "lucide-react";

type Status = "present" | "absent" | "late" | "excused";

type ClassOption = {
  id: string;
  name: string;
  level?: string;
};

type StudentRecord = {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber?: string;
  profileImage?: string;
  classLevel?: { id: string; name?: string | null } | null;
};

type AttendanceRecord = {
  id: string;
  studentId: string;
  date: string;
  status: Status;
  notes?: string | null;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    admissionNumber?: string;
    profileImage?: string;
  };
  markedBy?: {
    id: string;
    user: { name?: string; email?: string };
  };
};

type AttendanceEntry = {
  studentId: string;
  status: Status;
  notes?: string;
};

type AttendanceResponse = {
  message: string;
  count: number;
  records: AttendanceRecord[];
};

const STATUS_OPTIONS: { value: Status; label: string; icon: typeof CheckCircle2; color: string; bgColor: string; hoverColor: string }[] = [
  {
    value: "present",
    label: "Present",
    icon: CheckCircle2,
    color: "text-green-700 border-green-300 bg-green-50",
    bgColor: "bg-green-100 text-green-800 border-green-200",
    hoverColor: "hover:bg-green-50 hover:border-green-300 hover:text-green-700",
  },
  {
    value: "absent",
    label: "Absent",
    icon: XCircle,
    color: "text-red-700 border-red-300 bg-red-50",
    bgColor: "bg-red-100 text-red-800 border-red-200",
    hoverColor: "hover:bg-red-50 hover:border-red-300 hover:text-red-700",
  },
  {
    value: "late",
    label: "Late",
    icon: Clock,
    color: "text-amber-700 border-amber-300 bg-amber-50",
    bgColor: "bg-amber-100 text-amber-800 border-amber-200",
    hoverColor: "hover:bg-amber-50 hover:border-amber-300 hover:text-amber-700",
  },
  {
    value: "excused",
    label: "Excused",
    icon: HelpCircle,
    color: "text-blue-700 border-blue-300 bg-blue-50",
    bgColor: "bg-blue-100 text-blue-800 border-blue-200",
    hoverColor: "hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700",
  },
];

function getTodayString(): string {
  return new Date().toISOString().split("T")[0];
}

function getStudentName(student: { firstName: string; lastName: string }): string {
  return `${student.firstName} ${student.lastName}`;
}

export default function AttendancePage() {
  const { currentOrg } = useOrganization();
  const { can, isTeacher } = usePermissions();
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Map<string, AttendanceRecord>>(new Map());
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [date, setDate] = useState<string>(getTodayString());
  const [isLoadingClasses, setIsLoadingClasses] = useState(true);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const canMark = can("attendance.mark") || isTeacher;

  useEffect(() => {
    async function fetchClasses() {
      if (!currentOrg) return;
      try {
        setIsLoadingClasses(true);
        const data = await apiFetch<ClassOption[]>(`/classes/${currentOrg.slug}`);
        setClasses(data);
      } catch {
        toast.error("Failed to load classes");
      } finally {
        setIsLoadingClasses(false);
      }
    }
    fetchClasses();
  }, [currentOrg]);

  useEffect(() => {
    const org = currentOrg;
    if (!selectedClassId || !org || !date) {
      setStudents([]);
      setAttendanceMap(new Map());
      setHasLoaded(false);
      return;
    }

    async function fetchData() {
      try {
        setIsLoadingStudents(true);
        setHasLoaded(false);

        const [studentsData, attendanceData] = await Promise.all([
          apiFetch<StudentRecord[]>(
            `/students/${org?.slug}?classLevelId=${selectedClassId}`,
          ),
          apiFetch<{ records: AttendanceRecord[] }>(
            `/attendance/${org?.slug}/class/${selectedClassId}?date=${date}`,
          ),
        ]);

        setStudents(studentsData);
        const map = new Map<string, AttendanceRecord>();
        attendanceData.records.forEach((r) => {
          map.set(r.studentId, r);
        });
        setAttendanceMap(map);
      } catch {
        toast.error("Failed to load attendance data");
      } finally {
        setIsLoadingStudents(false);
        setHasLoaded(true);
      }
    }

    fetchData();
  }, [selectedClassId, date, currentOrg]);

  function getStudentStatus(studentId: string): Status {
    return attendanceMap.get(studentId)?.status || "present";
  }

  function setStudentStatus(studentId: string, status: Status) {
    setAttendanceMap((prev) => {
      const next = new Map(prev);
      const existing = next.get(studentId);
      if (existing) {
        next.set(studentId, { ...existing, status });
      } else {
        const student = students.find((s) => s.id === studentId);
        if (!student) return prev;
        next.set(studentId, {
          id: "",
          studentId,
          date,
          status,
          student: {
            id: studentId,
            firstName: student.firstName,
            lastName: student.lastName,
            admissionNumber: student.admissionNumber,
            profileImage: student.profileImage,
          },
        });
      }
      return next;
    });
  }

  async function handleMarkAttendance() {
    if (!currentOrg || !selectedClassId) return;

    if (students.length === 0) {
      toast.error("No students to mark attendance for");
      return;
    }

    setIsSaving(true);
    try {
      const records: AttendanceEntry[] = students.map((s) => ({
        studentId: s.id,
        status: getStudentStatus(s.id),
      }));

      const result = await apiFetch<AttendanceResponse>(
        `/attendance/${currentOrg.slug}/mark`,
        {
          method: "POST",
          body: JSON.stringify({
            date,
            classLevelId: selectedClassId,
            records,
          }),
        },
      );

      toast.success(
        `Attendance marked for ${result.count} student${result.count !== 1 ? "s" : ""}`,
      );
    } catch {
      // apiFetch already shows toast error
    } finally {
      setIsSaving(false);
    }
  }

  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const statusSummary = {
    present: students.filter((s) => getStudentStatus(s.id) === "present").length,
    absent: students.filter((s) => getStudentStatus(s.id) === "absent").length,
    late: students.filter((s) => getStudentStatus(s.id) === "late").length,
    excused: students.filter((s) => getStudentStatus(s.id) === "excused").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Attendance
          </h1>
          <p className="text-slate-500">
            Mark and manage student attendance records.
          </p>
        </div>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 space-y-1.5">
              <label className="text-sm font-medium text-slate-700">
                Class
              </label>
              {isLoadingClasses ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                  <Select
                    value={selectedClassId}
                    onValueChange={(v) => setSelectedClassId(v as string)}
                  >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select a class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id} className="capitalize">
                        {cls.level ? `${cls.name} (${cls.level})` : cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="flex-1 space-y-1.5">
              <label className="text-sm font-medium text-slate-700">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                max={getTodayString()}
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <div className="flex items-end">
              {canMark && selectedClassId && students.length > 0 && (
                <Button
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={handleMarkAttendance}
                  disabled={isSaving || isLoadingStudents}
                >
                  {isSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ClipboardCheck className="mr-2 h-4 w-4" />
                  )}
                  Mark Attendance
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {!selectedClassId ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-slate-300 bg-white p-10 text-center">
          <CalendarDays className="h-10 w-10 text-slate-400" />
          <span className="text-base font-semibold text-slate-700">
            Select a class and date
          </span>
          <span className="text-sm text-slate-400">
            Choose a class from the dropdown above and a date to view or mark attendance.
          </span>
        </div>
      ) : isLoadingStudents ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-20" />
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-20" />
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-20" />
            </div>
          </div>
        </div>
      ) : hasLoaded && students.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-slate-300 bg-white p-10 text-center">
          <Users className="h-10 w-10 text-slate-400" />
          <span className="text-base font-semibold text-slate-700">
            No students found
          </span>
          <span className="text-sm text-slate-400">
            This class has no students assigned yet.
          </span>
        </div>
      ) : (
        <>
          {selectedClass && students.length > 0 && (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-slate-500">
                <Users className="mr-1 inline h-4 w-4" />
                {students.length} student{students.length !== 1 ? "s" : ""}
              </span>
              {STATUS_OPTIONS.map((opt) => {
                const count = statusSummary[opt.value];
                if (count === 0) return null;
                const Icon = opt.icon;
                return (
                  <Badge
                    key={opt.value}
                    variant="outline"
                    className={cn("gap-1 px-2.5 py-1", opt.bgColor)}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {opt.label}: {count}
                  </Badge>
                );
              })}
            </div>
          )}

          <div className="space-y-2">
            {students.map((student) => {
              const currentStatus = getStudentStatus(student.id);
              return (
                <div
                  key={student.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-all"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                      {student.firstName[0]?.toUpperCase() ?? "?"}
                      {student.lastName[0]?.toUpperCase() ?? ""}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800">
                        {getStudentName(student)}
                      </p>
                      {student.admissionNumber && (
                        <p className="truncate text-xs text-slate-400">
                          {student.admissionNumber}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {STATUS_OPTIONS.map((opt) => {
                      const Icon = opt.icon;
                      const isActive = currentStatus === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => canMark && setStudentStatus(student.id, opt.value)}
                          disabled={!canMark}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-all",
                            isActive
                              ? opt.color
                              : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:border-slate-300",
                            !canMark && "cursor-default opacity-80",
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {opt.label}
                        </button>
                      );
                    })}
                    {attendanceMap.get(student.id)?.id && (
                      <Badge
                        variant="outline"
                        className="ml-1 border-slate-200 text-slate-400 text-[11px]"
                      >
                        Saved
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {canMark && students.length > 0 && (
            <div className="flex justify-end pt-2">
              <Button
                className="bg-blue-600 hover:bg-blue-700"
                onClick={handleMarkAttendance}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ClipboardCheck className="mr-2 h-4 w-4" />
                )}
                Mark Attendance
              </Button>
            </div>
          )}
        </>
      )}

      {/* ── Biometric attendance upsell ───────────────────────────── */}
      <Card className="border-blue-100/60 bg-gradient-to-br from-blue-50/40 to-white shadow-sm">
        <CardContent className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:p-8">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-blue-100">
            <Fingerprint className="h-8 w-8 text-blue-600" />
          </div>
          <div className="min-w-0 flex-1 space-y-1.5">
            <h3 className="text-lg font-bold text-slate-900">
              Biometric Attendance — Clock In & Clock Out
            </h3>
            <p className="text-sm leading-6 text-slate-500">
              Manual attendance marking works, but a biometric system eliminates
              buddy-punching, tracks clock-in/clock-out times automatically, and
              syncs directly with Hanoled. Parents get real-time arrival
              notifications and you get tamper-proof attendance logs for
              compliance.
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Real-time clock-in / clock-out
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Tamper-proof logs
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Parent arrival alerts
              </div>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            className="shrink-0 border-blue-200 bg-white text-blue-700 hover:bg-blue-50 hover:border-blue-300"
            onClick={() =>
              window.open("mailto:sales@hanoled.com?subject=Biometric Attendance Inquiry", "_blank")
            }
          >
            <ShoppingBag className="mr-2 h-4 w-4" />
            Purchase Biometric System
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
