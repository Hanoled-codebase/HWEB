export type ResultStage = "MID_TERM" | "END_OF_TERM";
export type SchoolSection = "JSS" | "SSS";

export const ELYON_GRADE_SCALE = [
  { grade: "A1**", min: 90, max: 100 },
  { grade: "A1*", min: 85, max: 89 },
  { grade: "A1", min: 80, max: 84 },
  { grade: "B2", min: 75, max: 79 },
  { grade: "B3", min: 70, max: 74 },
  { grade: "C4", min: 65, max: 69 },
  { grade: "C5", min: 60, max: 64 },
  { grade: "C6", min: 55, max: 59 },
  { grade: "D7", min: 50, max: 54 },
  { grade: "E8", min: 40, max: 49 },
  { grade: "F9", min: 0, max: 39 },
] as const;

const SHEET_PRESETS = {
  JSS: {
    MID_TERM: [
      { name: "Class Exercises", total: 10 },
      { name: "Assignments", total: 10 },
      { name: "Periodic Tests", total: 20 },
      { name: "Mid-term Examination", total: 60 },
    ],
    END_OF_TERM: [
      { name: "Class Exercises", total: 5 },
      { name: "Assignments", total: 5 },
      { name: "Periodic Tests", total: 5 },
      { name: "Projects", total: 5 },
      { name: "Terminal Examination", total: 60 },
    ],
  },
  SSS: {
    MID_TERM: [
      { name: "Class Exercises", total: 10 },
      { name: "Assignments", total: 10 },
      { name: "Periodic Tests", total: 20 },
      { name: "Mid-term Examination", total: 60 },
    ],
    END_OF_TERM: [
      { name: "Class Exercises", total: 5 },
      { name: "Projects / Assignments", total: 5 },
      { name: "Terminal Examination", total: 70 },
    ],
  },
} satisfies Record<SchoolSection, Record<ResultStage, Array<{ name: string; total: number }>>>;

export function detectClassSection(className?: string | null): "JSS" | "SSS" | "ALL" {
  const normalized = (className || "").toUpperCase();
  if (/\bSSS?\s*[1-3](?:\b|[A-Z])|SENIOR SECONDARY/.test(normalized)) return "SSS";
  if (/\bJSS?\s*[1-3](?:\b|[A-Z])|JUNIOR SECONDARY/.test(normalized)) return "JSS";
  return "ALL";
}

export function sectionForClass(className?: string | null): SchoolSection {
  return detectClassSection(className) === "SSS" ? "SSS" : "JSS";
}

export function spreadsheetPreset(section: SchoolSection, resultType: ResultStage) {
  return SHEET_PRESETS[section][resultType].map((assessment) => ({ ...assessment }));
}

const MACHINE_KEY_PATTERN = /^[A-Z0-9]+(?:_[A-Z0-9]+)+$/;

/**
 * Resolves the full human-readable header label for an assessment column.
 * Prefers `name` (e.g. "Class Exercises") over short `label` abbreviations
 * (e.g. "CE", "ASG", "PT"), while still using `label` when `name` is a
 * machine-style uppercase identifier like "MID_TERM_EXAM".
 */
export function resolveFullAssessmentLabel(
  name?: string | null,
  label?: string | null,
): string {
  const trimmedName = (name ?? "").trim();
  const trimmedLabel = (label ?? "").trim();

  if (trimmedName && !MACHINE_KEY_PATTERN.test(trimmedName)) {
    return trimmedName;
  }
  if (trimmedLabel) {
    return trimmedLabel;
  }
  if (trimmedName) {
    return trimmedName
      .toLowerCase()
      .split("_")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }
  return "Assessment";
}

export function resultTemplatePreset(section: SchoolSection, resultType: ResultStage) {
  if (resultType === "MID_TERM") {
    return {
      name: `${section} Mid-term Result`,
      midTermTotal: 100,
      metrics: [
        { name: "Class Exercises", label: "CE", weight: 10, stage: "MID_TERM" as const, isSingleInstance: false },
        { name: "Assignments", label: "ASG", weight: 10, stage: "MID_TERM" as const, kind: "ASSIGNMENT", isSingleInstance: false },
        { name: "Periodic Tests", label: "PT", weight: 20, stage: "MID_TERM" as const, kind: "TEST", isSingleInstance: false },
        { name: "Mid-Term Examination", label: "MTE", weight: 60, stage: "MID_TERM" as const, kind: "EXAM", isSingleInstance: true },
      ],
    };
  }
  if (section === "JSS") {
    return {
      name: "JSS Terminal Result",
      midTermTotal: 0,
      metrics: [
        { name: "Class Exercises", label: "CE", weight: 5, stage: "END_OF_TERM" as const, isSingleInstance: false },
        { name: "Assignments", label: "ASG", weight: 5, stage: "END_OF_TERM" as const, kind: "ASSIGNMENT", isSingleInstance: false },
        { name: "Periodic Tests", label: "PT", weight: 5, stage: "END_OF_TERM" as const, kind: "TEST", isSingleInstance: false },
        { name: "Projects", label: "PRJ", weight: 5, stage: "END_OF_TERM" as const, kind: "PROJECT", isSingleInstance: false },
        { name: "Mid-Term Score", label: "MTS", weight: 20, stage: "END_OF_TERM" as const, kind: "TEST", isSingleInstance: true },
        { name: "Examination", label: "EXAM", weight: 60, stage: "END_OF_TERM" as const, kind: "EXAM", isSingleInstance: true },
      ],
    };
  }
  return {
    name: "SSS Terminal Result",
    midTermTotal: 0,
    metrics: [
      { name: "Class Exercises", label: "CE", weight: 5, stage: "END_OF_TERM" as const, isSingleInstance: false },
      { name: "Projects / Assignments", label: "PA", weight: 5, stage: "END_OF_TERM" as const, kind: "ASSIGNMENT", isSingleInstance: false },
      { name: "Mid-Term Score", label: "MTS", weight: 20, stage: "END_OF_TERM" as const, kind: "TEST", isSingleInstance: true },
      { name: "Terminal Examination", label: "EXAM", weight: 70, stage: "END_OF_TERM" as const, kind: "EXAM", isSingleInstance: true },
    ],
  };
}
