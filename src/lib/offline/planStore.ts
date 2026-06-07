import type { LibraryPlan, PlanDayForTracking } from "../../data";
import { planDayDisplayName } from "../../data";
import { localDb } from "./localDb";

export async function hasPlansCache(userId: string): Promise<boolean> {
  const meta = await localDb.meta.get(userId);
  return meta != null;
}

export async function getCachedPlans(userId: string): Promise<LibraryPlan[]> {
  const rows = await localDb.plans.where("userId").equals(userId).toArray();
  return rows
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map((r) => r.plan);
}

export async function getCachedPlan(userId: string, planId: string): Promise<LibraryPlan | null> {
  const row = await localDb.plans.get(planId);
  if (!row || row.userId !== userId) return null;
  return row.plan;
}

export async function getCachedActivePlan(userId: string): Promise<LibraryPlan | null> {
  const plans = await getCachedPlans(userId);
  return plans.find((p) => p.isActive) ?? null;
}

export async function writePlansCache(userId: string, plans: LibraryPlan[]): Promise<void> {
  const now = Date.now();
  const planIds = new Set(plans.map((p) => p.id));

  await localDb.transaction("rw", localDb.plans, async () => {
    const existing = await localDb.plans.where("userId").equals(userId).toArray();
    for (const row of existing) {
      if (!planIds.has(row.planId)) {
        await localDb.plans.delete(row.planId);
      }
    }
    for (const plan of plans) {
      await localDb.plans.put({ planId: plan.id, userId, plan, updatedAt: now });
    }
  });

  await localDb.meta.put({ userId, lastFullSyncAt: now });
}

export async function upsertCachedPlan(userId: string, plan: LibraryPlan): Promise<void> {
  const now = Date.now();
  await localDb.plans.put({ planId: plan.id, userId, plan, updatedAt: now });
}

export async function removeCachedPlan(userId: string, planId: string): Promise<void> {
  const row = await localDb.plans.get(planId);
  if (row?.userId === userId) {
    await localDb.plans.delete(planId);
  }
}

export async function applyAdvancePlanLocal(userId: string, planId: string): Promise<void> {
  const plan = await getCachedPlan(userId, planId);
  if (!plan || plan.days.length === 0) return;
  const nextDay = (plan.currentDay + 1) % plan.days.length;
  await upsertCachedPlan(userId, { ...plan, currentDay: nextDay });
}

export async function applySetActivePlanLocal(userId: string, planId: string): Promise<void> {
  const plans = await getCachedPlans(userId);
  await localDb.transaction("rw", localDb.plans, async () => {
    for (const plan of plans) {
      const isActive = plan.id === planId;
      if (plan.isActive !== isActive) {
        await upsertCachedPlan(userId, { ...plan, isActive });
      }
    }
  });
}

export async function resolvePlanDayFromLocal(
  userId: string,
  planDayId: string,
): Promise<PlanDayForTracking | null> {
  const plans = await getCachedPlans(userId);
  for (const plan of plans) {
    const day = plan.days.find((d) => d.id === planDayId);
    if (!day) continue;
    return {
      id: day.id,
      name: planDayDisplayName(day),
      planId: plan.id,
      enabledBlocks: day.enabledBlocks,
      blocks: day.blocks ?? [],
      exercises: day.exercises,
    };
  }
  return null;
}
