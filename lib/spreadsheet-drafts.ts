import {
  getStudentName,
  type SpreadsheetAssessment,
  type SpreadsheetRow,
} from "./spreadsheets";

const STORAGE_PREFIX = "hanoled.spreadsheet.draft.v1";

export type DraftValuesByStudent = Record<string, Record<string, string>>;

export interface SpreadsheetDraftRecord {
  savedAt: string;
  valuesByStudent: DraftValuesByStudent;
}

export function buildSpreadsheetDraftKey(
  orgSlug: string,
  sheetId: string,
  scope = "sheet",
): string {
  return `${STORAGE_PREFIX}:${orgSlug}:${sheetId}:${scope}`;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function loadSpreadsheetDraft(key: string): SpreadsheetDraftRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isPlainRecord(parsed) || !isPlainRecord(parsed.valuesByStudent)) {
      window.localStorage.removeItem(key);
      return null;
    }

    const sanitized: DraftValuesByStudent = {};
    let entryCount = 0;

    for (const [studentId, cols] of Object.entries(parsed.valuesByStudent)) {
      if (!studentId || !isPlainRecord(cols)) continue;
      const cleanCols: Record<string, string> = {};
      for (const [colKey, val] of Object.entries(cols)) {
        if (typeof val === "string") {
          cleanCols[colKey] = val;
          entryCount += 1;
        }
      }
      if (Object.keys(cleanCols).length > 0) {
        sanitized[studentId] = cleanCols;
      }
    }

    if (entryCount === 0) {
      window.localStorage.removeItem(key);
      return null;
    }

    return {
      savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt : new Date().toISOString(),
      valuesByStudent: sanitized,
    };
  } catch {
    return null;
  }
}

export function saveSpreadsheetDraft(
  key: string,
  valuesByStudent: DraftValuesByStudent,
): void {
  if (typeof window === "undefined") return;
  try {
    const hasEntries = Object.values(valuesByStudent).some(
      (cols) => Object.keys(cols).length > 0,
    );
    if (!hasEntries) {
      window.localStorage.removeItem(key);
      return;
    }
    const payload: SpreadsheetDraftRecord = {
      savedAt: new Date().toISOString(),
      valuesByStudent,
    };
    window.localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // Ignore storage quota or private-mode errors — in-memory state still stays intact.
  }
}

export function clearSpreadsheetDraft(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage access errors.
  }
}

export function extractDirtyAssessmentDraft(
  serverRows: SpreadsheetRow[],
  localRows: SpreadsheetRow[],
  assessmentIndex: number,
  columnKey: string,
): DraftValuesByStudent {
  const serverByStudentId = new Map<string, SpreadsheetRow>();
  for (const row of serverRows) {
    if (row.student?.id) serverByStudentId.set(row.student.id, row);
  }

  const dirty: DraftValuesByStudent = {};
  for (const row of localRows) {
    const studentId = row.student?.id;
    if (!studentId) continue;
    const before = serverByStudentId.get(studentId)?.values?.[assessmentIndex] ?? "";
    const after = row.values?.[assessmentIndex] ?? "";
    if (String(before) !== String(after)) {
      dirty[studentId] = { [columnKey]: String(after) };
    }
  }
  return dirty;
}

export function extractDirtyRelationalDraft(
  savedValuesByStudentId: Map<string, Array<string | number | null>>,
  localRows: SpreadsheetRow[],
  assessments: SpreadsheetAssessment[],
): DraftValuesByStudent {
  const dirty: DraftValuesByStudent = {};
  for (const row of localRows) {
    const studentId = row.student?.id;
    if (!studentId) continue;
    const savedValues = savedValuesByStudentId.get(studentId);
    let studentChanges: Record<string, string> | null = null;
    for (let colIndex = 0; colIndex < assessments.length; colIndex += 1) {
      const colKey = assessments[colIndex]?.id || String(colIndex);
      const before = savedValues?.[colIndex] ?? "";
      const after = row.values?.[colIndex] ?? "";
      if (String(before) !== String(after)) {
        if (!studentChanges) studentChanges = {};
        studentChanges[colKey] = String(after);
      }
    }
    if (studentChanges) {
      dirty[studentId] = studentChanges;
    }
  }
  return dirty;
}

export function mergeDraftIntoSpreadsheetRows(
  serverRows: SpreadsheetRow[],
  assessments: SpreadsheetAssessment[],
  valuesByStudent: DraftValuesByStudent,
): { rows: SpreadsheetRow[]; restoredCount: number } {
  const colIndexByKey = new Map<string, number>();
  for (let i = 0; i < assessments.length; i += 1) {
    const subId = assessments[i]?.id;
    if (subId) colIndexByKey.set(subId, i);
    colIndexByKey.set(String(i), i);
  }

  let restoredCount = 0;
  const rows = serverRows.map((row) => {
    const studentId = row.student?.id;
    const draftCols = studentId ? valuesByStudent[studentId] : undefined;
    const nextValues = Array.isArray(row.values) ? [...row.values] : [];
    if (!draftCols) {
      return { student: { ...row.student }, values: nextValues };
    }

    for (const [colKey, draftVal] of Object.entries(draftCols)) {
      const colIndex = colIndexByKey.get(colKey);
      if (colIndex === undefined) continue;
      while (nextValues.length <= colIndex) nextValues.push("");
      if (String(nextValues[colIndex] ?? "") !== draftVal) {
        nextValues[colIndex] = draftVal;
        restoredCount += 1;
      }
    }

    return { student: { ...row.student }, values: nextValues };
  });

  return { rows, restoredCount };
}

/**
 * Neutralize CSV Formula Injection (DDE) for cells starting with formula
 * prefixes (`=`, `+`, `-`, `@`, tab, CR) and quote per RFC 4180.
 */
export function sanitizeCsvCell(raw: string | number | null | undefined): string {
  const text = raw === null || raw === undefined ? "" : String(raw);
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  if (/[",\r\n]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

export function buildSpreadsheetBackupCsv(
  assessments: SpreadsheetAssessment[],
  rows: SpreadsheetRow[],
): string {
  const header = [
    "Admission Number",
    "Student Name",
    ...assessments.map((a) => {
      const max = a.maxObtainableScore ?? a.total;
      return typeof max === "number" ? `${a.name} (/${max})` : a.name;
    }),
  ]
    .map((cell) => sanitizeCsvCell(cell))
    .join(",");

  const bodyLines = rows.map((row) => {
    const cells: Array<string | number | null | undefined> = [
      row.student.admissionNumber || "",
      getStudentName(row.student),
      ...assessments.map((_, idx) => row.values?.[idx] ?? ""),
    ];
    return cells.map((cell) => sanitizeCsvCell(cell)).join(",");
  });

  return [header, ...bodyLines].join("\r\n");
}

export function downloadSpreadsheetBackupCsv(
  filenameBase: string,
  assessments: SpreadsheetAssessment[],
  rows: SpreadsheetRow[],
): void {
  if (typeof window === "undefined") return;
  const csv = buildSpreadsheetBackupCsv(assessments, rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const safeBase = filenameBase.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-|-$/g, "") || "scores";
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${safeBase}-backup.csv`;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
