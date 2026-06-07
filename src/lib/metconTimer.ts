import { useEffect, useMemo, useRef, useState } from "react";
import type { SegmentKind } from "../theme";
import { useTimer, type TimerCfg, type TimerSnapshot } from "./engine";
import type { MetconConfig } from "./metcon";
import { METCON_DEFAULTS, normalizeMetconConfig } from "./metcon";

export type MetconTimerPhase = "prep" | "work" | "rest" | "roundRest" | "done" | "idle";

export interface CircuitSegment {
  kind: SegmentKind;
  label: string;
  dur: number;
  round: number;
  rounds: number;
  stationIndex: number;
  stationCount: number;
}

export function buildCircuitSegments(
  config: MetconConfig,
  stationCount: number,
): CircuitSegment[] {
  const rounds = config.rounds ?? METCON_DEFAULTS.circuit.rounds!;
  const workSec = config.workSec ?? METCON_DEFAULTS.circuit.workSec!;
  const restSec = config.restSec ?? METCON_DEFAULTS.circuit.restSec!;
  const roundRest = config.restBetweenRoundsSec ?? METCON_DEFAULTS.circuit.restBetweenRoundsSec!;
  const segs: CircuitSegment[] = [];

  for (let r = 1; r <= rounds; r++) {
    for (let s = 0; s < stationCount; s++) {
      segs.push({
        kind: "work",
        label: "WORK",
        dur: workSec,
        round: r,
        rounds,
        stationIndex: s,
        stationCount,
      });
      const isLastStation = s === stationCount - 1;
      const restDur = isLastStation ? roundRest : restSec;
      if (restDur > 0 && (r < rounds || !isLastStation)) {
        segs.push({
          kind: isLastStation ? "rest" : "rest",
          label: isLastStation ? "RUNDE PAUSE" : "REST",
          dur: restDur,
          round: r,
          rounds,
          stationIndex: s,
          stationCount,
        });
      }
    }
  }
  return segs;
}

export interface MetconTimerSnapshot {
  format: MetconConfig["format"];
  phase: MetconTimerPhase;
  running: boolean;
  done: boolean;
  idle: boolean;
  label: string;
  bigSeconds: number;
  round: number;
  rounds: number;
  stationIndex: number;
  stationCount: number;
  roundsCompleted: number;
  kind: SegmentKind;
  segProgress: number;
  totalProgress: number;
  elapsedSec: number;
  start: () => void;
  pause: () => void;
  reset: () => void;
  toggle: () => void;
  addRound: () => void;
  dropRound: () => void;
  skipSegment: () => void;
}

function useCircuitTimer(config: MetconConfig, stationCount: number): MetconTimerSnapshot {
  const cfgKey = JSON.stringify({ config, stationCount });
  const segments = useMemo(
    () => buildCircuitSegments(config, Math.max(1, stationCount)),
    [cfgKey],
  );
  const prepDur = config.prepSec ?? 5;
  const totalDur = segments.reduce((a, s) => a + s.dur, 0);

  const [t, setT] = useState(0);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const acc = useRef(0);
  const startTs = useRef(0);
  const timer = useRef<ReturnType<typeof setInterval> | 0>(0);

  const stop = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = 0;
  };

  useEffect(() => stop, []);
  useEffect(() => {
    stop();
    acc.current = 0;
    startTs.current = 0;
    setT(0);
    setRunning(false);
    setDone(false);
  }, [cfgKey]);

  const tick = () => {
    const now = performance.now();
    const el = acc.current + (now - startTs.current) / 1000;
    const cap = prepDur + totalDur;
    if (el >= cap) {
      stop();
      acc.current = cap;
      setT(cap);
      setRunning(false);
      setDone(true);
      return;
    }
    setT(el);
  };

  const start = () => {
    if (running || done) return;
    startTs.current = performance.now();
    stop();
    timer.current = setInterval(tick, 100);
    setRunning(true);
  };

  const pause = () => {
    if (!running) return;
    stop();
    acc.current += (performance.now() - startTs.current) / 1000;
    setRunning(false);
  };

  const reset = () => {
    stop();
    acc.current = 0;
    startTs.current = 0;
    setT(0);
    setRunning(false);
    setDone(false);
  };

  const skipSegment = () => {
    if (done || segments.length === 0) return;
    const inPrep = t < prepDur && !done;
    const runT = Math.max(0, t - prepDur);
    let before = 0;
    let idx = 0;
    for (let i = 0; i < segments.length; i++) {
      if (runT < before + segments[i].dur) {
        idx = i;
        break;
      }
      before += segments[i].dur;
      idx = i;
    }
    const jumpTo = before + segments[idx].dur;
    acc.current = prepDur + jumpTo;
    setT(prepDur + jumpTo);
    if (jumpTo >= totalDur) {
      setRunning(false);
      setDone(true);
      stop();
    }
    void inPrep;
  };

  const inPrep = t < prepDur && !done;
  const runT = Math.max(0, t - prepDur);

  let phase: MetconTimerPhase = "idle";
  let label = "BEREIT";
  let bigSeconds = prepDur;
  let round = 1;
  let rounds = config.rounds ?? 1;
  let stationIndex = 0;
  let kind: SegmentKind = "work";
  let segProgress = 0;
  let totalProgress = 0;

  if (t === 0 && !running && !done) {
    phase = "idle";
  } else if (inPrep) {
    phase = "prep";
    label = "GET READY";
    bigSeconds = prepDur - t;
    kind = "prep";
    segProgress = prepDur ? t / prepDur : 0;
  } else if (done) {
    phase = "done";
    label = "DONE";
    bigSeconds = 0;
    kind = "done";
    const last = segments[segments.length - 1];
    round = last?.round ?? rounds;
    stationIndex = last?.stationIndex ?? 0;
    totalProgress = 1;
    segProgress = 1;
  } else if (segments.length === 0) {
    phase = "work";
  } else {
    let before = 0;
    let idx = 0;
    for (let i = 0; i < segments.length; i++) {
      if (runT < before + segments[i].dur) {
        idx = i;
        break;
      }
      before += segments[i].dur;
      idx = i;
    }
    const seg = segments[idx];
    const segEl = Math.min(seg.dur, runT - before);
    round = seg.round;
    rounds = seg.rounds;
    stationIndex = seg.kind === "work" ? seg.stationIndex : seg.stationIndex;
    label = seg.label;
    bigSeconds = seg.dur - segEl;
    kind = seg.kind;
    phase = seg.label === "RUNDE PAUSE" ? "roundRest" : seg.kind === "rest" ? "rest" : "work";
    segProgress = seg.dur ? segEl / seg.dur : 1;
    totalProgress = totalDur ? Math.min(1, runT / totalDur) : 0;
  }

  const roundsCompleted =
    done ? rounds : Math.max(0, round - 1);

  return {
    format: "circuit",
    phase,
    running,
    done,
    idle: !running && !done && t === 0,
    label,
    bigSeconds,
    round,
    rounds,
    stationIndex,
    stationCount: Math.max(1, stationCount),
    roundsCompleted,
    kind,
    segProgress,
    totalProgress,
    elapsedSec: t,
    start,
    pause,
    reset,
    toggle: () => (running ? pause() : start()),
    addRound: () => {},
    dropRound: () => {},
    skipSegment,
  };
}

function amrapFromTimer(T: TimerSnapshot, stationCount: number): MetconTimerSnapshot {
  return {
    format: "amrap",
    phase: T.phase === "prep" ? "prep" : T.done ? "done" : T.idle ? "idle" : "work",
    running: T.running,
    done: T.done,
    idle: T.idle,
    label: T.label,
    bigSeconds: T.bigSeconds,
    round: T.round,
    rounds: T.rounds,
    stationIndex: 0,
    stationCount: Math.max(1, stationCount),
    roundsCompleted: T.taps,
    kind: T.kind,
    segProgress: T.segProgress,
    totalProgress: T.totalProgress,
    elapsedSec: T.elapsedSec,
    start: T.start,
    pause: T.pause,
    reset: T.reset,
    toggle: T.toggle,
    addRound: T.addTap,
    dropRound: T.dropTap,
    skipSegment: () => {},
  };
}

function emomFromTimer(T: TimerSnapshot, stationCount: number): MetconTimerSnapshot {
  const stationIndex =
    T.phase === "prep" || T.idle
      ? 0
      : (Math.max(1, T.round) - 1) % Math.max(1, stationCount);
  return {
    format: "emom",
    phase: T.phase === "prep" ? "prep" : T.done ? "done" : T.idle ? "idle" : "work",
    running: T.running,
    done: T.done,
    idle: T.idle,
    label: T.label,
    bigSeconds: T.bigSeconds,
    round: T.round,
    rounds: T.rounds,
    stationIndex,
    stationCount: Math.max(1, stationCount),
    roundsCompleted: T.done ? T.round : Math.max(0, T.round - 1),
    kind: T.kind,
    segProgress: T.segProgress,
    totalProgress: T.totalProgress,
    elapsedSec: T.elapsedSec,
    start: T.start,
    pause: T.pause,
    reset: T.reset,
    toggle: T.toggle,
    addRound: () => {},
    dropRound: () => {},
    skipSegment: () => {},
  };
}

export function metconConfigToTimerCfg(config: MetconConfig): TimerCfg {
  const c = normalizeMetconConfig(config.format, config);
  if (c.format === "amrap") {
    return { total: c.durationSec ?? 600, prep: c.prepSec ?? 5 };
  }
  return {
    interval: c.intervalSec ?? 60,
    rounds: c.rounds ?? 12,
    prep: c.prepSec ?? 5,
  };
}

export function useMetconTimer(
  config: MetconConfig,
  stationCount: number,
): MetconTimerSnapshot {
  const normalized = normalizeMetconConfig(config.format, config);
  const timerCfg = metconConfigToTimerCfg(normalized);
  const emomAmrap = useTimer(
    normalized.format === "amrap" ? "amrap" : "emom",
    timerCfg,
  );
  const circuit = useCircuitTimer(normalized, stationCount);

  if (normalized.format === "circuit") return circuit;
  if (normalized.format === "amrap") return amrapFromTimer(emomAmrap, stationCount);
  return emomFromTimer(emomAmrap, stationCount);
}
