import type { LibraryPlan } from "../../data";
import type {
  CreatePlanInput,
  ExerciseInput,
  SaveSessionInput,
  UpdatePlanInput,
} from "../db";
import { writeExercisesCache } from "./exerciseStore";
import { writePlansCache } from "./planStore";
import {
  enqueueSync,
  getPendingSyncCount,
  getPendingSyncEntries,
  markSyncError,
  removeSyncEntry,
} from "./syncQueue";
import type { SyncOpType, SyncQueueEntry } from "./types";
import { getIsOnlineSync } from "./networkStatus";

export interface SyncHandlers {
  saveSessionRemote: (userId: string, input: SaveSessionInput) => Promise<void>;
  advancePlanRemote: (planId: string) => Promise<void>;
  createPlanRemote: (
    userId: string,
    input: CreatePlanInput,
    ids: { planId: string; dayIds: string[] },
  ) => Promise<string>;
  updatePlanRemote: (planId: string, input: UpdatePlanInput) => Promise<void>;
  deletePlanRemote: (planId: string) => Promise<void>;
  setActivePlanRemote: (userId: string, planId: string) => Promise<void>;
  createExerciseRemote: (userId: string, input: ExerciseInput, exerciseId: string) => Promise<string>;
  updateExerciseRemote: (exerciseId: string, input: ExerciseInput) => Promise<void>;
  deleteExerciseRemote: (exerciseId: string) => Promise<void>;
  refreshPlansRemote: (userId: string) => Promise<LibraryPlan[]>;
  refreshExercisesRemote: (userId: string) => Promise<import("../../data").LibraryExercise[]>;
}

let handlers: SyncHandlers | null = null;
let processing = false;

export function registerSyncHandlers(h: SyncHandlers): void {
  handlers = h;
}

export async function getSyncPendingCount(userId: string): Promise<number> {
  return getPendingSyncCount(userId);
}

export async function enqueueMutation(
  userId: string,
  op: SyncOpType,
  payload: Record<string, unknown>,
): Promise<void> {
  await enqueueSync(userId, op, payload);
  if (getIsOnlineSync()) {
    void processSyncQueue(userId);
  }
}

async function executeEntry(entry: SyncQueueEntry): Promise<void> {
  if (!handlers) throw new Error("Sync-Handler nicht registriert.");

  const p = entry.payload;

  switch (entry.op) {
    case "SAVE_SESSION": {
      const input = p.input as SaveSessionInput;
      const advancePlanId = p.advancePlanId as string | undefined;
      await handlers.saveSessionRemote(entry.userId, input);
      if (advancePlanId) await handlers.advancePlanRemote(advancePlanId);
      break;
    }
    case "ADVANCE_PLAN":
      await handlers.advancePlanRemote(p.planId as string);
      break;
    case "CREATE_PLAN":
      await handlers.createPlanRemote(entry.userId, p.input as CreatePlanInput, {
        planId: p.planId as string,
        dayIds: p.dayIds as string[],
      });
      break;
    case "UPDATE_PLAN":
      await handlers.updatePlanRemote(p.planId as string, p.input as UpdatePlanInput);
      break;
    case "DELETE_PLAN":
      await handlers.deletePlanRemote(p.planId as string);
      break;
    case "SET_ACTIVE_PLAN":
      await handlers.setActivePlanRemote(p.userId as string, p.planId as string);
      break;
    case "CREATE_EXERCISE":
      await handlers.createExerciseRemote(
        entry.userId,
        p.input as ExerciseInput,
        p.exerciseId as string,
      );
      break;
    case "UPDATE_EXERCISE":
      await handlers.updateExerciseRemote(p.exerciseId as string, p.input as ExerciseInput);
      break;
    case "DELETE_EXERCISE":
      await handlers.deleteExerciseRemote(p.exerciseId as string);
      break;
    default:
      throw new Error(`Unbekannte Sync-Operation: ${entry.op}`);
  }
}

export async function processSyncQueue(userId: string): Promise<{ processed: number; failed: number }> {
  if (!handlers || processing) return { processed: 0, failed: 0 };
  if (!getIsOnlineSync()) return { processed: 0, failed: 0 };

  processing = true;
  let processed = 0;
  let failed = 0;

  try {
    const entries = await getPendingSyncEntries(userId);

    for (const entry of entries) {
      try {
        await executeEntry(entry);
        await removeSyncEntry(entry.id);
        processed++;
      } catch (e) {
        failed++;
        const msg = e instanceof Error ? e.message : "Sync fehlgeschlagen";
        await markSyncError(entry.id, msg);
        break;
      }
    }

    if (processed > 0 && getIsOnlineSync()) {
      const [plans, exercises] = await Promise.all([
        handlers.refreshPlansRemote(userId),
        handlers.refreshExercisesRemote(userId),
      ]);
      await writePlansCache(userId, plans);
      await writeExercisesCache(userId, exercises);
    }
  } finally {
    processing = false;
  }

  return { processed, failed };
}
