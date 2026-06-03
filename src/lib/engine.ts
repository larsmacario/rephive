import { useEffect, useMemo, useRef, useState } from "react";
import type { SegmentKind } from "../theme";
import type { ExerciseMetric } from "./exerciseCatalog";
import { DEFAULT_EXERCISE_METRIC, setVolumeKg } from "./exerciseCatalog";
import { applySetField, bumpSetField, createEmptySet, type SetField } from "./exerciseSets";
import {
  linkWithPrevious,
  shouldStartRestAfterSet,
  unlinkFromSuperset,
  sanitizeSupersetIds,
} from "./superset";

// ── types ───────────────────────────────────────────────────
export type TimerMode = "emom" | "amrap" | "tabata" | "fortime";

export interface TimerCfg {
  interval?: number;
  rounds?: number;
  prep?: number;
  total?: number;
  work?: number;
  rest?: number;
  cap?: number;
}

export interface WorkoutSet {
  reps: number;
  kg: number;
  done: boolean;
  durationSec?: number;
  distanceM?: number;
}
export interface Exercise {
  id: string;
  name: string;
  note?: string;
  supersetId?: string;
  catalogExerciseId?: string;
  metric: ExerciseMetric;
  sets: WorkoutSet[];
}
export interface Workout {
  name: string;
  sub: string;
  exercises: Exercise[];
}

interface Segment {
  kind: SegmentKind;
  label: string;
  dur: number;
  round: number;
  rounds: number;
}

// ── formatting ──────────────────────────────────────────────
export function fmt(s: number): string {
  s = Math.max(0, s);
  const whole = Math.ceil(s - 1e-6);
  const m = Math.floor(whole / 60);
  const ss = whole % 60;
  return m + ":" + String(ss).padStart(2, "0");
}
export const fmtDown = fmt;
export function fmtUp(s: number): string {
  s = Math.max(0, Math.floor(s));
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return m + ":" + String(ss).padStart(2, "0");
}

// ── timer presets ───────────────────────────────────────────
export const TIMER_MODES: { id: TimerMode; name: string; blurb: string }[] = [
  { id: "emom", name: "EMOM", blurb: "Every Minute On the Minute" },
  { id: "amrap", name: "AMRAP", blurb: "As Many Rounds As Possible" },
  { id: "tabata", name: "TABATA", blurb: "20s work · 10s rest" },
  { id: "fortime", name: "FOR TIME", blurb: "Race the clock" },
];

export const TIMER_DEFAULTS: Record<TimerMode, TimerCfg> = {
  emom: { interval: 60, rounds: 10, prep: 5 },
  amrap: { total: 720, prep: 5 },
  tabata: { work: 20, rest: 10, rounds: 8, prep: 5 },
  fortime: { cap: 600, prep: 5 },
};

// Build the countdown timeline for a given mode/cfg.
// FOR-TIME has no countdown timeline — it counts up after prep.
export function buildSegments(mode: TimerMode, cfg: TimerCfg): Segment[] {
  if (mode === "emom") {
    return Array.from({ length: cfg.rounds ?? 0 }, (_, i) => ({
      kind: "work" as const,
      label: "GO",
      dur: cfg.interval ?? 0,
      round: i + 1,
      rounds: cfg.rounds ?? 0,
    }));
  }
  if (mode === "tabata") {
    const segs: Segment[] = [];
    const rounds = cfg.rounds ?? 0;
    for (let i = 0; i < rounds; i++) {
      segs.push({ kind: "work", label: "WORK", dur: cfg.work ?? 0, round: i + 1, rounds });
      segs.push({ kind: "rest", label: "REST", dur: cfg.rest ?? 0, round: i + 1, rounds });
    }
    return segs;
  }
  if (mode === "amrap") {
    return [{ kind: "work", label: "AMRAP", dur: cfg.total ?? 0, round: 1, rounds: 1 }];
  }
  return []; // fortime
}

export interface TimerSnapshot {
  mode: TimerMode;
  countUp: boolean;
  phase: "prep" | "run" | "done";
  running: boolean;
  done: boolean;
  idle: boolean;
  label: string;
  bigSeconds: number;
  round: number;
  rounds: number;
  kind: SegmentKind;
  segProgress: number;
  totalProgress: number;
  taps: number;
  elapsedSec: number;
  timeLeftTotal: number | null;
  start: () => void;
  pause: () => void;
  reset: () => void;
  finish: () => void;
  toggle: () => void;
  addTap: () => void;
  dropTap: () => void;
}

// useTimer — one accumulator `t` = seconds since Start (incl. prep).
export function useTimer(mode: TimerMode, cfg: TimerCfg): TimerSnapshot {
  const cfgKey = JSON.stringify(cfg);
  const segments = useMemo(() => buildSegments(mode, cfg), [mode, cfgKey]);
  const countUp = mode === "fortime";
  const prepDur = cfg.prep || 0;
  const totalDur = segments.reduce((a, s) => a + s.dur, 0); // 0 for fortime

  const [t, setT] = useState(0);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [taps, setTaps] = useState(0); // amrap rounds / fortime reps logged

  const acc = useRef(0);
  const startTs = useRef(0);
  const timer = useRef<ReturnType<typeof setInterval> | 0>(0);

  const stop = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = 0;
  };
  useEffect(() => stop, []);
  // reset when config/mode changes
  useEffect(() => {
    stop();
    acc.current = 0;
    startTs.current = 0;
    setT(0);
    setRunning(false);
    setDone(false);
    setTaps(0);
  }, [mode, cfgKey]);

  const tick = () => {
    const now = performance.now();
    const el = acc.current + (now - startTs.current) / 1000;
    const cap = countUp ? (cfg.cap ? prepDur + cfg.cap : Infinity) : prepDur + totalDur;
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
    setTaps(0);
  };
  const finish = () => {
    // for-time manual finish
    stop();
    acc.current = t;
    setRunning(false);
    setDone(true);
  };
  const toggle = () => (running ? pause() : start());

  // ── derive snapshot ──
  const inPrep = t < prepDur && !done;
  const runT = Math.max(0, t - prepDur);

  const phase: "prep" | "run" | "done" = inPrep ? "prep" : done ? "done" : "run";
  let label: string;
  let bigSeconds: number;
  let round = 1;
  let rounds = 1;
  let kind: SegmentKind = "work";
  let segProgress = 0;
  let totalProgress = 0;

  if (inPrep) {
    label = "GET READY";
    bigSeconds = prepDur - t;
    kind = "prep";
    segProgress = prepDur ? t / prepDur : 0;
    totalProgress = 0;
    round = 1;
    rounds = segments[0]?.rounds || 1;
  } else if (countUp) {
    label = done ? "DONE" : "FOR TIME";
    bigSeconds = runT;
    kind = done ? "done" : "work";
    totalProgress = cfg.cap ? Math.min(1, runT / cfg.cap) : 0;
    segProgress = totalProgress;
  } else {
    let before = 0;
    let idx = segments.length - 1;
    for (let i = 0; i < segments.length; i++) {
      if (runT < before + segments[i].dur) {
        idx = i;
        break;
      }
      before += segments[i].dur;
    }
    if (done) {
      idx = segments.length - 1;
      before = totalDur - (segments[idx]?.dur || 0);
    }
    const seg =
      segments[idx] ||
      segments[segments.length - 1] ||
      ({ dur: 0, label: "", round: 1, rounds: 1, kind: "work" } as Segment);
    const segEl = Math.min(seg.dur, runT - before);
    label = done ? "DONE" : seg.label;
    bigSeconds = done ? 0 : seg.dur - segEl;
    round = seg.round;
    rounds = seg.rounds;
    kind = done ? "done" : seg.kind;
    segProgress = seg.dur ? segEl / seg.dur : 1;
    totalProgress = totalDur ? Math.min(1, runT / totalDur) : 0;
  }

  return {
    mode,
    countUp,
    phase,
    running,
    done,
    idle: !running && !done && t === 0,
    label,
    bigSeconds,
    round,
    rounds,
    kind,
    segProgress,
    totalProgress,
    taps,
    elapsedSec: t,
    timeLeftTotal: countUp ? null : Math.max(0, totalDur - runT),
    start,
    pause,
    reset,
    finish,
    toggle,
    addTap: () => setTaps((n) => n + 1),
    dropTap: () => setTaps((n) => Math.max(0, n - 1)),
  };
}

// ── tracking state: toggle sets, edit reps/kg, rest timer ────
export interface WorkoutOptions {
  restSeconds?: number;
  autoRest?: boolean;
}

export function useWorkout(initial: Workout, opts?: WorkoutOptions) {
  const restSeconds = opts?.restSeconds ?? 90;
  const autoRestEnabled = opts?.autoRest ?? true;
  const [wo, setWo] = useState<Workout>(initial);
  const [rest, setRest] = useState(0); // seconds remaining
  const restTimer = useRef<ReturnType<typeof setInterval> | 0>(0);
  const restEnd = useRef(0);

  // keep tracking state in sync if a different session is started
  useEffect(() => {
    setWo(initial);
  }, [initial]);

  useEffect(() => () => {
    if (restTimer.current) clearInterval(restTimer.current);
  }, []);

  const tickRest = () => {
    const left = Math.max(0, (restEnd.current - performance.now()) / 1000);
    setRest(left);
    if (left <= 0 && restTimer.current) {
      clearInterval(restTimer.current);
      restTimer.current = 0;
    }
  };
  const startRest = (sec = 90) => {
    if (restTimer.current) clearInterval(restTimer.current);
    restEnd.current = performance.now() + sec * 1000;
    setRest(sec);
    restTimer.current = setInterval(tickRest, 100);
  };
  const stopRest = () => {
    if (restTimer.current) clearInterval(restTimer.current);
    restTimer.current = 0;
    setRest(0);
  };

  const toggleSet = (exId: string, si: number) => {
    const ex = wo.exercises.find((e) => e.id === exId);
    const markingDone = ex && !ex.sets[si].done;
    setWo((w) => ({
      ...w,
      exercises: w.exercises.map((e) =>
        e.id !== exId
          ? e
          : { ...e, sets: e.sets.map((s, i) => (i === si ? { ...s, done: !s.done } : s)) },
      ),
    }));
    if (
      autoRestEnabled &&
      markingDone &&
      shouldStartRestAfterSet(wo.exercises, exId, si)
    ) {
      startRest(restSeconds);
    }
  };

  const linkExerciseWithPrevious = (exId: string) => {
    setWo((w) => ({ ...w, exercises: sanitizeSupersetIds(linkWithPrevious(w.exercises, exId)) }));
  };

  const unlinkExerciseFromSuperset = (exId: string) => {
    setWo((w) => ({ ...w, exercises: unlinkFromSuperset(w.exercises, exId) }));
  };
  const editSet = (exId: string, si: number, field: SetField, delta: number) => {
    setWo((w) => ({
      ...w,
      exercises: w.exercises.map((e) =>
        e.id !== exId
          ? e
          : {
              ...e,
              sets: e.sets.map((s, i) =>
                i !== si ? s : { ...bumpSetField(s, field, delta, e.metric), done: s.done },
              ),
            },
      ),
    }));
  };

  const setSetValue = (exId: string, si: number, field: SetField, value: number) => {
    setWo((w) => ({
      ...w,
      exercises: w.exercises.map((e) =>
        e.id !== exId
          ? e
          : {
              ...e,
              sets: e.sets.map((s, i) =>
                i !== si ? s : { ...applySetField(s, field, value, e.metric), done: s.done },
              ),
            },
      ),
    }));
  };

  const setName = (name: string) => {
    setWo((w) => ({ ...w, name: name.trim() || w.name }));
  };

  const addExercise = (
    name: string,
    note?: string,
    metric: ExerciseMetric = DEFAULT_EXERCISE_METRIC,
    catalogExerciseId?: string,
  ) => {
    const id = crypto.randomUUID();
    setWo((w) => ({
      ...w,
      exercises: [
        ...w.exercises,
        { id, name: name.trim(), note, metric, catalogExerciseId, sets: [] },
      ],
    }));
    return id;
  };

  const removeExercise = (exId: string) => {
    setWo((w) => ({ ...w, exercises: w.exercises.filter((e) => e.id !== exId) }));
  };

  const defaultSet = (sets: WorkoutSet[], metric: ExerciseMetric): WorkoutSet => {
    const last = sets[sets.length - 1];
    if (last) {
      return {
        reps: last.reps,
        kg: last.kg,
        durationSec: last.durationSec,
        distanceM: last.distanceM,
        done: false,
      };
    }
    return { ...createEmptySet(metric), done: false };
  };

  const addSet = (exId: string) => {
    setWo((w) => ({
      ...w,
      exercises: w.exercises.map((e) =>
        e.id !== exId ? e : { ...e, sets: [...e.sets, defaultSet(e.sets, e.metric)] },
      ),
    }));
  };

  const removeSet = (exId: string, si: number) => {
    setWo((w) => ({
      ...w,
      exercises: w.exercises.map((e) =>
        e.id !== exId ? e : { ...e, sets: e.sets.filter((_, i) => i !== si) },
      ),
    }));
  };

  const totalSets = wo.exercises.reduce((a, e) => a + e.sets.length, 0);
  const doneSets = wo.exercises.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0);
  const volume = wo.exercises.reduce(
    (a, e) => a + e.sets.filter((s) => s.done).reduce((b, s) => b + setVolumeKg(s, e.metric), 0),
    0,
  );

  return {
    wo,
    rest,
    restActive: rest > 0,
    startRest,
    stopRest,
    toggleSet,
    linkExerciseWithPrevious,
    unlinkExerciseFromSuperset,
    editSet,
    setSetValue,
    setName,
    addExercise,
    removeExercise,
    addSet,
    removeSet,
    totalSets,
    doneSets,
    volume,
  };
}

export function sessionMetrics(exercises: { metric?: ExerciseMetric; sets: WorkoutSet[] }[]) {
  const setCount = exercises.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0);
  const volumeKg = exercises.reduce(
    (a, e) =>
      a + e.sets.filter((s) => s.done).reduce((b, s) => b + setVolumeKg(s, e.metric ?? DEFAULT_EXERCISE_METRIC), 0),
    0,
  );
  return { setCount, volumeKg };
}
