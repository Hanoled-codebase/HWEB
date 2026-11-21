export type SpreadsheetStatus = "pending" | "active" | "inactive";

export type SpreadsheetQuestion = {
  text: string;
  options?: string[];
  correctAnswer?: string;
  score?: number;
};

export type AssessmentCategorySummary = {
  id: string;
  name: string;
  label?: string | null;
  maxMarks: number;
  isSingleInstance?: boolean;
  position?: number;
};

export type CategoryAllocationSummary = {
  categoryId: string;
  name: string;
  label?: string | null;
  maxMarks: number;
  allocatedMarks: number;
  rawMaxTotal?: number;
  remainingMarks: number;
  isSingleInstance: boolean;
  isComplete: boolean;
  isOverAllocated: boolean;
  subAssessmentCount: number;
  position: number;
};

export type SubAssessmentRecord = {
  id: string;
  categoryId: string;
  name: string;
  maxMarks: number;
  isSystemGenerated?: boolean;
  position?: number;
  recordedScoreCount?: number;
};

export type SpreadsheetAssessment = {
  id?: string;
  categoryId?: string;
  categoryName?: string;
  categoryMaxMarks?: number;
  isSingleInstance?: boolean;
  isSystemGenerated?: boolean;
  name: string;
  total?: number;
  maxObtainableScore?: number;
  position?: number;
  recordedScoreCount?: number;
  questions?: SpreadsheetQuestion[];
};

export type StudentCategoryScore = {
  categoryId: string;
  categoryName: string;
  earned: number;
  maxMarks: number;
  allocatedMarks: number;
  enteredCount: number;
  subCount: number;
};

export type StudentRelationalSummary = {
  categoryTotals: StudentCategoryScore[];
  categoryById: Map<string, StudentCategoryScore>;
  overallEarned: number;
  overallMax: number;
  hasAnyScore: boolean;
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
  version?: number;
  assessmentStorageMode?: "LEGACY_JSON" | "RELATIONAL";
  templateId?: string | null;
  template?: {
    id: string;
    name: string;
    assessmentCategories?: AssessmentCategorySummary[];
  } | null;
  assessmentCategories?: AssessmentCategorySummary[];
  categoryAllocations?: CategoryAllocationSummary[];
  subAssessments?: SubAssessmentRecord[];
  academicTerm?: string | null;
  academicYear?: string | null;
  hcoreAssessmentId?: string | null;
  status: SpreadsheetStatus;
  classLevel?: { id?: string; name?: string | null } | null;
  subject?: { id?: string; name?: string | null } | null;
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

  const hasRelationalMetadata = entries.some(
    (entry) => Boolean(entry.categoryId) || entry.isSingleInstance !== undefined,
  );
  if (hasRelationalMetadata) {
    return entries;
  }

  const nonExamEntries = entries.filter(
    (assessment) => assessment.name.trim().toLowerCase() !== "exam",
  );
  const examEntries = entries.filter(
    (assessment) => assessment.name.trim().toLowerCase() === "exam",
  );

  return [...nonExamEntries, ...examEntries];
}

export function resolveSpreadsheetCategories(
  sheet: SpreadsheetDetail | null | undefined,
): AssessmentCategorySummary[] {
  if (!sheet) return [];
  if (Array.isArray(sheet.assessmentCategories) && sheet.assessmentCategories.length > 0) {
    return sheet.assessmentCategories;
  }
  if (
    Array.isArray(sheet.template?.assessmentCategories) &&
    sheet.template.assessmentCategories.length > 0
  ) {
    return sheet.template.assessmentCategories;
  }
  if (Array.isArray(sheet.categoryAllocations) && sheet.categoryAllocations.length > 0) {
    return sheet.categoryAllocations.map((item) => ({
      id: item.categoryId,
      name: item.name,
      label: item.label,
      maxMarks: item.maxMarks,
      isSingleInstance: item.isSingleInstance,
      position: item.position,
    }));
  }
  const derived = new Map<string, AssessmentCategorySummary>();
  for (const item of sheet.assessments || []) {
    if (!item.categoryId || derived.has(item.categoryId)) continue;
    derived.set(item.categoryId, {
      id: item.categoryId,
      name: item.categoryName || item.name,
      maxMarks: Number(item.categoryMaxMarks ?? item.maxObtainableScore ?? item.total ?? 0),
      isSingleInstance: Boolean(item.isSingleInstance),
      position: derived.size,
    });
  }
  return Array.from(derived.values());
}

/**
 * Computes per-category sub-assessment summary in O(C + S) time and O(C) auxiliary space.
 * Non-locked categories accept unlimited sub-assessments with any positive max marks;
 * scores automatically normalize to each parent category's admin-configured maxMarks.
 */
export function computeCategoryAllocationSummary(
  categories: readonly AssessmentCategorySummary[],
  subAssessments: ReadonlyArray<{
    categoryId?: string;
    maxMarks?: number;
    maxObtainableScore?: number;
    total?: number;
  }>,
): CategoryAllocationSummary[] {
  const statsByCategory = new Map<string, { allocatedMarks: number; count: number }>();

  for (const sub of subAssessments) {
    if (!sub.categoryId) continue;
    const prev = statsByCategory.get(sub.categoryId) ?? { allocatedMarks: 0, count: 0 };
    const marks = Number(sub.maxMarks ?? sub.maxObtainableScore ?? sub.total ?? 0);
    statsByCategory.set(sub.categoryId, {
      allocatedMarks: prev.allocatedMarks + (Number.isFinite(marks) ? marks : 0),
      count: prev.count + 1,
    });
  }

  return categories.map((category, index) => {
    const maxMarks = Number(category.maxMarks) || 0;
    const stats = statsByCategory.get(category.id) ?? { allocatedMarks: 0, count: 0 };
    return {
      categoryId: category.id,
      name: category.name,
      label: category.label ?? null,
      maxMarks,
      allocatedMarks: stats.allocatedMarks,
      rawMaxTotal: stats.allocatedMarks,
      remainingMarks: 0,
      isSingleInstance: Boolean(category.isSingleInstance),
      isComplete: stats.count > 0,
      isOverAllocated: false,
      subAssessmentCount: stats.count,
      position: category.position ?? index,
    };
  });
}

export function validateScoreInput(
  raw: string | number | null | undefined,
  maxMarks: number | undefined,
): { valid: boolean; numeric: number | null; error: string | null } {
  if (raw === null || raw === undefined) {
    return { valid: true, numeric: null, error: null };
  }
  const text = typeof raw === "string" ? raw.trim() : String(raw);
  if (text === "") {
    return { valid: true, numeric: null, error: null };
  }
  const numeric = Number(text);
  if (!Number.isFinite(numeric)) {
    return { valid: false, numeric: null, error: "Enter a valid numeric score" };
  }
  if (numeric < 0) {
    return { valid: false, numeric: null, error: "Score cannot be negative" };
  }
  if (typeof maxMarks === "number" && Number.isFinite(maxMarks) && numeric > maxMarks) {
    return { valid: false, numeric: null, error: `Score cannot exceed ${maxMarks}` };
  }
  const rounded = Number.isInteger(numeric) ? numeric : Math.round(numeric * 100) / 100;
  return { valid: true, numeric: rounded, error: null };
}

/**
 * Computes normalized per-category earned totals and overall student score in O(C + A) time.
 * Formula per category C: W_C * (1 / n) * sum(S_i / M_i) — matching backend normalizationEngine.js.
 */
export function computeStudentRelationalTotals(
  categories: readonly AssessmentCategorySummary[],
  assessments: readonly SpreadsheetAssessment[],
  values: ReadonlyArray<string | number | null | undefined>,
): StudentRelationalSummary {
  const categoryById = new Map<string, StudentCategoryScore>();
  const ratioSumsById = new Map<string, number>();

  for (const category of categories) {
    categoryById.set(category.id, {
      categoryId: category.id,
      categoryName: category.name,
      earned: 0,
      maxMarks: Number(category.maxMarks) || 0,
      allocatedMarks: 0,
      enteredCount: 0,
      subCount: 0,
    });
    ratioSumsById.set(category.id, 0);
  }

  let hasAnyScore = false;
  let subMaxFallback = 0;

  for (let index = 0; index < assessments.length; index += 1) {
    const assessment = assessments[index];
    const possible = Number(assessment.maxObtainableScore ?? assessment.total ?? 0);
    const boundedMax = Number.isFinite(possible) ? Math.max(0, possible) : 0;
    subMaxFallback += boundedMax;

    const categoryKey = assessment.categoryId || `__uncategorized_${index}`;
    let entry = categoryById.get(categoryKey);
    if (!entry) {
      entry = {
        categoryId: categoryKey,
        categoryName: assessment.categoryName || assessment.name,
        earned: 0,
        maxMarks: Number(assessment.categoryMaxMarks ?? boundedMax) || 0,
        allocatedMarks: 0,
        enteredCount: 0,
        subCount: 0,
      };
      categoryById.set(categoryKey, entry);
      ratioSumsById.set(categoryKey, 0);
    }

    entry.allocatedMarks += boundedMax;
    entry.subCount += 1;

    const score = toNumericValue(values[index]);
    if (score !== null) {
      hasAnyScore = true;
      entry.enteredCount += 1;
      const boundedScore = Math.min(boundedMax, Math.max(0, score));
      if (boundedMax > 0) {
        ratioSumsById.set(
          categoryKey,
          (ratioSumsById.get(categoryKey) ?? 0) + boundedScore / boundedMax,
        );
      }
    }
  }

  for (const [categoryKey, entry] of categoryById.entries()) {
    if (entry.subCount > 0 && entry.allocatedMarks > 0) {
      const avgRatio = (ratioSumsById.get(categoryKey) ?? 0) / entry.subCount;
      entry.earned = Math.round(avgRatio * entry.maxMarks * 100) / 100;
    } else {
      entry.earned = 0;
    }
  }

  const categoryTotals = Array.from(categoryById.values());
  const overallEarned = Math.round(
    categoryTotals.reduce((sum, item) => sum + item.earned, 0) * 100,
  ) / 100;
  const categoryMaxSum = categoryTotals.reduce((sum, item) => sum + item.maxMarks, 0);
  const overallMax = categoryMaxSum > 0 ? categoryMaxSum : subMaxFallback;

  return {
    categoryTotals,
    categoryById,
    overallEarned,
    overallMax,
    hasAnyScore,
  };
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
          clampAssessmentScore(
            value,
            assessments[index]?.maxObtainableScore ?? assessments[index]?.total,
          ),
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
import { greetingName } from "@/lib/greeting-name";

export function getDisplayName(name: string | undefined) {
  if (!name) {
    return "Teacher";
  }

  return toTitleCase(greetingName(name) || name);
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
