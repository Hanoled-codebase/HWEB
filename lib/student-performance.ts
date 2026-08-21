import { formatScore } from "@/lib/spreadsheets";
import { toTitleCase } from "@/lib/utils";

export type StudentPerformanceAssessment = {
  name: string;
  total?: number;
  score: string | number | null;
  originalIndex: number;
  percentage?: number | null;
};

export type StudentPerformanceSubject = {
  spreadsheetId: string;
  status: "pending" | "active" | "inactive";
  updatedAt?: string;
  subject?: {
    id?: string;
    name?: string | null;
  } | null;
  classLevel?: {
    id?: string;
    name?: string | null;
    level?: string | null;
  } | null;
  totalScore: number;
  assessments: StudentPerformanceAssessment[];
};

export type StudentPerformanceResponse = {
  student: {
    id: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    admissionNumber?: string;
    gender?: string;
    classLevel?: {
      id?: string;
      name?: string | null;
      level?: string | null;
    } | null;
  };
  subjects: StudentPerformanceSubject[];
};

export type StudentPerformanceSummary = {
  scored: number;
  possible: number;
  percentage: number | null;
  enteredCount: number;
  totalCount: number;
};

export function getStudentFullName(
  student: StudentPerformanceResponse["student"],
) {
  return [student.firstName, student.middleName, student.lastName]
    .filter((n): n is string => !!n)
    .map((n) => toTitleCase(n))
    .join(" ");
}

export function getSubjectName(subject: StudentPerformanceSubject) {
  return subject.subject?.name || "Subject";
}

export function getStudentRecordId(
  student: StudentPerformanceResponse["student"],
) {
  if (student.admissionNumber?.trim()) {
    return student.admissionNumber.trim();
  }

  return student.id.slice(-4).toUpperCase();
}

export function hasEnteredScore(score: string | number | null | undefined) {
  return score !== null && score !== undefined && score !== "";
}

export function getNumericScore(score: string | number | null | undefined) {
  if (!hasEnteredScore(score)) {
    return null;
  }

  const numericValue = Number(score);
  return Number.isFinite(numericValue) ? numericValue : null;
}

export function getAssessmentPercentage(
  assessment: StudentPerformanceAssessment,
) {
  if (typeof assessment.percentage === "number") {
    return assessment.percentage;
  }

  const numericScore = getNumericScore(assessment.score);

  if (
    numericScore === null ||
    typeof assessment.total !== "number" ||
    assessment.total <= 0
  ) {
    return null;
  }

  return Number(((numericScore / assessment.total) * 100).toFixed(2));
}

export function getOrderedStudentAssessments(
  assessments: StudentPerformanceAssessment[],
) {
  const nonExam = assessments.filter(
    (assessment) => assessment.name.trim().toLowerCase() !== "exam",
  );
  const exam = assessments.filter(
    (assessment) => assessment.name.trim().toLowerCase() === "exam",
  );

  return [...nonExam, ...exam];
}

export function formatAssessmentScore(
  score: string | number | null | undefined,
  total?: number,
) {
  const numericScore = getNumericScore(score);

  if (numericScore === null) {
    return "Not entered";
  }

  if (typeof total === "number") {
    return `${formatScore(numericScore)} / ${formatScore(total)}`;
  }

  return formatScore(numericScore);
}

export function getPerformanceTone(percentage: number | null) {
  if (percentage === null) {
    return "text-slate-500";
  }

  if (percentage >= 70) {
    return "text-emerald-600";
  }

  if (percentage >= 50) {
    return "text-amber-600";
  }

  return "text-red-600";
}

export function getSubjectPerformanceSummary(
  subject: StudentPerformanceSubject,
): StudentPerformanceSummary {
  const enteredAssessments = subject.assessments.filter((assessment) =>
    hasEnteredScore(assessment.score),
  );
  const scored = enteredAssessments.reduce(
    (sum, assessment) => sum + (getNumericScore(assessment.score) || 0),
    0,
  );
  const possible = subject.assessments.reduce((sum, assessment) => {
    if (typeof assessment.total !== "number" || assessment.total <= 0) {
      return sum;
    }

    return sum + assessment.total;
  }, 0);
  const percentage =
    possible > 0 ? Number(((scored / possible) * 100).toFixed(2)) : null;

  return {
    scored,
    possible,
    percentage,
    enteredCount: enteredAssessments.length,
    totalCount: subject.assessments.length,
  };
}

export function getSubjectRecordLabel(summary: StudentPerformanceSummary) {
  if (summary.totalCount === 0 || summary.enteredCount === 0) {
    return "Waiting for score";
  }

  if (summary.enteredCount < summary.totalCount) {
    return "Grading in progress";
  }

  if (summary.percentage !== null && summary.percentage >= 75) {
    return "Distinction";
  }

  if (summary.percentage !== null && summary.percentage >= 60) {
    return "Merit";
  }

  if (summary.percentage !== null && summary.percentage >= 50) {
    return "Pass";
  }

  return "Needs support";
}

export function getSubjectRecordBadgeClass(summary: StudentPerformanceSummary) {
  if (summary.totalCount === 0 || summary.enteredCount === 0) {
    return "border-white/50 bg-white/70 text-slate-700";
  }

  if (summary.enteredCount < summary.totalCount) {
    return "border-amber-200/80 bg-amber-50/90 text-amber-800";
  }

  if (summary.percentage !== null && summary.percentage >= 75) {
    return "border-emerald-200/80 bg-emerald-50/90 text-emerald-800";
  }

  if (summary.percentage !== null && summary.percentage >= 60) {
    return "border-cyan-200/80 bg-cyan-50/90 text-cyan-800";
  }

  if (summary.percentage !== null && summary.percentage >= 50) {
    return "border-amber-200/80 bg-amber-50/90 text-amber-800";
  }

  return "border-rose-200/80 bg-rose-50/90 text-rose-800";
}
