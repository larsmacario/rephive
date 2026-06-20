import { useCallback, useEffect, useRef, useState } from "react";
import { fmt, fmtUp, useTimer, type TimerCfg, type TimerMode } from "../engine";
import type { SaveSessionInput } from "../db";
import { buildTimerSessionInput } from "../timerSession";
import { usePreferences } from "../preferences";
import { useActiveTimer } from "../activeTimer";
import { useIntervalTimerSounds } from "../useTimerSounds";
import { useAuth } from "../auth";
import { useHeartRateMonitor } from "../heartRate/useHeartRateMonitor";
import { maxHrFromBirthDate, type HeartRateSample } from "../heartRate/heartRateZones";
import { mKind } from "../../theme";

export type TimerLeaveAction = { kind: "back" } | { kind: "reset" };

export interface UseIntervalTimerSessionOptions {
  onSaveSession: (input: SaveSessionInput) => Promise<void>;
}

export function useIntervalTimerSession({ onSaveSession }: UseIntervalTimerSessionOptions) {
  const { profile } = useAuth();
  const { preferences, updatePreferences } = usePreferences();
  const heartRate = useHeartRateMonitor();
  const [heartRateSheetOpen, setHeartRateSheetOpen] = useState(false);
  const [hrSamples, setHrSamples] = useState<HeartRateSample[]>([]);
  const lastSampleKeyRef = useRef<string | null>(null);
  const maxHr = maxHrFromBirthDate(profile?.birth_date);
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
  useIntervalTimerSounds(T, preferences.timerSounds, preferences.timerSoundPack, cfg.cap);

  useEffect(() => {
    setTimerActive(!T.idle);
    return () => setTimerActive(false);
  }, [T.idle, setTimerActive]);

  const savedRunRef = useRef(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [leaveAction, setLeaveAction] = useState<TimerLeaveAction | null>(null);

  const clearHrSamples = useCallback(() => {
    setHrSamples([]);
    lastSampleKeyRef.current = null;
  }, []);

  const requestReset = useCallback(() => {
    if (!T.idle) {
      setLeaveAction({ kind: "reset" });
      return;
    }
    T.reset();
    clearHrSamples();
  }, [T, clearHrSamples]);

  const requestBackFromRun = useCallback(() => {
    if (!T.idle) {
      setLeaveAction({ kind: "back" });
      return false;
    }
    return true;
  }, [T.idle]);

  const confirmLeaveAction = useCallback(
    (onBack?: () => void) => {
      if (!leaveAction) return;
      if (leaveAction.kind === "back") {
        T.reset();
        clearHrSamples();
        onBack?.();
      } else {
        T.reset();
        clearHrSamples();
      }
      setLeaveAction(null);
    },
    [leaveAction, T, clearHrSamples],
  );

  const leaveCopy =
    leaveAction?.kind === "back"
      ? {
          message: "Ein Timer läuft. Beim Verlassen wird der Timer gestoppt.",
          confirmLabel: "STOPPEN",
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
    clearHrSamples();
  }, [mode, clearHrSamples]);

  useEffect(() => {
    if (T.idle) {
      clearHrSamples();
    }
  }, [T.idle, clearHrSamples]);

  useEffect(() => {
    if (!T.running || heartRate.bpm == null) return;
    const key = `${T.elapsedSec}:${heartRate.bpm}`;
    if (lastSampleKeyRef.current === key) return;
    lastSampleKeyRef.current = key;
    setHrSamples((prev) => [...prev, { elapsedSec: T.elapsedSec, bpm: heartRate.bpm! }]);
  }, [T.running, T.elapsedSec, heartRate.bpm]);

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

  const resetSession = useCallback(() => {
    T.reset();
    clearHrSamples();
    setMode("emom");
    setLeaveAction(null);
    savedRunRef.current = false;
    setSaveStatus("idle");
    setSaveError(null);
  }, [T, clearHrSamples]);

  return {
    mode,
    setMode,
    cfg,
    setCfg,
    T,
    col,
    big,
    heartRate,
    heartRateSheetOpen,
    setHeartRateSheetOpen,
    hrSamples,
    maxHr,
    birthDate: profile?.birth_date,
    saveStatus,
    saveError,
    leaveAction,
    setLeaveAction,
    leaveCopy,
    requestReset,
    requestBackFromRun,
    confirmLeaveAction,
    resetSession,
    timerIdle: T.idle,
    timerRunning: T.running,
  };
}

export type IntervalTimerSession = ReturnType<typeof useIntervalTimerSession>;
