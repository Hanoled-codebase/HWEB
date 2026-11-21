/**
 * Shared validation + warning logic for class result templates.
 *
 * Used by the template dialog (to mirror the backend's zod rules before
 * saving) and by unit tests, so the UI and the API can never drift apart
 * silently. The backend schema lives in
 * Hanoled/backend/src/routes/result-templates.js.
 */

export type TemplateMetricInput = {
  name: string;
  label?: string;
  weight: number | string;
  maxMarks?: number | string;
  isSingleInstance?: boolean;
  stage?: "MID_TERM" | "END_OF_TERM";
  kind?: string;
  assessmentTitle?: string;
};

export type GradeLevelInput = { grade: string; min: number | string; max: number | string };

export const ASSESSMENT_KINDS = [
  "QUIZ",
  "ASSIGNMENT",
  "TEST",
  "EXAM",
  "PRACTICAL",
  "PROJECT",
  "EXTERNAL",
] as const;

export type AssessmentKind = (typeof ASSESSMENT_KINDS)[number];

/** The stage a metric belongs to; metrics without a stage read as end-of-term (legacy). */
export function metricStage(metric: TemplateMetricInput): "MID_TERM" | "END_OF_TERM" {
  return metric.stage === "MID_TERM" ? "MID_TERM" : "END_OF_TERM";
}

/**
 * Mirrors the backend's stage bookkeeping: each used stage's weights must
 * total exactly 100, and a mid-term share only makes sense when at least one
 * component is assigned to the mid-term stage (and vice versa). Returns an
 * error message, or null when the form is valid.
 */
export function validateTemplateForm(input: {
  metrics: TemplateMetricInput[];
  gradeScale: GradeLevelInput[];
  midTermTotal: number | string;
}): string | null {
  const metrics = input.metrics || [];
  const midTermTotal = Number(input.midTermTotal) || 0;

  if (metrics.length === 0) {
    return "Add at least one assessment category";
  }

  const seenNames = new Set<string>();
  for (const metric of metrics) {
    const trimmedName = metric.name.trim();
    if (!trimmedName) {
      return "Every component needs an internal name (e.g. CA 1)";
    }
    const normalizedName = trimmedName.toLowerCase();
    if (seenNames.has(normalizedName)) {
      return `Duplicate category name "${trimmedName}". Category names must be unique.`;
    }
    seenNames.add(normalizedName);

    const rawMarks = metric.maxMarks ?? metric.weight;
    const weight = Number(rawMarks);
    if (!Number.isFinite(weight) || !Number.isInteger(weight) || weight <= 0 || weight > 100) {
      return `Component "${trimmedName}" maximum marks must be a positive whole number between 1 and 100`;
    }
    if (metric.kind && !(ASSESSMENT_KINDS as readonly string[]).includes(metric.kind)) {
      return `Component "${trimmedName}" has an unknown assessment kind`;
    }
    if (metric.assessmentTitle && metric.assessmentTitle.trim().length > 200) {
      return `Component "${trimmedName}" sheet title is too long (max 200)`;
    }
  }

  for (const stage of ["MID_TERM", "END_OF_TERM"] as const) {
    const stageItems = metrics.filter((m) => metricStage(m) === stage);
    if (stageItems.length === 0) continue;
    const sum = stageItems.reduce((acc, m) => acc + (Number(m.maxMarks ?? m.weight) || 0), 0);
    if (Math.abs(sum - 100) > 0.01) {
      return (
        stage === "MID_TERM"
          ? `Mid-term component weights must total 100% (currently ${sum}%)`
          : `End-of-term component weights must total 100% (currently ${sum}%)`
      );
    }
  }

  const hasMidTermMetric = metrics.some((m) => metricStage(m) === "MID_TERM");
  if (midTermTotal > 0 && !hasMidTermMetric) {
    return "A mid-term share above 0% needs at least one mid-term component";
  }
  if (midTermTotal <= 0 && hasMidTermMetric) {
    return "A mid-term component needs a mid-term share above 0%";
  }

  if (!Array.isArray(input.gradeScale) || input.gradeScale.length === 0) {
    return "Add at least one grade level";
  }
  const sortedGrades = [...input.gradeScale]
    .map((grade) => ({ ...grade, min: Number(grade.min), max: Number(grade.max) }))
    .sort((left, right) => left.min - right.min);
  for (let index = 0; index < sortedGrades.length; index += 1) {
    const grade = sortedGrades[index];
    if (grade.min > grade.max) return `Grade ${grade.grade} minimum cannot exceed its maximum`;
    const previous = sortedGrades[index - 1];
    if (previous && grade.min <= previous.max) return `Grade ranges ${previous.grade} and ${grade.grade} overlap`;
  }
  return null;
}

export type ComputedMetric = {
  name: string;
  label?: string;
  score?: number;
  matched?: boolean;
  ambiguous?: boolean;
  sources?: number;
  candidateTitles?: string[];
};

/**
 * Human-readable warnings for a computed result: components that matched no
 * sheet (silently scored 0) and components that averaged more than one sheet.
 */
export function metricWarnings(computed: ComputedMetric[] | undefined | null): string[] {
  if (!Array.isArray(computed)) return [];
  const warnings: string[] = [];
  for (const metric of computed) {
    const label = metric.label || metric.name;
    if (metric.matched === false) {
      warnings.push(`${label}: matched no sheet — scored 0`);
    } else if (metric.ambiguous) {
      const titles = (metric.candidateTitles || []).join(", ");
      warnings.push(
        `${label}: averaged ${metric.sources} sheets (${titles}). Bind an exact sheet title in the template to remove the guesswork.`,
      );
    }
  }
  return warnings;
}

/** True when any metric of the result carries a warning. */
export function hasMetricWarnings(computed: ComputedMetric[] | undefined | null): boolean {
  return metricWarnings(computed).length > 0;
}
