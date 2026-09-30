import { describe, expect, it } from "vitest";
import type { AssignedExam } from "../../components/cbt/ExamCard";
import { examStartHref, pendingSchoolExams } from "../student-pending-exams";

const now = new Date("2026-09-30T10:00:00.000Z");

function exam(id: string, overrides: Partial<AssignedExam> = {}): AssignedExam {
  return {
    id,
    title: `Exam ${id}`,
    description: null,
    duration: 40,
    totalQuestions: 20,
    passMark: 50,
    myResult: null,
    ...overrides,
  };
}

function result(status: string) {
  return { examId: "x", status, percentage: null, score: null };
}

describe("pendingSchoolExams", () => {
  it("keeps exams the student hasn't started or hasn't finished", () => {
    const pending = pendingSchoolExams([exam("new"), exam("half", { myResult: result("started") })], now);
    expect(pending.map((e) => e.id)).toEqual(["new", "half"]);
  });

  it("drops exams already submitted or marked, including ones awaiting result release", () => {
    const done = [
      exam("submitted", { myResult: result("submitted") }),
      exam("graded", { myResult: result("graded") }),
      exam("unreleased", { myResult: { ...result("submitted"), resultsReleased: false } }),
    ];
    expect(pendingSchoolExams(done, now)).toEqual([]);
  });

  it("drops exams whose window has closed, but keeps open-ended and still-open ones", () => {
    const exams = [
      exam("closed", { endDate: "2026-09-30T09:59:59.000Z" }),
      exam("open", { endDate: "2026-10-01T00:00:00.000Z" }),
      exam("no-end", { endDate: null }),
    ];
    expect(pendingSchoolExams(exams, now).map((e) => e.id)).toEqual(["open", "no-end"]);
  });
});

describe("examStartHref", () => {
  it("opens the exam's start dialog in the CBT portal, where passkeys and device checks happen", () => {
    expect(examStartHref("abc 123")).toBe("/cbt/student?examId=abc%20123");
  });
});
