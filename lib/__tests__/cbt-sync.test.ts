import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SyncQueueItem } from "../cbt-offline";

const mocks = vi.hoisted(() => ({
  edgeMode: false,
  offline: {
    getPendingSyncs: vi.fn(),
    removeSyncItem: vi.fn(),
    removeLease: vi.fn(),
    incrementRetry: vi.fn(),
    markSyncFailed: vi.fn(),
    isOnline: vi.fn(() => true),
    onBackOnline: vi.fn(),
    clearAutoSave: vi.fn(),
  },
  toastSuccess: vi.fn(),
}));

vi.mock("../cbt-offline", () => mocks.offline);
vi.mock("../api", () => ({
  get EDGE_MODE() {
    return mocks.edgeMode;
  },
  HCBT_BASE: "https://cbt.test",
}));
vi.mock("sonner", () => ({ toast: { success: mocks.toastSuccess } }));

const { buildSubmitOperations } = await vi.importActual<typeof import("../cbt-offline")>("../cbt-offline");
const { startSyncWorker } = await import("../cbt-sync");

function queued(overrides: Partial<SyncQueueItem> = {}): SyncQueueItem {
  const answers = { "q-1": 2 };
  return {
    id: "item-1",
    examId: "exam-1",
    attemptId: "attempt-1",
    leaseToken: "lease-token",
    answers,
    operations: buildSubmitOperations(answers, false, 0, "2026-09-29T10:00:00.000Z"),
    cheating: false,
    submittedAt: "2026-09-29T10:00:00.000Z",
    retries: 0,
    ...overrides,
  };
}

function reply(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

const fetchMock = vi.fn();
let stop: (() => void) | undefined;

// Runs one flush of the queue: the worker processes it immediately on start.
async function flush(items: SyncQueueItem[]) {
  mocks.offline.getPendingSyncs.mockResolvedValue(items);
  stop = startSyncWorker();
  await vi.waitFor(() => expect(mocks.offline.getPendingSyncs).toHaveBeenCalled());
  await new Promise((resolve) => setTimeout(resolve, 0));
  await vi.waitFor(() => {
    const settled =
      mocks.offline.removeSyncItem.mock.calls.length +
      mocks.offline.markSyncFailed.mock.calls.length +
      mocks.offline.incrementRetry.mock.calls.length;
    expect(settled).toBeGreaterThanOrEqual(items.filter((item) => !item.failed).length);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.edgeMode = false;
  mocks.offline.isOnline.mockReturnValue(true);
  mocks.offline.onBackOnline.mockReturnValue(() => {});
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  stop?.();
  stop = undefined;
  vi.unstubAllGlobals();
});

describe("offline submission sync", () => {
  it("sends the operation log to the attempt's sync endpoint, then clears the saved copy", async () => {
    fetchMock.mockResolvedValue(reply(200, { status: "submitted", acknowledgedSequence: 2 }));
    const item = queued();

    await flush([item]);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://cbt.test/api/student/exam-1/offline/sync");
    expect(init).toMatchObject({ method: "POST", credentials: "omit" });
    expect(JSON.parse(init.body)).toEqual({
      attemptId: "attempt-1",
      leaseToken: "lease-token",
      operations: item.operations,
    });
    expect(mocks.offline.removeSyncItem).toHaveBeenCalledWith("item-1");
    expect(mocks.offline.clearAutoSave).toHaveBeenCalledWith("exam-1");
    expect(mocks.toastSuccess).toHaveBeenCalled();
  });

  it("keeps a submission the server rejects instead of deleting it", async () => {
    fetchMock.mockResolvedValue(reply(403, { code: "OFFLINE_LEASE_REVOKED", error: "Offline lease is no longer valid" }));

    await flush([queued()]);

    expect(mocks.offline.markSyncFailed).toHaveBeenCalledWith(
      "item-1",
      expect.stringContaining("OFFLINE_LEASE_REVOKED"),
      expect.objectContaining({ code: "OFFLINE_LEASE_REVOKED" }),
    );
    expect(mocks.offline.removeSyncItem).not.toHaveBeenCalled();
  });

  it("hands a submission that is too late to sync to the school for review", async () => {
    fetchMock
      .mockResolvedValueOnce(reply(401, { code: "OFFLINE_LEASE_INVALID", error: "Invalid or expired offline attempt lease" }))
      .mockResolvedValueOnce(reply(200, { status: "awaiting_review" }));
    const item = queued();

    await flush([item]);

    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe("https://cbt.test/api/student/exam-1/offline/late");
    expect(JSON.parse(init.body)).toEqual({
      attemptId: "attempt-1",
      leaseToken: "lease-token",
      operations: item.operations,
      submittedAt: item.submittedAt,
    });
    expect(mocks.offline.markSyncFailed).toHaveBeenCalledWith(
      "item-1",
      expect.stringContaining("OFFLINE_LEASE_INVALID"),
      { code: "OFFLINE_LEASE_INVALID", sentForReview: true },
    );
    expect(mocks.offline.removeSyncItem).not.toHaveBeenCalled();
  });

  it("clears a reviewed submission once the school accepts it", async () => {
    fetchMock.mockResolvedValue(reply(200, { status: "accepted" }));
    const waiting = queued({ failed: { at: "2026-09-30T10:00:00.000Z", reason: "401", sentForReview: true } });

    await flush([waiting]);
    await vi.waitFor(() => expect(mocks.offline.removeSyncItem).toHaveBeenCalledWith("item-1"));

    expect(fetchMock.mock.calls[0][0]).toBe("https://cbt.test/api/student/exam-1/offline/late");
  });

  it("tries the review again later when the network drops", async () => {
    fetchMock
      .mockResolvedValueOnce(reply(401, { code: "OFFLINE_LEASE_INVALID", error: "expired" }))
      .mockRejectedValueOnce(new TypeError("Failed to fetch"));

    await flush([queued()]);

    expect(mocks.offline.incrementRetry).toHaveBeenCalledWith("item-1");
    expect(mocks.offline.markSyncFailed).not.toHaveBeenCalled();
  });

  it.each([
    ["the network is down", () => Promise.reject(new TypeError("Failed to fetch"))],
    ["the server errors", () => Promise.resolve(reply(503, { error: "Unavailable" }))],
  ])("retries later when %s, keeping the submission", async (_label, respond) => {
    fetchMock.mockImplementation(respond);

    await flush([queued()]);

    expect(mocks.offline.incrementRetry).toHaveBeenCalledWith("item-1");
    expect(mocks.offline.markSyncFailed).not.toHaveBeenCalled();
    expect(mocks.offline.removeSyncItem).not.toHaveBeenCalled();
  });

  it("sends long logs in chunks the endpoint accepts (250 operations)", async () => {
    const answers = Object.fromEntries(Array.from({ length: 299 }, (_, i) => [`q-${i}`, i % 4]));
    const item = queued({ answers, operations: buildSubmitOperations(answers, false, 0, "2026-09-29T10:00:00.000Z") });
    fetchMock
      .mockResolvedValueOnce(reply(200, { status: "started", acknowledgedSequence: 250, gapAt: null }))
      .mockResolvedValueOnce(reply(200, { status: "submitted", acknowledgedSequence: 300 }));

    await flush([item]);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).operations).toHaveLength(250);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).operations).toHaveLength(50);
    expect(mocks.offline.removeSyncItem).toHaveBeenCalledWith("item-1");
  });

  it("keeps an item the server can't place in sequence as failed", async () => {
    fetchMock.mockResolvedValue(reply(200, { status: "started", acknowledgedSequence: 0, gapAt: 1 }));

    await flush([queued()]);

    expect(mocks.offline.markSyncFailed).toHaveBeenCalledWith("item-1", expect.stringContaining("missing operation 1"), expect.anything());
  });

  it("keeps an item queued without a lease as failed and never sends it", async () => {
    await flush([queued({ leaseToken: "" })]);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(mocks.offline.markSyncFailed).toHaveBeenCalledWith("item-1", "Queued without an offline lease", expect.anything());
  });

  it("leaves items already marked failed alone", async () => {
    await flush([queued({ failed: { at: "2026-09-29T10:00:00.000Z", reason: "401" } })]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uses the Edge appliance's own route and answer map in Edge mode", async () => {
    mocks.edgeMode = true;
    fetchMock.mockResolvedValue(reply(200, { ok: true }));

    await flush([queued()]);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://cbt.test/api/offline/sync");
    expect(JSON.parse(init.body)).toEqual({ leaseToken: "lease-token", attemptId: "attempt-1", answers: { "q-1": 2 } });
    expect(mocks.offline.removeSyncItem).toHaveBeenCalledWith("item-1");
  });
});

describe("startSyncWorker", () => {
  it("runs one shared worker however many pages start it", () => {
    const unsubscribe = vi.fn();
    mocks.offline.onBackOnline.mockReturnValue(unsubscribe);
    mocks.offline.getPendingSyncs.mockResolvedValue([]);

    const stopExamPage = startSyncWorker();
    const stopDashboard = startSyncWorker();
    expect(mocks.offline.onBackOnline).toHaveBeenCalledTimes(1);

    stopExamPage();
    stopExamPage(); // releasing twice must not stop the other page's worker
    expect(unsubscribe).not.toHaveBeenCalled();

    stopDashboard();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
