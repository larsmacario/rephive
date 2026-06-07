import { localDb } from "./localDb";
import type { SyncOpType, SyncPayload, SyncQueueEntry } from "./types";

export async function enqueueSync(
  userId: string,
  op: SyncOpType,
  payload: SyncPayload,
): Promise<string> {
  const id = crypto.randomUUID();
  const entry: SyncQueueEntry = {
    id,
    userId,
    op,
    payload,
    createdAt: Date.now(),
    retries: 0,
  };
  await localDb.syncQueue.put(entry);
  return id;
}

export async function getPendingSyncCount(userId: string): Promise<number> {
  return localDb.syncQueue.where("userId").equals(userId).count();
}

export async function getPendingSyncEntries(userId: string): Promise<SyncQueueEntry[]> {
  return localDb.syncQueue.where("userId").equals(userId).sortBy("createdAt");
}

export async function removeSyncEntry(id: string): Promise<void> {
  await localDb.syncQueue.delete(id);
}

export async function markSyncError(id: string, error: string): Promise<void> {
  const entry = await localDb.syncQueue.get(id);
  if (!entry) return;
  await localDb.syncQueue.put({
    ...entry,
    retries: entry.retries + 1,
    lastError: error,
  });
}
