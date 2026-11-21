import { describe, expect, it } from "vitest";
import {
  ASSESSMENT_KINDS,
  metricWarnings,
  validateTemplateForm,
} from "@/lib/result-template-validation";
import {
  ELYON_GRADE_SCALE,
  detectClassSection,
  resultTemplatePreset,
  spreadsheetPreset,
} from "@/lib/result-presets";

const validMetrics = [
  { name: "TEST", label: "Mid-term Test", weight: 100, stage: "MID_TERM" as const, kind: "TEST" },
  { name: "EXAM", label: "Exam", weight: 70, stage: "END_OF_TERM" as const, kind: "EXAM" },
  { name: "PROJECT", label: "Project", weight: 30, stage: "END_OF_TERM" as const, kind: "PROJECT" },
];

const base = {
  metrics: validMetrics,
  gradeScale: [{ grade: "A", min: 75, max: 100 }],
  midTermTotal: 30,
};

describe("validateTemplateForm", () => {
  it("accepts a valid staged template with kinds", () => {
    expect(validateTemplateForm(base)).toBeNull();
  });

  it("rejects mid-term weights that do not total 100", () => {
    const metrics = [{ ...validMetrics[0], weight: 60 }, ...validMetrics.slice(1)];
    expect(validateTemplateForm({ ...base, metrics })).toMatch(/Mid-term component weights/);
  });

  it("rejects end-of-term weights that do not total 100", () => {
    const metrics = [{ ...validMetrics[1], weight: 60 }, ...validMetrics.slice(2)];
    expect(validateTemplateForm({ ...base, metrics })).toMatch(/End-of-term component weights/);
  });

  it("rejects a mid-term share without mid-term components", () => {
    expect(
      validateTemplateForm({
        metrics: [{ name: "EXAM", label: "Exam", weight: 100 }],
        gradeScale: base.gradeScale,
        midTermTotal: 30,
      }),
    ).toMatch(/needs at least one mid-term component/);
  });

  it("rejects mid-term components without a mid-term share", () => {
    expect(validateTemplateForm({ ...base, midTermTotal: 0 })).toMatch(
      /mid-term share above 0%/,
    );
  });

  it("rejects an unknown assessment kind", () => {
    const metrics = [{ ...validMetrics[0], kind: "POPTOURNAMENT" }, ...validMetrics.slice(1)];
    expect(validateTemplateForm({ ...base, metrics })).toMatch(/unknown assessment kind/);
  });

  it("accepts every kind in the HCORE catalogue", () => {
    for (const kind of ASSESSMENT_KINDS) {
      const metrics = [{ ...validMetrics[0], kind }, ...validMetrics.slice(1)];
      expect(validateTemplateForm({ ...base, metrics })).toBeNull();
    }
  });

  it("rejects an over-long exact sheet title", () => {
    const metrics = [
      { ...validMetrics[0], assessmentTitle: "x".repeat(201) },
      ...validMetrics.slice(1),
    ];
    expect(validateTemplateForm({ ...base, metrics })).toMatch(/sheet title is too long/);
  });

  it("rejects components without an internal name", () => {
    const metrics = [{ ...validMetrics[0], name: " " }, ...validMetrics.slice(1)];
    expect(validateTemplateForm({ ...base, metrics })).toMatch(/internal name/);
  });

  it("accepts a legacy template with no stages and no share", () => {
    expect(
      validateTemplateForm({
        metrics: [{ name: "EXAM", label: "Exam", weight: 100 }],
        gradeScale: base.gradeScale,
        midTermTotal: 0,
      }),
    ).toBeNull();
  });

  it("rejects overlapping grade bands", () => {
    expect(
      validateTemplateForm({
        ...base,
        gradeScale: [
          { grade: "A", min: 70, max: 100 },
          { grade: "B", min: 60, max: 70 },
        ],
      }),
    ).toMatch(/overlap/);
  });

  it("rejects zero, negative, or fractional category marks", () => {
    expect(
      validateTemplateForm({
        ...base,
        metrics: [
          { name: "Classwork", label: "CW", weight: 0 },
          { name: "Exam", label: "EX", weight: 100 },
        ],
        midTermTotal: 0,
      }),
    ).toMatch(/positive whole number/);

    expect(
      validateTemplateForm({
        ...base,
        metrics: [
          { name: "Classwork", label: "CW", weight: 30.5 },
          { name: "Exam", label: "EX", weight: 69.5 },
        ],
        midTermTotal: 0,
      }),
    ).toMatch(/positive whole number/);
  });

  it("rejects duplicate category names case-insensitively", () => {
    expect(
      validateTemplateForm({
        ...base,
        metrics: [
          { name: "Classwork", label: "CW1", weight: 30 },
          { name: " classwork ", label: "CW2", weight: 70 },
        ],
        midTermTotal: 0,
      }),
    ).toMatch(/Duplicate category name/);
  });
});

describe("Elyon result presets", () => {
  it("keeps the exact Elyon grade bands", () => {
    expect(ELYON_GRADE_SCALE).toEqual([
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
    ]);
  });

  it("creates separate JSS and SSS Mid-term and End-of-term structures summing to 100", () => {
    expect(spreadsheetPreset("SSS", "MID_TERM")).toEqual([
      { name: "Class Exercises", total: 10 },
      { name: "Assignments", total: 10 },
      { name: "Periodic Tests", total: 20 },
      { name: "Mid-term Examination", total: 60 },
    ]);
    expect(spreadsheetPreset("SSS", "END_OF_TERM")).toEqual([
      { name: "Class Exercises", total: 5 },
      { name: "Projects / Assignments", total: 5 },
      { name: "Terminal Examination", total: 70 },
    ]);

    const jssMid = resultTemplatePreset("JSS", "MID_TERM");
    expect(jssMid.midTermTotal).toBe(100);
    expect(validateTemplateForm({ metrics: jssMid.metrics, gradeScale: [...ELYON_GRADE_SCALE], midTermTotal: jssMid.midTermTotal })).toBeNull();
    expect(jssMid.metrics.filter((m) => m.isSingleInstance).map((m) => m.name)).toEqual(["Mid-Term Examination"]);

    const jssEnd = resultTemplatePreset("JSS", "END_OF_TERM");
    expect(jssEnd.midTermTotal).toBe(0);
    expect(validateTemplateForm({ metrics: jssEnd.metrics, gradeScale: [...ELYON_GRADE_SCALE], midTermTotal: jssEnd.midTermTotal })).toBeNull();
    expect(jssEnd.metrics.filter((m) => m.isSingleInstance).map((m) => m.name)).toEqual(["Mid-Term Score", "Examination"]);

    const sssEnd = resultTemplatePreset("SSS", "END_OF_TERM");
    expect(sssEnd.midTermTotal).toBe(0);
    expect(validateTemplateForm({ metrics: sssEnd.metrics, gradeScale: [...ELYON_GRADE_SCALE], midTermTotal: sssEnd.midTermTotal })).toBeNull();
    expect(sssEnd.metrics.map((m) => m.weight)).toEqual([5, 5, 20, 70]);

    expect(detectClassSection("JSS 1A")).toBe("JSS");
    expect(detectClassSection("SSS 2 SCIENCE")).toBe("SSS");
    expect(detectClassSection("SS 1B")).toBe("SSS");
    expect(detectClassSection("Primary 4")).toBe("ALL");
  });
});

describe("metricWarnings", () => {
  it("flags components that matched no sheet", () => {
    const warnings = metricWarnings([{ name: "EXAM", label: "Exam", score: 0, matched: false }]);
    expect(warnings).toEqual(["Exam: matched no sheet — scored 0"]);
  });

  it("flags ambiguous multi-sheet averages and lists the candidates", () => {
    const warnings = metricWarnings([
      {
        name: "EXAM",
        label: "Exam",
        score: 50,
        matched: true,
        ambiguous: true,
        sources: 2,
        candidateTitles: ["Exam A", "Exam B"],
      },
    ]);
    expect(warnings[0]).toMatch(/averaged 2 sheets \(Exam A, Exam B\)/);
  });

  it("returns nothing for clean metrics", () => {
    expect(metricWarnings([{ name: "EXAM", label: "Exam", score: 60, matched: true }])).toEqual([]);
    expect(metricWarnings(undefined)).toEqual([]);
  });
});
