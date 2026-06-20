import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fmt, type Exercise } from "../../lib/engine";
import {
  countExpressProgress,
  findNextExpressExercise,
  findNextExpressTarget,
} from "../../lib/expressTrackingFlow";
import type { SetField } from "../../lib/exerciseSets";
import {
  formatKgDisplay,
  formatRepsDisplay,
  parseKgInput,
  parseRepsInput,
} from "../../lib/exerciseSets";
import { prefersReducedMotion, triggerTapHaptic } from "../../lib/haptics";
import {
  appendFrictionMetrics,
  type FrictionSessionMetrics,
} from "../../lib/ownerLabs";
import { brandButtonStyle, M } from "../../theme";
import { MButton } from "../MButton";
import { Icon } from "../Icon";

export interface ExpressTrackingViewProps {
  exercises: Exercise[];
  elapsedSec: number;
  onBack: () => void;
  onBumpSet: (exId: string, setIndex: number, field: SetField, delta: number) => void;
  onSetValues: (exId: string, setIndex: number, kg: number, reps: number) => void;
  onToggleSet: (exId: string, setIndex: number) => void;
  onAddSet: (exId: string) => void;
  onRemoveSet: (exId: string, setIndex: number) => void;
  onOpenExerciseMenu: (exId: string) => void;
  restActive?: boolean;
  restSec?: number;
  onSkipRest?: () => void;
  onAllSetsDone?: () => void;
}

function fmtElapsed(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function ExpressTrackingView({
  exercises,
  elapsedSec,
  onBack,
  onBumpSet,
  onSetValues,
  onToggleSet,
  onAddSet,
  onRemoveSet,
  onOpenExerciseMenu,
  restActive = false,
  restSec = 0,
  onSkipRest,
  onAllSetsDone,
}: ExpressTrackingViewProps) {
  const target = useMemo(() => findNextExpressTarget(exercises), [exercises]);
  const progress = useMemo(() => countExpressProgress(exercises), [exercises]);
  const progressPct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  const exercise = target ? exercises.find((e) => e.id === target.exerciseId) : null;
  const set = exercise && target ? exercise.sets[target.setIndex] : null;

  const metricsRef = useRef<FrictionSessionMetrics>({
    mode: "express",
    startedAt: new Date().toISOString(),
    setsLogged: 0,
    tapCount: 0,
    overrideCount: 0,
    setDurationsMs: [],
  });
  const setStartedAt = useRef<number>(performance.now());
  const prevTargetKey = useRef<string | null>(null);
  const finishedRef = useRef(false);

  const [exerciseSwitchFlash, setExerciseSwitchFlash] = useState(false);
  const prevExerciseIdRef = useRef<string | null>(null);

  const nextExercise = useMemo(() => {
    if (!target) return null;
    return findNextExpressExercise(exercises, target.exerciseId);
  }, [exercises, target]);

  useEffect(() => {
    if (!target) return;
    const prev = prevExerciseIdRef.current;
    if (prev != null && prev !== target.exerciseId) {
      setExerciseSwitchFlash(true);
      void triggerTapHaptic();
      const id = window.setTimeout(() => setExerciseSwitchFlash(false), 1000);
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
      </div>
    );
  }

  const isSuggested = Boolean(set.suggested && !set.done);
  const canRemoveSet = exercise.sets.length > 1;
  const isLastSetInExercise = target.setIndex === target.totalSetsInExercise - 1;
  const showNextExercisePreview = isLastSetInExercise && nextExercise != null;
  const reducedMotion = prefersReducedMotion();

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

  const handleSetValueCommit = (field: "kg" | "reps", newValue: number) => {
    if (!target || !set) return;
    recordOverride();
    onSetValues(
      target.exerciseId,
      target.setIndex,
      field === "kg" ? newValue : set.kg,
      field === "reps" ? newValue : set.reps,
    );
  };

  const displayColor = isSuggested ? M.brand : M.fg;
  const displayTypography = {
    fontFamily: M.disp,
    fontWeight: 800,
    fontSize: 52,
    lineHeight: 1.05,
    color: displayColor,
    fontVariantNumeric: "tabular-nums" as const,
  };

  const exerciseSwitchActive = exerciseSwitchFlash;
  const animateExerciseSwitch = exerciseSwitchFlash && !reducedMotion;

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
        <div style={{ fontSize: 13, color: M.mut, marginTop: 6, fontWeight: 600 }}>
          {progress.done}/{progress.total} Sätze
        </div>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div style={{ flexShrink: 0, paddingTop: 8 }}>
          <div
            style={{
              marginBottom: 16,
              position: "relative",
              padding: "14px 16px 12px",
              borderRadius: 16,
              border: "1px solid " + (exerciseSwitchActive ? M.brandBorder : "transparent"),
              background: exerciseSwitchActive ? M.brandSoft : "transparent",
              boxShadow: exerciseSwitchActive ? M.brandGlow : "none",
              transition: reducedMotion ? "none" : "border-color 0.3s ease, background 0.3s ease, box-shadow 0.3s ease",
              animation: animateExerciseSwitch ? "expressExerciseSwitchPanel 1s ease" : undefined,
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 10,
                left: 16,
                right: 16,
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: 1.2,
                textTransform: "uppercase",
                color: M.brand,
                textAlign: "center",
                opacity: exerciseSwitchActive ? 1 : 0,
                pointerEvents: "none",
                transition: reducedMotion ? "none" : "opacity 0.25s ease",
              }}
              aria-hidden={!exerciseSwitchActive}
            >
              Neue Übung
            </div>

            <div
              style={{
                fontFamily: M.disp,
                fontWeight: 700,
                fontSize: 26,
                color: exerciseSwitchActive ? M.brand : M.fg,
                lineHeight: 1.15,
                paddingTop: 24,
                minHeight: 60,
                marginBottom: 12,
                textAlign: "center",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                transition: reducedMotion ? "none" : "color 0.3s ease",
                animation: animateExerciseSwitch ? "expressExerciseSwitchTitle 0.7s ease" : undefined,
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
                minHeight: 44,
              }}
            >
              <ExpressSetStepButton label="−" onClick={handleRemoveSet} disabled={!canRemoveSet} ariaLabel="Satz entfernen" />
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: exerciseSwitchActive ? M.fg : M.mut,
                  fontVariantNumeric: "tabular-nums",
                  minWidth: 108,
                  textAlign: "center",
                  transition: reducedMotion ? "none" : "color 0.3s ease",
                }}
              >
                Satz {target.setIndex + 1} von {target.totalSetsInExercise}
              </span>
              <ExpressSetStepButton label="+" onClick={handleAddSet} ariaLabel="Satz hinzufügen" />
            </div>
          </div>

          <div
            style={{
              ...displayTypography,
              display: "flex",
              alignItems: "baseline",
              justifyContent: "center",
              textAlign: "center",
              minHeight: 55,
              marginBottom: 20,
            }}
          >
            <ExpressSetValueInput
              value={set.kg}
              format={formatKgDisplay}
              parse={parseKgInput}
              inputMode="decimal"
              ariaLabel="Gewicht in kg"
              color={displayColor}
              onCommit={(kg) => handleSetValueCommit("kg", kg)}
            />
            <span aria-hidden>{" kg × "}</span>
            <ExpressSetValueInput
              value={set.reps}
              format={formatRepsDisplay}
              parse={parseRepsInput}
              inputMode="numeric"
              ariaLabel="Wiederholungen"
              color={displayColor}
              onCommit={(reps) => handleSetValueCommit("reps", reps)}
            />
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 24,
              marginBottom: 16,
            }}
          >
            <ExpressBumpButton label="kg −" onClick={() => handleBump("kg", -1)} />
            <ExpressBumpButton label="kg +" onClick={() => handleBump("kg", 1)} />
            <ExpressBumpButton label="Wdh −" onClick={() => handleBump("reps", -1)} />
            <ExpressBumpButton label="Wdh +" onClick={() => handleBump("reps", 1)} />
          </div>
        </div>

        {showNextExercisePreview ? (
          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              WebkitOverflowScrolling: "touch",
              overscrollBehavior: "contain",
              paddingTop: 4,
              paddingBottom: 8,
            }}
          >
            <div
              style={{
                padding: "12px 14px",
                borderRadius: 14,
                border: "1px solid " + M.line2,
                background: M.card,
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: 13,
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
                  minHeight: 38,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {nextExercise.exerciseName}
              </div>
            </div>
          </div>
        ) : (
          <div aria-hidden style={{ flex: 1, minHeight: 0 }} />
        )}
      </div>

      <style>{`
        @keyframes expressExerciseSwitchPanel {
          0% {
            box-shadow: 0 0 0 rgba(126, 246, 123, 0);
          }
          35% {
            box-shadow: 0 0 32px rgba(126, 246, 123, 0.35);
          }
          100% {
            box-shadow: 0 0 20px rgba(126, 246, 123, 0.22);
          }
        }
        @keyframes expressExerciseSwitchTitle {
          0% {
            opacity: 0.35;
          }
          100% {
            opacity: 1;
          }
        }
      `}</style>

      <div
        style={{
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          paddingTop: 8,
        }}
      >
        {isSuggested ? (
          <div style={{ textAlign: "center", fontSize: 13, color: M.brand, fontStyle: "italic" }}>
            Auto-Pilot · ein Tap zum Loggen
          </div>
        ) : null}

        {restActive ? (
          <div
            style={{
              ...brandButtonStyle(),
              borderRadius: 16,
              padding: "13px 18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              boxSizing: "border-box",
            }}
          >
            <span style={{ fontWeight: 700, fontSize: 13, letterSpacing: 1 }}>PAUSE</span>
            <span
              style={{
                fontFamily: M.disp,
                fontWeight: 700,
                fontSize: 30,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {fmt(restSec)}
            </span>
            <MButton
              type="button"
              onClick={onSkipRest}
              variant="secondary"
              size="sm"
              style={{ borderColor: "rgba(10,26,10,.25)", color: M.brandInk, background: "transparent" }}
            >
              Skip
            </MButton>
          </div>
        ) : null}

        <div style={{ display: "flex", alignItems: "stretch", gap: 10 }}>
          <MButton
            type="button"
            variant="primary"
            size="md"
            onClick={handleConfirm}
            style={{ flex: 1, minHeight: 52, fontFamily: M.disp, fontWeight: 700, letterSpacing: 0.3 }}
          >
            <Icon name="check" size={18} stroke={2.6} /> Satz loggen
          </MButton>
          <MButton
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onOpenExerciseMenu(target.exerciseId)}
            aria-label="Übungsmenü"
            style={{ flexShrink: 0, color: M.mut2, alignSelf: "stretch", minHeight: 52, width: 52 }}
          >
            <Icon name="moreH" size={20} stroke={2.2} />
          </MButton>
        </div>
      </div>
    </div>
  );
}

function ExpressSetValueInput({
  value,
  format,
  parse,
  inputMode,
  ariaLabel,
  color,
  onCommit,
}: {
  value: number;
  format: (value: number) => string;
  parse: (raw: string) => number | null;
  inputMode: "decimal" | "numeric";
  ariaLabel: string;
  color: string;
  onCommit: (value: number) => void;
}) {
  const [draft, setDraft] = useState("");
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setDraft(format(value));
  }, [value, focused, format]);

  const commit = () => {
    const parsed = parse(draft);
    if (parsed !== null) onCommit(parsed);
    setDraft(format(parsed ?? value));
    setFocused(false);
  };

  const shown = focused ? draft : format(value);
  const widthCh = Math.max(1, shown.length);

  return (
    <input
      type="text"
      inputMode={inputMode}
      value={shown}
      aria-label={ariaLabel}
      onFocus={(e) => {
        setFocused(true);
        setDraft(format(value));
        e.currentTarget.select();
      }}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
        }
      }}
      style={{
        fontFamily: M.disp,
        fontWeight: 800,
        fontSize: 52,
        lineHeight: 1.05,
        color,
        fontVariantNumeric: "tabular-nums",
        textAlign: "center",
        background: "transparent",
        border: "none",
        outline: "none",
        padding: 0,
        margin: 0,
        width: `${widthCh}ch`,
        minWidth: "1ch",
        maxWidth: "100%",
        cursor: "text",
        touchAction: "manipulation",
        WebkitAppearance: "none",
        MozAppearance: "textfield",
      }}
    />
  );
}

function ExpressSetStepButton({
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
        width: 44,
        height: 44,
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

function ExpressBumpButton({ label, onClick }: { label: string; onClick: () => void }) {
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
