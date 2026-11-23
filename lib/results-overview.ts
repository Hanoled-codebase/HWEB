import { toNumericValue } from "@/lib/spreadsheets";

export type ResultStage = "MID_TERM" | "END_OF_TERM";

export type CompletionStatus = "recorded" | "draft" | "pending";
export type CompletionFilter = "all" | CompletionStatus;
export type PerformanceBand = "all" | "distinction" | "credit" | "support";

export type ResultEdition = {
  key: string;
  title: string;
  academicTerm: string;
  academicYear: string;
  resultType: ResultStage;
  classCount?: number;
  subjectCount?: number;
  totalStudents?: number;
  recordedCount?: number;
  incompleteCount?: number;
  pendingCount?: number;
  averageScore?: number | null;
  studentIds?: string[];
  subjectCountsByStudent?: Record<string, number>;
  isPublished?: boolean;
  totalScore?: number | null;
  grade?: string | null;
  position?: number | null;
  updatedAt?: string | null;
};

export type EditionChildSummary = {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber?: string | null;
  classLevel?: {
    id?: string;
    name?: string | null;
    level?: string | null;
  } | null;
};

export type StaffEditionsResponse = {
  roleScope: "staff";
  editions: ResultEdition[];
};

export type ParentEditionsResponse = {
  roleScope: "parent";
  children: EditionChildSummary[];
  editions: ResultEdition[];
};

export type EditionsApiResponse = StaffEditionsResponse | ParentEditionsResponse;

export type StudentEditionsResponse = {
  student: EditionChildSummary;
  editions: ResultEdition[];
};

export type ResultAssessment = {
  name: string;
  total?: number;
};

export type ResultSheet = {
  id: string;
  assessments?: ResultAssessment[];
  title: string;
  resultType?: string;
  termType?: string;
  academicTerm?: string | null;
  academicYear?: string | null;
  columns: string[];
  values: Array<string | number | null>;
  percentage?: number | null;
  subject?: { id?: string; name?: string | null } | null;
  classLevel?: {
    id?: string;
    name?: string | null;
    level?: string | null;
  } | null;
  updatedAt?: string;
};

export type StudentResultGroup = {
  student: {
    id: string;
    firstName: string;
    lastName: string;
    admissionNumber?: string;
    classLevel?: {
      id?: string;
      name?: string | null;
      level?: string | null;
    } | null;
  };
  results: ResultSheet[];
  approvedTemplate?: {
    id: string;
    name: string;
    classLevelId?: string | null;
    isDefault: boolean;
    isApproved: boolean;
    metrics: Array<{ name: string; label: string; weight: number }>;
    gradeScale: Array<{ grade: string; min: number; max: number }>;
  } | null;
  isTemplateApproved?: boolean;
  expectedSubjectsCount?: number;
  completedSubjectsCount?: number;
  completionStatus?: CompletionStatus;
  averageScore?: number | null;
  classRank?: number | null;
};

export type ComputedResultSummary = {
  totalScore: number;
  grade: string;
  position: number | null;
  published: boolean;
};

export type StudentOverviewRow = {
  studentId: string;
  fullName: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  classId: string;
  className: string;
  completedSubjects: number;
  expectedSubjects: number;
  completionRatio: number;
  completionStatus: CompletionStatus;
  averageScore: number | null;
  classRank: number | null;
  grade: string | null;
  isPublished: boolean;
  isTemplateApproved: boolean;
  group: StudentResultGroup;
};

export type OverviewKpis = {
  totalLearners: number;
  recordedCount: number;
  incompleteCount: number;
  pendingCount: number;
  recordedPercent: number;
  classAverage: number | null;
  midTermDelta: number | null;
  topPerformer: {
    studentId: string;
    name: string;
    averageScore: number;
  } | null;
};

export type SubjectMatrixColumn = {
  key: string;
  name: string;
};

export type SubjectMatrixRow = {
  studentId: string;
  overview: StudentOverviewRow;
  scoresBySubjectKey: ReadonlyMap<string, number | null>;
};

export type SubjectMatrixData = {
  subjects: SubjectMatrixColumn[];
  rows: SubjectMatrixRow[];
  subjectAverages: ReadonlyMap<string, number | null>;
};

const COLLATOR = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

export function formatEditionTitle(term: string, resultType: ResultStage): string {
  const cleanTerm = term.trim() || "First Term";
  if (resultType === "MID_TERM") {
    return /mid-?term/i.test(cleanTerm) ? `${cleanTerm} Result` : `${cleanTerm} Mid-Term Result`;
  }
  return `${cleanTerm} Result`;
}

export function groupEditionsByYear(
  editions: ResultEdition[],
): Array<{ academicYear: string; editions: ResultEdition[] }> {
  const buckets = new Map<string, ResultEdition[]>();
  for (const edition of editions) {
    const year = edition.academicYear?.trim() || "2026/2027";
    let list = buckets.get(year);
    if (!list) {
      list = [];
      buckets.set(year, list);
    }
    list.push(edition);
  }
  return Array.from(buckets.entries()).map(([academicYear, items]) => ({
    academicYear,
    editions: items,
  }));
}

export function formatOrdinalRank(rank: number | null | undefined): string {
  if (typeof rank !== "number" || !Number.isFinite(rank) || rank <= 0) {
    return "—";
  }
  const rounded = Math.trunc(rank);
  const mod100 = rounded % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${rounded}th`;
  switch (rounded % 10) {
    case 1:
      return `${rounded}st`;
    case 2:
      return `${rounded}nd`;
    case 3:
      return `${rounded}rd`;
    default:
      return `${rounded}th`;
  }
}

function getSheetSubjectKey(sheet: ResultSheet): string {
  if (sheet.subject?.id) return sheet.subject.id;
  const cleanName = sheet.subject?.name?.trim().toLowerCase();
  if (cleanName) return `name:${cleanName}`;
  return `sheet:${sheet.id}`;
}

export function computeSheetPercentage(sheet: ResultSheet): number | null {
  if (typeof sheet.percentage === "number" && Number.isFinite(sheet.percentage)) {
    return Math.round(sheet.percentage * 10) / 10;
  }

  const assessments = sheet.assessments?.length
    ? sheet.assessments
    : sheet.columns.map((name) => ({ name, total: undefined }));
  let earned = 0;
  let possible = 0;
  let hasScore = false;

  for (let i = 0; i < sheet.values.length; i += 1) {
    const val = toNumericValue(sheet.values[i]);
    const total = assessments[i]?.total;
    if (val !== null) {
      hasScore = true;
      earned += val;
      if (typeof total === "number" && total > 0) {
        possible += total;
      }
    } else if (typeof total === "number" && total > 0) {
      possible += total;
    }
  }

  if (!hasScore) return null;
  if (possible > 0) {
    return Math.round(((earned / possible) * 100) * 10) / 10;
  }
  return Math.round(earned * 10) / 10;
}

function sheetHasAnyScore(sheet: ResultSheet): boolean {
  return sheet.values.some((v) => v !== null && v !== undefined && v !== "");
}

export function buildStudentOverviewRows(
  groups: StudentResultGroup[],
  computedResultsMap: Record<string, ComputedResultSummary> = {},
): StudentOverviewRow[] {
  // Derive per-class expected unique subjects as fallback when backend field is absent.
  const classSubjects = new Map<string, Set<string>>();
  for (const group of groups) {
    const classId = group.student.classLevel?.id || group.student.classLevel?.name || "unassigned";
    let subjectSet = classSubjects.get(classId);
    if (!subjectSet) {
      subjectSet = new Set<string>();
      classSubjects.set(classId, subjectSet);
    }
    for (const sheet of group.results) {
      subjectSet.add(getSheetSubjectKey(sheet));
    }
  }

  const draftRows: StudentOverviewRow[] = [];
  const needClientRankByClass = new Map<string, Array<{ idx: number; score: number }>>();

  for (let idx = 0; idx < groups.length; idx += 1) {
    const group = groups[idx];
    const student = group.student;
    const classId = student.classLevel?.id || student.classLevel?.name || "unassigned";
    const className = student.classLevel?.name || "Unassigned";

    const scoredSubjectSet = new Set<string>();
    const sheetPercentages: number[] = [];

    for (const sheet of group.results) {
      if (!sheetHasAnyScore(sheet)) continue;
      const subjKey = getSheetSubjectKey(sheet);
      if (!scoredSubjectSet.has(subjKey)) {
        scoredSubjectSet.add(subjKey);
        const pct = computeSheetPercentage(sheet);
        if (pct !== null) sheetPercentages.push(pct);
      }
    }

    const fallbackExpected = classSubjects.get(classId)?.size || scoredSubjectSet.size;
    const rawExpected =
      typeof group.expectedSubjectsCount === "number" && group.expectedSubjectsCount >= 0
        ? group.expectedSubjectsCount
        : fallbackExpected;
    const expectedSubjects = Math.max(rawExpected, 0);

    const rawCompleted =
      typeof group.completedSubjectsCount === "number" && group.completedSubjectsCount >= 0
        ? group.completedSubjectsCount
        : scoredSubjectSet.size;
    const completedSubjects =
      expectedSubjects > 0 ? Math.min(rawCompleted, expectedSubjects) : rawCompleted;

    const computed = computedResultsMap[student.id];

    let completionStatus: CompletionStatus =
      group.completionStatus ||
      (expectedSubjects > 0 && completedSubjects >= expectedSubjects
        ? "recorded"
        : completedSubjects > 0
          ? "draft"
          : "pending");

    if (expectedSubjects === 0 && completedSubjects > 0 && !group.completionStatus) {
      completionStatus = "recorded";
    }

    const fallbackAvg =
      sheetPercentages.length > 0
        ? Math.round(
            (sheetPercentages.reduce((sum, val) => sum + val, 0) / sheetPercentages.length) * 10,
          ) / 10
        : null;

    const averageScore =
      typeof group.averageScore === "number"
        ? group.averageScore
        : computed && typeof computed.totalScore === "number"
          ? Math.round(computed.totalScore * 10) / 10
          : fallbackAvg;

    const classRank =
      typeof group.classRank === "number"
        ? group.classRank
        : computed?.position ?? null;

    const completionRatio =
      expectedSubjects > 0 ? Math.min(1, completedSubjects / expectedSubjects) : 0;

    const row: StudentOverviewRow = {
      studentId: student.id,
      fullName: `${student.firstName} ${student.lastName}`.trim(),
      firstName: student.firstName,
      lastName: student.lastName,
      admissionNumber: student.admissionNumber?.trim() || student.id.slice(-4).toUpperCase(),
      classId,
      className,
      completedSubjects,
      expectedSubjects,
      completionRatio,
      completionStatus,
      averageScore,
      classRank,
      grade: computed?.grade ?? null,
      isPublished: Boolean(computed?.published),
      isTemplateApproved: Boolean(group.isTemplateApproved),
      group,
    };

    if (row.classRank === null && row.averageScore !== null) {
      let bucket = needClientRankByClass.get(classId);
      if (!bucket) {
        bucket = [];
        needClientRankByClass.set(classId, bucket);
      }
      bucket.push({ idx: draftRows.length, score: row.averageScore });
    }

    draftRows.push(row);
  }

  for (const list of needClientRankByClass.values()) {
    list.sort((a, b) => b.score - a.score);
    let lastScore: number | null = null;
    let lastRank = 0;
    for (let i = 0; i < list.length; i += 1) {
      const item = list[i];
      const rank = lastScore !== null && item.score === lastScore ? lastRank : i + 1;
      lastScore = item.score;
      lastRank = rank;
      draftRows[item.idx].classRank = rank;
    }
  }

  return draftRows;
}

export function computeOverviewKpis(
  rows: StudentOverviewRow[],
  midTermAverage: number | null = null,
): OverviewKpis {
  const totalLearners = rows.length;
  let recordedCount = 0;
  let incompleteCount = 0;
  let pendingCount = 0;
  let scoreSum = 0;
  let scoreCount = 0;
  let topPerformer: OverviewKpis["topPerformer"] = null;

  for (const row of rows) {
    if (row.completionStatus === "recorded") recordedCount += 1;
    else if (row.completionStatus === "draft") incompleteCount += 1;
    else pendingCount += 1;

    if (typeof row.averageScore === "number") {
      scoreSum += row.averageScore;
      scoreCount += 1;
      if (!topPerformer || row.averageScore > topPerformer.averageScore) {
        topPerformer = {
          studentId: row.studentId,
          name: row.fullName,
          averageScore: row.averageScore,
        };
      }
    }
  }

  const classAverage =
    scoreCount > 0 ? Math.round((scoreSum / scoreCount) * 10) / 10 : null;
  const midTermDelta =
    classAverage !== null && typeof midTermAverage === "number"
      ? Math.round((classAverage - midTermAverage) * 10) / 10
      : null;

  return {
    totalLearners,
    recordedCount,
    incompleteCount,
    pendingCount,
    recordedPercent: totalLearners > 0 ? Math.round((recordedCount / totalLearners) * 100) : 0,
    classAverage,
    midTermDelta,
    topPerformer,
  };
}

export function filterOverviewRows(
  rows: StudentOverviewRow[],
  filters: {
    classId: string;
    status: CompletionFilter;
    performance: PerformanceBand;
    search: string;
  },
): StudentOverviewRow[] {
  const query = filters.search.trim().toLowerCase();
  return rows.filter((row) => {
    if (filters.classId !== "all" && row.classId !== filters.classId) {
      return false;
    }
    if (filters.status !== "all" && row.completionStatus !== filters.status) {
      return false;
    }
    if (filters.performance !== "all") {
      if (row.averageScore === null) return false;
      if (filters.performance === "distinction" && row.averageScore < 75) return false;
      if (
        filters.performance === "credit" &&
        (row.averageScore < 50 || row.averageScore >= 75)
      ) {
        return false;
      }
      if (filters.performance === "support" && row.averageScore >= 50) return false;
    }
    if (query) {
      const hayName = row.fullName.toLowerCase();
      const hayAdm = row.admissionNumber.toLowerCase();
      const hayClass = row.className.toLowerCase();
      if (!hayName.includes(query) && !hayAdm.includes(query) && !hayClass.includes(query)) {
        return false;
      }
    }
    return true;
  });
}

export function buildSubjectMatrix(rows: StudentOverviewRow[]): SubjectMatrixData {
  const subjectMap = new Map<string, SubjectMatrixColumn>();
  const subjectTotals = new Map<string, { sum: number; count: number }>();

  const matrixRows: SubjectMatrixRow[] = rows.map((overview) => {
    const scoresBySubjectKey = new Map<string, number | null>();
    for (const sheet of overview.group.results) {
      if (!sheetHasAnyScore(sheet)) continue;
      const key = getSheetSubjectKey(sheet);
      const name = sheet.subject?.name?.trim() || sheet.title || "Subject";
      if (!subjectMap.has(key)) {
        subjectMap.set(key, { key, name });
      }
      if (!scoresBySubjectKey.has(key)) {
        const pct = computeSheetPercentage(sheet);
        scoresBySubjectKey.set(key, pct);
        if (pct !== null) {
          const prev = subjectTotals.get(key) || { sum: 0, count: 0 };
          prev.sum += pct;
          prev.count += 1;
          subjectTotals.set(key, prev);
        }
      }
    }
    return {
      studentId: overview.studentId,
      overview,
      scoresBySubjectKey,
    };
  });

  const subjects = Array.from(subjectMap.values()).sort((a, b) =>
    COLLATOR.compare(a.name, b.name),
  );

  const subjectAverages = new Map<string, number | null>();
  for (const subject of subjects) {
    const stat = subjectTotals.get(subject.key);
    subjectAverages.set(
      subject.key,
      stat && stat.count > 0 ? Math.round((stat.sum / stat.count) * 10) / 10 : null,
    );
  }

  return { subjects, rows: matrixRows, subjectAverages };
}

function sanitizeCsvCell(raw: string): string {
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  if (safe.includes(",") || safe.includes('"') || safe.includes("\n")) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

export function buildOverviewCsvContent(rows: StudentOverviewRow[]): string {
  const header = [
    "Student Name",
    "Admission No",
    "Class",
    "Subjects Completed",
    "Expected Subjects",
    "Status",
    "Average (%)",
    "Class Rank",
  ];
  const lines = [header.map(sanitizeCsvCell).join(",")];
  for (const row of rows) {
    const line = [
      row.fullName,
      row.admissionNumber,
      row.className,
      String(row.completedSubjects),
      String(row.expectedSubjects),
      row.completionStatus === "recorded"
        ? "Recorded"
        : row.completionStatus === "draft"
          ? "Incomplete"
          : "Pending",
      row.averageScore !== null ? row.averageScore.toFixed(1) : "—",
      formatOrdinalRank(row.classRank),
    ];
    lines.push(line.map(sanitizeCsvCell).join(","));
  }
  return lines.join("\n");
}

export function exportOverviewRowsToCsv(rows: StudentOverviewRow[], filename: string): void {
  const csv = buildOverviewCsvContent(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
