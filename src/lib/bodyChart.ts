import type { BodyMeasurement } from "./db";
import { getPeriodStart, type StatsPeriod } from "./stats";

export interface ChartPoint {
  label: string;
  value: number;
}

export type BodyMetricKey = keyof Pick<
  BodyMeasurement,
  | "weightKg"
  | "bodyFatPct"
  | "muscleMassKg"
  | "waterPct"
  | "hipsCm"
  | "waistCm"
  | "chestCm"
  | "shouldersCm"
  | "upperArmLCm"
  | "upperArmRCm"
  | "lowerArmLCm"
  | "lowerArmRCm"
  | "thighLCm"
  | "thighRCm"
  | "calfLCm"
  | "calfRCm"
>;

export function formatChartDate(iso: string): string {
  return new Date(iso).toLocaleDateString("de-DE", { day: "numeric", month: "numeric" });
}

export function filterMeasurementsForPeriod(
  measurements: BodyMeasurement[],
  period: StatsPeriod,
): BodyMeasurement[] {
  const limitDate = getPeriodStart(period);

  const filtered = limitDate
    ? measurements.filter((m) => new Date(m.performedAt) >= limitDate)
    : measurements;

  return [...filtered].reverse().slice(-10);
}

export function buildMetricSeries(
  measurements: BodyMeasurement[],
  period: StatsPeriod,
  metricKey: BodyMetricKey,
): ChartPoint[] {
  return filterMeasurementsForPeriod(measurements, period)
    .filter((m) => {
      const val = m[metricKey];
      return val !== undefined && val !== null;
    })
    .map((m) => ({
      label: formatChartDate(m.performedAt),
      value: m[metricKey] as number,
    }));
}

export function buildWeightSeries(measurements: BodyMeasurement[]): ChartPoint[] {
  return [...measurements]
    .reverse()
    .slice(-10)
    .map((m) => ({
      label: formatChartDate(m.performedAt),
      value: m.weightKg,
    }));
}
