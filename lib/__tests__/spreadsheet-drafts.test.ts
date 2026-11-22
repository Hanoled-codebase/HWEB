import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  buildSpreadsheetBackupCsv,
  buildSpreadsheetDraftKey,
  clearSpreadsheetDraft,
  extractDirtyAssessmentDraft,
  extractDirtyRelationalDraft,
  loadSpreadsheetDraft,
  mergeDraftIntoSpreadsheetRows,
  sanitizeCsvCell,
  saveSpreadsheetDraft,
} from "../spreadsheet-drafts";
import type { SpreadsheetAssessment, SpreadsheetRow } from "../spreadsheets";

function createMockStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  };
}

describe("spreadsheet-drafts", () => {
  const originalWindow = globalThis.window;

  beforeEach(() => {
    const localStorage = createMockStorage();
    Object.defineProperty(globalThis, "window", {
      value: { localStorage },
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, "window", {
      value: originalWindow,
      configurable: true,
      writable: true,
    });
  });

  it("saves, loads, and clears local score drafts", () => {
    const key = buildSpreadsheetDraftKey("dpc", "sheet-1", "assessment:0");
    saveSpreadsheetDraft(key, { "stu-1": { "0": "5" } });

    const loaded = loadSpreadsheetDraft(key);
    expect(loaded?.valuesByStudent).toEqual({ "stu-1": { "0": "5" } });

    clearSpreadsheetDraft(key);
    expect(loadSpreadsheetDraft(key)).toBeNull();
  });

  it("discards malformed JSON gracefully", () => {
    const key = buildSpreadsheetDraftKey("dpc", "sheet-bad");
    window.localStorage.setItem(key, "{not-json");
    expect(loadSpreadsheetDraft(key)).toBeNull();
  });

  it("extracts only dirty scores and merges without mutating server rows", () => {
    const assessments: SpreadsheetAssessment[] = [
      { id: "sub-1", name: "Classwork", maxObtainableScore: 5, total: 5 },
      { id: "sub-2", name: "Test", maxObtainableScore: 20, total: 20 },
    ];
    const serverRows: SpreadsheetRow[] = [
      { student: { id: "stu-1", firstName: "Miracle", lastName: "Amandiana", admissionNumber: "DPC-1" }, values: ["", "12"] },
      { student: { id: "stu-2", firstName: "Henry", lastName: "Ajenifuja", admissionNumber: "DPC-2" }, values: ["4", "15"] },
    ];
    const localRows: SpreadsheetRow[] = [
      { student: { id: "stu-1", firstName: "Miracle", lastName: "Amandiana", admissionNumber: "DPC-1" }, values: ["5", "12"] },
      { student: { id: "stu-2", firstName: "Henry", lastName: "Ajenifuja", admissionNumber: "DPC-2" }, values: ["4", "15"] },
    ];

    const dirtySingle = extractDirtyAssessmentDraft(serverRows, localRows, 0, "sub-1");
    expect(dirtySingle).toEqual({ "stu-1": { "sub-1": "5" } });

    const savedMap = new Map<string, Array<string | number | null>>(
      serverRows
        .filter((r): r is SpreadsheetRow & { student: { id: string } } => Boolean(r.student.id))
        .map((r) => [r.student.id, r.values]),
    );
    const dirtyRelational = extractDirtyRelationalDraft(savedMap, localRows, assessments);
    expect(dirtyRelational).toEqual({ "stu-1": { "sub-1": "5" } });

    const merged = mergeDraftIntoSpreadsheetRows(serverRows, assessments, dirtyRelational);
    expect(merged.restoredCount).toBe(1);
    expect(merged.rows[0].values).toEqual(["5", "12"]);
    // Server rows stay unmutated
    expect(serverRows[0].values).toEqual(["", "12"]);
  });

  it("neutralizes CSV formula injection prefixes and formats backup CSV", () => {
    expect(sanitizeCsvCell("=CMD|' /C calc'!A0")).toBe("'=CMD|' /C calc'!A0");
    expect(sanitizeCsvCell("+123")).toBe("'+123");
    expect(sanitizeCsvCell("-5")).toBe("'-5");
    expect(sanitizeCsvCell("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(sanitizeCsvCell('Obi, "Ada"')).toBe('"Obi, ""Ada"""');

    const csv = buildSpreadsheetBackupCsv(
      [{ name: "Classwork", total: 5 }],
      [{ student: { id: "stu-1", firstName: "Miracle", lastName: "Amandiana", admissionNumber: "DPC-2026-00013" }, values: ["5"] }],
    );
    expect(csv).toBe("Admission Number,Student Name,Classwork (/5)\r\nDPC-2026-00013,Miracle Amandiana,5");
  });
});
