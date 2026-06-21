import { useMemo } from "react";
import { M } from "../theme";
import { Icon } from "./Icon";
import { MButton } from "./MButton";
import {
  buildZoneBands,
  getZoneForBpm,
  hasHeartRateZoneProfile,
  type HeartRateSample,
} from "../lib/heartRate/heartRateZones";

export interface HeartRateTrendProps {
  bpm: number | null;
  connected: boolean;
  deviceName?: string | null;
  supported: boolean;
  samples: HeartRateSample[];
  maxHr: number | null;
  birthDate?: string | null;
  compact?: boolean;
  onConnect: () => void;
}

const CHART_WIDTH = 320;
const CHART_HEIGHT = 72;
const CHART_PAD_X = 4;
const CHART_PAD_Y = 6;

function computeYDomain(samples: HeartRateSample[], maxHr: number | null): [number, number] {
  const values = samples.map((s) => s.bpm);
  if (maxHr != null) {
    const zoneMin = Math.round(maxHr * 0.45);
    const zoneMax = maxHr;
    if (values.length === 0) return [zoneMin, zoneMax];
    const min = Math.min(...values, zoneMin);
    const max = Math.max(...values, zoneMax);
    const pad = Math.max(4, (max - min) * 0.08);
    return [Math.max(40, min - pad), max + pad];
  }
  if (values.length === 0) return [60, 180];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = Math.max(6, (max - min) * 0.12);
  return [Math.max(40, min - pad), max + pad];
}

function toChartPoint(
  sample: HeartRateSample,
  samples: HeartRateSample[],
  yMin: number,
  yMax: number,
): { x: number; y: number } {
  const innerW = CHART_WIDTH - CHART_PAD_X * 2;
  const innerH = CHART_HEIGHT - CHART_PAD_Y * 2;
  const maxElapsed = Math.max(samples[samples.length - 1]?.elapsedSec ?? 1, sample.elapsedSec, 1);
  const x = CHART_PAD_X + (sample.elapsedSec / maxElapsed) * innerW;
  const yNorm = (sample.bpm - yMin) / Math.max(1, yMax - yMin);
  const y = CHART_PAD_Y + innerH - yNorm * innerH;
  return { x, y };
}

export function HeartRateTrend({
  bpm,
  connected,
  deviceName,
  supported,
  samples,
  maxHr,
  birthDate,
  compact = false,
  onConnect,
}: HeartRateTrendProps) {
  const zonesEnabled = hasHeartRateZoneProfile(birthDate) && maxHr != null;
  const currentZone = bpm != null && maxHr != null ? getZoneForBpm(bpm, maxHr) : null;
  const zoneBands = maxHr != null ? buildZoneBands(maxHr) : [];

  const [yMin, yMax] = useMemo(() => computeYDomain(samples, maxHr), [samples, maxHr]);

  const lineSegments = useMemo(() => {
    if (samples.length < 2 || maxHr == null) return [];
    const segments: { d: string; color: string }[] = [];
    for (let i = 1; i < samples.length; i += 1) {
      const prev = toChartPoint(samples[i - 1], samples, yMin, yMax);
      const curr = toChartPoint(samples[i], samples, yMin, yMax);
      const midBpm = (samples[i - 1].bpm + samples[i].bpm) / 2;
      const color = getZoneForBpm(midBpm, maxHr).color;
      segments.push({ d: `M ${prev.x} ${prev.y} L ${curr.x} ${curr.y}`, color });
    }
    return segments;
  }, [samples, maxHr, yMin, yMax]);

  const lastPoint = samples.length > 0 ? toChartPoint(samples[samples.length - 1], samples, yMin, yMax) : null;
  const liveFontSize = compact ? 36 : 52;

  if (compact) {
    const accent = currentZone?.color ?? M.brand;
    const softBg = `${accent}24`;
    const softBorder = `${accent}55`;
    const compactBoxStyle: React.CSSProperties = {
      marginTop: 8,
      marginBottom: 8,
      padding: "16px 18px",
      borderRadius: 16,
      minHeight: 84,
      flexShrink: 0,
    };
    const bpmValueStyle: React.CSSProperties = {
      fontFamily: M.disp,
      fontWeight: 700,
      fontSize: 36,
      lineHeight: 1,
      fontVariantNumeric: "tabular-nums",
      color: M.fg,
    };

    if (!connected) {
      return (
        <div
          style={{
            ...compactBoxStyle,
            background: M.card,
            border: "1px solid " + M.line2,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
              <Icon name="heart" size={20} fill={M.mut2} color={M.mut2} />
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: M.mut }}>BPM</div>
                <div style={bpmValueStyle}>—</div>
              </div>
            </div>
            {supported ? (
              <MButton
                type="button"
                variant="secondary"
                size="sm"
                onClick={onConnect}
                style={{ marginLeft: "auto", flexShrink: 0, fontFamily: M.disp, letterSpacing: 0.3 }}
              >
                <Icon name="heart" size={14} color={M.fg} /> Verbinden
              </MButton>
            ) : (
              <span style={{ marginLeft: "auto", fontSize: 11, color: M.mut2, textAlign: "right" }}>
                Nur iOS-App
              </span>
            )}
          </div>
        </div>
      );
    }

    return (
      <div
        style={{
          ...compactBoxStyle,
          background: softBg,
          border: `1px solid ${softBorder}`,
          transition: "background .25s, border-color .25s",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <Icon name="heart" size={20} fill={accent} color={accent} />
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: M.mut }}>BPM</div>
              <div style={bpmValueStyle}>{bpm ?? "—"}</div>
            </div>
          </div>
          {currentZone ? (
            <div
              style={{
                marginLeft: "auto",
                flexShrink: 0,
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: 0.5,
                color: accent,
                textAlign: "right",
                lineHeight: 1.3,
              }}
            >
              ZONE {currentZone.zone}
              <div style={{ fontSize: 11, fontWeight: 600, color: M.mut, marginTop: 3 }}>
                {currentZone.label.toUpperCase()}
              </div>
            </div>
          ) : deviceName ? (
            <span style={{ marginLeft: "auto", fontSize: 12, color: M.mut, textAlign: "right" }}>{deviceName}</span>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        marginTop: 12,
        marginBottom: 12,
        padding: "16px 16px 24px",
        borderRadius: 16,
        background: M.card,
        border: "1px solid " + M.line2,
        flexShrink: 0,
      }}
    >
      {connected && deviceName ? (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 10px",
            borderRadius: 999,
            background: M.panel,
            border: "1px solid " + M.line2,
            marginBottom: 12,
            fontSize: 13,
            fontWeight: 600,
            color: M.mut,
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: M.brand,
              flexShrink: 0,
            }}
            aria-hidden
          />
          {deviceName} · verbunden
        </div>
      ) : null}

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <Icon
              name="heart"
              size={16}
              fill={currentZone?.color ?? (connected ? M.brand : M.mut2)}
              color={currentZone?.color ?? (connected ? M.brand : M.mut2)}
            />
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1.2, color: M.mut }}>BPM</span>
          </div>
          <div
            style={{
              fontFamily: M.disp,
              fontWeight: 700,
              fontSize: liveFontSize,
              lineHeight: 1,
              fontVariantNumeric: "tabular-nums",
              color: M.fg,
            }}
          >
            {connected && bpm != null ? bpm : "—"}
          </div>
        </div>

        {currentZone ? (
          <div
            style={{
              marginTop: 22,
              padding: "5px 10px",
              borderRadius: 999,
              border: `1px solid ${currentZone.color}`,
              color: currentZone.color,
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: 0.6,
              whiteSpace: "nowrap",
            }}
          >
            ZONE {currentZone.zone} · {currentZone.label.toUpperCase()}
          </div>
        ) : null}
      </div>

      <div style={{ position: "relative", width: "100%", height: CHART_HEIGHT, marginTop: 14 }}>
        <svg
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          preserveAspectRatio="none"
          style={{ width: "100%", height: "100%", display: "block", overflow: "visible" }}
          role="img"
          aria-label={
            samples.length > 0
              ? `Herzfrequenzverlauf, aktuell ${bpm ?? "unbekannt"} Schläge pro Minute`
              : "Herzfrequenzverlauf"
          }
        >
          {zonesEnabled
            ? zoneBands.map((band) => {
                const innerH = CHART_HEIGHT - CHART_PAD_Y * 2;
                const yTop =
                  CHART_PAD_Y + innerH - ((band.maxBpm - yMin) / Math.max(1, yMax - yMin)) * innerH;
                const yBottom =
                  CHART_PAD_Y + innerH - ((band.minBpm - yMin) / Math.max(1, yMax - yMin)) * innerH;
                const h = Math.max(1, yBottom - yTop);
                return (
                  <rect
                    key={band.zone}
                    x={CHART_PAD_X}
                    y={yTop}
                    width={CHART_WIDTH - CHART_PAD_X * 2}
                    height={h}
                    fill={band.color}
                    fillOpacity={0.08}
                  />
                );
              })
            : null}

          {zonesEnabled && maxHr != null
            ? zoneBands.map((band) => {
                const innerH = CHART_HEIGHT - CHART_PAD_Y * 2;
                const y =
                  CHART_PAD_Y + innerH - ((band.minBpm - yMin) / Math.max(1, yMax - yMin)) * innerH;
                return (
                  <line
                    key={`line-${band.zone}`}
                    x1={CHART_PAD_X}
                    x2={CHART_WIDTH - CHART_PAD_X}
                    y1={y}
                    y2={y}
                    stroke={band.color}
                    strokeOpacity={0.18}
                    strokeWidth={1}
                  />
                );
              })
            : null}

          {lineSegments.length > 0
            ? lineSegments.map((seg, i) => (
                <path key={i} d={seg.d} fill="none" stroke={seg.color} strokeWidth={2.5} strokeLinecap="round" />
              ))
            : samples.length === 1 && lastPoint ? (
                <circle cx={lastPoint.x} cy={lastPoint.y} r={4} fill={M.brand} />
              ) : (
                <line
                  x1={CHART_PAD_X}
                  x2={CHART_WIDTH - CHART_PAD_X}
                  y1={CHART_HEIGHT / 2}
                  y2={CHART_HEIGHT / 2}
                  stroke={M.line}
                  strokeWidth={2}
                  strokeDasharray="4 6"
                />
              )}

          {lastPoint && samples.length > 1 ? (
            <circle
              cx={lastPoint.x}
              cy={lastPoint.y}
              r={5}
              fill={currentZone?.color ?? M.brand}
              stroke={M.card}
              strokeWidth={2}
            />
          ) : null}
        </svg>
      </div>

      {!zonesEnabled ? (
        <p style={{ margin: "8px 0 0", fontSize: 13, lineHeight: 1.4, color: M.mut2, fontWeight: 600 }}>
          Geburtsdatum im Profil hinterlegen, um HF-Zonen anzuzeigen.
        </p>
      ) : null}

      {!connected && supported ? (
        <MButton
          type="button"
          variant="secondary"
          size="sm"
          fullWidth
          onClick={onConnect}
          style={{ marginTop: 10, fontFamily: M.disp, letterSpacing: 0.4 }}
        >
          <Icon name="heart" size={14} color={M.fg} /> Sensor verbinden
        </MButton>
      ) : null}

      {!supported ? (
        <p style={{ margin: "8px 0 0", fontSize: 13, lineHeight: 1.4, color: M.mut2 }}>
          BLE-Herzfrequenz nur in der iOS-App oder Chrome verfügbar.
        </p>
      ) : null}
    </div>
  );
}
