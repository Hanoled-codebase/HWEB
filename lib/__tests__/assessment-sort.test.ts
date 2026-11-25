import { describe, expect, it } from "vitest";
import {
  getSpreadsheetRowKey,
  sortAssessmentRows,
  type SpreadsheetRow,
} from "../spreadsheets";

const sampleRows: SpreadsheetRow[] = [
  {
    student: { id: "s1", firstName: "Victoria", lastName: "Awoyemi", admissionNumber: "HNL-007" },
    values: ["5"],
  },
  {
    student: { id: "s2", firstName: "Anjola", lastName: "Abodunrin", admissionNumber: "HNL-001" },
    values: [""],
  },
  {
    student: { id: "s3", firstName: "Ayomikun", lastName: "Adebayo", admissionNumber: "HNL-002" },
    values: [0],
  },
  {
    student: { id: "s4", firstName: "Ameerah", lastName: "Adesina", admissionNumber: "HNL-006" },
    values: [null],
  },
];

describe("sortAssessmentRows", () => {
  it("sorts alphabetically ascending (A-Z) by surname then first name without mutating input", () => {
    const before = sampleRows.map((r) => r.student.id);
    const result = sortAssessmentRows(sampleRows, 0, "name-asc");

    expect(result.map((item) => item.row.student.id)).toEqual(["s2", "s3", "s4", "s1"]);
    expect(result.map((item) => item.index)).toEqual([1, 2, 3, 0]);
    expect(sampleRows.map((r) => r.student.id)).toEqual(before);
  });

  it("sorts alphabetically descending (Z-A) by surname then first name", () => {
    const result = sortAssessmentRows(sampleRows, 0, "name-desc");
    expect(result.map((item) => item.row.student.id)).toEqual(["s1", "s4", "s3", "s2"]);
  });

  it("sorts unentered scores first (treating 0 as entered), tie-broken A-Z", () => {
    const result = sortAssessmentRows(sampleRows, 0, "unentered-first");
    expect(result.map((item) => item.row.student.id)).toEqual(["s2", "s4", "s3", "s1"]);
  });

  it("sorts entered scores first (treating 0 as entered), tie-broken A-Z", () => {
    const result = sortAssessmentRows(sampleRows, 0, "entered-first");
    expect(result.map((item) => item.row.student.id)).toEqual(["s3", "s1", "s2", "s4"]);
  });

  it("respects enteredKeysSnapshot so rows stay stable while typing", () => {
    const snapshot = new Set<string>([getSpreadsheetRowKey(sampleRows[0], 0)]);
    const result = sortAssessmentRows(sampleRows, 0, "entered-first", snapshot);
    // Only s1 is in snapshot even though s3 has score 0 in live values
    expect(result.map((item) => item.row.student.id)).toEqual(["s1", "s2", "s3", "s4"]);
  });

  it("handles empty and singleton lists safely", () => {
    expect(sortAssessmentRows([], 0, "name-asc")).toEqual([]);
    const single = [sampleRows[0]];
    expect(sortAssessmentRows(single, 0, "unentered-first")).toEqual([
      { row: sampleRows[0], index: 0 },
    ]);
  });
});
