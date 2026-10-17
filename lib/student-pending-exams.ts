import type { AssignedExam } from "@/components/cbt/ExamCard";

// HSMS never reads HCBT, so a student's pending exams come from HCBT's own
// assigned-exams list. SSCE papers are open practice rather than assignments,
// so only school exams can be pending.

/** School exams the student still has to sit: never started, or started and not yet submitted. */
export function pendingSchoolExams(exams: AssignedExam[], now: Date = new Date()): AssignedExam[] {
  return exams.filter((exam) => {
    const status = exam.myResult?.status;
    if (status && status !== "started") return false;
    return !exam.endDate || new Date(exam.endDate) >= now;
  });
}

/**
 * Where "Start" sends a student: the CBT portal opens the exam's start dialog,
 * which asks for a passkey when one is set and refuses phones, rather than
 * jumping straight into the exam.
 */
export function examStartHref(examId: string): string {
  return `/cbt/student?examId=${encodeURIComponent(examId)}`;
}
