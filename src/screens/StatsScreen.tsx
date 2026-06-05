import { useEffect, useMemo, useState } from "react";
import { M } from "../theme";
import { type StatsPeriod, useStatsOverview } from "../lib/stats";
import { buildMetricSeries, type BodyMetricKey } from "../lib/bodyChart";
import { Icon } from "../components/Icon";
import { MStat } from "../components/widgets";
import { TrendLineChart } from "../components/TrendLineChart";
import { useBodyMeasurements } from "../lib/db";
import { MButton } from "../components/MButton";

const PERIODS: { id: StatsPeriod; label: string }[] = [
  { id: "d7", label: "7 Tage" },
  { id: "d30", label: "30 Tage" },
  { id: "d90", label: "90 Tage" },
  { id: "all", label: "Gesamt" },
];

const BODY_METRICS_CFG = [
  { key: "weightKg", label: "GEWICHTSVERLAUF", unit: "kg" },
  { key: "bodyFatPct", label: "KÖRPERFETTANTEIL", unit: "%" },
  { key: "muscleMassKg", label: "MUSKELMASSE", unit: "kg" },
  { key: "waterPct", label: "WASSERANTEIL", unit: "%" },
  { key: "hipsCm", label: "HÜFTUMFANG", unit: "cm" },
  { key: "waistCm", label: "TAILLENUMFANG", unit: "cm" },
  { key: "chestCm", label: "BRUSTUMFANG", unit: "cm" },
  { key: "shouldersCm", label: "SCHULTERUMFANG", unit: "cm" },
  { key: "upperArmLCm", label: "OBERARM LINKS", unit: "cm" },
  { key: "upperArmRCm", label: "OBERARM RECHTS", unit: "cm" },
  { key: "lowerArmLCm", label: "UNTERARM LINKS", unit: "cm" },
  { key: "lowerArmRCm", label: "UNTERARM RECHTS", unit: "cm" },
  { key: "thighLCm", label: "OBERSCHENKEL LINKS", unit: "cm" },
  { key: "thighRCm", label: "OBERSCHENKEL RECHTS", unit: "cm" },
  { key: "calfLCm", label: "WADEN LINKS", unit: "cm" },
  { key: "calfRCm", label: "WADEN RECHTS", unit: "cm" },
] as const;

export interface StatsScreenProps {
  onBack: () => void;
  refreshKey?: number;
}

export function StatsScreen({ onBack, refreshKey = 0 }: StatsScreenProps) {
  const [period, setPeriod] = useState<StatsPeriod>("d7");
  const { data, loading, error, reload } = useStatsOverview(period, refreshKey);
  const { data: measurements, reload: reloadBody } = useBodyMeasurements(refreshKey);

  useEffect(() => {
    reload();
    reloadBody();
  }, [refreshKey, reload, reloadBody]);

  const chart = data?.chart ?? [];
  const volumeChartPoints = useMemo(
    () => chart.map((w) => ({ label: w.d, value: w.v })),
    [chart],
  );

  const activeMetrics = useMemo(() => {
    if (!measurements) return [];
    return BODY_METRICS_CFG.filter((cfg) => {
      return measurements.some((m) => {
        const val = m[cfg.key as keyof typeof m];
        return val !== undefined && val !== null;
      });
    });
  }, [measurements]);

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <div
        style={{
          padding: "2px 22px 12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <MButton onClick={onBack} variant="ghost" size="icon" aria-label="Zurück">
          <Icon name="chevL" size={20} stroke={2.2} color={M.mut} />
        </MButton>
        <span style={{ fontSize: 12, letterSpacing: 1.5, color: M.mut, fontWeight: 700 }}>STATISTIK</span>
        <span style={{ width: 24 }} />
      </div>

      <div style={{ padding: "0 22px 10px" }}>
        <div
          style={{
            display: "flex",
            gap: 6,
            padding: 4,
            background: M.panel,
            borderRadius: 12,
            border: "1px solid " + M.line2,
          }}
        >
          {PERIODS.map((p) => {
            const on = period === p.id;
            return (
              <MButton
                key={p.id}
                onClick={() => setPeriod(p.id)}
                variant={on ? "primary" : "ghost"}
                size="sm"
                style={{ flex: 1, fontSize: 11, letterSpacing: 0.1, ...(on ? null : { color: M.mut }) }}
              >
                {p.label}
              </MButton>
            );
          })}
        </div>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          padding: "0 22px 24px",
        }}
      >
        {loading && <div style={{ color: M.mut, fontSize: 14 }}>Statistiken werden geladen…</div>}
        {error && <div style={{ color: "#ff8a8a", fontSize: 14 }}>{error}</div>}

        {!loading && !error && data && (
          <>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <MStat label="SESSIONS" value={String(data.summary.sessions)} sub="im Zeitraum" />
              <MStat label="VOLUMEN" value={`${data.summary.volumeT}t`} sub="im Zeitraum" />
              <MStat label="ZEIT" value={`${data.summary.durationH}h`} sub="trainiert" />
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
              <MStat label="STREAK" value={String(data.summary.streakWeeks)} sub="Wochen" />
              <MStat label="PRs" value={String(data.summary.prCount)} sub="markiert" />
              <MStat
                label="KRAFT"
                value={String(data.summary.strengthSessions)}
                sub={data.summary.timerSessions > 0 ? `+ ${data.summary.timerSessions} Timer` : "Sessions"}
              />
            </div>

            <div
              style={{
                marginTop: 16,
                background: M.card,
                border: "1px solid " + M.line2,
                borderRadius: 18,
                padding: "15px 16px 12px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: 11, letterSpacing: 1.4, color: M.mut, fontWeight: 700 }}>
                  {data.chartTitle}
                </span>
                <span style={{ fontFamily: M.disp, fontWeight: 700, fontSize: 16, color: M.acc }}>
                  {chart.reduce((a, w) => a + w.v, 0) > 0 ? "●" : "—"}
                </span>
              </div>
              {chart.length === 0 ? (
                <div style={{ color: M.mut, fontSize: 13, marginTop: 16, textAlign: "center" }}>
                  Keine Daten im gewählten Zeitraum
                </div>
              ) : (
                <TrendLineChart points={volumeChartPoints} unit="t" height={100} />
              )}
            </div>

            {/* Körperdaten Trends (dynamisch gerendert nach hinterlegten Werten) */}
            {activeMetrics.length === 0 ? (
              <div
                style={{
                  marginTop: 16,
                  background: M.card,
                  border: "1px solid " + M.line2,
                  borderRadius: 18,
                  padding: "20px 16px",
                  color: M.mut,
                  fontSize: 13,
                  textAlign: "center",
                }}
              >
                Noch keine Körperdaten erfasst.
              </div>
            ) : (
              activeMetrics.map((cfg) => {
                if (!measurements) return null;

                const metricPoints = buildMetricSeries(
                  measurements,
                  period,
                  cfg.key as BodyMetricKey,
                );

                if (metricPoints.length === 0) return null;

                const latestVal = metricPoints[metricPoints.length - 1].value;

                return (
                  <div
                    key={cfg.key}
                    style={{
                      marginTop: 16,
                      background: M.card,
                      border: "1px solid " + M.line2,
                      borderRadius: 18,
                      padding: "15px 16px 12px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <span style={{ fontSize: 11, letterSpacing: 1.4, color: M.mut, fontWeight: 700 }}>
                        {cfg.label} (LETZTE 10)
                      </span>
                      <span style={{ fontFamily: M.disp, fontWeight: 700, fontSize: 16, color: M.acc }}>
                        {latestVal.toFixed(1)} {cfg.unit}
                      </span>
                    </div>

                    <TrendLineChart points={metricPoints} unit={cfg.unit} height={100} />
                  </div>
                );
              })
            )}

            <div style={{ marginTop: 20 }}>
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: 1.4,
                  color: M.mut,
                  fontWeight: 700,
                  marginBottom: 10,
                }}
              >
                TOP-ÜBUNGEN
              </div>
              {data.topExercises.length === 0 ? (
                <div
                  style={{
                    background: M.card,
                    border: "1px solid " + M.line2,
                    borderRadius: 14,
                    padding: "20px 16px",
                    color: M.mut,
                    fontSize: 13,
                    textAlign: "center",
                  }}
                >
                  Keine Kraft-Übungen mit Volumen im gewählten Zeitraum.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {data.topExercises.map((ex, i) => (
                    <div
                      key={ex.name}
                      style={{
                        background: M.card,
                        border: "1px solid " + M.line2,
                        borderRadius: 14,
                        padding: "12px 14px",
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: M.disp,
                          fontWeight: 700,
                          fontSize: 18,
                          color: M.mut2,
                          minWidth: 22,
                        }}
                      >
                        {i + 1}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 15, color: M.fg }}>{ex.name}</div>
                        <div style={{ color: M.mut, fontSize: 12, marginTop: 2 }}>
                          in {ex.sessionCount} Session{ex.sessionCount === 1 ? "" : "s"}
                        </div>
                      </div>
                      <span style={{ fontFamily: M.disp, fontWeight: 700, fontSize: 18, color: M.acc }}>
                        {ex.volumeT}t
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
