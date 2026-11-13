import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { state, apiFetchMock } = vi.hoisted(() => ({
  state: {
    effects: [] as Array<() => void | (() => void)>,
    user: { id: "user-1" } as { id: string } | null,
  },
  apiFetchMock: vi.fn(async () => ({
    notifications: [],
    unreadCount: 0,
    attention: [],
  })),
}));

vi.mock("react", () => ({
  useState: <T>(initial: T) => [initial, vi.fn()],
  useCallback: <T extends (...args: never[]) => unknown>(fn: T) => fn,
  useEffect: (fn: () => void | (() => void)) => {
    state.effects.push(fn);
  },
}));

vi.mock("@/lib/api", () => ({
  apiFetch: apiFetchMock,
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: state.user }),
}));

vi.mock("@/lib/attendance", () => ({
  localDay: () => "2026-11-12",
}));

import { useNotifications } from "../useNotifications";

describe("useNotifications", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    state.effects = [];
    state.user = { id: "user-1" };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("loads once on login and never schedules background polling", async () => {
    const hook = useNotifications();
    expect(state.effects).toHaveLength(1);

    state.effects[0]();
    await Promise.resolve();
    await Promise.resolve();
    expect(apiFetchMock).toHaveBeenCalledTimes(1);
    expect(apiFetchMock).toHaveBeenCalledWith(
      "/notifications?date=2026-11-12",
      { showErrorToast: false },
    );

    // Advance well past the old 30s/5m intervals: nothing self-triggers.
    await vi.advanceTimersByTimeAsync(15 * 60_000);
    expect(apiFetchMock).toHaveBeenCalledTimes(1);

    // Explicit refresh (e.g. clicking the notification bell) fetches again.
    await hook.refresh();
    expect(apiFetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not fetch when no user is signed in", async () => {
    state.user = null;
    useNotifications();
    state.effects[0]();
    await Promise.resolve();
    await Promise.resolve();
    expect(apiFetchMock).not.toHaveBeenCalled();
  });
});
