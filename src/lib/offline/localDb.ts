import Dexie, { type Table } from "dexie";
import type { CachedExercisesRow, CachedPlanRow, MetaRow, SyncQueueEntry } from "./types";

class RephiveLocalDb extends Dexie {
  plans!: Table<CachedPlanRow, string>;
  exercises!: Table<CachedExercisesRow, string>;
  syncQueue!: Table<SyncQueueEntry, string>;
  meta!: Table<MetaRow, string>;

  constructor() {
    super("rephive_local");
    this.version(1).stores({
      plans: "planId, userId, updatedAt",
      exercises: "userId, updatedAt",
      syncQueue: "id, userId, createdAt",
      meta: "userId",
    });
  }
}

export const localDb = new RephiveLocalDb();

export async function clearLocalDataForUser(userId: string): Promise<void> {
  await localDb.transaction("rw", localDb.plans, localDb.exercises, localDb.syncQueue, localDb.meta, async () => {
    await localDb.plans.where("userId").equals(userId).delete();
    await localDb.exercises.where("userId").equals(userId).delete();
    await localDb.syncQueue.where("userId").equals(userId).delete();
    await localDb.meta.where("userId").equals(userId).delete();
  });
}

export async function clearAllLocalData(): Promise<void> {
  await localDb.transaction("rw", localDb.plans, localDb.exercises, localDb.syncQueue, localDb.meta, async () => {
    await localDb.plans.clear();
    await localDb.exercises.clear();
    await localDb.syncQueue.clear();
    await localDb.meta.clear();
  });
}
