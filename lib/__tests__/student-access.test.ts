import { describe, expect, it } from "vitest";
import {
  ALLOWED_STUDENT_SUBPATHS,
  extractSchoolSubpath,
  isAllowedStudentSubpath,
} from "../student-access";

describe("student-access", () => {
  describe("extractSchoolSubpath", () => {
    it("extracts subpath relative to school base path", () => {
      expect(extractSchoolSubpath("/dashboard/school/greenfield", "greenfield")).toBe("");
      expect(extractSchoolSubpath("/dashboard/school/greenfield/", "greenfield")).toBe("");
      expect(extractSchoolSubpath("/dashboard/school/greenfield/student/homework", "greenfield")).toBe("/student/homework");
      expect(extractSchoolSubpath("/dashboard/school/greenfield/student/scheme-of-work?term=1", "greenfield")).toBe("/student/scheme-of-work");
      expect(extractSchoolSubpath("/dashboard/school/greenfield/student/results#details", "greenfield")).toBe("/student/results");
      expect(extractSchoolSubpath("/dashboard/school/greenfield/settings", "greenfield")).toBe("/settings");
    });

    it("returns null for non-matching school or invalid paths", () => {
      expect(extractSchoolSubpath(null, "greenfield")).toBeNull();
      expect(extractSchoolSubpath("", "greenfield")).toBeNull();
      expect(extractSchoolSubpath("/welcome", "greenfield")).toBeNull();
      expect(extractSchoolSubpath("/dashboard/school/other-school", "greenfield")).toBeNull();
    });
  });

  describe("isAllowedStudentSubpath", () => {
    it("allows the 9 student-permitted subpaths", () => {
      for (const path of ALLOWED_STUDENT_SUBPATHS) {
        expect(isAllowedStudentSubpath(path)).toBe(true);
        if (path !== "") {
          expect(isAllowedStudentSubpath(`${path}/`)).toBe(true);
        }
      }
    });

    it("allows empty string or single slash as dashboard home", () => {
      expect(isAllowedStudentSubpath("")).toBe(true);
      expect(isAllowedStudentSubpath("/")).toBe(true);
    });

    it("blocks restricted staff / school routes", () => {
      expect(isAllowedStudentSubpath("/students")).toBe(false);
      expect(isAllowedStudentSubpath("/teachers")).toBe(false);
      expect(isAllowedStudentSubpath("/payroll")).toBe(false);
      expect(isAllowedStudentSubpath("/billing")).toBe(false);
      expect(isAllowedStudentSubpath("/debt")).toBe(false);
      expect(isAllowedStudentSubpath("/settings")).toBe(false);
      expect(isAllowedStudentSubpath("/attendance")).toBe(false);
      expect(isAllowedStudentSubpath("/classes")).toBe(false);
      expect(isAllowedStudentSubpath("/subjects")).toBe(false);
      expect(isAllowedStudentSubpath("/homework")).toBe(false);
      expect(isAllowedStudentSubpath("/scheme-of-work")).toBe(false);
      expect(isAllowedStudentSubpath("/support")).toBe(false);
      expect(isAllowedStudentSubpath("/admissions")).toBe(false);
      expect(isAllowedStudentSubpath("/invites")).toBe(false);
      expect(isAllowedStudentSubpath("/invoices")).toBe(false);
    });
  });
});

