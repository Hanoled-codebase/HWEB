import { describe, expect, it } from "vitest";
import { isSafeRedirectUrl } from "../safe-redirect";

describe("isSafeRedirectUrl", () => {
  it("allows safe relative paths", () => {
    expect(isSafeRedirectUrl("/dashboard")).toBe(true);
    expect(isSafeRedirectUrl("/dashboard/school/greenfield")).toBe(true);
    expect(isSafeRedirectUrl("/cbt/student?orgSlug=greenfield")).toBe(true);
    expect(isSafeRedirectUrl("/welcome")).toBe(true);
    expect(isSafeRedirectUrl("/signin?callbackUrl=%2Fdashboard")).toBe(true);
  });

  it("blocks protocol-relative URLs (//evil.com)", () => {
    expect(isSafeRedirectUrl("//evil.com")).toBe(false);
    expect(isSafeRedirectUrl("//attacker.com/steal")).toBe(false);
    expect(isSafeRedirectUrl("///evil.com")).toBe(false);
  });

  it("blocks backslash escapes (/\\evil.com)", () => {
    expect(isSafeRedirectUrl("/\\evil.com")).toBe(false);
    expect(isSafeRedirectUrl("/\\attacker.com/steal")).toBe(false);
    expect(isSafeRedirectUrl("/\\\\evil.com")).toBe(false);
  });

  it("blocks absolute URLs and non-http schemes", () => {
    expect(isSafeRedirectUrl("https://evil.com")).toBe(false);
    expect(isSafeRedirectUrl("http://evil.com")).toBe(false);
    expect(isSafeRedirectUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeRedirectUrl("data:text/html,evil")).toBe(false);
  });

  it("blocks empty, null, or undefined values", () => {
    expect(isSafeRedirectUrl("")).toBe(false);
    expect(isSafeRedirectUrl(null)).toBe(false);
    expect(isSafeRedirectUrl(undefined)).toBe(false);
  });
});
