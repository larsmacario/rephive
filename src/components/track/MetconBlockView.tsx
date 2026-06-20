import { useEffect, useRef } from "react";
import { M, mKind } from "../../theme";
import type { Exercise } from "../../lib/engine";
import type { PlanDayBlock } from "../../data";
import {
  configFromPlanDayBlock,
  formatAmrapResult,
  formatMetconBlockBadge,
  normalizeMetconConfig,
} from "../../lib/metcon";
import { useMetconTimer } from "../../lib/metconTimer";
import { useActiveTimer } from "../../lib/activeTimer";
import { useIntervalTimerSounds } from "../../lib/useTimerSounds";
import { usePreferences } from "../../lib/preferences";
import { Icon } from "../Icon";
import { Ring } from "../Ring";
import { MButton } from "../MButton";
import { fmt, fmtUp } from "../../lib/engine";
import { FORMAT_LABELS } from "../../lib/planBlocks";

export interface MetconBlockViewProps {
  block: PlanDayBlock;
  exercises: Exercise[];
  historyHint?: string | null;
  onBack: () => void;
  onComplete: (roundsCompleted: number, durationSec: number) => void;
}

export function MetconBlockView({
  block,
  exercises,
  historyHint,
  onBack,
  onComplete,
}: MetconBlockViewProps) {
  const { preferences } = usePreferences();
  const rawConfig = configFromPlanDayBlock(block);
  const config = normalizeMetconConfig(
    rawConfig?.format ?? "amrap",
    rawConfig ?? undefined,
  );
  const T = useMetconTimer(config, exercises.length);
  const { setActive: setTimerActive } = useActiveTimer();
  const completedRef = useRef(false);

  useIntervalTimerSounds(
    {
      running: T.running,
      phase: T.phase === "prep" ? "prep" : T.done ? "done" : "run",
      kind: T.kind,
      round: T.round,
      bigSeconds: T.bigSeconds,
      done: T.done,
      mode: config.format === "amrap" ? "amrap" : "emom",
      countUp: false,
      idle: T.idle,
    },
    preferences.timerSounds,
    preferences.timerSoundPack,
    config.durationSec,
  );

  useEffect(() => {
    setTimerActive(!T.idle);
    return () => setTimerActive(false);
  }, [T.idle, setTimerActive]);

  useEffect(() => {
    if (!T.idle) completedRef.current = false;
  }, [T.idle]);

  useEffect(() => {
    if (!T.done || completedRef.current) return;
    completedRef.current = true;
    const workSec = Math.max(0, Math.floor(T.elapsedSec - (config.prepSec ?? 5)));
    onComplete(T.roundsCompleted, workSec);
  }, [T.done, T.roundsCompleted, T.elapsedSec, config.prepSec, onComplete]);

  const col = mKind(T.kind);
  const big =
    config.format === "amrap" && T.phase !== "prep" && !T.idle
      ? fmt(T.bigSeconds)
      : T.phase === "prep" || (config.format !== "amrap" && T.phase !== "done")
        ? fmt(T.bigSeconds)
        : fmtUp(T.bigSeconds);

  const activeExercise = exercises[T.stationIndex];

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "8px 18px 12px",
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          onClick={onBack}
          aria-label="Zur Übersicht"
          style={{ background: "none", border: "none", cursor: "pointer", color: M.mut, display: "flex", padding: 0, flexShrink: 0 }}
        >
          <Icon name="chevL" size={24} stroke={2.2} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "#f97316",
            }}
          >
            MetCon · {FORMAT_LABELS[config.format]}
          </div>
          <div style={{ fontSize: 13, color: M.mut2, marginTop: 2 }}>
            {formatMetconBlockBadge(config)}
          </div>
        </div>
      </div>

      {historyHint ? (
        <div style={{ padding: "0 18px 8px", fontSize: 13, color: M.mut, lineHeight: 1.4 }}>
          {historyHint}
        </div>
      ) : null}

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          padding: "0 18px 12px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", padding: "8px 0 16px" }}>
          <Ring
            size={200}
            stroke={12}
            progress={T.kind === "prep" ? 1 - T.segProgress : T.segProgress}
            color={col}
            track="rgba(255,255,255,.06)"
            glow={T.running ? col : null}
          >
            <span
              style={{
                fontFamily: M.disp,
                fontWeight: 700,
                fontSize: 13,
                letterSpacing: 2,
                color: col,
              }}
            >
              {T.label}
            </span>
            <span
              style={{
                fontFamily: M.disp,
                fontWeight: 700,
                fontSize: 56,
                lineHeight: 0.95,
                marginTop: 6,
                fontVariantNumeric: "tabular-nums",
                color: M.fg,
              }}
            >
              {big}
            </span>
            {config.format === "amrap" && T.phase !== "prep" && !T.idle && (
              <span
                style={{
                  fontFamily: M.disp,
                  fontWeight: 600,
                  fontSize: 16,
                  letterSpacing: 1,
                  color: M.mut,
                  marginTop: 6,
                }}
              >
                {T.roundsCompleted} <span style={{ color: M.mut2 }}>RUNDEN</span>
              </span>
            )}
            {(config.format === "emom" || config.format === "circuit") && T.phase !== "prep" && !T.idle && (
              <span
                style={{
                  fontFamily: M.disp,
                  fontWeight: 600,
                  fontSize: 14,
                  letterSpacing: 1,
                  color: M.mut,
                  marginTop: 6,
                  textAlign: "center",
                  padding: "0 8px",
                }}
              >
                RUNDE {String(T.round).padStart(2, "0")}
                <span style={{ color: M.mut2 }}> / {String(T.rounds).padStart(2, "0")}</span>
              </span>
            )}
          </Ring>
        </div>

        {T.done && config.format === "amrap" ? (
          <div
            style={{
              textAlign: "center",
              marginBottom: 16,
              padding: "12px 14px",
              borderRadius: 12,
              background: M.brandSoft,
              border: "1px solid " + M.brandBorder,
              color: M.brand,
              fontFamily: M.disp,
              fontWeight: 700,
              fontSize: 15,
            }}
          >
            {formatAmrapResult(
              T.roundsCompleted,
              Math.max(0, Math.floor(T.elapsedSec - (config.prepSec ?? 5))),
            )}
          </div>
        ) : null}

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
          {config.format === "amrap" && (
            <div style={{ display: "flex", gap: 8 }}>
              <MButton
                onClick={T.addRound}
                disabled={!T.running}
                variant="secondary"
                size="md"
                fullWidth
                style={{
                  fontFamily: M.disp,
                  letterSpacing: 0.5,
                  background: T.running ? M.accSoft : M.card,
                  color: T.running ? M.fg : M.mut2,
                }}
              >
                + Runde abschließen
              </MButton>
              <MButton
                onClick={T.dropRound}
                disabled={!T.running || T.roundsCompleted <= 0}
                variant="ghost"
                size="md"
                style={{ flex: "0 0 auto", minWidth: 52, color: M.mut }}
                aria-label="Runde korrigieren"
              >
                −
              </MButton>
            </div>
          )}
          {config.format === "circuit" && T.running && (
            <MButton
              onClick={T.skipSegment}
              variant="ghost"
              size="sm"
              fullWidth
              style={{ color: M.mut, fontSize: 12 }}
            >
              Station überspringen
            </MButton>
          )}
        </div>

        {activeExercise && (config.format === "emom" || config.format === "circuit") && T.running && (
          <div
            style={{
              marginBottom: 12,
              padding: "10px 12px",
              borderRadius: 12,
              background: M.brandSoft,
              border: "1px solid " + M.brandBorder,
              fontSize: 13,
              fontWeight: 600,
              color: M.fg,
            }}
          >
            Jetzt: {activeExercise.name}
          </div>
        )}

        <div style={{ fontSize: 13, letterSpacing: 1.2, color: M.mut2, fontWeight: 700, marginBottom: 8 }}>
          ÜBUNGEN
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {exercises.map((ex, idx) => {
            const active = idx === T.stationIndex && T.running && config.format !== "amrap";
            const targetReps = ex.sets[0]?.reps;
            return (
              <div
                key={ex.id}
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  background: active ? M.brandSoft : M.panel,
                  border: `1px solid ${active ? M.brandBorder : M.line2}`,
                  fontSize: 13,
                  fontWeight: 600,
                  color: M.fg,
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <span>{ex.name}</span>
                {targetReps != null && targetReps > 0 ? (
                  <span style={{ color: M.mut2, fontWeight: 500, flexShrink: 0 }}>
                    {targetReps} Wdh.
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <div
        style={{
          padding: "12px 18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 18,
          flexShrink: 0,
        }}
      >
        <MButton onClick={T.reset} variant="secondary" size="icon" aria-label="Zurücksetzen">
          <Icon name="reset" size={16} stroke={2} color={M.mut} />
        </MButton>
        <button
          onClick={T.toggle}
          disabled={T.done}
          type="button"
          style={{
            width: 68,
            height: 68,
            borderRadius: 34,
            border: "none",
            cursor: T.done ? "default" : "pointer",
            background: T.done ? M.card : M.acc,
            color: T.done ? M.mut2 : M.accInk,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: T.running ? `0 0 0 4px ${M.accSoft}, 0 0 18px ${M.accSoft}` : "none",
          }}
        >
          <Icon name={T.running ? "pause" : "play"} size={30} style={{ marginLeft: T.running ? 0 : 3 }} />
        </button>
        <div style={{ width: 40 }} />
      </div>
    </div>
  );
}
