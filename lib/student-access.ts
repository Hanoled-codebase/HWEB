export type StudentNavPath =
  | ""
  | "/student/homework"
  | "/student/scheme-of-work"
  | "/student/results"
  | "/student/results/transcript"
  | "/student/pending"
  | "/student/timetable"
  | "/student/library"
  | "/student/invoices";

export const ALLOWED_STUDENT_SUBPATHS: readonly string[] = [
  "",
  "/student/homework",
  "/student/scheme-of-work",
  "/student/results",
  "/student/results/transcript",
  "/student/pending",
  "/student/timetable",
  "/student/library",
  "/student/invoices",
];

const ALLOWED_STUDENT_SET = new Set(ALLOWED_STUDENT_SUBPATHS);

/** Strip query/hash and trailing slash; extract subpath relative to `/dashboard/school/<slug>`. */
export function extractSchoolSubpath(pathname: string | null | undefined, slug: string): string | null {
  if (!pathname || !slug) return null;
  const cleanPath = pathname.split(/[?#]/)[0].replace(/\/+$/, "");
  const base = `/dashboard/school/${encodeURIComponent(slug)}`.replace(/\/+$/, "");
  const rawBase = `/dashboard/school/${slug}`.replace(/\/+$/, "");

  const prefix =
    cleanPath === rawBase || cleanPath.startsWith(`${rawBase}/`)
      ? rawBase
      : cleanPath === base || cleanPath.startsWith(`${base}/`)
        ? base
        : null;

  if (!prefix) return null;
  const rest = cleanPath.slice(prefix.length);
  return rest === "" ? "" : rest;
}

/** True only when the subpath belongs to a student-permitted HSMS feature. */
export function isAllowedStudentSubpath(subpath: string | null | undefined): boolean {
  if (subpath === null || subpath === undefined) return false;
  const normalized = subpath === "/" ? "" : subpath.replace(/\/+$/, "");
  return ALLOWED_STUDENT_SET.has(normalized);
}

