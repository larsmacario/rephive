import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Exercise } from "../../lib/engine";
import {
  countTurboProgress,
  findNextTurboExercise,
  findNextTurboTarget,
  formatTurboSetDisplay,
} from "../../lib/frictionTurbo";
import type { SetField } from "../../lib/exerciseSets";
import { prefersReducedMotion, triggerTapHaptic } from "../../lib/haptics";
import {
  appendFrictionMetrics,
  type FrictionSessionMetrics,
} from "../../lib/ownerLabs";
import { useVoiceSetLog } from "../../hooks/useVoiceSetLog";
import { usePushToTalk } from "../../hooks/usePushToTalk";
import { parseVoiceSetUtterance, type VoiceSetParseResult } from "../../lib/voiceSetParser";
import { brandButtonStyle, buttonBase, buttonPressStyle, M } from "../../theme";
import { MButton } from "../MButton";
import { Icon } from "../Icon";

export interface FrictionTurboViewProps {
  exercises: Exercise[];
  elapsedSec: number;
  onBack: () => void;
  onBumpSet: (exId: string, setIndex: number, field: SetField, delta: number) => void;
  onSetValues: (exId: string, setIndex: number, kg: number, reps: number) => void;
  onToggleSet: (exId: string, setIndex: number) => void;
  onAddSet: (exId: string) => void;
  onRemoveSet: (exId: string, setIndex: number) => void;
  onOpenExerciseMenu: (exId: string) => void;
  onOpenHistory: (exId: string) => void;
  onOpenNotes: (exId: string) => void;
  onAllSetsDone?: () => void;
}

function fmtElapsed(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function FrictionTurboView({
  exercises,
  elapsedSec,
  onBack,
  onBumpSet,
  onSetValues,
  onToggleSet,
  onAddSet,
  onRemoveSet,
  onOpenExerciseMenu,
  onOpenHistory,
  onOpenNotes,
  onAllSetsDone,
}: FrictionTurboViewProps) {
  const target = useMemo(() => findNextTurboTarget(exercises), [exercises]);
  const progress = useMemo(() => countTurboProgress(exercises), [exercises]);
  const progressPct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  const exercise = target ? exercises.find((e) => e.id === target.exerciseId) : null;
  const set = exercise && target ? exercise.sets[target.setIndex] : null;

  const metricsRef = useRef<FrictionSessionMetrics>({
    mode: "turbo",
    startedAt: new Date().toISOString(),
    setsLogged: 0,
    tapCount: 0,
    overrideCount: 0,
    setDurationsMs: [],
  });
  const setStartedAt = useRef<number>(performance.now());
  const prevTargetKey = useRef<string | null>(null);
  const finishedRef = useRef(false);

  const [voicePreview, setVoicePreview] = useState<VoiceSetParseResult | null>(null);
  const [exerciseSwitchFlash, setExerciseSwitchFlash] = useState(false);
  const prevExerciseIdRef = useRef<string | null>(null);

  const nextExercise = useMemo(() => {
    if (!target) return null;
    return findNextTurboExercise(exercises, target.exerciseId);
  }, [exercises, target]);

  useEffect(() => {
    if (!target) return;
    const prev = prevExerciseIdRef.current;
    if (prev != null && prev !== target.exerciseId) {
      setExerciseSwitchFlash(true);
      void triggerTapHaptic();
      const id = window.setTimeout(() => setExerciseSwitchFlash(false), 600);
      prevExerciseIdRef.current = target.exerciseId;
      return () => window.clearTimeout(id);
    }
    prevExerciseIdRef.current = target.exerciseId;
  }, [target?.exerciseId, target]);

  const bumpTap = useCallback(() => {
    metricsRef.current.tapCount += 1;
  }, []);

  const recordOverride = useCallback(() => {
    metricsRef.current.overrideCount += 1;
    bumpTap();
  }, [bumpTap]);

  useEffect(() => {
    if (!target) return;
    const key = `${target.exerciseId}:${target.setIndex}`;
    if (prevTargetKey.current !== key) {
      setStartedAt.current = performance.now();
      prevTargetKey.current = key;
    }
  }, [target]);

  useEffect(() => {
    if (target || finishedRef.current || progress.total === 0) return;
    if (progress.done === progress.total) {
      finishedRef.current = true;
      metricsRef.current.endedAt = new Date().toISOString();
      appendFrictionMetrics({ ...metricsRef.current });
      onAllSetsDone?.();
    }
  }, [target, progress.done, progress.total, onAllSetsDone]);

  const handleConfirm = async () => {
    if (!target) return;
    bumpTap();
    const duration = Math.round(performance.now() - setStartedAt.current);
    metricsRef.current.setDurationsMs.push(duration);
    metricsRef.current.setsLogged += 1;
    await triggerTapHaptic();
    onToggleSet(target.exerciseId, target.setIndex);
  };

  const handleBump = (field: SetField, delta: number) => {
    if (!target) return;
    recordOverride();
    onBumpSet(target.exerciseId, target.setIndex, field, delta);
  };

  const handleVoiceResult = useCallback(
    (text: string) => {
      if (!target) return;
      setVoicePreview(parseVoiceSetUtterance(text, exercises));
    },
    [target, exercises],
  );

  const applyVoiceAndLog = async () => {
    if (!target || voicePreview?.kg == null || voicePreview.reps == null) return;
    recordOverride();
    onSetValues(target.exerciseId, target.setIndex, voicePreview.kg, voicePreview.reps);
    setVoicePreview(null);
    bumpTap();
    const duration = Math.round(performance.now() - setStartedAt.current);
    metricsRef.current.setDurationsMs.push(duration);
    metricsRef.current.setsLogged += 1;
    await triggerTapHaptic();
    onToggleSet(target.exerciseId, target.setIndex);
  };

  const voice = useVoiceSetLog({
    onResult: handleVoiceResult,
    contextualStrings: exercise ? [exercise.name] : [],
  });
  const ptt = usePushToTalk(
    () => voice.start(),
    () => voice.stop(),
    voice.supported,
  );
  const voiceActive = ptt.holding || voice.listening || voice.starting;

  if (!target || !set || !exercise) {
    if (onAllSetsDone) {
      return (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ color: M.mut, fontSize: 14, fontWeight: 600 }}>Workout wird zusammengefasst…</div>
        </div>
      );
    }

    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "24px 18px" }}>
        <div style={{ fontFamily: M.disp, fontWeight: 700, fontSize: 22, color: M.fg }}>Fertig</div>
        <div style={{ color: M.mut, marginTop: 8, fontSize: 14 }}>Alle Sätze erledigt.</div>
        <MButton type="button" variant="secondary" size="md" onClick={onBack} style={{ marginTop: 24 }}>
          Zur Übersicht
        </MButton>
      </div>
    );
  }

  const isSuggested = Boolean(set.suggested && !set.done);
  const canRemoveSet = exercise.sets.length > 1;
  const isLastSetInExercise = target.setIndex === target.totalSetsInExercise - 1;
  const showNextExercisePreview = isLastSetInExercise && nextExercise != null;
  const reducedMotion = prefersReducedMotion();

  const actionPillStyle = {
    padding: "10px 16px",
    minHeight: 44,
    borderRadius: 999,
    border: "1px solid " + M.line,
    background: M.card,
    color: M.fg,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: M.body,
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
  } as const;

  const handleAddSet = () => {
    if (!target) return;
    recordOverride();
    onAddSet(target.exerciseId);
  };

  const handleRemoveSet = () => {
    if (!target || !canRemoveSet) return;
    recordOverride();
    onRemoveSet(target.exerciseId, target.setIndex);
  };

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        padding: "8px 18px 12px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          marginBottom: 16,
          flexShrink: 0,
        }}
      >
        <MButton type="button" variant="ghost" size="icon" onClick={onBack} aria-label="Zur Übersicht">
          <Icon name="chevL" size={22} stroke={2.2} color={M.mut} />
        </MButton>
        <span
          style={{
            flex: 1,
            textAlign: "center",
            fontFamily: M.disp,
            fontWeight: 700,
            fontSize: 20,
            fontVariantNumeric: "tabular-nums",
            color: M.fg,
          }}
        >
          {fmtElapsed(elapsedSec)}
        </span>
        <div style={{ width: 44, flexShrink: 0 }} aria-hidden />
      </div>

      <div style={{ marginBottom: 12, flexShrink: 0 }}>
        <div style={{ height: 4, borderRadius: 999, background: M.line2, overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: `${progressPct}%`,
              background: M.brand,
              borderRadius: 999,
              transition: "width .25s ease",
            }}
          />
        </div>
        <div style={{ fontSize: 11, color: M.mut, marginTop: 6, fontWeight: 600 }}>
          {progress.done}/{progress.total} Sätze
        </div>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          overscrollBehavior: "contain",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            paddingTop: 8,
            paddingBottom: 8,
          }}
        >
          <div
            style={{
              fontFamily: M.disp,
              fontWeight: 700,
              fontSize: 26,
              color: exerciseSwitchFlash && !reducedMotion ? M.brand : M.fg,
              lineHeight: 1.15,
              marginBottom: 12,
              textAlign: "center",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              animation:
                exerciseSwitchFlash && !reducedMotion ? "turboExerciseSwitch 0.6s ease" : undefined,
            }}
          >
            {target.exerciseName}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              marginBottom: 16,
            }}
          >
            <TurboSetStepButton label="−" onClick={handleRemoveSet} disabled={!canRemoveSet} ariaLabel="Satz entfernen" />
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: M.mut,
                fontVariantNumeric: "tabular-nums",
                minWidth: 96,
                textAlign: "center",
              }}
            >
              Satz {target.setIndex + 1} von {target.totalSetsInExercise}
            </span>
            <TurboSetStepButton label="+" onClick={handleAddSet} ariaLabel="Satz hinzufügen" />
          </div>

          <div
            style={{
              fontFamily: M.disp,
              fontWeight: 800,
              fontSize: 52,
              lineHeight: 1.05,
              color: isSuggested ? M.brand : M.fg,
              textAlign: "center",
              marginBottom: 20,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {formatTurboSetDisplay(set.kg, set.reps)}
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 24,
              marginBottom: 16,
            }}
          >
            <TurboBumpButton label="kg −" onClick={() => handleBump("kg", -1)} />
            <TurboBumpButton label="kg +" onClick={() => handleBump("kg", 1)} />
            <TurboBumpButton label="Wdh −" onClick={() => handleBump("reps", -1)} />
            <TurboBumpButton label="Wdh +" onClick={() => handleBump("reps", 1)} />
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              justifyContent: "center",
            }}
          >
            <button type="button" onClick={() => onOpenHistory(target.exerciseId)} style={actionPillStyle}>
              Verlauf
            </button>
            <button type="button" onClick={() => onOpenNotes(target.exerciseId)} style={actionPillStyle}>
              Notizen
            </button>
            <button
              type="button"
              onClick={() => onOpenExerciseMenu(target.exerciseId)}
              style={actionPillStyle}
              aria-label="Übungsmenü"
            >
              ⋯
            </button>
          </div>

          {showNextExercisePreview ? (
            <div
              style={{
                marginTop: 12,
                padding: "12px 14px",
                borderRadius: 14,
                border: "1px solid " + M.line2,
                background: M.card,
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 1.1,
                  textTransform: "uppercase",
                  color: M.mut,
                  marginBottom: 6,
                }}
              >
                Als Nächstes
              </div>
              <div
                style={{
                  fontFamily: M.disp,
                  fontWeight: 700,
                  fontSize: 16,
                  color: M.fg,
                  lineHeight: 1.2,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {nextExercise.exerciseName}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <style>{`
        @keyframes turboExerciseSwitch {
          0% { transform: scale(1); }
          35% { transform: scale(1.06); }
          100% { transform: scale(1); }
        }
      `}</style>

      <div
        style={{
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          paddingTop: 8,
          position: "relative",
        }}
      >
        {voicePreview ? (
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: "100%",
              marginBottom: 10,
              padding: "12px 14px",
              borderRadius: 14,
              border: "1px solid " + M.line2,
              background: M.card,
              zIndex: 4,
              boxShadow: "0 -8px 24px rgba(0,0,0,.35)",
            }}
          >
            <div style={{ fontSize: 12, color: M.mut, marginBottom: 6 }}>
              Erkannt: „{voicePreview.cleaned || voicePreview.raw}"
            </div>
            {voicePreview.kg != null && voicePreview.reps != null ? (
              <div style={{ fontWeight: 700, color: M.fg, marginBottom: 10 }}>
                {formatTurboSetDisplay(voicePreview.kg, voicePreview.reps)}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: M.mut, marginBottom: 10 }}>Werte nicht erkannt</div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <MButton
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setVoicePreview(null)}
                style={{ flex: 1 }}
              >
                Verwerfen
              </MButton>
              {voicePreview.kg != null && voicePreview.reps != null ? (
                <MButton type="button" variant="primary" size="sm" onClick={applyVoiceAndLog} style={{ flex: 1 }}>
                  Übernehmen und loggen
                </MButton>
              ) : null}
            </div>
          </div>
        ) : null}

        <button
          type="button"
          aria-label="Gedrückt halten für Spracheingabe"
          aria-pressed={voiceActive}
          disabled={!voice.supported}
          onPointerDown={ptt.press}
          onContextMenu={(e) => e.preventDefault()}
          style={{
            ...buttonBase,
            ...brandButtonStyle(),
            width: "100%",
            minHeight: 88,
            fontSize: 18,
            fontFamily: M.disp,
            fontWeight: 800,
            letterSpacing: 0.4,
            borderRadius: 16,
            touchAction: "none",
            userSelect: "none",
            WebkitUserSelect: "none",
            WebkitTouchCallout: "none",
            ...(voiceActive ? buttonPressStyle("primary", true) : null),
            ...(!voice.supported ? { opacity: 0.5, cursor: "not-allowed" } : null),
          }}
        >
          {voiceActive ? "Sprich jetzt…" : voice.supported ? "Gedrückt halten · Voice" : "Voice nicht verfügbar"}
        </button>

        {isSuggested && !voicePreview ? (
          <div style={{ textAlign: "center", fontSize: 12, color: M.brand, fontStyle: "italic" }}>
            Auto-Pilot · ein Tap zum Loggen
          </div>
        ) : null}

        <MButton
          type="button"
          variant="secondary"
          size="md"
          fullWidth
          onClick={handleConfirm}
          style={{ minHeight: 52, fontFamily: M.disp, fontWeight: 700, letterSpacing: 0.3 }}
        >
          <Icon name="check" size={18} stroke={2.6} /> Satz loggen
        </MButton>
      </div>
    </div>
  );
}

function TurboSetStepButton({
  label,
  onClick,
  disabled,
  ariaLabel,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      style={{
        width: 40,
        height: 40,
        borderRadius: 10,
        border: "1px solid " + M.line2,
        background: M.cardHi,
        color: M.mut,
        fontFamily: M.disp,
        fontWeight: 700,
        fontSize: 20,
        lineHeight: 1,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.3 : 1,
        flexShrink: 0,
        padding: 0,
      }}
    >
      {label}
    </button>
  );
}

function TurboBumpButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        minWidth: 72,
        minHeight: 56,
        borderRadius: 14,
        border: "1px solid " + M.line2,
        background: M.cardHi,
        color: M.fg,
        fontFamily: M.disp,
        fontWeight: 700,
        fontSize: 15,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}
