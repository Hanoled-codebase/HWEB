/**
 * Universal Grading & Max Book Architecture
 * Frontend Normalization Engine and Type Definitions
 */

export type TermType = "MID_TERM" | "END_TERM" | "CUSTOM";

export interface AssessmentCategory {
  id?: string;
  name: string;
  weight: number;
  isSingleInstance?: boolean;
}

export interface AssessmentVariant {
  id?: string;
  categoryId?: string;
  name: string;
  maxObtainableScore: number;
  total?: number;
}

export interface NormalizedCategoryResult {
  categoryName: string;
  targetWeight: number;
  rawEarnedTotal: number;
  maxObtainableTotal: number;
  percentageYield: number;
  normalizedScore: number;
}

export interface StudentNormalizationResult {
  categoryBreakdown: NormalizedCategoryResult[];
  totalNormalizedScore: number;
}

/**
 * Mathematical Model:
 * Normalized Score = (Sum of S_i / Sum of M_i) * W_C
 * Where:
 *   S_i = Earned score for variant i
 *   M_i = Maximum obtainable score for variant i
 *   W_C = Admin configured target weight for parent category C
 */
export function normalizeCategoryScore(
  category: AssessmentCategory,
  variants: Array<{ name?: string; rawScore: number; maxScore: number }> = [],
): NormalizedCategoryResult {
  const targetWeight = Number(category?.weight) || 0;
  const categoryName = category?.name || "Untitled Category";

  if (!Array.isArray(variants) || variants.length === 0) {
    return {
      categoryName,
      targetWeight,
      rawEarnedTotal: 0,
      maxObtainableTotal: 0,
      percentageYield: 0,
      normalizedScore: 0,
    };
  }

  let rawEarnedTotal = 0;
  let maxObtainableTotal = 0;
  let totalPercentage = 0;

  for (let i = 0; i < variants.length; i++) {
    const v = variants[i];
    const rawScore = Number(v.rawScore) || 0;
    const maxScore = Number(v.maxScore) || 0;

    const maximum = Number.isFinite(maxScore) ? Math.max(0, maxScore) : 0;
    const clamped = Number.isFinite(rawScore) ? Math.min(maximum, Math.max(0, rawScore)) : 0;
    rawEarnedTotal += clamped;
    maxObtainableTotal += maximum;
    totalPercentage += maximum > 0 ? clamped / maximum : 0;
  }

  // Edge case: Division by Zero
  if (maxObtainableTotal === 0) {
    return {
      categoryName,
      targetWeight,
      rawEarnedTotal: 0,
      maxObtainableTotal: 0,
      percentageYield: 0,
      normalizedScore: 0,
    };
  }

  const percentageYield = totalPercentage / variants.length;
  const rawNormalized = percentageYield * targetWeight;
  const normalizedScore = Math.round(rawNormalized * 100) / 100;

  return {
    categoryName,
    targetWeight,
    rawEarnedTotal,
    maxObtainableTotal,
    percentageYield: Math.round(percentageYield * 10000) / 100,
    normalizedScore,
  };
}

/**
 * Validates single instance category lock
 */
export function validateVariantAddition(
  category: AssessmentCategory,
  currentVariantCount = 0,
): { allowed: boolean; reason?: string } {
  if (category?.isSingleInstance && currentVariantCount >= 1) {
    return {
      allowed: false,
      reason: `Category "${category.name}" is locked to a single instance and cannot accept additional variants.`,
    };
  }
  return { allowed: true };
}

/**
 * Auto-Naming Convention:
 * Format: [Subject] - [Class] - [Term Type] - [Academic Year/Term]
 * Example: Mathematics - JSS1A - Mid-Term Spreadsheet - Term 1 2026
 */
export function buildSpreadsheetTitle(
  subjectName: string,
  className: string,
  termType: TermType = "END_TERM",
  academicSession?: string | null,
): string {
  const normalizedSubject = subjectName ? subjectName.trim() : "";
  const normalizedClass = className ? className.trim() : "";

  const typeLabel =
    termType === "MID_TERM"
      ? "Mid-Term Spreadsheet"
      : termType === "CUSTOM"
        ? "Custom Spreadsheet"
        : "End-Term Spreadsheet";

  const sessionSuffix = academicSession ? ` - ${academicSession.trim()}` : "";

  if (normalizedSubject && normalizedClass) {
    return `${normalizedSubject} - ${normalizedClass} - ${typeLabel}${sessionSuffix}`;
  }

  return normalizedSubject || normalizedClass || "Spreadsheet";
}
