import { afterEach, describe, expect, it } from "vitest";
import { buildSubmitOperations } from "../cbt-offline";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const SUBMITTED_AT = "2026-09-29T10:00:00.000Z";

describe("buildSubmitOperations", () => {
  const realRandomUUID = crypto.randomUUID;
  afterEach(() => {
    Object.defineProperty(crypto, "randomUUID", { value: realRandomUUID, configurable: true });
  });

  it("logs each answer, then the submission, continuing the server's sequence", () => {
    const operations = buildSubmitOperations({ "q-1": 2, "q-2": 0 }, false, 4, SUBMITTED_AT);

    expect(operations.map((op) => [op.sequence, op.type, op.questionId, op.selectedOption])).toEqual([
      [5, "ANSWER_SET", "q-1", 2],
      [6, "ANSWER_SET", "q-2", 0],
      [7, "SUBMIT_INTENT", undefined, undefined],
    ]);
    expect(operations.at(-1)?.payload).toEqual({ cheating: false });
    expect(operations.every((op) => op.clientTimestamp === SUBMITTED_AT)).toBe(true);
  });

  it("carries the proctoring flag and still submits with no answers", () => {
    expect(buildSubmitOperations({}, true, 0, SUBMITTED_AT)).toEqual([
      expect.objectContaining({ sequence: 1, type: "SUBMIT_INTENT", payload: { cheating: true } }),
    ]);
  });

  it("gives every operation a distinct v4 UUID, which the sync endpoint requires", () => {
    const ids = buildSubmitOperations({ a: 1, b: 2, c: 3 }, false, 0, SUBMITTED_AT).map((op) => op.operationId);
    expect(new Set(ids).size).toBe(ids.length);
    ids.forEach((id) => expect(id).toMatch(UUID));
  });

  it("still makes valid UUIDs where crypto.randomUUID is missing (plain-http LAN pages)", () => {
    Object.defineProperty(crypto, "randomUUID", { value: undefined, configurable: true });
    const ids = buildSubmitOperations({ a: 1 }, false, 0, SUBMITTED_AT).map((op) => op.operationId);
    ids.forEach((id) => expect(id).toMatch(UUID));
  });
});
