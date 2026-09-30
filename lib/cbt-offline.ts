/**
 * Offline Exam Cache Engine
 * 
 * Uses IndexedDB to store exam leases and queue offline submissions.
 * When online, lib/cbt-sync.ts replays queued attempts to
 * POST /api/student/:examId/offline/sync (or the Edge appliance's
 * POST /api/offline/sync).
 *
 * Object Stores:
 *   - exam_leases: Cached exam data (questions, metadata) for offline use
 *   - sync_queue:  Pending submissions awaiting network connectivity
 */

const DB_NAME = 'hcbt_offline';
const DB_VERSION = 1;
const STORE_LEASES = 'exam_leases';
const STORE_SYNC_QUEUE = 'sync_queue';

// ── Types ──────────────────────────────────────────────────────────────

export interface ExamLease {
  examId: string;
  leaseToken: string;
  exam: {
    id: string;
    title: string;
    duration: number;
    passMark: number;
    questions: Array<{
      id: string;
      text: string;
      options: string[];
      correctAnswer?: number;
      marks: number;
      imageUrl?: string;
    }>;
  };
  leasedAt: string;    // ISO timestamp
  expiresAt: string;   // ISO timestamp
  orgSlug: string;
}

/** One entry of HCBT's ordered offline-attempt log (see Hcbt offlineAttempt.js). */
export interface OfflineOperation {
  operationId: string;
  sequence: number;
  type: 'ANSWER_SET' | 'SUBMIT_INTENT';
  questionId?: string;
  selectedOption?: number;
  payload?: { cheating: boolean };
  clientTimestamp: string;
}

export interface SyncQueueItem {
  id: string;          // Auto-generated UUID
  examId: string;
  attemptId: string;
  leaseToken: string;
  answers: Record<string, number>;
  // Built once at enqueue time so every retry resends the same operation IDs,
  // which is what lets the server deduplicate them.
  operations?: OfflineOperation[];
  cheating: boolean;
  submittedAt: string; // ISO timestamp when the student hit "submit"
  retries: number;
  // Set when the server rejected the submission outright. The item is kept, not
  // deleted, so the student's answers are never thrown away.
  failed?: SyncFailure;
}

export interface SyncFailure {
  at: string;
  reason: string;
  /** HCBT's error code, e.g. OFFLINE_LEASE_INVALID when the upload window closed. */
  code?: string;
  /** Too late to sync, so handed to the school to accept or dismiss. */
  sentForReview?: boolean;
}

// Lets screens that list the queue refresh when the sync worker changes it.
const QUEUE_EVENT = 'hcbt:sync-queue-changed';

function queueChanged(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(QUEUE_EVENT));
}

export function onQueueChanged(callback: () => void): () => void {
  window.addEventListener(QUEUE_EVENT, callback);
  return () => window.removeEventListener(QUEUE_EVENT, callback);
}

// ── IndexedDB Helpers ──────────────────────────────────────────────────

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_LEASES)) {
        db.createObjectStore(STORE_LEASES, { keyPath: 'examId' });
      }
      if (!db.objectStoreNames.contains(STORE_SYNC_QUEUE)) {
        db.createObjectStore(STORE_SYNC_QUEUE, { keyPath: 'id' });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txPromise<T>(
  storeName: string,
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
        const req = callback(store);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

// ── Lease Operations ───────────────────────────────────────────────────

/** Save an exam lease to IndexedDB */
export async function saveLease(lease: ExamLease): Promise<void> {
  await txPromise(STORE_LEASES, 'readwrite', (store) => store.put(lease));
}

/** Retrieve a cached lease for an exam */
export async function getLease(examId: string): Promise<ExamLease | undefined> {
  return txPromise(STORE_LEASES, 'readonly', (store) => store.get(examId));
}

/** Remove a lease after successful online submission */
export async function removeLease(examId: string): Promise<void> {
  await txPromise(STORE_LEASES, 'readwrite', (store) => store.delete(examId));
}

/** Check if a lease is still valid (not expired) */
export function isLeaseValid(lease: ExamLease): boolean {
  return new Date(lease.expiresAt).getTime() > Date.now();
}

// ── Sync Queue Operations ──────────────────────────────────────────────

/** Generate a v4 UUID (the sync endpoint rejects operation IDs that aren't one) */
function uuid(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  // randomUUID only exists in secure contexts, e.g. not on a plain-http LAN address.
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Turn a finished attempt into the operation log the offline sync endpoint
 * expects: one ANSWER_SET per answered question, then a SUBMIT_INTENT.
 * Sequences continue from the last one the server acknowledged.
 */
export function buildSubmitOperations(
  answers: Record<string, number>,
  cheating: boolean,
  lastSyncedSequence: number,
  submittedAt: string,
): OfflineOperation[] {
  const operations: OfflineOperation[] = Object.entries(answers).map(([questionId, selectedOption], index) => ({
    operationId: uuid(),
    sequence: lastSyncedSequence + index + 1,
    type: 'ANSWER_SET',
    questionId,
    selectedOption,
    clientTimestamp: submittedAt,
  }));
  operations.push({
    operationId: uuid(),
    sequence: lastSyncedSequence + operations.length + 1,
    type: 'SUBMIT_INTENT',
    payload: { cheating },
    clientTimestamp: submittedAt,
  });
  return operations;
}

/** Enqueue an attempt for background sync */
export async function enqueueAttempt(item: Omit<SyncQueueItem, 'id' | 'retries'>): Promise<string> {
  const id = uuid();
  const entry: SyncQueueItem = { ...item, id, retries: 0 };
  await txPromise(STORE_SYNC_QUEUE, 'readwrite', (store) => store.put(entry));
  queueChanged();
  return id;
}

/** Get all pending sync items */
export async function getPendingSyncs(): Promise<SyncQueueItem[]> {
  return txPromise(STORE_SYNC_QUEUE, 'readonly', (store) => store.getAll());
}

/** Items the server wouldn't take, kept so the answers aren't lost. */
export async function getFailedSyncs(): Promise<SyncQueueItem[]> {
  return (await getPendingSyncs()).filter((item) => item.failed);
}

/** Remove a successfully synced item (or one the student chose to delete) */
export async function removeSyncItem(id: string): Promise<void> {
  await txPromise(STORE_SYNC_QUEUE, 'readwrite', (store) => store.delete(id));
  queueChanged();
}

/** Increment retry count for a failed sync */
export async function incrementRetry(id: string): Promise<void> {
  const item = await txPromise<SyncQueueItem>(STORE_SYNC_QUEUE, 'readonly', (store) => store.get(id));
  if (item) {
    item.retries += 1;
    await txPromise(STORE_SYNC_QUEUE, 'readwrite', (store) => store.put(item));
  }
}

/** Stop retrying an item the server rejected, but keep its answers. */
export async function markSyncFailed(
  id: string,
  reason: string,
  details: Pick<SyncFailure, 'code' | 'sentForReview'> = {},
): Promise<void> {
  const item = await txPromise<SyncQueueItem>(STORE_SYNC_QUEUE, 'readonly', (store) => store.get(id));
  if (item) {
    item.failed = { at: new Date().toISOString(), reason, ...details };
    await txPromise(STORE_SYNC_QUEUE, 'readwrite', (store) => store.put(item));
    queueChanged();
  }
}

/** Put a failed item back in line, e.g. after the school fixed what blocked it. */
export async function retrySyncItem(id: string): Promise<void> {
  const item = await txPromise<SyncQueueItem>(STORE_SYNC_QUEUE, 'readonly', (store) => store.get(id));
  if (item) {
    delete item.failed;
    item.retries = 0;
    await txPromise(STORE_SYNC_QUEUE, 'readwrite', (store) => store.put(item));
    queueChanged();
  }
}

// ── Auto-Save (answers in progress) ────────────────────────────────────

const AUTOSAVE_KEY_PREFIX = 'hcbt_answers_';

/** Save in-progress answers to localStorage as a fast fallback */
export function autoSaveAnswers(examId: string, answers: Record<string, number>): void {
  try {
    localStorage.setItem(`${AUTOSAVE_KEY_PREFIX}${examId}`, JSON.stringify(answers));
  } catch {
    // localStorage may be full or unavailable — silent fail
  }
}

/** Recover auto-saved answers */
export function recoverAnswers(examId: string): Record<string, number> | null {
  try {
    const raw = localStorage.getItem(`${AUTOSAVE_KEY_PREFIX}${examId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Clear auto-saved answers after successful submission */
export function clearAutoSave(examId: string): void {
  try {
    localStorage.removeItem(`${AUTOSAVE_KEY_PREFIX}${examId}`);
  } catch {
    // silent
  }
}

// ── Network Status ─────────────────────────────────────────────────────

/** Check if browser is currently online */
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

/** Register a callback for when the browser comes back online */
export function onBackOnline(callback: () => void): () => void {
  const handler = () => callback();
  window.addEventListener('online', handler);
  return () => window.removeEventListener('online', handler);
}
