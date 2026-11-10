import { describe, expect, it } from "vitest";
import {
  isGenericPostAuthTarget,
  isParentOnlyAccount,
  resolveParentDashboardPath,
} from "../parent-routing";

describe("isParentOnlyAccount", () => {
  it("returns true when the user only holds PARENT in HSMS", () => {
    expect(
      isParentOnlyAccount([
        {
          id: "org-1",
          slug: "greenfield",
          products: { HSMS: { status: "ACTIVE", roles: ["PARENT"] } },
        },
      ]),
    ).toBe(true);
  });

  it("returns true when the user holds GUARDIAN across multiple schools", () => {
    expect(
      isParentOnlyAccount([
        { id: "org-1", slug: "greenfield", products: { HSMS: { roles: ["PARENT"] } } },
        { id: "org-2", slug: "oakridge", products: { HSMS: { roles: ["GUARDIAN"] } } },
      ]),
    ).toBe(true);
  });

  it("returns false for dual-role users (parent + teacher or CBT examiner)", () => {
    expect(
      isParentOnlyAccount([
        {
          id: "org-1",
          slug: "greenfield",
          products: {
            HSMS: { roles: ["PARENT", "TEACHER"] },
            HCBT: { roles: ["EXAMINER"] },
          },
        },
      ]),
    ).toBe(false);
  });

  it("returns false for staff, students, candidates, and empty roles", () => {
    expect(
      isParentOnlyAccount([
        { id: "org-1", slug: "greenfield", products: { HSMS: { roles: ["SCHOOL_ADMIN"] } } },
      ]),
    ).toBe(false);
    expect(
      isParentOnlyAccount([
        {
          id: "org-1",
          slug: "greenfield",
          products: { HSMS: { roles: ["STUDENT"] }, HCBT: { roles: ["CANDIDATE"] } },
        },
      ]),
    ).toBe(false);
    expect(isParentOnlyAccount([])).toBe(false);
  });

  it("falls back to login roles when contexts are unavailable", () => {
    expect(isParentOnlyAccount([], ["PARENT"])).toBe(true);
    expect(isParentOnlyAccount([], ["TEACHER"])).toBe(false);
  });
});

describe("resolveParentDashboardPath", () => {
  const orgs = [
    { id: "id-1", slug: "alpha-school" },
    { id: "id-2", slug: "greenfield" },
  ];

  it("prefers the requested organization slug or id", () => {
    expect(resolveParentDashboardPath(orgs, "greenfield")).toBe("/dashboard/school/greenfield");
    expect(resolveParentDashboardPath(orgs, "id-2")).toBe("/dashboard/school/greenfield");
  });

  it("falls back to the first organization or fallback slug or /dashboard", () => {
    expect(resolveParentDashboardPath(orgs)).toBe("/dashboard/school/alpha-school");
    expect(resolveParentDashboardPath([], null, "greenfield")).toBe("/dashboard/school/greenfield");
    expect(resolveParentDashboardPath([])).toBe("/dashboard");
  });
});

describe("isGenericPostAuthTarget", () => {
  it("treats generic landing routes and unsafe URLs as generic", () => {
    expect(isGenericPostAuthTarget(null)).toBe(true);
    expect(isGenericPostAuthTarget("/welcome")).toBe(true);
    expect(isGenericPostAuthTarget("/dashboard")).toBe(true);
    expect(isGenericPostAuthTarget("/")).toBe(true);
    expect(isGenericPostAuthTarget("https://evil.example")).toBe(true);
  });

  it("preserves explicit deep links", () => {
    expect(isGenericPostAuthTarget("/dashboard/school/greenfield/invoices")).toBe(false);
    expect(isGenericPostAuthTarget("/dashboard/school/greenfield/results?student=1")).toBe(false);
  });
});
