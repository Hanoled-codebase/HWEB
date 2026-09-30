/**
 * CBT Background Sync Service
 *
 * Watches for pending offline exam submissions in IndexedDB and replays them
 * to HCBT once the browser is online:
 *   - Cloud: POST /api/student/:examId/offline/sync with the ordered operation
 *     log built at enqueue time.
 *   - Edge appliance: POST /api/offline/sync with the plain answer map.
 * Both endpoints authenticate with the attempt's offline lease, not the
 * browser session, which may have expired while the student was offline.
 *
 * A device offline past its lease (the deadline plus the upload grace) can't
 * sync any more. Its whole log then goes to POST /api/student/:examId/offline/late,
 * where a school admin accepts or dismisses it, instead of staying stuck here.
 *
 * Usage:
 *   import { startSyncWorker } from '@/lib/cbt-sync';
 *   // Call once when CBT student pages mount
 *   const cleanup = startSyncWorker();
 *   // Call cleanup() on unmount
 */

import { toast } from 'sonner';
import { EDGE_MODE, HCBT_BASE } from './api';
import {
  getPendingSyncs,
  removeSyncItem,
  removeLease,
  incrementRetry,
  markSyncFailed,
  isOnline,
  onBackOnline,
  clearAutoSave,
  type SyncQueueItem,
} from './cbt-offline';

const SYNC_INTERVAL_MS = 30_000; // 30 seconds
const MAX_OPERATIONS_PER_REQUEST = 250; // HCBT's offlineSyncSchema limit

/** The server rejected the submission; resending it unchanged won't help. */
class PermanentSyncError extends Error {
  constructor(message: string, readonly code?: string) {
    super(message);
  }
}

interface SyncResponse {
  status?: string;
  gapAt?: number | null;
  code?: string;
  error?: string;
}

// Plain fetch rather than the shared request(): a lease rejection must not
// trigger request()'s session refresh / sign-out redirect or its error toasts.
async function postSync(path: string, body: unknown): Promise<SyncResponse> {
  const response = await fetch(`${HCBT_BASE}${path}`, {
    method: 'POST',
    credentials: 'omit',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data: SyncResponse = await response.json().catch(() => ({}));
  if (response.ok) return data;

  const message = `${response.status} ${data.code ?? ''} ${data.error ?? response.statusText}`.trim();
  if (response.status >= 500 || response.status === 408 || response.status === 429) {
    throw new Error(message);
  }
  throw new PermanentSyncError(message, data.code);
}

async function syncToCloud(item: SyncQueueItem): Promise<void> {
  const operations = item.operations ?? [];
  if (operations.length === 0) throw new PermanentSyncError('Queued without an operation log');

  const path = `/api/student/${encodeURIComponent(item.examId)}/offline/sync`;
  for (let i = 0; i < operations.length; i += MAX_OPERATIONS_PER_REQUEST) {
    const result = await postSync(path, {
      attemptId: item.attemptId,
      leaseToken: item.leaseToken,
      operations: operations.slice(i, i + MAX_OPERATIONS_PER_REQUEST),
    });
    // Also covers an attempt that was already submitted, e.g. an online submit
    // that went through just before the connection dropped.
    if (result.status === 'submitted') return;
    if (result.gapAt) throw new PermanentSyncError(`Server is missing operation ${result.gapAt}`);
  }
  throw new PermanentSyncError('Server acknowledged the submission but did not finalize it');
}

async function syncToEdge(item: SyncQueueItem): Promise<void> {
  await postSync('/api/offline/sync', {
    leaseToken: item.leaseToken,
    attemptId: item.attemptId,
    answers: item.answers,
  });
}

async function done(item: SyncQueueItem, message: string): Promise<void> {
  await removeSyncItem(item.id);
  await removeLease(item.examId);
  clearAutoSave(item.examId);
  toast.success(message);
}

/**
 * Too late to sync: hand the whole log to the school. Also how the device
 * learns the school's decision later (the endpoint answers with it).
 */
async function sendForReview(item: SyncQueueItem, reason: string): Promise<void> {
  const { status } = await postSync(`/api/student/${encodeURIComponent(item.examId)}/offline/late`, {
    attemptId: item.attemptId,
    leaseToken: item.leaseToken,
    operations: item.operations,
    submittedAt: item.submittedAt,
  });
  if (status === 'accepted' || status === 'submitted') {
    await done(item, 'Your school accepted your saved exam.');
  } else if (status === 'dismissed') {
    await markSyncFailed(item.id, 'The school did not accept this late submission', { code: 'DISMISSED' });
  } else {
    await markSyncFailed(item.id, reason, { code: 'OFFLINE_LEASE_INVALID', sentForReview: true });
  }
}

/** Attempt to sync a single queued item */
async function syncOne(item: SyncQueueItem): Promise<void> {
  if (item.failed && !item.failed.sentForReview) return;

  try {
    if (item.failed?.sentForReview) {
      await sendForReview(item, item.failed.reason);
      return;
    }
    if (!item.leaseToken) throw new PermanentSyncError('Queued without an offline lease');
    await (EDGE_MODE ? syncToEdge(item) : syncToCloud(item));
    await done(item, 'Your saved exam has been submitted.');
    console.log(`[CBT Sync] Successfully synced attempt ${item.attemptId}`);
  } catch (err) {
    const tooLate = err instanceof PermanentSyncError && err.code === 'OFFLINE_LEASE_INVALID';
    if (tooLate && !EDGE_MODE && item.operations?.length && !item.failed) {
      try {
        await sendForReview(item, err.message);
      } catch (reviewErr) {
        if (reviewErr instanceof PermanentSyncError) await markSyncFailed(item.id, reviewErr.message, { code: reviewErr.code });
        else await incrementRetry(item.id);
      }
      return;
    }
    if (err instanceof PermanentSyncError) {
      console.error(`[CBT Sync] Server rejected attempt ${item.attemptId}; keeping it for recovery:`, err.message);
      await markSyncFailed(item.id, err.message, { code: err.code, sentForReview: item.failed?.sentForReview });
      return;
    }
    // Network or server hiccup: keep the item and try again on the next tick.
    console.warn(`[CBT Sync] Failed to sync attempt ${item.attemptId}:`, err);
    await incrementRetry(item.id);
  }
}

let processing = false;

/**
 * Process all pending items in the sync queue. Items waiting on the school's
 * review are asked about only when `checkReviews` is set (once per worker
 * start, or on request), not every tick.
 */
async function processQueue(checkReviews = false): Promise<void> {
  if (!isOnline() || processing) return;
  processing = true;

  try {
    const pending = (await getPendingSyncs()).filter(
      (item) => !item.failed || (checkReviews && item.failed.sentForReview),
    );
    if (pending.length === 0) return;

    console.log(`[CBT Sync] Processing ${pending.length} pending submission(s)...`);

    for (const item of pending) {
      await syncOne(item);
    }
  } finally {
    processing = false;
  }
}

/** Try the queue now, including asking about submissions the school is reviewing. */
export function syncNow(): Promise<void> {
  return processQueue(true);
}

function runWorker(): () => void {
  // Immediately attempt to flush the queue
  processQueue(true);

  // Set up periodic polling
  const intervalId = setInterval(() => processQueue(), SYNC_INTERVAL_MS);

  // Also flush when the browser comes back online
  const unsubOnline = onBackOnline(() => {
    console.log('[CBT Sync] Browser came back online — flushing queue...');
    processQueue(true);
  });

  return () => {
    clearInterval(intervalId);
    unsubOnline();
  };
}

let workerUsers = 0;
let stopWorker: (() => void) | null = null;

/**
 * Start the background sync worker.
 * Several pages may start it; one shared worker runs until the last of them
 * calls its cleanup function.
 */
export function startSyncWorker(): () => void {
  workerUsers += 1;
  if (!stopWorker) stopWorker = runWorker();

  let released = false;
  return () => {
    if (released) return;
    released = true;
    workerUsers -= 1;
    if (workerUsers === 0 && stopWorker) {
      stopWorker();
      stopWorker = null;
    }
  };
}
