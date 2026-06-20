import { DEFAULT_TIMER_SOUND_PACK_ID } from "./timerSoundPacks";
import { playPackCue } from "./timerAudioEngine";

export type TimerCue = "tick" | "go" | "rest" | "done";

export function playTimerCue(cue: TimerCue, packId = DEFAULT_TIMER_SOUND_PACK_ID) {
  playPackCue(packId, cue);
}

export function countdownSecond(seconds: number): number {
  return Math.ceil(seconds - 1e-6);
}
