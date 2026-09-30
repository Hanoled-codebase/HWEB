import { describe, expect, it } from "vitest";
import { MAX_OPTIONS, optionLabel } from "../cbt-options";

describe("optionLabel", () => {
  it("letters choices A to F", () => {
    expect(Array.from({ length: MAX_OPTIONS }, (_, i) => optionLabel(i)).join("")).toBe("ABCDEF");
  });
});
