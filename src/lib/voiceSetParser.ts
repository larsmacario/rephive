import { normalizeExerciseName } from "./db";
import type { Exercise } from "./engine";
import { cleanVoiceTranscript } from "./voiceTranscriptCleanup";

export interface VoiceSetParseResult {
  raw: string;
  /** STT text after gym-specific cleanup (for display + parsing). */
  cleaned: string;
  exerciseName: string | null;
  kg: number | null;
  reps: number | null;
}

const FILLER_PREFIX = /^(in|und|mit|also|äh+|hm+|okay|so|dann|jetzt)\s+/;

const GERMAN_ONES: Record<string, number> = {
  null: 0,
  eins: 1,
  ein: 1,
  eine: 1,
  einer: 1,
  zwei: 2,
  drei: 3,
  vier: 4,
  fünf: 5,
  funf: 5,
  sechs: 6,
  sieben: 7,
  acht: 8,
  neun: 9,
  zehn: 10,
  elf: 11,
  zwölf: 12,
  zwoelf: 12,
  zwolf: 12,
  dreizehn: 13,
  vierzehn: 14,
  fünfzehn: 15,
  funfzehn: 15,
  sechzehn: 16,
  siebzehn: 17,
  achtzehn: 18,
  neunzehn: 19,
};

const GERMAN_TENS: Record<string, number> = {
  zwanzig: 20,
  dreißig: 30,
  dreissig: 30,
  vierzig: 40,
  fünfzig: 50,
  funfzig: 50,
  sechzig: 60,
  siebzig: 70,
  achtzig: 80,
  neunzig: 90,
  hundert: 100,
};

function buildGermanNumberWordMap(): Map<string, number> {
  const map = new Map<string, number>(Object.entries({ ...GERMAN_ONES, ...GERMAN_TENS }));

  for (const [onesWord, onesVal] of Object.entries(GERMAN_ONES)) {
    if (onesVal === 0 || onesVal >= 10) continue;
    for (const [tensWord, tensVal] of Object.entries(GERMAN_TENS)) {
      if (tensVal >= 100) continue;
      map.set(`${onesWord}und${tensWord}`, tensVal + onesVal);
    }
  }

  return map;
}

const GERMAN_NUMBER_WORDS = buildGermanNumberWordMap();

function replaceGermanNumberWords(text: string): string {
  let s = ` ${text} `;
  const words = [...GERMAN_NUMBER_WORDS.keys()].sort((a, b) => b.length - a.length);
  for (const word of words) {
    const num = GERMAN_NUMBER_WORDS.get(word);
    if (num == null) continue;
    s = s.replace(new RegExp(`\\s${word}\\s`, "g"), ` ${num} `);
  }
  return s.trim().replace(/\s+/g, " ");
}

function normalizeUtterance(text: string): string {
  let s = text
    .toLowerCase()
    .replace(/,/g, ".")
    .replace(/×/g, "x")
    .replace(/\s+/g, " ")
    .trim();

  while (FILLER_PREFIX.test(s)) {
    s = s.replace(FILLER_PREFIX, "").trim();
  }

  s = replaceGermanNumberWords(s);

  return s
    .replace(/\bkilo\b/g, "kg")
    .replace(/\bwdh\.?\b/g, "wdh")
    .replace(/\bwiederholungen?\b/g, "wdh")
    .replace(/\bmal\b/g, "x")
    .replace(/\bfor\b/g, " ");
}

function parseNumbers(text: string): { kg: number | null; reps: number | null } {
  const normalized = normalizeUtterance(text);

  const timesMatch = normalized.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+)/);
  if (timesMatch) {
    return finalize(parseFloat(timesMatch[1]), parseInt(timesMatch[2], 10));
  }

  const kgMatch =
    normalized.match(/(\d+(?:\.\d+)?)\s*kg/) ?? normalized.match(/kg\s+(\d+(?:\.\d+)?)/);
  const repsMatch =
    normalized.match(/(\d+)\s*wdh/) ??
    normalized.match(/wdh\s+(\d+)/) ??
    normalized.match(/(\d+)\s*reps?/);

  let kg = kgMatch ? parseFloat(kgMatch[1]) : null;
  let reps = repsMatch ? parseInt(repsMatch[1], 10) : null;

  const numbers = [...normalized.matchAll(/\d+(?:\.\d+)?/g)].map((m) => parseFloat(m[0]));

  if (kg == null && reps == null && numbers.length >= 2) {
    const [a, b] = numbers;
    if (a >= b) {
      kg = a;
      reps = Math.round(b);
    } else {
      kg = b;
      reps = Math.round(a);
    }
  } else if (kg == null && reps != null && numbers.length >= 2) {
    const other = numbers.find((n) => Math.round(n) !== reps);
    if (other != null) kg = other;
  } else if (reps == null && kg != null && numbers.length >= 2) {
    const other = numbers.find((n) => n !== kg);
    if (other != null) reps = Math.round(other);
  }

  return finalize(kg, reps);
}

function finalize(kg: number | null, reps: number | null): { kg: number | null; reps: number | null } {
  if (kg != null && (!Number.isFinite(kg) || kg < 0)) kg = null;
  if (reps != null && (!Number.isFinite(reps) || reps < 1)) reps = null;
  return { kg, reps };
}

function matchExerciseName(raw: string, exercises: Exercise[]): string | null {
  const norm = normalizeExerciseName(raw);
  if (!norm) return null;
  for (const ex of exercises) {
    const nameNorm = normalizeExerciseName(ex.name);
    if (norm === nameNorm || norm.includes(nameNorm) || nameNorm.includes(norm)) {
      return ex.name;
    }
  }
  const tokens = norm.split(/\s+/).filter(Boolean);
  for (const ex of exercises) {
    const nameNorm = normalizeExerciseName(ex.name);
    if (tokens.some((t) => t.length >= 4 && nameNorm.includes(t))) return ex.name;
  }
  return null;
}

/** Parse German gym utterances like „Bankdrücken 80 Kilo 8“. */
export function parseVoiceSetUtterance(raw: string, exercises: Exercise[] = []): VoiceSetParseResult {
  const trimmed = raw.trim();
  const cleaned = cleanVoiceTranscript(trimmed);
  const { kg, reps } = parseNumbers(cleaned);

  let exerciseName: string | null = null;
  if (exercises.length > 0) {
    const withoutNumbers = cleaned
      .replace(/\d+(?:[.,]\d+)?/g, " ")
      .replace(/\b(kg|kilo|wdh|wiederholungen?|reps?|mal|x|×)\b/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (withoutNumbers.length >= 3) {
      exerciseName = matchExerciseName(withoutNumbers, exercises);
    }
  }

  return { raw: trimmed, cleaned, exerciseName, kg, reps };
}
