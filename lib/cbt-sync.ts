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
class PermanentSyncError extends Error {}

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
  throw new PermanentSyncError(message);
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

/** Attempt to sync a single queued item */
async function syncOne(item: SyncQueueItem): Promise<void> {
  if (item.failed) return;

  try {
    if (!item.leaseToken) throw new PermanentSyncError('Queued without an offline lease');
    await (EDGE_MODE ? syncToEdge(item) : syncToCloud(item));

    // Cleanup on success
    await removeSyncItem(item.id);
    await removeLease(item.examId);
    clearAutoSave(item.examId);
    console.log(`[CBT Sync] Successfully synced attempt ${item.attemptId}`);
    toast.success('Your saved exam has been submitted.');
  } catch (err) {
    if (err instanceof PermanentSyncError) {
      console.error(`[CBT Sync] Server rejected attempt ${item.attemptId}; keeping it for recovery:`, err.message);
      await markSyncFailed(item.id, err.message);
      return;
    }
    // Network or server hiccup: keep the item and try again on the next tick.
    console.warn(`[CBT Sync] Failed to sync attempt ${item.attemptId}:`, err);
    await incrementRetry(item.id);
  }
}

let processing = false;

/** Process all pending items in the sync queue */
async function processQueue(): Promise<void> {
  if (!isOnline() || processing) return;
  processing = true;

  try {
    const pending = (await getPendingSyncs()).filter((item) => !item.failed);
    if (pending.length === 0) return;

    console.log(`[CBT Sync] Processing ${pending.length} pending submission(s)...`);

    for (const item of pending) {
      await syncOne(item);
    }
  } finally {
    processing = false;
  }
}

function runWorker(): () => void {
  // Immediately attempt to flush the queue
  processQueue();

  // Set up periodic polling
  const intervalId = setInterval(processQueue, SYNC_INTERVAL_MS);

  // Also flush when the browser comes back online
  const unsubOnline = onBackOnline(() => {
    console.log('[CBT Sync] Browser came back online — flushing queue...');
    processQueue();
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
