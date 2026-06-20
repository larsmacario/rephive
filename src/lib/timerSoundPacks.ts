import type { TimerCue } from "./timerSounds";

export interface TimerSoundPack {
  id: string;
  label: string;
  description: string;
}

export const DEFAULT_TIMER_SOUND_PACK_ID = "klassisch";

export const TIMER_SOUND_PACKS: TimerSoundPack[] = [
  {
    id: "klassisch",
    label: "Klassisch",
    description: "Kurze digitale Beep-Signale",
  },
  {
    id: "boxring",
    label: "Boxring",
    description: "Metallische Round-Glocke mit langem Nachklang",
  },
  {
    id: "pfeife",
    label: "Pfeife",
    description: "Trainer-Pfeife mit Luftgeräusch",
  },
  {
    id: "sanft",
    label: "Sanft",
    description: "Leise Sinus-Chimes",
  },
];

const PACK_BY_ID = new Map(TIMER_SOUND_PACKS.map((p) => [p.id, p]));

export function getTimerSoundPack(packId: string): TimerSoundPack {
  return PACK_BY_ID.get(packId) ?? PACK_BY_ID.get(DEFAULT_TIMER_SOUND_PACK_ID)!;
}

export function normalizeTimerSoundPackId(raw: unknown): string {
  if (typeof raw === "string" && PACK_BY_ID.has(raw)) return raw;
  return DEFAULT_TIMER_SOUND_PACK_ID;
}

export type { TimerCue };
