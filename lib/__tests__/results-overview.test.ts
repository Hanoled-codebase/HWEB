import { describe, expect, it } from "vitest";
import {
  buildOverviewCsvContent,
  buildStudentOverviewRows,
  buildSubjectMatrix,
  computeOverviewKpis,
  filterOverviewRows,
  formatEditionTitle,
  formatOrdinalRank,
  groupEditionsByYear,
  type ResultEdition,
  type StudentResultGroup,
} from "../results-overview";

const makeGroup = (
  id: string,
  firstName: string,
  lastName: string,
  opts: {
    classId?: string;
    className?: string;
    subjects?: Array<{ id: string; name: string; score: number | null; total?: number }>;
    expectedSubjectsCount?: number;
    completedSubjectsCount?: number;
    completionStatus?: "recorded" | "draft" | "pending";
    averageScore?: number | null;
    classRank?: number | null;
  } = {},
): StudentResultGroup => {
  const classId = opts.classId ?? "sss2b";
  const className = opts.className ?? "SSS 2B";
  return {
    student: {
      id,
      firstName,
      lastName,
      admissionNumber: `HNL-${id}`,
      classLevel: { id: classId, name: className },
    },
    isTemplateApproved: true,
    expectedSubjectsCount: opts.expectedSubjectsCount,
    completedSubjectsCount: opts.completedSubjectsCount,
    completionStatus: opts.completionStatus,
    averageScore: opts.averageScore,
    classRank: opts.classRank,
    results: (opts.subjects ?? []).map((s, idx) => ({
      id: `sheet-${id}-${idx}`,
      title: `${s.name} - ${className}`,
      assessments: [{ name: "Total", total: s.total ?? 100 }],
      columns: ["Total"],
      values: s.score === null ? [] : [s.score],
      subject: { id: s.id, name: s.name },
      classLevel: { id: classId, name: className },
    })),
  };
};

describe("results-overview helpers", () => {
  it("formats edition titles and groups editions cleanly by year", () => {
    expect(formatEditionTitle("First Term", "MID_TERM")).toBe("First Term Mid-Term Result");
    expect(formatEditionTitle("First Term", "END_OF_TERM")).toBe("First Term Result");
    expect(formatEditionTitle("Second Term", "END_OF_TERM")).toBe("Second Term Result");

    const editions: ResultEdition[] = [
      { key: "2026/2027|First Term|MID_TERM", title: "First Term Mid-Term Result", academicTerm: "First Term", academicYear: "2026/2027", resultType: "MID_TERM" },
      { key: "2026/2027|First Term|END_OF_TERM", title: "First Term Result", academicTerm: "First Term", academicYear: "2026/2027", resultType: "END_OF_TERM" },
      { key: "2025/2026|Third Term|END_OF_TERM", title: "Third Term Result", academicTerm: "Third Term", academicYear: "2025/2026", resultType: "END_OF_TERM" },
    ];
    const grouped = groupEditionsByYear(editions);
    expect(grouped).toHaveLength(2);
    expect(grouped[0].academicYear).toBe("2026/2027");
    expect(grouped[0].editions).toHaveLength(2);
    expect(grouped[1].academicYear).toBe("2025/2026");
  });

  it("formats ordinal ranks accurately including teens (11th, 12th, 13th)", () => {
    expect(formatOrdinalRank(1)).toBe("1st");
    expect(formatOrdinalRank(2)).toBe("2nd");
    expect(formatOrdinalRank(3)).toBe("3rd");
    expect(formatOrdinalRank(4)).toBe("4th");
    expect(formatOrdinalRank(11)).toBe("11th");
    expect(formatOrdinalRank(12)).toBe("12th");
    expect(formatOrdinalRank(21)).toBe("21st");
    expect(formatOrdinalRank(null)).toBe("—");
  });

  it("clamps completed subjects to expected subjects, computes tied competition ranks, and derives KPIs", () => {
    const groups: StudentResultGroup[] = [
      makeGroup("1", "Emmanuel", "Ibrahim", {
        expectedSubjectsCount: 2,
        completedSubjectsCount: 3, // clamp invariant guard
        subjects: [
          { id: "mth", name: "Mathematics", score: 90 },
          { id: "eng", name: "English", score: 80 },
        ],
      }),
      makeGroup("2", "Funmi", "Oluwaseun", {
        expectedSubjectsCount: 2,
        subjects: [
          { id: "mth", name: "Mathematics", score: 85 },
          { id: "eng", name: "English", score: 85 },
        ],
      }),
      makeGroup("3", "Chidi", "Eze", {
        expectedSubjectsCount: 2,
        subjects: [{ id: "mth", name: "Mathematics", score: 60 }],
      }),
      makeGroup("4", "Dorcas", "Samuel", {
        expectedSubjectsCount: 2,
        subjects: [],
      }),
    ];

    const rows = buildStudentOverviewRows(groups);
    expect(rows[0].completedSubjects).toBe(2);
    expect(rows[0].averageScore).toBe(85);
    expect(rows[0].classRank).toBe(1);
    expect(rows[1].averageScore).toBe(85);
    expect(rows[1].classRank).toBe(1);
    expect(rows[2].completionStatus).toBe("draft");
    expect(rows[2].classRank).toBe(3);
    expect(rows[3].completionStatus).toBe("pending");
    expect(rows[3].classRank).toBeNull();

    const kpis = computeOverviewKpis(rows, 70);
    expect(kpis.totalLearners).toBe(4);
    expect(kpis.recordedCount).toBe(2);
    expect(kpis.incompleteCount).toBe(1);
    expect(kpis.pendingCount).toBe(1);
    expect(kpis.recordedPercent).toBe(50);
    expect(kpis.classAverage).toBe(76.7);
    expect(kpis.midTermDelta).toBe(6.7);
    expect(kpis.topPerformer?.name).toBe("Emmanuel Ibrahim");
  });

  it("filters rows across class, status, performance band, and search query", () => {
    const groups: StudentResultGroup[] = [
      makeGroup("1", "Anjola", "Abodunrin", {
        classId: "sss2b",
        subjects: [{ id: "mth", name: "Mathematics", score: 78 }],
        expectedSubjectsCount: 1,
      }),
      makeGroup("2", "Chidi", "Eze", {
        classId: "sss2b",
        subjects: [{ id: "mth", name: "Mathematics", score: 42 }],
        expectedSubjectsCount: 2,
      }),
    ];
    const rows = buildStudentOverviewRows(groups);

    expect(
      filterOverviewRows(rows, { classId: "all", status: "recorded", performance: "distinction", search: "anjola" }),
    ).toHaveLength(1);
    expect(
      filterOverviewRows(rows, { classId: "all", status: "all", performance: "support", search: "" }),
    ).toHaveLength(1);
  });

  it("builds O(1) lookup Subject Performance Matrix and handles 500+ students smoothly", () => {
    const groups = Array.from({ length: 600 }, (_, i) =>
      makeGroup(String(i + 1), "Learner", `#${i + 1}`, {
        expectedSubjectsCount: 3,
        subjects: [
          { id: "mth", name: "Mathematics", score: 50 + (i % 45) },
          { id: "eng", name: "English", score: 55 + (i % 40) },
          { id: "bio", name: "Biology", score: 60 + (i % 35) },
        ],
      }),
    );

    const start = performance.now();
    const rows = buildStudentOverviewRows(groups);
    const matrix = buildSubjectMatrix(rows);
    const elapsedMs = performance.now() - start;

    expect(matrix.subjects.map((s) => s.name)).toEqual(["Biology", "English", "Mathematics"]);
    expect(matrix.rows).toHaveLength(600);
    expect(matrix.rows[0].scoresBySubjectKey.get("mth")).toBe(50);
    expect(matrix.subjectAverages.get("mth")).toBeGreaterThan(60);
    expect(elapsedMs).toBeLessThan(100);
  });

  it("sanitizes CSV formula prefixes on overview export", () => {
    const rows = buildStudentOverviewRows([
      makeGroup("1", "=HYPERLINK(\"http://evil\")", "User", {
        subjects: [{ id: "mth", name: "Mathematics", score: 88 }],
        expectedSubjectsCount: 1,
      }),
    ]);
    const csv = buildOverviewCsvContent(rows);
    expect(csv).toContain("'=HYPERLINK");
  });
});
