import { describe, expect, it } from "vitest";
import { resolvePostResetRedirect } from "../reset-password-routing";

describe("resolvePostResetRedirect", () => {
  it("redirects student to school-branded student portal", () => {
    expect(
      resolvePostResetRedirect({ school: "greenfield", audience: "student" })
    ).toBe("/signin/student?school=greenfield");
  });

  it("redirects parent to school-branded parent portal", () => {
    expect(
      resolvePostResetRedirect({ school: "elyon-college", audience: "parent" })
    ).toBe("/signin/parent?school=elyon-college");
  });

  it("redirects teacher/staff to school-branded staff portal", () => {
    expect(
      resolvePostResetRedirect({ school: "greenfield", audience: "teacher" })
    ).toBe("/signin/staff?school=greenfield");
    expect(
      resolvePostResetRedirect({ school: "greenfield", audience: "staff" })
    ).toBe("/signin/staff?school=greenfield");
  });

  it("redirects correctly when no school is provided", () => {
    expect(resolvePostResetRedirect({ audience: "student" })).toBe("/signin/student");
    expect(resolvePostResetRedirect({ audience: "parent" })).toBe("/signin/parent");
    expect(resolvePostResetRedirect({ audience: "staff" })).toBe("/signin/staff");
    expect(resolvePostResetRedirect()).toBe("/signin");
  });

  it("redirects general users with school slug to general signin with school query", () => {
    expect(resolvePostResetRedirect({ school: "greenfield" })).toBe("/signin?school=greenfield");
  });
});

