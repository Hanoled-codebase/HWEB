import { apiFetch } from "@/lib/api";

/** Shape of GET /department/:slug/overview (Hanoled backend, routes/department.js). */
export type DepartmentOverview = {
  departments: Array<{ id: string; name: string; subjects: Array<{ id: string; name: string }> }>;
  /** The HOD role is held but no department is linked to it yet. */
  needsDepartment?: boolean;
  term?: string | null;
  academicYear?: string | null;
  notesWindowDays?: number;
  totals?: {
    subjects: number;
    teachers: number;
    classes: number;
    sheetsStarted: number;
    sheetsComplete: number;
    sheetsPublished: number;
    schemes: number;
    recentNotes: number;
  };
  readyToPublish?: Array<{ spreadsheetId: string; subject: string; className: string; teacher: string | null; updatedAt: string }>;
  slots?: Array<{
    memberId: string;
    teacher: string;
    subjectId: string;
    subject: string;
    classLevelId: string;
    className: string;
    sheet: { id: string; completion: number; published: boolean; updatedAt: string } | null;
    hasScheme: boolean;
    recentNotes: number;
  }>;
  teachers?: Array<{
    memberId: string;
    name: string;
    classes: number;
    sheetsComplete: number;
    sheetsMissing: number;
    schemesMissing: number;
    recentNotes: number;
  }>;
};

export type DepartmentSlot = NonNullable<DepartmentOverview["slots"]>[number];
export type DepartmentTeacher = NonNullable<DepartmentOverview["teachers"]>[number];

export const departmentQueries = {
  overview: (slug: string) => ({
    queryKey: ["department", "overview", slug] as const,
    queryFn: () => apiFetch<DepartmentOverview>(`/department/${slug}/overview`, { showErrorToast: false }),
  }),
};

/** Where a teacher's class stands: not started, in progress, complete, published. */
export function sheetStage(sheet: DepartmentSlot["sheet"]) {
  if (!sheet) return "missing" as const;
  if (sheet.published) return "published" as const;
  if (sheet.completion >= 100) return "complete" as const;
  return "started" as const;
}

/** A teacher needs a look when a class has no sheet or no scheme yet. */
export function teacherNeedsAttention(teacher: DepartmentTeacher) {
  return teacher.sheetsMissing > 0 || teacher.schemesMissing > 0;
}
