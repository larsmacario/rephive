import { ageFromBirthDate } from "../nutrition";

export type HeartRateZone = 1 | 2 | 3 | 4 | 5;

export interface HeartRateZoneDefinition {
  zone: HeartRateZone;
  label: string;
  shortLabel: string;
  color: string;
  minPct: number;
  maxPct: number;
}

/** Standard 5-zone model (% of max HR). */
export const HEART_RATE_ZONES: HeartRateZoneDefinition[] = [
  { zone: 1, label: "Erholung", shortLabel: "Z1 · ERHOLUNG", color: "#3b82f6", minPct: 0.5, maxPct: 0.6 },
  { zone: 2, label: "Grundlage", shortLabel: "Z2 · GRUNDLAGE", color: "#14b8a6", minPct: 0.6, maxPct: 0.7 },
  { zone: 3, label: "Aerob", shortLabel: "Z3 · AEROB", color: "#22c55e", minPct: 0.7, maxPct: 0.8 },
  { zone: 4, label: "Schwelle", shortLabel: "Z4 · SCHWELLE", color: "#f59e0b", minPct: 0.8, maxPct: 0.9 },
  { zone: 5, label: "Maximal", shortLabel: "Z5 · MAXIMAL", color: "#ef4444", minPct: 0.9, maxPct: 1.0 },
];

export interface HeartRateZoneBand {
  zone: HeartRateZone;
  color: string;
  minBpm: number;
  maxBpm: number;
}

export interface HeartRateSample {
  elapsedSec: number;
  bpm: number;
}

export function maxHrFromAge(age: number): number {
  return Math.max(100, 220 - age);
}

export function maxHrFromBirthDate(birthDate: string | null | undefined): number | null {
  if (!birthDate?.trim()) return null;
  const parsed = new Date(birthDate.trim());
  if (Number.isNaN(parsed.getTime())) return null;
  return maxHrFromAge(ageFromBirthDate(birthDate));
}

export function hasHeartRateZoneProfile(birthDate: string | null | undefined): boolean {
  return maxHrFromBirthDate(birthDate) != null;
}

export function bpmAtZonePct(maxHr: number, pct: number): number {
  return Math.round(maxHr * pct);
}

export function buildZoneBands(maxHr: number): HeartRateZoneBand[] {
  return HEART_RATE_ZONES.map((z) => ({
    zone: z.zone,
    color: z.color,
    minBpm: bpmAtZonePct(maxHr, z.minPct),
    maxBpm: bpmAtZonePct(maxHr, z.maxPct),
  }));
}

export function getZoneForBpm(bpm: number, maxHr: number): HeartRateZoneDefinition {
  const pct = bpm / maxHr;
  if (pct >= HEART_RATE_ZONES[4].minPct) return HEART_RATE_ZONES[4];
  if (pct >= HEART_RATE_ZONES[3].minPct) return HEART_RATE_ZONES[3];
  if (pct >= HEART_RATE_ZONES[2].minPct) return HEART_RATE_ZONES[2];
  if (pct >= HEART_RATE_ZONES[1].minPct) return HEART_RATE_ZONES[1];
  return HEART_RATE_ZONES[0];
}

export function getZoneColorForBpm(bpm: number, maxHr: number | null, fallback = "#7ef67b"): string {
  if (maxHr == null || maxHr <= 0) return fallback;
  return getZoneForBpm(bpm, maxHr).color;
}
