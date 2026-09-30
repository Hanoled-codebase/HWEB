import { describe, expect, it } from "vitest";
import { passwordRules } from "../password-policy";

const allMet = (value: string, audience: "learner" | "staff") => passwordRules(value, audience).every((rule) => rule.met);

describe("passwordRules", () => {
  it("asks a student for 8 characters that aren't a simple run", () => {
    expect(allMet("mangoes4ever", "learner")).toBe(true);
    expect(allMet("mango4", "learner")).toBe(false);
    expect(allMet("12345678", "learner")).toBe(false);
    expect(allMet("hgfedcba", "learner")).toBe(false);
    expect(allMet("aaaaaaaa", "learner")).toBe(false);
  });

  it("asks staff for 12 characters of three kinds", () => {
    expect(allMet("mangoes4ever", "staff")).toBe(false);
    expect(allMet("Correct-Horse-42", "staff")).toBe(true);
  });
});
