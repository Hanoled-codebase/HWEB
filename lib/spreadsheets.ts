export type SpreadsheetStatus = "pending" | "active" | "inactive";

export type SpreadsheetQuestion = {
  text: string;
  options?: string[];
  correctAnswer?: string;
  score?: number;
};

export type SpreadsheetAssessment = {
  name: string;
  total?: number;
  questions?: SpreadsheetQuestion[];
};

export type SpreadsheetStudent = {
  id?: string;
  firstName?: string;
  lastName?: string;
  admissionNumber?: string;
};

export type SpreadsheetRow = {
  student: SpreadsheetStudent;
  values: Array<string | number | null>;
};

export type SpreadsheetDetail = {
  id: string;
  title?: string | null;
  status: SpreadsheetStatus;
  classLevel?: { name?: string | null } | null;
  subject?: { name?: string | null } | null;
  assessments?: SpreadsheetAssessment[];
  columns?: string[];
  data?: SpreadsheetRow[];
};

type SpreadsheetIdentity = {
  title?: string | null;
  classLevel?: { name?: string | null } | null;
  subject?: { name?: string | null } | null;
};

export type DisplayAssessment = SpreadsheetAssessment & {
  originalIndex: number;
};

export function parseRouteParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] || "";
  }

  return value || "";
}

export function parseIntegerParam(
  value: string | string[] | undefined,
  fallback = 0,
) {
  const parsedValue = Number.parseInt(parseRouteParam(value), 10);
  return Number.isFinite(parsedValue) ? parsedValue : fallback;
}

export function cloneRows(rows: SpreadsheetRow[] | undefined) {
  return (rows || []).map((row) => ({
    student: { ...row.student },
    values: Array.isArray(row.values) ? [...row.values] : [],
  }));
}

export function getErrorMessage(error: unknown, fallback: string) {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return fallback;
}

export function getSpreadsheetLabel(spreadsheet: SpreadsheetIdentity) {
  const subjectName = spreadsheet.subject?.name?.trim() || "";
  const className = spreadsheet.classLevel?.name?.trim() || "";
  const title = spreadsheet.title?.trim() || "";

  if (subjectName && className) {
    return `${subjectName} - ${className}`;
  }

  return subjectName || className || title || "Spreadsheet";
}

export function getOrderedAssessments(
  assessments: SpreadsheetAssessment[],
): DisplayAssessment[] {
  const entries = assessments.map((assessment, originalIndex) => ({
    ...assessment,
    originalIndex,
  }));

  const nonExamEntries = entries.filter(
    (assessment) => assessment.name.trim().toLowerCase() !== "exam",
  );
  const examEntries = entries.filter(
    (assessment) => assessment.name.trim().toLowerCase() === "exam",
  );

  return [...nonExamEntries, ...examEntries];
}

export function toNumericValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

export function clampAssessmentScore(
  value: string | number | null | undefined,
  total: number | undefined,
) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return "";
  }

  const maxScore =
    typeof total === "number" && Number.isFinite(total) ? total : undefined;
  const boundedValue = Math.max(
    0,
    maxScore === undefined ? numericValue : Math.min(numericValue, maxScore),
  );

  return Number.isInteger(boundedValue)
    ? boundedValue
    : Number(boundedValue.toFixed(2));
}

export function sanitizeSpreadsheetRows(
  rows: SpreadsheetRow[] | undefined,
  assessments: SpreadsheetAssessment[],
) {
  return (rows || []).map((row) => ({
    student: { ...row.student },
    values: Array.isArray(row.values)
      ? row.values.map((value, index) =>
          clampAssessmentScore(value, assessments[index]?.total),
        )
      : [],
  }));
}

export function formatScore(value: number) {
  if (Number.isInteger(value)) {
    return String(value);
  }

  return value.toFixed(2).replace(/\.?0+$/, "");
}

export function calculateRowTotal(values: Array<string | number | null>): number {
  return values.reduce((sum: number, value) => sum + (toNumericValue(value) || 0), 0);
}

export function getStudentName(student: SpreadsheetStudent) {
  const raw = `${student.firstName || ""} ${student.lastName || ""}`.trim();
  return raw
    ? raw
        .split(" ")
        .map((n) => (n ? n.charAt(0).toUpperCase() + n.slice(1).toLowerCase() : n))
        .join(" ")
    : "Unnamed Student";
}

export function getStatusClassName(status: SpreadsheetStatus) {
  switch (status) {
    case "active":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "pending":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "inactive":
      return "border-slate-200 bg-slate-100 text-slate-700";
    default:
      return "border-slate-200 bg-slate-100 text-slate-700";
  }
}

import { toTitleCase } from "@/lib/utils";

export function getDisplayName(name: string | undefined) {
  if (!name) {
    return "Teacher";
  }

  return toTitleCase(name.split(" ")[0] || name);
}

export function getInitials(name: string | undefined) {
  if (!name) {
    return "T";
  }

  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}
