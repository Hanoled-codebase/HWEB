export interface ImportableAssessment {
  id?: string;
  name: string;
  total?: number;
  maxObtainableScore?: number;
}

export interface ImportableStudentRow {
  student?: {
    id?: string;
    firstName?: string | null;
    lastName?: string | null;
    admissionNumber?: string | null;
  } | null;
  studentId?: string;
  values: Array<number | string | null>;
}

export interface SpreadsheetImportSummary<T extends ImportableStudentRow> {
  updatedRows: T[];
  matchedStudents: number;
  updatedCells: number;
  unmatchedRows: number;
  invalidCells: string[];
}

function escapeCsvCell(value: unknown): string {
  const raw = value === null || value === undefined ? "" : String(value);
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

function normalizeHeader(value: string): string {
  return value
    .replace(/^\uFEFF/, "")
    .replace(/\(\s*\/\s*\d+(?:\.\d+)?\s*\)/g, "")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .toLowerCase();
}

function normalizePersonKey(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function buildSpreadsheetTemplateCsv(
  assessments: ImportableAssessment[],
  rows: ImportableStudentRow[],
): string {
  const headers = [
    "Admission Number",
    "Student Name",
    ...assessments.map((a) => {
      const max = a.maxObtainableScore ?? a.total;
      return typeof max === "number" && max > 0 ? `${a.name} (/${max})` : a.name;
    }),
  ];

  const lines: string[] = [headers.map(escapeCsvCell).join(",")];
  for (const row of rows) {
    const admission = row.student?.admissionNumber || "";
    const fullName = [row.student?.firstName, row.student?.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();
    const values = assessments.map((_, idx) => {
      const val = row.values[idx];
      return val === null || val === undefined ? "" : val;
    });
    lines.push([admission, fullName, ...values].map(escapeCsvCell).join(","));
  }
  return `\uFEFF${lines.join("\r\n")}`;
}

export function downloadSpreadsheetTemplateCsv(
  title: string,
  assessments: ImportableAssessment[],
  rows: ImportableStudentRow[],
): void {
  const csv = buildSpreadsheetTemplateCsv(assessments, rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const safeName = (title || "spreadsheet")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "spreadsheet";
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${safeName}-template.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/**
 * Parses RFC 4180 CSV or TSV text into a 2D array of cell strings.
 * Runs in O(N) time over input length without regex backtracking.
 */
export function parseDelimitedTable(text: string): string[][] {
  const cleaned = text.replace(/^\uFEFF/, "");
  const firstLine = cleaned.split(/\r?\n/, 1)[0] || "";
  const delimiter =
    firstLine.includes("\t") && !firstLine.includes(",") ? "\t" : ",";

  const table: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < cleaned.length; i += 1) {
    const ch = cleaned[i];
    if (inQuotes) {
      if (ch === '"') {
        if (cleaned[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(cell);
      cell = "";
    } else if (ch === "\r" || ch === "\n") {
      if (ch === "\r" && cleaned[i + 1] === "\n") {
        i += 1;
      }
      row.push(cell);
      if (row.some((c) => c.trim().length > 0)) {
        table.push(row);
      }
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    if (row.some((c) => c.trim().length > 0)) {
      table.push(row);
    }
  }

  return table;
}

export function parseSpreadsheetScoreImport<T extends ImportableStudentRow>(
  fileText: string,
  assessments: ImportableAssessment[],
  existingRows: T[],
): SpreadsheetImportSummary<T> {
  const table = parseDelimitedTable(fileText);
  if (table.length < 2) {
    throw new Error("The uploaded file must contain a header row and at least one student row.");
  }

  const headerRow = table[0];
  const normalizedHeaders = headerRow.map(normalizeHeader);

  const admissionColIdx = normalizedHeaders.findIndex(
    (h) => h === "admission number" || h === "admission no" || h === "student id" || h === "reg no",
  );
  const nameColIdx = normalizedHeaders.findIndex(
    (h) => h === "student name" || h === "name" || h === "full name" || h === "student",
  );

  if (admissionColIdx === -1 && nameColIdx === -1) {
    throw new Error("Could not find an 'Admission Number' or 'Student Name' column in the file.");
  }

  // O(1) header -> assessment index lookup
  const assessmentByName = new Map<string, number>();
  assessments.forEach((a, idx) => {
    assessmentByName.set(normalizeHeader(a.name), idx);
  });

  const columnToAssessmentIdx = new Map<number, number>();
  normalizedHeaders.forEach((header, colIdx) => {
    if (colIdx === admissionColIdx || colIdx === nameColIdx) return;
    const matchedIdx = assessmentByName.get(header);
    if (matchedIdx !== undefined) {
      columnToAssessmentIdx.set(colIdx, matchedIdx);
    }
  });

  if (columnToAssessmentIdx.size === 0) {
    throw new Error(
      "None of the score columns matched this spreadsheet's assessments. Download the format first to ensure column headers match.",
    );
  }

  // O(1) student lookup maps (admission number primary, normalized name fallback)
  const rowIdxByAdmission = new Map<string, number>();
  const rowIdxByName = new Map<string, number>();
  const updatedRows: T[] = existingRows.map((row, idx) => {
    const admission = row.student?.admissionNumber;
    if (admission) {
      rowIdxByAdmission.set(normalizePersonKey(admission), idx);
    }
    const fullName = [row.student?.firstName, row.student?.lastName]
      .filter(Boolean)
      .join(" ");
    if (fullName) {
      rowIdxByName.set(normalizePersonKey(fullName), idx);
    }
    const revName = [row.student?.lastName, row.student?.firstName]
      .filter(Boolean)
      .join(" ");
    if (revName && !rowIdxByName.has(normalizePersonKey(revName))) {
      rowIdxByName.set(normalizePersonKey(revName), idx);
    }
    return {
      ...row,
      values: [...row.values],
    };
  });

  const matchedStudentIndices = new Set<number>();
  let updatedCells = 0;
  let unmatchedRows = 0;
  const invalidCells: string[] = [];

  for (let r = 1; r < table.length; r += 1) {
    const line = table[r];
    const admissionVal =
      admissionColIdx >= 0 ? normalizePersonKey(line[admissionColIdx] || "") : "";
    const nameVal =
      nameColIdx >= 0 ? normalizePersonKey(line[nameColIdx] || "") : "";

    let targetIdx: number | undefined;
    if (admissionVal) {
      targetIdx = rowIdxByAdmission.get(admissionVal);
    }
    if (targetIdx === undefined && nameVal) {
      targetIdx = rowIdxByName.get(nameVal);
    }

    if (targetIdx === undefined) {
      unmatchedRows += 1;
      continue;
    }

    matchedStudentIndices.add(targetIdx);
    const targetRow = updatedRows[targetIdx];

    for (const [colIdx, assessmentIdx] of columnToAssessmentIdx.entries()) {
      const rawCell = (line[colIdx] ?? "").trim();
      if (rawCell === "") continue;
      const numeric = Number(rawCell);
      const assessment = assessments[assessmentIdx];
      const maxMarks = assessment.maxObtainableScore ?? assessment.total;
      if (!Number.isFinite(numeric) || numeric < 0) {
        invalidCells.push(`Row ${r + 1} (${assessment.name}): "${rawCell}" is not a valid score`);
        continue;
      }
      if (typeof maxMarks === "number" && maxMarks > 0 && numeric > maxMarks) {
        invalidCells.push(
          `Row ${r + 1} (${assessment.name}): ${numeric} exceeds max ${maxMarks}`,
        );
        continue;
      }
      targetRow.values[assessmentIdx] = numeric;
      updatedCells += 1;
    }
  }

  return {
    updatedRows,
    matchedStudents: matchedStudentIndices.size,
    updatedCells,
    unmatchedRows,
    invalidCells,
  };
}
