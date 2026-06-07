import type { Tables } from "./database.types";
import { isAppOwner } from "./roles";

const STORAGE_PREFIX = "rephive:labs:";

export interface OwnerLabFlags {
  frictionKillerTurbo: boolean;
}

const DEFAULT_FLAGS: OwnerLabFlags = {
  frictionKillerTurbo: false,
};

function storageKey(suffix: string): string {
  return `${STORAGE_PREFIX}${suffix}`;
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function isOwnerLabsVisible(profile: Tables<"profiles"> | null | undefined): boolean {
  return isAppOwner(profile);
}

export function readOwnerLabFlags(): OwnerLabFlags {
  const raw = readJson<Partial<OwnerLabFlags>>(storageKey("flags"), {});
  return {
    frictionKillerTurbo: raw.frictionKillerTurbo === true ? true : DEFAULT_FLAGS.frictionKillerTurbo,
  };
}

export function writeOwnerLabFlags(flags: OwnerLabFlags): void {
  writeJson(storageKey("flags"), flags);
}

export function patchOwnerLabFlags(patch: Partial<OwnerLabFlags>): OwnerLabFlags {
  const next = { ...readOwnerLabFlags(), ...patch };
  writeOwnerLabFlags(next);
  return next;
}

export interface FrictionSessionMetrics {
  mode: "turbo" | "classic";
  startedAt: string;
  endedAt?: string;
  setsLogged: number;
  tapCount: number;
  overrideCount: number;
  setDurationsMs: number[];
}

export function readFrictionMetricsLog(): FrictionSessionMetrics[] {
  return readJson<FrictionSessionMetrics[]>(storageKey("frictionMetrics"), []);
}

export function appendFrictionMetrics(entry: FrictionSessionMetrics): void {
  const log = readFrictionMetricsLog();
  log.unshift(entry);
  writeJson(storageKey("frictionMetrics"), log.slice(0, 20));
}

export function medianMs(durations: number[]): number | null {
  if (durations.length === 0) return null;
  const sorted = [...durations].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? Math.round((sorted[mid - 1] + sorted[mid]) / 2) : sorted[mid];
}

export { useOwnerLabs } from "./ownerLabs.tsx";
