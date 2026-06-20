import { M, type SegmentKind } from "../../theme";
import type { TimerMode } from "../engine";

export interface TimerModeColors {
  accent: string;
  soft: string;
  border: string;
}

/** GET READY countdown — always yellow, independent of timer mode. */
export const TIMER_PREP_COLOR = "#facc15";

export const TIMER_MODE_COLORS: Record<TimerMode, TimerModeColors> = {
  emom: {
    accent: M.brandStrong,
    soft: "rgba(126,246,123,.14)",
    border: "rgba(126,246,123,.32)",
  },
  amrap: {
    accent: "#f59e0b",
    soft: "rgba(245,158,11,.14)",
    border: "rgba(245,158,11,.32)",
  },
  tabata: {
    accent: "#ef4444",
    soft: "rgba(239,68,68,.14)",
    border: "rgba(239,68,68,.32)",
  },
  fortime: {
    accent: "#3b82f6",
    soft: "rgba(59,130,246,.14)",
    border: "rgba(59,130,246,.32)",
  },
};

export function timerModeAccent(mode: TimerMode): string {
  return TIMER_MODE_COLORS[mode].accent;
}

export function timerPhaseColor(kind: SegmentKind, modeAccent: string, done: boolean): string {
  if (done || kind === "done") return M.mut2;
  if (kind === "prep") return TIMER_PREP_COLOR;
  if (kind === "rest") return M.fg;
  return modeAccent;
}
