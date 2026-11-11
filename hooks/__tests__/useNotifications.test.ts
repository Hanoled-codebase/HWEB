import { describe, expect, it } from "vitest";
import { nextPollDelay } from "../useNotifications";

// The notification poll backs off exponentially instead of hammering the
// backend on a fixed interval: a dead session used to 401-flood HSMS every
// 30s for as long as a tab stayed open (each poll also firing the refresh
// chain), which showed up as the Vercel CPU spike in Nov 2026.
describe("nextPollDelay", () => {
  it("starts at the 30s base interval", () => {
    expect(nextPollDelay(0)).toBe(30_000);
  });

  it("doubles on every consecutive failure", () => {
    expect(nextPollDelay(1)).toBe(60_000);
    expect(nextPollDelay(2)).toBe(120_000);
    expect(nextPollDelay(3)).toBe(240_000);
  });

  it("caps the wait at five minutes", () => {
    expect(nextPollDelay(4)).toBe(300_000);
    expect(nextPollDelay(50)).toBe(300_000);
  });

  it("never produces a zero or negative delay", () => {
    for (let n = 0; n < 12; n += 1) {
      expect(nextPollDelay(n)).toBeGreaterThan(0);
    }
  });
});
