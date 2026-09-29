import { apiFetch } from "@/lib/api";

/** Shapes returned by the student register endpoints (Hanoled backend, routes/attendance.js). */

export type AttendanceStatus = "present" | "absent" | "late" | "excused";

export type Tally = { present: number; absent: number; late: number; excused: number; total: number };

export type MyClasses = {
  date: string;
  canTakeAnyRegister: boolean;
  /** Classes whose register this person takes. */
  register: Array<{ classLevelId: string; className: string; students: number; taken: Tally }>;
  /** Class + subject pairs they may only look at. */
  subjects: Array<{
    classLevelId: string;
    className: string;
    subjectId: string;
    subjectName: string;
    students: number;
    classTeachers: string[];
  }>;
};

export type SubjectAttendance = {
  date: string;
  classLevel: { id: string; name: string };
  subject: { id: string; name: string };
  classTeachers: string[];
  offeringFrom: "sheet" | "class";
  registerTaken: boolean;
  students: Array<{
    id: string;
    firstName: string;
    lastName: string;
    admissionNumber: string | null;
    status: AttendanceStatus | null;
    notes: string | null;
    last30: Tally;
  }>;
};

export type RegisterRecord = {
  id: string;
  studentId: string;
  status: AttendanceStatus;
  notes?: string | null;
  updatedAt?: string;
  markedBy?: { user?: { name?: string } };
};

export type RegisterStudent = { id: string; firstName: string; lastName: string; admissionNumber?: string | null };

export const attendanceQueries = {
  myClasses: (slug: string, date: string) => ({
    queryKey: ["attendance", "mine", slug, date] as const,
    queryFn: () => apiFetch<MyClasses>(`/attendance/${slug}/my-classes`, { params: { date }, showErrorToast: false }),
  }),
  register: (slug: string, classLevelId: string, date: string) => ({
    queryKey: ["attendance", "register", slug, classLevelId, date] as const,
    queryFn: async () => {
      const [students, attendance] = await Promise.all([
        apiFetch<RegisterStudent[]>(`/students/${slug}`, { params: { classLevelId }, showErrorToast: false }),
        apiFetch<{ records: RegisterRecord[] }>(`/attendance/${slug}/class/${classLevelId}`, {
          params: { date },
          showErrorToast: false,
        }),
      ]);
      return { students, records: attendance.records };
    },
  }),
  subject: (slug: string, classLevelId: string, subjectId: string, date: string) => ({
    queryKey: ["attendance", "subject", slug, classLevelId, subjectId, date] as const,
    queryFn: () =>
      apiFetch<SubjectAttendance>(`/attendance/${slug}/subject/${classLevelId}/${subjectId}`, {
        params: { date },
        showErrorToast: false,
      }),
  }),
};

export function saveRegister(
  slug: string,
  body: { date: string; classLevelId: string; records: Array<{ studentId: string; status: AttendanceStatus }> },
) {
  return apiFetch<{ count: number }>(`/attendance/${slug}/mark`, {
    method: "POST",
    body: JSON.stringify(body),
    showErrorToast: false,
  });
}

/** Local calendar day as YYYY-MM-DD (not UTC, so late evening stays "today"). */
export function localDay(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

export function dayLabel(day: string) {
  if (day === localDay()) return "Today";
  return new Date(`${day}T12:00:00`).toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short" });
}

export const STATUS_META: Record<AttendanceStatus, { label: string; short: string; on: string; dot: string }> = {
  present: { label: "Present", short: "P", on: "border-emerald-600 bg-emerald-600 text-white", dot: "bg-emerald-500" },
  absent: { label: "Absent", short: "A", on: "border-red-600 bg-red-600 text-white", dot: "bg-red-500" },
  late: { label: "Late", short: "L", on: "border-amber-500 bg-amber-500 text-slate-900", dot: "bg-amber-500" },
  excused: { label: "Excused", short: "E", on: "border-blue-600 bg-blue-600 text-white", dot: "bg-blue-600" },
};

export const STATUS_ORDER: AttendanceStatus[] = ["present", "absent", "late", "excused"];
