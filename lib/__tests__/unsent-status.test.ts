import { describe, expect, it } from "vitest";
import { unsentStatus } from "../../components/cbt/UnsentSubmissions";

const at = "2026-09-30T10:00:00.000Z";

describe("unsentStatus", () => {
  it("tells a student a late submission is with the school, and lets them check on it", () => {
    expect(unsentStatus({ at, reason: "401", code: "OFFLINE_LEASE_INVALID", sentForReview: true })).toMatchObject({
      tone: "waiting",
      canRetry: true,
    });
  });

  it("doesn't offer a retry that can't work", () => {
    for (const code of ["DISMISSED", "OFFLINE_LEASE_REVOKED", "ATTEMPT_NOT_FOUND"]) {
      expect(unsentStatus({ at, reason: "x", code })).toMatchObject({ tone: "problem", canRetry: false });
    }
  });

  it("offers a retry for anything else", () => {
    expect(unsentStatus({ at, reason: "409 CANONICAL_REGISTRATION_REQUIRED", code: "CANONICAL_REGISTRATION_REQUIRED" }).canRetry).toBe(true);
    expect(unsentStatus({ at, reason: "Server is missing operation 3" }).canRetry).toBe(true);
  });
});
