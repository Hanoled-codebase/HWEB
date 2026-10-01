import { describe, expect, it } from "vitest";
import { greetingName } from "../greeting-name";

describe("greetingName", () => {
  it("greets an untitled name by first name", () => {
    expect(greetingName("Ngozi Obi")).toBe("Ngozi");
    expect(greetingName("Ada")).toBe("Ada");
  });

  it("keeps a title with the surname instead of greeting the title", () => {
    expect(greetingName("Dr Amaka Eze")).toBe("Dr Eze");
    expect(greetingName("Mrs Ngozi Obi")).toBe("Mrs Obi");
    expect(greetingName("Mr. Adebayo Okafor")).toBe("Mr. Okafor");
    expect(greetingName("Chief Dr Musa Bello")).toBe("Chief Dr Bello");
  });

  it("copes with a title and one name, stray spaces and nothing at all", () => {
    expect(greetingName("Mr Okafor")).toBe("Mr Okafor");
    expect(greetingName("  Funmi   Adeyemi ")).toBe("Funmi");
    expect(greetingName("Dr")).toBe("Dr");
    expect(greetingName("")).toBe("");
    expect(greetingName(undefined)).toBe("");
  });
});
