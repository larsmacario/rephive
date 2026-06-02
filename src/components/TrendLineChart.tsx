import { useMemo } from "react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { M } from "../theme";

const ACCENT_FALLBACK = "oklch(0.87 0.21 143)";

export interface TrendLineChartPoint {
  label: string;
  value: number;
}

export interface TrendLineChartProps {
  points: TrendLineChartPoint[];
  unit?: string;
  height?: number;
  valueFormatter?: (value: number) => string;
}

function resolveAccentColor(): string {
  if (typeof document === "undefined") return ACCENT_FALLBACK;
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--mom-acc").trim();
  return raw || ACCENT_FALLBACK;
}

function defaultValueFormatter(value: number): string {
  return value.toFixed(1);
}

function computeYDomain(values: number[]): [number, number] {
  if (values.length === 0) return [0, 1];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding = Math.max((max - min) * 0.12, 0.5);
  return [Math.max(0, min - padding), max + padding];
}

interface ChartRow {
  label: string;
  value: number;
  index: number;
}

export function TrendLineChart({
  points,
  unit = "",
  height = 100,
  valueFormatter = defaultValueFormatter,
}: TrendLineChartProps) {
  const accent = useMemo(() => resolveAccentColor(), []);

  const data = useMemo<ChartRow[]>(
    () => points.map((p, index) => ({ label: p.label, value: p.value, index })),
    [points],
  );

  const yDomain = useMemo(() => computeYDomain(points.map((p) => p.value)), [points]);

  if (points.length === 0) return null;

  const lastIndex = points.length - 1;

  return (
    <div style={{ width: "100%", height, marginTop: 12 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
          <XAxis
            dataKey="label"
            tick={{ fill: M.mut2, fontSize: 10, fontWeight: 700 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis hide domain={yDomain} />
          <Tooltip
            cursor={{ stroke: "rgba(255,255,255,.12)", strokeWidth: 1 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const row = payload[0].payload as ChartRow;
              return (
                <div
                  style={{
                    background: M.cardHi,
                    border: "1px solid " + M.line,
                    borderRadius: 8,
                    padding: "6px 10px",
                    fontSize: 12,
                    color: M.fg,
                  }}
                >
                  <div style={{ color: M.mut, fontSize: 10, marginBottom: 2 }}>{row.label}</div>
                  <div style={{ fontFamily: M.disp, fontWeight: 700, color: accent }}>
                    {valueFormatter(row.value)}
                    {unit ? ` ${unit}` : ""}
                  </div>
                </div>
              );
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={accent}
            strokeWidth={2}
            dot={(props) => {
              const { cx, cy, index } = props as { cx?: number; cy?: number; index?: number };
              if (cx == null || cy == null || index == null) return <g />;
              const isLast = index === lastIndex;
              return (
                <circle
                  cx={cx}
                  cy={cy}
                  r={isLast ? 4 : 3}
                  fill={accent}
                  fillOpacity={isLast ? 1 : 0.55}
                  stroke={M.card}
                  strokeWidth={1.5}
                />
              );
            }}
            activeDot={{ r: 5, fill: accent, stroke: M.card, strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
