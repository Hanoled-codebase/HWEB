/**
 * Offline Exam Cache Engine
 * 
 * Uses IndexedDB to store exam leases and queue offline submissions.
 * When online, syncs queued attempts via POST /api/cbt/offline/sync.
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

export interface SyncQueueItem {
  id: string;          // Auto-generated UUID
  examId: string;
  attemptId: string;
  leaseToken: string;
  answers: Record<string, number>;
  cheating: boolean;
  submittedAt: string; // ISO timestamp when the student hit "submit"
  retries: number;
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

/** Generate a simple UUID */
function uuid(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Enqueue an attempt for background sync */
export async function enqueueAttempt(item: Omit<SyncQueueItem, 'id' | 'retries'>): Promise<string> {
  const id = uuid();
  const entry: SyncQueueItem = { ...item, id, retries: 0 };
  await txPromise(STORE_SYNC_QUEUE, 'readwrite', (store) => store.put(entry));
  return id;
}

/** Get all pending sync items */
export async function getPendingSyncs(): Promise<SyncQueueItem[]> {
  return txPromise(STORE_SYNC_QUEUE, 'readonly', (store) => store.getAll());
}

/** Remove a successfully synced item */
export async function removeSyncItem(id: string): Promise<void> {
  await txPromise(STORE_SYNC_QUEUE, 'readwrite', (store) => store.delete(id));
}

/** Increment retry count for a failed sync */
export async function incrementRetry(id: string): Promise<void> {
  const item = await txPromise<SyncQueueItem>(STORE_SYNC_QUEUE, 'readonly', (store) => store.get(id));
  if (item) {
    item.retries += 1;
    await txPromise(STORE_SYNC_QUEUE, 'readwrite', (store) => store.put(item));
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
