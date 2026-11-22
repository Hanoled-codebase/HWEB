import { describe, expect, it } from "vitest";
import {
  buildCategoryEntryParam,
  computeCategoryAllocationSummary,
  computeStudentRelationalTotals,
  countEnteredScoresForColumn,
  groupAssessmentsByCategory,
  hasTeacherSubAssessments,
  resolveAssessmentEntryTarget,
  resolveSpreadsheetCategories,
  validateScoreInput,
  type AssessmentCategorySummary,
  type SpreadsheetAssessment,
  type SpreadsheetDetail,
} from "@/lib/spreadsheets";

const TEMPLATE_CATEGORIES: AssessmentCategorySummary[] = [
  { id: "cat-cw", name: "Classwork", label: "CW", maxMarks: 10, isSingleInstance: false, position: 0 },
  { id: "cat-asgn", name: "Assignments", label: "ASGN", maxMarks: 10, isSingleInstance: false, position: 1 },
  { id: "cat-prj", name: "Projects", label: "PRJ", maxMarks: 10, isSingleInstance: false, position: 2 },
  { id: "cat-exam", name: "Examination", label: "Exam", maxMarks: 70, isSingleInstance: true, position: 3 },
];

describe("computeCategoryAllocationSummary", () => {
  it("tracks sub-assessment counts and raw mark totals without imposing over-allocation caps", () => {
    const summary = computeCategoryAllocationSummary(TEMPLATE_CATEGORIES, [
      { categoryId: "cat-cw", maxMarks: 10 },
      { categoryId: "cat-cw", maxMarks: 10 },
      { categoryId: "cat-cw", maxMarks: 10 },
      { categoryId: "cat-asgn", maxMarks: 5 },
      { categoryId: "cat-prj", maxMarks: 20 },
      { categoryId: "cat-prj", maxMarks: 15 },
      { categoryId: "cat-exam", maxMarks: 70 },
    ]);

    expect(summary).toEqual([
      expect.objectContaining({
        categoryId: "cat-cw",
        maxMarks: 10,
        allocatedMarks: 30,
        rawMaxTotal: 30,
        remainingMarks: 0,
        isComplete: true,
        isOverAllocated: false,
        subAssessmentCount: 3,
      }),
      expect.objectContaining({
        categoryId: "cat-asgn",
        maxMarks: 10,
        allocatedMarks: 5,
        rawMaxTotal: 5,
        remainingMarks: 0,
        isComplete: true,
        isOverAllocated: false,
        subAssessmentCount: 1,
      }),
      expect.objectContaining({
        categoryId: "cat-prj",
        maxMarks: 10,
        allocatedMarks: 35,
        rawMaxTotal: 35,
        remainingMarks: 0,
        isComplete: true,
        isOverAllocated: false,
        subAssessmentCount: 2,
      }),
      expect.objectContaining({
        categoryId: "cat-exam",
        maxMarks: 70,
        allocatedMarks: 70,
        rawMaxTotal: 70,
        remainingMarks: 0,
        isSingleInstance: true,
        isComplete: true,
        isOverAllocated: false,
        subAssessmentCount: 1,
      }),
    ]);
  });

  it("marks categories with no sub-assessments as incomplete and never over-allocated", () => {
    const summary = computeCategoryAllocationSummary(TEMPLATE_CATEGORIES, []);
    expect(summary.map((item) => item.subAssessmentCount)).toEqual([0, 0, 0, 0]);
    expect(summary.every((item) => !item.isComplete && !item.isOverAllocated)).toBe(true);
  });
});

describe("validateScoreInput", () => {
  it("accepts blank input and scores within [0, maxMarks]", () => {
    expect(validateScoreInput("", 10)).toEqual({ valid: true, numeric: null, error: null });
    expect(validateScoreInput(null, 10)).toEqual({ valid: true, numeric: null, error: null });
    expect(validateScoreInput("0", 10)).toEqual({ valid: true, numeric: 0, error: null });
    expect(validateScoreInput("3.5", 4)).toEqual({ valid: true, numeric: 3.5, error: null });
    expect(validateScoreInput(4, 4)).toEqual({ valid: true, numeric: 4, error: null });
  });

  it("rejects negative, NaN, and over-maximum scores", () => {
    expect(validateScoreInput("-1", 10).valid).toBe(false);
    expect(validateScoreInput("-0.5", 10).error).toMatch(/negative/i);
    expect(validateScoreInput("abc", 10).valid).toBe(false);
    expect(validateScoreInput("5", 4)).toEqual({
      valid: false,
      numeric: null,
      error: "Score cannot exceed 4",
    });
  });
});

describe("computeStudentRelationalTotals", () => {
  it("normalizes equal-weighted sub-assessments (3x10 under max 10 -> 10, 8/10 under max 5 -> 4)", () => {
    const categories: AssessmentCategorySummary[] = [
      { id: "cat-cw", name: "Classwork", label: "CW", maxMarks: 10, isSingleInstance: false, position: 0 },
      { id: "cat-ce", name: "Class Exercises", label: "CE", maxMarks: 5, isSingleInstance: false, position: 1 },
      { id: "cat-asgn", name: "Assignments", label: "ASGN", maxMarks: 15, isSingleInstance: false, position: 2 },
      { id: "cat-exam", name: "Examination", label: "Exam", maxMarks: 70, isSingleInstance: true, position: 3 },
    ];
    const assessments: SpreadsheetAssessment[] = [
      { id: "sub-cw1", categoryId: "cat-cw", categoryName: "Classwork", categoryMaxMarks: 10, name: "Classwork 1", maxObtainableScore: 10 },
      { id: "sub-cw2", categoryId: "cat-cw", categoryName: "Classwork", categoryMaxMarks: 10, name: "Classwork 2", maxObtainableScore: 10 },
      { id: "sub-cw3", categoryId: "cat-cw", categoryName: "Classwork", categoryMaxMarks: 10, name: "Classwork 3", maxObtainableScore: 10 },
      { id: "sub-ce1", categoryId: "cat-ce", categoryName: "Class Exercises", categoryMaxMarks: 5, name: "Regular Class Exercise", maxObtainableScore: 10 },
      { id: "sub-a1", categoryId: "cat-asgn", categoryName: "Assignments", categoryMaxMarks: 15, name: "Assignment 1", maxObtainableScore: 10 },
      { id: "sub-a2", categoryId: "cat-asgn", categoryName: "Assignments", categoryMaxMarks: 15, name: "Assignment 2", maxObtainableScore: 10 },
      { id: "sub-ex", categoryId: "cat-exam", categoryName: "Examination", categoryMaxMarks: 70, name: "Examination", maxObtainableScore: 70, isSingleInstance: true },
    ];

    const totals = computeStudentRelationalTotals(
      categories,
      assessments,
      [10, 10, 10, 8, 8, 6, 56],
    );

    expect(totals.hasAnyScore).toBe(true);
    expect(totals.overallMax).toBe(100);
    expect(totals.categoryById.get("cat-cw")?.earned).toBe(10);
    expect(totals.categoryById.get("cat-ce")?.earned).toBe(4);
    expect(totals.categoryById.get("cat-asgn")?.earned).toBe(10.5);
    expect(totals.categoryById.get("cat-exam")?.earned).toBe(56);
    expect(totals.overallEarned).toBe(80.5);
  });

  it("averages uneven sub-assessment max scores proportionally to the category cap", () => {
    const assessments: SpreadsheetAssessment[] = [
      { id: "sub-cw1", categoryId: "cat-cw", categoryName: "Classwork", categoryMaxMarks: 10, name: "Classwork 1", maxObtainableScore: 4 },
      { id: "sub-cw2", categoryId: "cat-cw", categoryName: "Classwork", categoryMaxMarks: 10, name: "Classwork 2", maxObtainableScore: 3 },
      { id: "sub-cw3", categoryId: "cat-cw", categoryName: "Classwork", categoryMaxMarks: 10, name: "Classwork 3", maxObtainableScore: 3 },
      { id: "sub-a1", categoryId: "cat-asgn", categoryName: "Assignments", categoryMaxMarks: 10, name: "Assignment 1", maxObtainableScore: 5 },
      { id: "sub-a2", categoryId: "cat-asgn", categoryName: "Assignments", categoryMaxMarks: 10, name: "Assignment 2", maxObtainableScore: 5 },
      { id: "sub-p1", categoryId: "cat-prj", categoryName: "Projects", categoryMaxMarks: 10, name: "Project 1", maxObtainableScore: 6 },
      { id: "sub-p2", categoryId: "cat-prj", categoryName: "Projects", categoryMaxMarks: 10, name: "Project 2", maxObtainableScore: 4 },
      { id: "sub-ex", categoryId: "cat-exam", categoryName: "Examination", categoryMaxMarks: 70, name: "Examination", maxObtainableScore: 70, isSingleInstance: true },
    ];

    const totals = computeStudentRelationalTotals(
      TEMPLATE_CATEGORIES,
      assessments,
      [3.5, 2.5, 3, 4, 5, 5, 3, 58],
    );

    expect(totals.hasAnyScore).toBe(true);
    expect(totals.overallMax).toBe(100);
    // CW: ((3.5/4 + 2.5/3 + 3/3) / 3) * 10 = 9.03
    expect(totals.categoryById.get("cat-cw")?.earned).toBe(9.03);
    // ASGN: ((4/5 + 5/5) / 2) * 10 = 9
    expect(totals.categoryById.get("cat-asgn")?.earned).toBe(9);
    // PRJ: ((5/6 + 3/4) / 2) * 10 = 7.92
    expect(totals.categoryById.get("cat-prj")?.earned).toBe(7.92);
    expect(totals.categoryById.get("cat-exam")?.earned).toBe(58);
    expect(totals.overallEarned).toBe(83.95);
  });

  it("keeps full parent category maxMarks denominator when categories have no sub-assessments yet", () => {
    const assessments: SpreadsheetAssessment[] = [
      { id: "sub-ex", categoryId: "cat-exam", categoryName: "Examination", categoryMaxMarks: 70, name: "Examination", maxObtainableScore: 70, isSingleInstance: true },
    ];
    const totals = computeStudentRelationalTotals(TEMPLATE_CATEGORIES, assessments, [""]);
    expect(totals.hasAnyScore).toBe(false);
    expect(totals.overallMax).toBe(100);
    expect(totals.overallEarned).toBe(0);
    expect(totals.categoryTotals).toHaveLength(4);
  });

  it("resolves categories from assessmentCategories or template.assessmentCategories", () => {
    const fromTemplate = resolveSpreadsheetCategories({
      id: "sheet-1",
      status: "pending",
      template: { id: "tpl-1", name: "Term 1", assessmentCategories: TEMPLATE_CATEGORIES },
    });
    expect(fromTemplate.map((c) => c.id)).toEqual(["cat-cw", "cat-asgn", "cat-prj", "cat-exam"]);
  });
});

describe("conditional sub-assessment routing helpers", () => {
  it("routes empty, fixed, and single default categories directly to score entry, and custom/multi sub-assessments to the nested list", () => {
    const cw = TEMPLATE_CATEGORIES[0];
    const exam = TEMPLATE_CATEGORIES[3];

    expect(hasTeacherSubAssessments(cw, [])).toBe(false);
    expect(
      hasTeacherSubAssessments(cw, [
        {
          originalIndex: 0,
          assessment: {
            id: "sub-default",
            categoryId: cw.id,
            name: "Classwork",
            maxObtainableScore: 10,
          },
        },
      ]),
    ).toBe(false);
    expect(
      hasTeacherSubAssessments(cw, [
        {
          originalIndex: 0,
          assessment: {
            id: "sub-custom",
            categoryId: cw.id,
            name: "Classwork 1",
            maxObtainableScore: 10,
          },
        },
      ]),
    ).toBe(true);
    expect(
      hasTeacherSubAssessments(cw, [
        {
          originalIndex: 0,
          assessment: {
            id: "sub-scaled",
            categoryId: cw.id,
            name: "Classwork",
            maxObtainableScore: 20,
          },
        },
      ]),
    ).toBe(true);
    expect(
      hasTeacherSubAssessments(exam, [
        {
          originalIndex: 0,
          assessment: {
            id: "sub-ex",
            categoryId: exam.id,
            name: "Examination",
            maxObtainableScore: 70,
            isSystemGenerated: true,
          },
        },
      ]),
    ).toBe(false);
  });

  it("resolves virtual direct-entry categories, exact sub-assessment IDs, and legacy numeric indexes", () => {
    const sheet: SpreadsheetDetail = {
      id: "sheet-rel",
      status: "pending",
      assessmentStorageMode: "RELATIONAL",
      assessmentCategories: TEMPLATE_CATEGORIES,
      assessments: [
        { id: "sub-cw1", categoryId: "cat-cw", name: "Classwork 1", maxObtainableScore: 10 },
        { id: "sub-cw2", categoryId: "cat-cw", name: "Classwork 2", maxObtainableScore: 10 },
        { id: "sub-ex", categoryId: "cat-exam", name: "Examination", maxObtainableScore: 70, isSystemGenerated: true },
      ],
      data: [
        { student: { id: "s1", firstName: "Ada", lastName: "Obi" }, values: [8, "", 60] },
        { student: { id: "s2", firstName: "Kemi", lastName: "Bello" }, values: ["", "", 55] },
      ],
    };

    const grouped = groupAssessmentsByCategory(TEMPLATE_CATEGORIES, sheet.assessments || []);
    expect(grouped.get("cat-cw")?.length).toBe(2);
    expect(grouped.get("cat-asgn")?.length).toBe(0);
    expect(countEnteredScoresForColumn(sheet.data, 0)).toBe(1);
    expect(countEnteredScoresForColumn(sheet.data, 2)).toBe(2);

    // Unsplit category (0 subs) -> virtual direct entry
    const virtualAsgn = resolveAssessmentEntryTarget(sheet, buildCategoryEntryParam("cat-asgn"));
    expect(virtualAsgn?.isVirtualDefault).toBe(true);
    expect(virtualAsgn?.returnsToCategoryList).toBe(false);
    expect(virtualAsgn?.assessment.name).toBe("Assignments");
    expect(virtualAsgn?.assessment.maxObtainableScore).toBe(10);

    // Sub-assessment inside multi-sub category -> returns to category list
    const cw2 = resolveAssessmentEntryTarget(sheet, "sub-cw2");
    expect(cw2?.isVirtualDefault).toBe(false);
    expect(cw2?.returnsToCategoryList).toBe(true);
    expect(cw2?.assessment.originalIndex).toBe(1);

    // Fixed single-instance Examination -> returns to main assessments list
    const examTarget = resolveAssessmentEntryTarget(sheet, "sub-ex");
    expect(examTarget?.isVirtualDefault).toBe(false);
    expect(examTarget?.returnsToCategoryList).toBe(false);
    expect(examTarget?.assessment.originalIndex).toBe(2);
  });
});
