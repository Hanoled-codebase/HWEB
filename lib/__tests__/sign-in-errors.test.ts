import { describe, expect, it } from "vitest";
import { signInFailure } from "../sign-in-errors";

const GENERIC = "Something went wrong signing in. Please try again.";
const PRISMA_TEXT =
  "Invalid `prisma.organization.findFirst()` invocation: The column `organizations.leaverRetentionYears` does not exist in the current database.";

function response(status: number, correlationId: string | null = null) {
  return { status, headers: { get: (name: string) => (name === "x-correlation-id" ? correlationId : null) } };
}

describe("signInFailure", () => {
  it("shows HCORE's own message for a deliberate sign-in error", () => {
    expect(signInFailure(response(401), { error: "Invalid credentials", code: "INVALID_CREDENTIALS" }, GENERIC)).toEqual({
      error: "Invalid credentials",
    });
    expect(signInFailure(response(429), { error: "Account is temporarily locked", code: "ACCOUNT_LOCKED" }, GENERIC)).toEqual({
      error: "Account is temporarily locked",
    });
  });

  it("shows a server fault as the generic message and HCORE's reference", () => {
    const body = { error: GENERIC, code: "INTERNAL_SERVER_ERROR", correlationId: "3f1c2b1e-9a4d-4c55-8f0e-2d7b6a1c9e10" };
    expect(signInFailure(response(500), body, GENERIC)).toEqual({
      error: GENERIC,
      reference: "3f1c2b1e-9a4d-4c55-8f0e-2d7b6a1c9e10",
    });
  });

  it("never shows Prisma text an older HCORE sent as a bare 400", () => {
    const failure = signInFailure(response(400, "0b9d6c52-1f3e-4a7b-9c2d-5e8f1a3b4c6d"), { error: PRISMA_TEXT }, GENERIC);
    expect(failure).toEqual({ error: GENERIC, reference: "0b9d6c52-1f3e-4a7b-9c2d-5e8f1a3b4c6d" });
    expect(JSON.stringify(failure)).not.toMatch(/prisma|leaverRetentionYears/i);
  });

  it("copes with a response that was not JSON", () => {
    expect(signInFailure(response(502), null, GENERIC)).toEqual({ error: GENERIC });
  });
});
