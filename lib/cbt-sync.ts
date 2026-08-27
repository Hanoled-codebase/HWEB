/**
 * CBT Background Sync Service
 *
 * Watches for pending offline exam submissions in IndexedDB and
 * pushes them to POST /api/cbt/offline/sync once the browser is online.
 *
 * Usage:
 *   import { startSyncWorker } from '@/lib/cbt-sync';
 *   // Call once when CBT student pages mount
 *   const cleanup = startSyncWorker();
 *   // Call cleanup() on unmount
 */

import { cbtApi } from './api-cbt';
import {
  getPendingSyncs,
  removeSyncItem,
  removeLease,
  incrementRetry,
  isOnline,
  onBackOnline,
  clearAutoSave,
  type SyncQueueItem,
} from './cbt-offline';

const MAX_RETRIES = 5;
const SYNC_INTERVAL_MS = 30_000; // 30 seconds

/** Attempt to sync a single queued item */
async function syncOne(item: SyncQueueItem): Promise<boolean> {
  try {
    await cbtApi.syncOfflineAttempt({
      leaseToken: item.leaseToken,
      attemptId: item.attemptId,
      answers: item.answers,
      submittedAt: item.submittedAt,
    });

    // Cleanup on success
    await removeSyncItem(item.id);
    await removeLease(item.examId);
    clearAutoSave(item.examId);
    console.log(`[CBT Sync] Successfully synced attempt ${item.attemptId}`);
    return true;
  } catch (err) {
    console.warn(`[CBT Sync] Failed to sync attempt ${item.attemptId}:`, err);
    if (item.retries >= MAX_RETRIES) {
      console.error(`[CBT Sync] Max retries reached for ${item.attemptId}. Removing from queue.`);
      await removeSyncItem(item.id);
      return false;
    }
    await incrementRetry(item.id);
    return false;
  }
}

/** Process all pending items in the sync queue */
async function processQueue(): Promise<void> {
  if (!isOnline()) return;

  const pending = await getPendingSyncs();
  if (pending.length === 0) return;

  console.log(`[CBT Sync] Processing ${pending.length} pending submission(s)...`);

  for (const item of pending) {
    await syncOne(item);
  }
}

/**
 * Start the background sync worker.
 * Returns a cleanup function to stop polling + remove event listeners.
 */
export function startSyncWorker(): () => void {
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
