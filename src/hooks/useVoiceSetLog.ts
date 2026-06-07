import { Capacitor } from "@capacitor/core";
import type { PluginListenerHandle } from "@capacitor/core";
import { useCallback, useEffect, useRef, useState } from "react";

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: { [index: number]: { transcript: string }; isFinal?: boolean };
  };
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type SpeechBackend = "native" | "web";

interface NativePartialResultEvent {
  matches?: string[];
  accumulated?: string;
  accumulatedText?: string;
  forced?: boolean;
}

const BASE_CONTEXTUAL_STRINGS = [
  "Kilo",
  "Kilogramm",
  "kg",
  "Wiederholung",
  "Wiederholungen",
  "Wdh",
  "Reps",
  "Satz",
  "zehn",
  "zwanzig",
  "dreißig",
  "mal",
];

const SIMULATOR_EMPTY_ERROR =
  "Im Simulator oft kein Mikro-Signal — Xcode: I/O → Microphone. Zuverlässig: echtes iPhone.";

function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function pickNativeTranscript(event: NativePartialResultEvent): string {
  return (event.accumulatedText ?? event.accumulated ?? event.matches?.[0] ?? "").trim();
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message.trim()) return err.message.trim();
  if (typeof err === "string" && err.trim()) return err.trim();
  return fallback;
}

function pickWebTranscript(event: SpeechRecognitionEventLike): string {
  const results = event.results;
  for (let i = results.length - 1; i >= 0; i -= 1) {
    const transcript = results[i]?.[0]?.transcript?.trim();
    if (transcript) return transcript;
  }
  return "";
}

export interface UseVoiceSetLogOptions {
  onResult: (transcript: string) => void;
  lang?: string;
  contextualStrings?: string[];
}

export function useVoiceSetLog({
  onResult,
  lang = "de-DE",
  contextualStrings = [],
}: UseVoiceSetLogOptions) {
  const [listening, setListening] = useState(false);
  const [starting, setStarting] = useState(false);
  const [supported, setSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  const backendRef = useRef<SpeechBackend | null>(null);
  const webRecRef = useRef<SpeechRecognitionLike | null>(null);
  const nativeActiveRef = useRef(false);
  const sessionActiveRef = useRef(false);
  const startingRef = useRef(false);
  const stopQueuedRef = useRef(false);
  const emittedThisSessionRef = useRef(false);
  const latestTranscriptRef = useRef("");
  const partialListenerRef = useRef<PluginListenerHandle | null>(null);
  const errorListenerRef = useRef<PluginListenerHandle | null>(null);
  const contextualStringsRef = useRef(contextualStrings);
  contextualStringsRef.current = contextualStrings;

  const cacheTranscript = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    latestTranscriptRef.current = trimmed;
  }, []);

  const resolveTranscript = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed || emittedThisSessionRef.current) return;
    emittedThisSessionRef.current = true;
    onResultRef.current(trimmed);
  }, []);

  const mergedContextualStrings = useCallback(() => {
    const merged = [...BASE_CONTEXTUAL_STRINGS, ...contextualStringsRef.current];
    return [...new Set(merged.map((s) => s.trim()).filter(Boolean))];
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function initNative() {
      try {
        const { SpeechRecognition } = await import("@capgo/capacitor-speech-recognition");
        const { available } = await SpeechRecognition.available();
        if (cancelled) return;
        if (!available) return false;

        partialListenerRef.current = await SpeechRecognition.addListener(
          "partialResults",
          (event: NativePartialResultEvent) => {
            const text = pickNativeTranscript(event);
            if (text) cacheTranscript(text);
            if (event.forced) resolveTranscript(text || latestTranscriptRef.current);
          },
        );

        errorListenerRef.current = await SpeechRecognition.addListener("error", (event) => {
          setError(event.message?.trim() || "Sprache nicht erkannt — bitte erneut versuchen.");
          nativeActiveRef.current = false;
          setListening(false);
          setStarting(false);
        });

        backendRef.current = "native";
        setSupported(true);
        return true;
      } catch {
        return false;
      }
    }

    function initWeb(Ctor: SpeechRecognitionConstructor) {
      const rec = new Ctor();
      rec.lang = lang;
      rec.continuous = true;
      rec.interimResults = true;
      rec.onresult = (event) => {
        const transcript = pickWebTranscript(event);
        if (transcript) cacheTranscript(transcript);
        const lastIdx = event.results.length - 1;
        if (event.results[lastIdx]?.isFinal && transcript) {
          resolveTranscript(transcript);
        }
      };
      rec.onerror = (ev) => {
        if (ev.error && ev.error !== "aborted") {
          setError("Sprache nicht erkannt — bitte erneut versuchen.");
        }
        setListening(false);
        setStarting(false);
        sessionActiveRef.current = false;
      };
      rec.onend = () => {
        if (!emittedThisSessionRef.current && latestTranscriptRef.current) {
          resolveTranscript(latestTranscriptRef.current);
        }
        setListening(false);
        setStarting(false);
        sessionActiveRef.current = false;
      };
      webRecRef.current = rec;
      backendRef.current = "web";
      setSupported(true);
    }

    async function init() {
      const WebCtor = getSpeechRecognition();
      if (WebCtor) {
        initWeb(WebCtor);
        return;
      }

      if (Capacitor.isNativePlatform()) {
        const ok = await initNative();
        if (!cancelled && !ok) {
          setSupported(false);
          setError("Spracherkennung auf diesem Gerät nicht verfügbar.");
        }
        return;
      }

      if (!cancelled) {
        setSupported(false);
        setError("Spracherkennung in diesem Browser nicht verfügbar.");
      }
    }

    void init();

    return () => {
      cancelled = true;
      void partialListenerRef.current?.remove();
      void errorListenerRef.current?.remove();
      partialListenerRef.current = null;
      errorListenerRef.current = null;
      webRecRef.current?.abort();
      webRecRef.current = null;
      backendRef.current = null;
    };
  }, [cacheTranscript, lang, resolveTranscript]);

  const ensureNativeMicPermission = useCallback(async () => {
    const { SpeechRecognition } = await import("@capgo/capacitor-speech-recognition");
    const perm = await SpeechRecognition.requestPermissions();
    if (perm.speechRecognition !== "granted") {
      throw new Error("Mikrofon- oder Sprachberechtigung fehlt.");
    }
  }, []);

  const cleanupNativeSession = useCallback(async () => {
    const { SpeechRecognition } = await import("@capgo/capacitor-speech-recognition");
    const { listening: stillListening } = await SpeechRecognition.isListening();
    if (!stillListening) return;
    try {
      await SpeechRecognition.forceStop();
    } catch {
      try {
        await SpeechRecognition.stop();
      } catch {
        // ignore stale session cleanup errors
      }
    }
    await delay(120);
  }, []);

  const stopNative = useCallback(async () => {
    sessionActiveRef.current = false;
    nativeActiveRef.current = false;
    setListening(false);
    setStarting(false);

    try {
      const { SpeechRecognition } = await import("@capgo/capacitor-speech-recognition");

      const beforeStop = await SpeechRecognition.getLastPartialResult();
      const cachedBeforeStop = pickNativeTranscript({
        accumulatedText: beforeStop.text,
        matches: beforeStop.matches,
      });

      try {
        await SpeechRecognition.forceStop();
      } catch {
        try {
          await SpeechRecognition.stop();
        } catch {
          // session may already be gone
        }
      }
      await delay(250);

      if (!emittedThisSessionRef.current) {
        const text = latestTranscriptRef.current || cachedBeforeStop || beforeStop.text.trim();
        if (text) {
          resolveTranscript(text);
        } else if (Capacitor.getPlatform() === "ios") {
          setError(SIMULATOR_EMPTY_ERROR);
        } else {
          setError("Nichts erkannt — Mikrofon prüfen.");
        }
      }
    } catch (err) {
      if (!emittedThisSessionRef.current && latestTranscriptRef.current) {
        resolveTranscript(latestTranscriptRef.current);
      } else if (!emittedThisSessionRef.current) {
        setError(errorMessage(err, "Sprache nicht erkannt — bitte erneut versuchen."));
      }
    } finally {
      latestTranscriptRef.current = "";
    }
  }, [resolveTranscript]);

  const startNative = useCallback(async () => {
    const { SpeechRecognition } = await import("@capgo/capacitor-speech-recognition");
    await ensureNativeMicPermission();
    await cleanupNativeSession();

    await SpeechRecognition.start({
      language: lang,
      partialResults: true,
      maxResults: 3,
      contextualStrings: mergedContextualStrings(),
    });
  }, [cleanupNativeSession, ensureNativeMicPermission, lang, mergedContextualStrings]);

  const start = useCallback(async () => {
    setError(null);

    if (backendRef.current === "native") {
      if (nativeActiveRef.current || startingRef.current) return;
      startingRef.current = true;
      setStarting(true);
      stopQueuedRef.current = false;
      emittedThisSessionRef.current = false;
      latestTranscriptRef.current = "";
      sessionActiveRef.current = true;

      try {
        await startNative();
        if (stopQueuedRef.current) {
          await stopNative();
          return;
        }
        nativeActiveRef.current = true;
        setListening(true);
      } catch (err) {
        sessionActiveRef.current = false;
        setError(errorMessage(err, "Mikrofon gerade nicht verfügbar."));
        nativeActiveRef.current = false;
        setListening(false);
      } finally {
        startingRef.current = false;
        setStarting(false);
      }
      return;
    }

    const rec = webRecRef.current;
    if (!rec) return;
    sessionActiveRef.current = true;
    emittedThisSessionRef.current = false;
    latestTranscriptRef.current = "";
    setStarting(true);
    try {
      rec.start();
      setListening(true);
    } catch (err) {
      sessionActiveRef.current = false;
      setError(errorMessage(err, "Mikrofon gerade nicht verfügbar."));
      setListening(false);
    } finally {
      setStarting(false);
    }
  }, [startNative, stopNative]);

  const stop = useCallback(async () => {
    if (backendRef.current === "native") {
      if (startingRef.current) {
        stopQueuedRef.current = true;
        return;
      }
      if (!sessionActiveRef.current && !nativeActiveRef.current) return;
      await stopNative();
      return;
    }

    webRecRef.current?.stop();
    setListening(false);
    setStarting(false);
    sessionActiveRef.current = false;
  }, [stopNative]);

  return { listening, starting, supported, error, start, stop };
}
