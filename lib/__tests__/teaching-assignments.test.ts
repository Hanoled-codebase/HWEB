import { describe, expect, it } from "vitest";
import { hcoreIds, teachingKey, toHcoreTeaching } from "../teaching-assignments";

const classes = [
  { id: "c-linked", hcoreClassGroupId: "hc-c-linked" },
  { id: "c-local", hcoreClassGroupId: null },
];
const subjects = [
  { id: "s-linked", hcoreSubjectId: "hc-s-linked" },
  { id: "s-local", hcoreSubjectId: null },
];
const ids = hcoreIds(classes, subjects);

const row = (classLevelId: string, subjectId: string | null, type = "SUBJECT_TEACHER") => ({
  type,
  classLevel: { id: classLevelId },
  subject: subjectId ? { id: subjectId } : null,
});

describe("toHcoreTeaching", () => {
  it("translates a linked subject assignment into HCORE ids", () => {
    expect(toHcoreTeaching(row("c-linked", "s-linked"), ids)).toEqual({
      classGroupId: "hc-c-linked",
      subjectId: "hc-s-linked",
      assignmentType: "SUBJECT_TEACHER",
    });
  });

  it("translates a linked class-teacher assignment, which has no subject", () => {
    expect(toHcoreTeaching(row("c-linked", null, "CLASS_TEACHER"), ids)).toEqual({
      classGroupId: "hc-c-linked",
      subjectId: null,
      assignmentType: "CLASS_TEACHER",
    });
  });

  // These are the rows the HR screen must remove locally instead: HCORE has no
  // id for the class or subject, so it can never hold (or drop) the row, and a
  // "removal" that asks HCORE silently does nothing — the row came straight
  // back on the next refresh.
  it("returns null for a subject the directory doesn't know", () => {
    expect(toHcoreTeaching(row("c-linked", "s-local"), ids)).toBeNull();
  });

  it("returns null for a class the directory doesn't know", () => {
    expect(toHcoreTeaching(row("c-local", "s-linked"), ids)).toBeNull();
  });

  it("returns null for roles HCORE doesn't hold as teaching", () => {
    expect(toHcoreTeaching({ type: "HOD", classLevel: { id: "c-linked" }, subject: null }, ids)).toBeNull();
  });
});

describe("teachingKey", () => {
  it("distinguishes the same class+subject by assignment type", () => {
    const asSubject = { assignmentType: "SUBJECT_TEACHER" as const, classGroupId: "c", subjectId: "s" };
    const asClass = { assignmentType: "CLASS_TEACHER" as const, classGroupId: "c", subjectId: null };
    expect(teachingKey(asSubject)).not.toBe(teachingKey(asClass));
  });
});
