import { useEffect, useRef, useState } from "react";
import { M, mKind } from "../theme";
import {
  fmt,
  fmtUp,
  TIMER_MODES,
  useTimer,
  type TimerCfg,
  type TimerMode,
} from "../lib/engine";
import type { SaveSessionInput } from "../lib/db";
import { buildTimerSessionInput } from "../lib/timerSession";
import { usePreferences } from "../lib/preferences";
import { useActiveTimer } from "../lib/activeTimer";
import { useIntervalTimerSounds } from "../lib/useTimerSounds";
import { contentMaxWidth, useBreakpoint } from "../lib/responsive";
import { Icon } from "../components/Icon";
import { Ring } from "../components/Ring";
import { TimerConfigPanel } from "../components/TimerConfigPanel";
import { TimerLeaveSheet } from "../components/TimerLeaveSheet";
import { MButton } from "../components/MButton";

type TimerLeaveAction = { kind: "mode"; mode: TimerMode } | { kind: "reset" };

export interface TimerScreenProps {
  onSaveSession: (input: SaveSessionInput) => Promise<void>;
}

export function TimerScreen({ onSaveSession }: TimerScreenProps) {
  const breakpoint = useBreakpoint();
  const maxW = contentMaxWidth(breakpoint);
  const { preferences, updatePreferences } = usePreferences();
  const [mode, setMode] = useState<TimerMode>("emom");
  const cfgs = preferences.timerDefaults;
  const cfg = cfgs[mode];
  const setCfg = (p: Partial<TimerCfg>) =>
    updatePreferences({
      timerDefaults: {
        [mode]: { ...cfgs[mode], ...p },
      },
    });
  const T = useTimer(mode, cfg);
  const { setActive: setTimerActive } = useActiveTimer();
  useIntervalTimerSounds(T, preferences.timerSounds, cfg.cap);

  useEffect(() => {
    setTimerActive(!T.idle);
    return () => setTimerActive(false);
  }, [T.idle, setTimerActive]);

  const savedRunRef = useRef(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [leaveAction, setLeaveAction] = useState<TimerLeaveAction | null>(null);

  const requestMode = (next: TimerMode) => {
    if (next === mode) return;
    if (!T.idle) {
      setLeaveAction({ kind: "mode", mode: next });
      return;
    }
    setMode(next);
  };

  const requestReset = () => {
    if (!T.idle) {
      setLeaveAction({ kind: "reset" });
      return;
    }
    T.reset();
  };

  const confirmLeaveAction = () => {
    if (!leaveAction) return;
    if (leaveAction.kind === "mode") {
      setMode(leaveAction.mode);
    } else {
      T.reset();
    }
    setLeaveAction(null);
  };

  const leaveCopy =
    leaveAction?.kind === "mode"
      ? {
          message: "Ein Timer läuft. Beim Modus-Wechsel wird der Timer gestoppt.",
          confirmLabel: "MODUS WECHSELN",
        }
      : leaveAction?.kind === "reset"
        ? {
            message: "Ein Timer läuft. Beim Zurücksetzen geht der aktuelle Fortschritt verloren.",
            confirmLabel: "ZURÜCKSETZEN",
          }
        : null;

  useEffect(() => {
    savedRunRef.current = false;
    setSaveStatus("idle");
    setSaveError(null);
  }, [mode]);

  const resetTimer = T.reset;

  useEffect(() => {
    if (!T.done || savedRunRef.current) return;

    savedRunRef.current = true;
    const input = buildTimerSessionInput(mode, cfg, {
      elapsedSec: T.elapsedSec,
      round: T.round,
      taps: T.taps,
      bigSeconds: T.bigSeconds,
      countUp: T.countUp,
    });

    let cancelled = false;
    setSaveStatus("saving");
    setSaveError(null);

    void (async () => {
      try {
        await onSaveSession(input);
        if (cancelled) return;
        setSaveStatus("saved");
        resetTimer();
      } catch (e) {
        if (cancelled) return;
        savedRunRef.current = false;
        setSaveStatus("error");
        setSaveError(e instanceof Error ? e.message : "Speichern fehlgeschlagen");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [T.done, T.elapsedSec, T.round, T.taps, T.bigSeconds, T.countUp, mode, cfg, onSaveSession, resetTimer]);

  const col = mKind(T.kind);
  const big = T.countUp && T.phase !== "prep" ? fmtUp(T.bigSeconds) : fmt(T.bigSeconds);

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        padding: "6px 22px 10px",
        minHeight: 0,
        width: "100%",
        maxWidth: maxW,
        margin: maxW ? "0 auto" : undefined,
        position: "relative",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 6,
          background: M.panel,
          padding: 5,
          borderRadius: 14,
          border: "1px solid " + M.line2,
        }}
      >
        {TIMER_MODES.map((m) => (
          <MButton
            key={m.id}
            onClick={() => requestMode(m.id)}
            variant={mode === m.id ? "primary" : "ghost"}
            size="sm"
            style={{
              flex: 1,
              fontFamily: M.disp,
              letterSpacing: 0.5,
              ...(mode === m.id ? null : { color: M.mut }),
            }}
          >
            {m.name}
          </MButton>
        ))}
      </div>
      <div
        style={{
          textAlign: "center",
          marginTop: 7,
          fontSize: 11,
          letterSpacing: 1.5,
          color: M.mut,
          fontWeight: 600,
        }}
      >
        {TIMER_MODES.find((m) => m.id === mode)!.blurb.toUpperCase()}
      </div>
      {(saveStatus === "saved" || saveStatus === "error") && (
        <div
          style={{
            textAlign: "center",
            marginTop: 6,
            fontSize: 12,
            fontWeight: 600,
            color: saveStatus === "saved" ? M.acc : "#ff8a8a",
          }}
        >
          {saveStatus === "saved" ? "Im Verlauf gespeichert" : saveError}
        </div>
      )}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 0,
        }}
      >
        <Ring
          size={232}
          stroke={12}
          progress={T.kind === "prep" ? 1 - T.segProgress : T.segProgress}
          color={col}
          track={"rgba(255,255,255,.06)"}
          glow={T.running ? col : null}
        >
          <span style={{ fontFamily: M.disp, fontWeight: 700, fontSize: 14, letterSpacing: 3, color: col }}>
            {T.label}
          </span>
          <span
            style={{
              fontFamily: M.disp,
              fontWeight: 700,
              fontSize: 84,
              lineHeight: 0.9,
              marginTop: 6,
              fontVariantNumeric: "tabular-nums",
              letterSpacing: -1,
              color: M.fg,
            }}
          >
            {big}
          </span>
          {(mode === "emom" || mode === "tabata") && T.phase !== "prep" && (
            <span style={{ fontFamily: M.disp, fontWeight: 600, fontSize: 16, letterSpacing: 1.5, color: M.mut, marginTop: 6 }}>
              RUNDE {String(T.round).padStart(2, "0")}{" "}
              <span style={{ color: M.mut2 }}>/ {String(T.rounds).padStart(2, "0")}</span>
            </span>
          )}
          {mode === "amrap" && T.phase !== "prep" && (
            <span style={{ fontFamily: M.disp, fontWeight: 600, fontSize: 16, letterSpacing: 1, color: M.mut, marginTop: 6 }}>
              {T.taps} <span style={{ color: M.mut2 }}>RUNDEN</span>
            </span>
          )}
        </Ring>
      </div>
      <div
        style={{
          minHeight: 50,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 4,
        }}
      >
        {mode === "amrap" && (
          <MButton
            onClick={T.addTap}
            disabled={!T.running}
            variant="secondary"
            size="md"
            fullWidth
            style={{
              fontFamily: M.disp,
              letterSpacing: 0.6,
              background: T.running ? M.accSoft : M.card,
              color: T.running ? M.fg : M.mut2,
            }}
          >
            + Runde abschließen
          </MButton>
        )}
        {mode === "fortime" && (
          <MButton
            onClick={T.finish}
            disabled={!T.running}
            variant="primary"
            size="md"
            fullWidth
            style={{ fontFamily: M.disp, letterSpacing: 0.6, ...(T.running ? null : { background: M.card, color: M.mut2 }) }}
          >
            <Icon name="flag" size={15} stroke={2.4} />
            Zeit stoppen
          </MButton>
        )}
        {(mode === "emom" || mode === "tabata") && (
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap", justifyContent: "center" }}>
            {Array.from({ length: T.rounds }, (_, i) => (
              <span
                key={i}
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: 5,
                  background:
                    i + 1 < T.round || T.done
                      ? M.acc
                      : i + 1 === T.round && T.phase !== "prep"
                        ? col
                        : "rgba(255,255,255,.14)",
                  boxShadow:
                    i + 1 === T.round && T.running && T.phase !== "prep"
                      ? `0 0 8px ${col}`
                      : "none",
                }}
              />
            ))}
          </div>
        )}
      </div>
      <TimerConfigPanel mode={mode} cfg={cfg} setCfg={setCfg} disabled={!T.idle} />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 18,
          marginTop: 12,
        }}
      >
        <MButton onClick={requestReset} variant="secondary" size="icon" aria-label="Timer zurücksetzen">
          <Icon name="reset" size={16} stroke={2} color={M.mut} />
        </MButton>
        <button
          onClick={T.toggle}
          disabled={T.done}
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
            transition: "box-shadow .2s",
          }}
        >
          <Icon name={T.running ? "pause" : "play"} size={30} style={{ marginLeft: T.running ? 0 : 3 }} />
        </button>
        <div
          style={{
            width: 40,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
            color: M.mut,
          }}
        >
          <Icon name="bolt" size={16} color={M.fg} />
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.8 }}>
            {T.running ? "LIVE" : T.done ? "FERTIG" : "BEREIT"}
          </span>
        </div>
      </div>
      {leaveAction && leaveCopy && (
        <TimerLeaveSheet
          message={leaveCopy.message}
          confirmLabel={leaveCopy.confirmLabel}
          onConfirm={confirmLeaveAction}
          onCancel={() => setLeaveAction(null)}
        />
      )}
    </div>
  );
}
