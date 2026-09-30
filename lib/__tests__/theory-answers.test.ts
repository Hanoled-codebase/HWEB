import { describe, expect, it } from "vitest";
import { buildSubmitOperations } from "../cbt-offline";
import { isAnswered, useExamStore } from "../../store/exam";

describe("theory answers", () => {
  it("travel in the offline log as text, beside chosen options", () => {
    const ops = buildSubmitOperations({ "q-mcq": 2, "q-essay": "Plants use light." }, false, 4, "2026-09-30T10:00:00.000Z");
    expect(ops.map((op) => [op.sequence, op.type, op.selectedOption, op.text])).toEqual([
      [5, "ANSWER_SET", 2, undefined],
      [6, "ANSWER_SET", undefined, "Plants use light."],
      [7, "SUBMIT_INTENT", undefined, undefined],
    ]);
  });

  it("count as answered only when something is typed", () => {
    expect(isAnswered("An answer")).toBe(true);
    expect(isAnswered("   ")).toBe(false);
    expect(isAnswered(0)).toBe(true);
    expect(isAnswered(null)).toBe(false);
  });

  it("are sent to HCBT as textAnswer", () => {
    useExamStore.setState({ answers: { "q-mcq": 1, "q-essay": "Because.", "q-skip": null } });
    expect(useExamStore.getState().getFormattedAnswers()).toEqual([
      { questionId: "q-mcq", selectedOption: 1 },
      { questionId: "q-essay", selectedOption: null, textAnswer: "Because." },
      { questionId: "q-skip", selectedOption: null },
    ]);
  });
});
