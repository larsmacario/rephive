export type TimerCue = "tick" | "go" | "rest" | "done";

const CUE_CONFIG: Record<TimerCue, { freq: number; duration: number; type?: OscillatorType }> = {
  tick: { freq: 880, duration: 0.12 },
  go: { freq: 660, duration: 0.2 },
  rest: { freq: 440, duration: 0.2 },
  done: { freq: 880, duration: 0.15 },
};

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
  }
  return audioCtx;
}

function playBeep(freq: number, duration: number, type: OscillatorType = "sine", when = 0) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const startAt = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.28, startAt);
  gain.gain.exponentialRampToValueAtTime(0.001, startAt + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startAt);
  osc.stop(startAt + duration + 0.02);
}

export function playTimerCue(cue: TimerCue) {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    void ctx.resume();
  }

  const { freq, duration, type } = CUE_CONFIG[cue];
  if (cue === "done") {
    playBeep(freq, duration, type, 0);
    playBeep(freq, duration, type, 0.22);
    return;
  }
  playBeep(freq, duration, type);
}

export function countdownSecond(seconds: number): number {
  return Math.ceil(seconds - 1e-6);
}
