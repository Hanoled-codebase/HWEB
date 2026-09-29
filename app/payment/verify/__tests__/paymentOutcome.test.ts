import { describe, expect, it } from "vitest";
import { paymentOutcome } from "../PaymentVerify";

describe("paymentOutcome", () => {
  it("reports paid only when the provider confirms success", () => {
    expect(paymentOutcome("success")).toBe("paid");
  });

  it.each(["abandoned", "pending", "ongoing", "processing", "queued", "PENDING", "PARTIALLY_PAID"])(
    "treats %s as not completed yet",
    (status) => {
      expect(paymentOutcome(status)).toBe("incomplete");
    },
  );

  it.each(["failed", "reversed", "EXPIRED", undefined])("treats %s as failed, never as paid", (status) => {
    expect(paymentOutcome(status)).toBe("failed");
  });
});
