import { describe, expect, it } from "vitest";
import {
  buildRelationalImportModel,
  buildSpreadsheetTemplateCsv,
  parseSpreadsheetScoreImport,
  type ImportableAssessment,
  type ImportableStudentRow,
} from "@/lib/spreadsheet-import";

describe("spreadsheet-import", () => {
  const assessments: ImportableAssessment[] = [
    { id: "a1", name: "Class Exercises", maxObtainableScore: 10 },
    { id: "a2", name: "Mid-Term Test", maxObtainableScore: 20 },
    { id: "a3", name: "Exam", maxObtainableScore: 70 },
  ];

  const rows: ImportableStudentRow[] = [
    {
      student: {
        id: "s1",
        firstName: "Ada",
        lastName: "Okafor",
        admissionNumber: "HNL-2026-001",
      },
      values: ["", "", ""],
    },
    {
      student: {
        id: "s2",
        firstName: "Tunde",
        lastName: "Bello",
        admissionNumber: "HNL-2026-002",
      },
      values: [8, "", ""],
    },
  ];

  it("builds a template CSV with assessment max marks and neutralizes formulas", () => {
    const csv = buildSpreadsheetTemplateCsv(assessments, rows);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("Admission Number,Student Name,Class Exercises (/10),Mid-Term Test (/20),Exam (/70)");
    expect(csv).toContain("HNL-2026-001,Ada Okafor,,,");
    expect(csv).toContain("HNL-2026-002,Tunde Bello,8,,");
  });

  it("imports scores by admission number and name fallback while validating max bounds", () => {
    const upload = [
      "Admission Number,Student Name,Class Exercises (/10),Mid-Term Test (/20),Exam (/70)",
      "HNL-2026-001,Ada Okafor,9,18,65",
      ",Tunde Bello,10,25,60",
      "UNKNOWN-999,Ghost Student,5,5,50",
    ].join("\r\n");

    const result = parseSpreadsheetScoreImport(upload, assessments, rows);

    expect(result.matchedStudents).toBe(2);
    expect(result.unmatchedRows).toBe(1);
    expect(result.updatedRows[0].values).toEqual([9, 18, 65]);
    // 25 exceeds max 20 for Mid-Term Test, so it is skipped and reported
    expect(result.updatedRows[1].values).toEqual([10, "", 60]);
    expect(result.invalidCells).toHaveLength(1);
    expect(result.invalidCells[0]).toContain("exceeds max 20");
    // Ensure input rows were not mutated
    expect(rows[0].values).toEqual(["", "", ""]);
    expect(result.updatedAssessmentIndices).toEqual([0, 1, 2]);
    expect(result.importedEntries).toEqual([
      { studentId: "s1", assessmentIndex: 0, score: 9 },
      { studentId: "s1", assessmentIndex: 1, score: 18 },
      { studentId: "s1", assessmentIndex: 2, score: 65 },
      { studentId: "s2", assessmentIndex: 0, score: 10 },
      { studentId: "s2", assessmentIndex: 2, score: 60 },
    ]);
  });

  it("includes all relational template categories in order even when only Examination exists", () => {
    const categories = [
      { id: "cat-cw", name: "Classwork", maxMarks: 5 },
      { id: "cat-asg", name: "Assignment", maxMarks: 10 },
      { id: "cat-apt", name: "Academic Progress Test", maxMarks: 15 },
      { id: "cat-exam", name: "Examination", maxMarks: 70 },
    ];
    const groupedSubs = new Map([
      ["cat-cw", []],
      ["cat-asg", []],
      ["cat-apt", []],
      [
        "cat-exam",
        [{ assessment: { id: "sub-exam", name: "Examination", maxObtainableScore: 70 }, originalIndex: 0 }],
      ],
    ]);
    const sheetRows: ImportableStudentRow[] = [
      {
        student: { id: "s1", firstName: "Ada", middleName: "Joy", lastName: "Okafor", admissionNumber: "DPC-2026-00001" },
        values: [55],
      },
    ];

    const model = buildRelationalImportModel(categories, groupedSubs, sheetRows);
    expect(model.assessments.map((a) => ({ name: a.name, virtual: a.isVirtualCategory, id: a.id }))).toEqual([
      { name: "Classwork", virtual: true, id: undefined },
      { name: "Assignment", virtual: true, id: undefined },
      { name: "Academic Progress Test", virtual: true, id: undefined },
      { name: "Examination", virtual: false, id: "sub-exam" },
    ]);
    expect(model.rows[0].values).toEqual(["", "", "", 55]);

    const csv = buildSpreadsheetTemplateCsv(model.assessments, model.rows);
    expect(csv).toContain(
      "Admission Number,Student Name,Classwork (/5),Assignment (/10),Academic Progress Test (/15),Examination (/70)",
    );
    expect(csv).toContain("DPC-2026-00001,Ada Okafor,,,,55");

    // Partial import: fill Classwork and Examination only -> only indices 0 and 3 appear in updatedAssessmentIndices
    const upload = [
      "Admission Number,Student Name,Classwork (/5),Assignment (/10),Academic Progress Test (/15),Examination (/70)",
      "DPC-2026-00001,Ada Okafor,4,,,62",
    ].join("\r\n");

    const parsed = parseSpreadsheetScoreImport(upload, model.assessments, model.rows);
    expect(parsed.updatedAssessmentIndices).toEqual([0, 3]);
    expect(parsed.importedEntries).toEqual([
      { studentId: "s1", assessmentIndex: 0, score: 4 },
      { studentId: "s1", assessmentIndex: 3, score: 62 },
    ]);
    // Assignment (index 1) and Academic Progress Test (index 2) have no scores -> not provisioned
    expect(parsed.updatedAssessmentIndices).not.toContain(1);
    expect(parsed.updatedAssessmentIndices).not.toContain(2);
  });
});
