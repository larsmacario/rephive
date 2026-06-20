import {
  medianMs,
  readFrictionMetricsLog,
  useOwnerLabs,
  type FrictionSessionMetrics,
} from "../../lib/ownerLabs";
import { M } from "../../theme";
import { MSwitch } from "../widgets";

function formatMetricsSummary(entry: FrictionSessionMetrics): string {
  const med = medianMs(entry.setDurationsMs);
  const medStr = med != null ? `${(med / 1000).toFixed(1)} s Median` : "—";
  return `${entry.mode} · ${entry.setsLogged} Sätze · ${entry.tapCount} Taps · ${entry.overrideCount} Overrides · ${medStr}`;
}

export function OwnerLabsSection() {
  const { flags, updateFlags } = useOwnerLabs(null);
  const metricsLog = readFrictionMetricsLog();

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          padding: "12px 0",
          borderBottom: "1px solid " + M.line2,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: M.fg, fontWeight: 600, fontSize: 15 }}>Friction-Killer (Express Tracking)</div>
          <div style={{ color: M.mut, fontSize: 13, marginTop: 3, lineHeight: 1.45 }}>
            Experiment · nur auf diesem Gerät. Ein Satz, Riesen-Confirm, schnelle Overrides.
          </div>
        </div>
        <MSwitch
          checked={flags.frictionKillerTurbo}
          onChange={(v) => updateFlags({ frictionKillerTurbo: v })}
        />
      </div>

      <div style={{ padding: "12px 0", borderBottom: metricsLog.length ? "1px solid " + M.line2 : "none" }}>
        <div style={{ color: M.fg, fontWeight: 600, fontSize: 14, marginBottom: 8 }}>Gym-Test (2 Sessions)</div>
        <div style={{ color: M.mut, fontSize: 13, lineHeight: 1.5 }}>
          Session A: klassischer Track — Zeit/Taps pro Satz notieren.
          <br />
          Session B: Express an — Ziel: ≤3 s und ≤2 Taps bei Auto-Pilot-Prefill.
        </div>
      </div>

      {metricsLog.length > 0 ? (
        <div style={{ paddingTop: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1, color: M.mut, marginBottom: 8 }}>
            LETZTE EXPRESS-SESSIONS
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {metricsLog.slice(0, 5).map((entry, i) => (
              <div
                key={`${entry.startedAt}-${i}`}
                style={{
                  fontSize: 13,
                  color: M.mut2,
                  lineHeight: 1.45,
                  fontFamily: M.body,
                }}
              >
                {formatMetricsSummary(entry)}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}
