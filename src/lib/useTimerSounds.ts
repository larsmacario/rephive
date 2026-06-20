import { useEffect, useRef } from "react";
import type { SegmentKind } from "../theme";
import type { TimerSnapshot } from "./engine";
import { countdownSecond, playTimerCue } from "./timerSounds";

interface IntervalSoundState {
  phase: TimerSnapshot["phase"];
  kind: SegmentKind;
  round: number;
  done: boolean;
}

export function useIntervalTimerSounds(
  snapshot: Pick<
    TimerSnapshot,
    "running" | "phase" | "kind" | "round" | "bigSeconds" | "done" | "mode" | "countUp" | "idle"
  >,
  enabled: boolean,
  packId: string,
  cap?: number,
) {
  const prev = useRef<IntervalSoundState | null>(null);
  const prevTickSec = useRef<number | null>(null);
  const segmentKey = useRef<string>("");

  useEffect(() => {
    if (!enabled || snapshot.idle) {
      prev.current = null;
      prevTickSec.current = null;
      segmentKey.current = "";
      return;
    }

    if (!snapshot.running) return;

    const current: IntervalSoundState = {
      phase: snapshot.phase,
      kind: snapshot.kind,
      round: snapshot.round,
      done: snapshot.done,
    };

    const key = `${snapshot.phase}:${snapshot.kind}:${snapshot.round}`;
    if (key !== segmentKey.current) {
      segmentKey.current = key;
      prevTickSec.current = null;
    }

    if (prev.current) {
      if (prev.current.phase === "prep" && current.phase === "run") {
        playTimerCue("go", packId);
      } else if (current.phase === "run" && prev.current.phase === "run") {
        if (prev.current.round !== current.round || prev.current.kind !== current.kind) {
          playTimerCue(current.kind === "rest" ? "rest" : "go", packId);
        }
      }

      if (!prev.current.done && current.done) {
        const manualForTimeFinish =
          snapshot.mode === "fortime" && snapshot.countUp && (cap == null || snapshot.bigSeconds < cap - 0.05);
        if (!manualForTimeFinish) {
          playTimerCue("done", packId);
        }
      }
    } else if (current.phase === "run") {
      playTimerCue("go", packId);
    }

    if (!snapshot.done && (snapshot.phase === "prep" || !snapshot.countUp)) {
      const sec = countdownSecond(snapshot.bigSeconds);
      if (sec >= 1 && sec <= 3 && sec !== prevTickSec.current) {
        playTimerCue("tick", packId);
        prevTickSec.current = sec;
      }
    }

    prev.current = current;
  }, [
    enabled,
    packId,
    snapshot.idle,
    snapshot.running,
    snapshot.phase,
    snapshot.kind,
    snapshot.round,
    snapshot.bigSeconds,
    snapshot.done,
    snapshot.mode,
    snapshot.countUp,
    cap,
  ]);
}

export function useRestTimerSounds(rest: number, restActive: boolean, enabled: boolean, packId: string) {
  const prevActive = useRef(false);
  const prevRest = useRef(0);
  const prevTickSec = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      prevActive.current = false;
      prevRest.current = 0;
      prevTickSec.current = null;
      return;
    }

    if (!restActive) {
      if (prevActive.current && prevRest.current > 0 && prevRest.current <= 1.5 && rest <= 0) {
        playTimerCue("go", packId);
      }
      prevActive.current = false;
      prevRest.current = rest;
      prevTickSec.current = null;
      return;
    }

    if (!prevActive.current && restActive) {
      playTimerCue("rest", packId);
      prevTickSec.current = null;
    }

    const sec = countdownSecond(rest);
    if (sec >= 1 && sec <= 3 && sec !== prevTickSec.current) {
      playTimerCue("tick", packId);
      prevTickSec.current = sec;
    }

    prevActive.current = restActive;
    prevRest.current = rest;
  }, [enabled, packId, rest, restActive]);
}
