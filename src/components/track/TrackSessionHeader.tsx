import type { ReactNode } from "react";
import { M } from "../../theme";
import { formatTrackElapsed } from "../../lib/heartRate/heartRateService";
import type { HeartRateSample } from "../../lib/heartRate/heartRateZones";
import { maxHrFromBirthDate } from "../../lib/heartRate/heartRateZones";
import { Icon } from "../Icon";
import { MButton } from "../MButton";
import { HeartRateTrend } from "../HeartRateTrend";

export interface TrackSessionHeaderProps {
  elapsedSec: number;
  heartRateBpm: number | null;
  heartRateConnected: boolean;
  heartRateDeviceName?: string | null;
  heartRateSupported: boolean;
  hrSamples?: HeartRateSample[];
  birthDate?: string | null;
  onOpenHeartRate: () => void;
  timerPaused: boolean;
  onToggleTimerPause: () => void;
  onBack?: () => void;
  trailingActions?: ReactNode;
  sessionName?: string;
  isCustom?: boolean;
  onSessionNameChange?: (name: string) => void;
  progressLabel?: string;
  /** Kompakt unter dem Übungs-Karussell (ohne Zurück/Session). */
  variant?: "default" | "exerciseFooter";
}

export function TrackSessionHeader({
  elapsedSec,
  heartRateBpm,
  heartRateConnected,
  heartRateDeviceName,
  heartRateSupported,
  hrSamples = [],
  birthDate,
  onOpenHeartRate,
  timerPaused,
  onToggleTimerPause,
  onBack,
  trailingActions,
  sessionName,
  isCustom,
  onSessionNameChange,
  progressLabel,
  variant = "default",
}: TrackSessionHeaderProps) {
  const isFooter = variant === "exerciseFooter";
  const maxHr = maxHrFromBirthDate(birthDate);

  return (
    <div style={{ padding: isFooter ? "8px 18px 4px" : "8px 18px 10px", flexShrink: 0 }}>
      {!isFooter && (onBack || trailingActions) ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 10,
            minHeight: 40,
          }}
        >
          <div style={{ flex: "0 0 auto" }}>
            {onBack ? (
              <MButton type="button" variant="ghost" size="icon" onClick={onBack} aria-label="Zur Übersicht">
                <Icon name="chevL" size={22} stroke={2.2} color={M.mut} />
              </MButton>
            ) : null}
          </div>
          {trailingActions ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "0 0 auto" }}>{trailingActions}</div>
          ) : (
            <div aria-hidden style={{ width: 44 }} />
          )}
        </div>
      ) : null}

      {!isFooter ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "12px 14px 12px 18px",
            borderRadius: 999,
            background: M.brand,
            color: M.brandInk,
          }}
        >
          <span
            style={{
              fontFamily: M.disp,
              fontWeight: 700,
              fontSize: 26,
              fontVariantNumeric: "tabular-nums",
              letterSpacing: 0.5,
              lineHeight: 1,
            }}
          >
            {formatTrackElapsed(elapsedSec)}
          </span>
          <MButton
            type="button"
            variant="secondary"
            size="icon"
            onClick={onToggleTimerPause}
            aria-label={timerPaused ? "Workout fortsetzen" : "Workout-Timer pausieren"}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              background: M.brandInk,
              color: M.brand,
              border: "none",
              flexShrink: 0,
            }}
          >
            <Icon name={timerPaused ? "play" : "pause"} size={16} color={M.brand} />
          </MButton>
        </div>
      ) : null}

      <HeartRateTrend
        bpm={heartRateBpm}
        connected={heartRateConnected}
        deviceName={heartRateDeviceName}
        supported={heartRateSupported}
        samples={hrSamples}
        maxHr={maxHr}
        birthDate={birthDate}
        compact
        onConnect={onOpenHeartRate}
      />

      {sessionName != null && !isFooter ? (
        isCustom ? (
          <input
            value={sessionName}
            onChange={(e) => onSessionNameChange?.(e.target.value)}
            style={{
              width: "100%",
              fontFamily: M.disp,
              fontWeight: 700,
              fontSize: 16,
              lineHeight: 1.2,
              marginTop: 12,
              background: "transparent",
              border: "none",
              color: M.mut,
              outline: "none",
              padding: 0,
              textAlign: "center",
            }}
          />
        ) : (
          <div
            style={{
              fontFamily: M.disp,
              fontWeight: 700,
              fontSize: 16,
              lineHeight: 1.2,
              marginTop: 12,
              textAlign: "center",
              color: M.mut,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {sessionName}
          </div>
        )
      ) : null}

      {progressLabel && !isFooter ? (
        <div style={{ fontSize: 13, color: M.mut2, marginTop: 8, textAlign: "center", fontWeight: 600 }}>
          {progressLabel}
        </div>
      ) : null}
    </div>
  );
}
