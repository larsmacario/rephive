import { useEffect, useMemo, useState } from "react";
import { M } from "../theme";
import type { LibraryExercise } from "../data";
import { fmt, fmtUp, useWorkout, type Workout } from "../lib/engine";

import { setFieldHeaders, SetMetricFields } from "../components/SetMetricFields";
import { WARMUP_COLUMN_WIDTH, WarmUpSetToggle } from "../components/WarmUpSetToggle";
import { useExercises } from "../lib/db";
import { usePreferences } from "../lib/preferences";
import { useRestTimerSounds } from "../lib/useTimerSounds";
import { contentMaxWidth, useBreakpoint } from "../lib/responsive";
import type { ActiveWorkoutSnapshot } from "../lib/activeWorkout";
import { Icon } from "../components/Icon";
import { MStat } from "../components/widgets";
import { WorkoutFinishSheet } from "../components/WorkoutFinishSheet";
import { ExercisePickerSheet } from "../components/ExercisePickerSheet";
import { ExerciseHistorySheet } from "../components/ExerciseHistorySheet";
import { ExerciseVideoSheet } from "../components/ExerciseVideoSheet";
import { resolveExerciseVideoUrl } from "../lib/youtube";
import { OneRmCalculatorSheet } from "../components/OneRmCalculatorSheet";
import { getOneRmPrefillFromExercise } from "../lib/oneRepMax";
import { SupersetBlock, supersetLinkButtonStyle } from "../components/SupersetBlock";
import {
  isLinkedWithPrevious,
  nextInSupersetBlock,
  segmentExercises,
} from "../lib/superset";
import type { Exercise } from "../lib/engine";
import { MButton } from "../components/MButton";
import { ConfirmSheet } from "../components/ConfirmSheet";

export interface TrackScreenProps {
  session: Workout;
  startedAt: number;
  workoutId?: string;
  tags: string[];
  planId?: string;
  onPause: (snapshot: ActiveWorkoutSnapshot) => void;
  onDiscard: () => void;
  onFinish: (payload: {
    name: string;
    tags: string[];
    durationMin: number;
    volumeKg: number;
    setCount: number;
    workoutId?: string;
    planId?: string;
    exercises: {
      name: string;
      note?: string;
      supersetId?: string;
      sets: { reps: number; kg: number; done: boolean }[];
    }[];
  }) => void | Promise<void>;
}

export function TrackScreen({ session, startedAt, workoutId, tags, planId, onPause, onDiscard, onFinish }: TrackScreenProps) {
  const isCustom = !workoutId;
  const breakpoint = useBreakpoint();
  const maxW = contentMaxWidth(breakpoint);
  const { preferences, updatePreferences } = usePreferences();
  const { data: library, loading: libraryLoading, reload: reloadExercises } = useExercises();
  const W = useWorkout(session, {
    restSeconds: preferences.restSeconds,
    autoRest: preferences.autoRest,
  });
  useRestTimerSounds(W.rest, W.restActive, preferences.timerSounds);
  const [open, setOpen] = useState<string>(session.exercises[0]?.id || "");
  const [elapsedSec, setElapsedSec] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [finishSheet, setFinishSheet] = useState(false);
  const [picker, setPicker] = useState(false);
  const [historyExercise, setHistoryExercise] = useState<string | null>(null);
  const [videoExercise, setVideoExercise] = useState<{ name: string; youtubeUrl: string } | null>(null);
  const [oneRmOpen, setOneRmOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<{ id: string; name: string } | null>(null);
  const pct = W.totalSets ? Math.round((W.doneSets / W.totalSets) * 100) : 0;
  const exLibrary = library ?? [];

  const oneRmPrefill = useMemo(() => {
    const ex = W.wo.exercises.find((e) => e.id === open);
    return getOneRmPrefillFromExercise(ex);
  }, [W.wo.exercises, open]);

  useEffect(() => {
    const tick = () => setElapsedSec(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  const addExerciseFromPicker = (name: string, note?: string) => {
    const id = W.addExercise(name, note);
    W.addSet(id);
    setOpen(id);
    setPicker(false);
  };

  const addFromLibrary = (ex: LibraryExercise) => {
    const id = W.addExercise(ex.name, `${ex.group} · ${ex.equip}`, ex.metric, ex.id);
    W.addSet(id);
    setOpen(id);
    setPicker(false);
  };

  const buildFinishPayload = () => ({
    name: W.wo.name,
    tags: isCustom ? ["Individuell"] : tags,
    durationMin: Math.max(1, Math.round(elapsedSec / 60)),
    volumeKg: W.volume,
    setCount: W.doneSets,
    workoutId,
    planId,
    exercises: W.wo.exercises.map((e) => ({
      name: e.name,
      note: e.note,
      supersetId: e.supersetId,
      metric: e.metric,
      sets: e.sets,
    })),
  });

  const handleToggleSet = (exId: string, si: number) => {
    const ex = W.wo.exercises.find((e) => e.id === exId);
    const markingDone = ex && !ex.sets[si]?.done;
    W.toggleSet(exId, si);
    if (markingDone) {
      const nextId = nextInSupersetBlock(W.wo.exercises, exId);
      if (nextId) setOpen(nextId);
    }
  };

  const handlePause = () => {
    onPause({
      session: JSON.parse(JSON.stringify(W.wo)) as Workout,
      startedAt,
      workoutId,
      tags,
      planId,
    });
  };

  const handleSave = async (feedback: Record<string, { rating: "like" | "dislike" | "pain" }>) => {
    setFinishing(true);
    try {
      if (Object.keys(feedback).length > 0) {
        const nextFeedback = { ...(preferences.exerciseFeedback || {}) };
        for (const [name, val] of Object.entries(feedback)) {
          nextFeedback[name] = val;
        }
        updatePreferences({ exerciseFeedback: nextFeedback });
      }
      await onFinish(buildFinishPayload());
    } finally {
      setFinishing(false);
      setFinishSheet(false);
    }
  };

  const handleDiscard = () => {
    setFinishSheet(false);
    onDiscard();
  };

  const handleConfirmRemoveExercise = () => {
    if (!removeTarget) return;
    const remaining = W.wo.exercises.filter((e) => e.id !== removeTarget.id);
    W.removeExercise(removeTarget.id);
    if (open === removeTarget.id) setOpen(remaining[0]?.id ?? "");
    setRemoveTarget(null);
  };

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        width: "100%",
        maxWidth: maxW,
        margin: maxW ? "0 auto" : undefined,
        position: "relative",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "2px 18px 10px" }}>
        <MButton onClick={handlePause} variant="secondary" size="icon" aria-label="Workout pausieren">
          <Icon name="chevL" size={18} stroke={2.2} />
        </MButton>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10.5, letterSpacing: 2, color: M.brand, fontWeight: 700 }}>
            ● LÄUFT · {fmtUp(elapsedSec)}
          </div>
          {isCustom ? (
            <input
              value={W.wo.name}
              onChange={(e) => W.setName(e.target.value)}
              style={{
                width: "100%",
                fontFamily: M.disp,
                fontWeight: 700,
                fontSize: 22,
                lineHeight: 1,
                marginTop: 1,
                background: "transparent",
                border: "none",
                color: M.fg,
                outline: "none",
                padding: 0,
              }}
            />
          ) : (
            <div
              style={{
                fontFamily: M.disp,
                fontWeight: 700,
                fontSize: 22,
                lineHeight: 1,
                marginTop: 1,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {W.wo.name}
            </div>
          )}
        </div>
        <MButton
          type="button"
          aria-label="1RM-Rechner"
          onClick={() => setOneRmOpen(true)}
          variant="secondary"
          size="icon"
          style={{ flexShrink: 0, color: M.fg }}
        >
          <Icon name="calculator" size={17} stroke={2} />
        </MButton>
      </div>
      <div style={{ padding: "0 18px 12px" }}>
        <div style={{ display: "flex", gap: 10 }}>
          <MStat label="SÄTZE" value={`${W.doneSets}/${W.totalSets}`} />
          <MStat label="VOLUMEN" value={`${(W.volume / 1000).toFixed(1)}t`} />
          <MStat label="FORTSCHRITT" value={`${pct}%`} />
        </div>
        <div
          style={{
            height: 5,
            borderRadius: 3,
            background: "rgba(255,255,255,.08)",
            marginTop: 12,
            overflow: "hidden",
          }}
        >
          <div
            style={{ width: pct + "%", height: "100%", background: M.acc, borderRadius: 3, transition: "width .3s" }}
          />
        </div>
      </div>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          padding: "0 18px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {W.wo.exercises.length === 0 && (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              padding: "32px 12px",
              color: M.mut,
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 16,
                background: M.accSoft,
                color: M.acc,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 14,
              }}
            >
              <Icon name="dumbbell" size={26} stroke={2} />
            </div>
            <div style={{ fontFamily: M.disp, fontWeight: 700, fontSize: 20, color: M.fg }}>Noch keine Übungen</div>
            <div style={{ fontSize: 14, marginTop: 8, lineHeight: 1.45, maxWidth: 260 }}>
              {isCustom
                ? "Füge Übungen aus der Bibliothek hinzu oder tippe einen eigenen Namen ein."
                : "Füge Übungen über das Plus-Symbol unten hinzu."}
            </div>
          </div>
        )}
        {segmentExercises(W.wo.exercises).map((seg) => {
          const renderExerciseCard = (ex: Exercise, ei: number) => {
          const isOpen = open === ex.id;
          const done = ex.sets.filter((s) => s.done).length;
          const complete = ex.sets.length > 0 && done === ex.sets.length;
          const linked = isLinkedWithPrevious(W.wo.exercises, ex.id);
          const videoUrl = resolveExerciseVideoUrl(ex, exLibrary);
          return (
            <div
              key={ex.id}
              style={{
                background: M.card,
                border: "1px solid " + (isOpen ? M.line : M.line2),
                borderRadius: 16,
                flexShrink: 0,
                overflow: isOpen ? "visible" : "hidden",
              }}
            >
              <div
                role="button"
                tabIndex={0}
                onClick={() => setOpen(isOpen ? "" : ex.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setOpen(isOpen ? "" : ex.id);
                  }
                }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 15px",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    flex: "0 0 auto",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: complete ? M.acc : M.accSoft,
                    color: complete ? M.accInk : M.acc,
                    fontFamily: M.disp,
                    fontWeight: 700,
                    fontSize: 16,
                  }}
                >
                  {complete ? <Icon name="check" size={18} stroke={2.6} /> : ei + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      color: M.fg,
                      fontWeight: 600,
                      fontSize: 16,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {ex.name}
                  </div>
                  <div style={{ color: M.mut, fontSize: 12, marginTop: 1 }}>
                    {ex.note ? `${ex.note} · ` : ""}
                    {done}/{ex.sets.length} Sätze
                  </div>
                </div>
                {videoUrl && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setVideoExercise({ name: ex.name, youtubeUrl: videoUrl });
                    }}
                    aria-label="Video ansehen"
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: M.mut2,
                      display: "flex",
                      padding: 4,
                      opacity: 0.85,
                    }}
                  >
                    <Icon name="play" size={16} color={M.mut2} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setHistoryExercise(ex.name);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: M.mut2,
                    display: "flex",
                    padding: 4,
                  }}
                >
                  <Icon name="history" size={16} stroke={2} />
                </button>
                <MButton
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setRemoveTarget({ id: ex.id, name: ex.name });
                  }}
                  variant="danger"
                  size="icon"
                  aria-label="Übung aus Session entfernen"
                  style={{ flexShrink: 0, padding: 4, width: 32, height: 32 }}
                >
                  <Icon name="trash" size={16} stroke={2} color={M.mut2} />
                </MButton>
                <Icon name={isOpen ? "chevD" : "chevR"} size={18} color={M.mut2} stroke={2.2} />
              </div>
              {isOpen && (
                <div style={{ padding: "0 15px 14px" }}>
                  {isCustom && ei > 0 && (
                    <div style={{ paddingBottom: 10 }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          linked
                            ? W.unlinkExerciseFromSuperset(ex.id)
                            : W.linkExerciseWithPrevious(ex.id);
                        }}
                        style={supersetLinkButtonStyle(linked)}
                      >
                        {linked ? "Supersatz lösen" : "Mit vorheriger verknüpfen"}
                      </button>
                    </div>
                  )}
                  <div
                    style={{
                      display: "flex",
                      fontSize: 10,
                      letterSpacing: 1.2,
                      color: M.mut2,
                      fontWeight: 700,
                      padding: "4px 4px 8px",
                    }}
                  >
                    {setFieldHeaders(ex.metric).map((h) => (
                      <span
                        key={h.key}
                        style={{
                          width: h.key === "set" ? 34 : undefined,
                          flex: h.key === "set" ? undefined : 1,
                          textAlign: h.key === "set" ? "left" : "center",
                        }}
                      >
                        {h.label}
                      </span>
                    ))}
                    <span style={{ width: WARMUP_COLUMN_WIDTH, textAlign: "center" }}>W-UP</span>
                    <span style={{ width: 72 }} />
                  </div>
                  {ex.sets.map((s, si) => (
                    <div
                      key={si}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        padding: "7px 4px",
                        borderTop: "1px solid " + M.line2,
                      }}
                    >
                      <span
                        style={{
                          width: 34,
                          fontFamily: M.disp,
                          fontWeight: 700,
                          fontSize: 17,
                          color: s.done ? M.acc : si === 0 && s.warmUp ? M.acc : M.mut,
                        }}
                      >
                        {si === 0 && s.warmUp ? "W" : si + 1}
                      </span>
                      <SetMetricFields
                        set={s}
                        metric={ex.metric}
                        onBump={(field, delta) => W.editSet(ex.id, si, field, delta)}
                        onSetValue={(field, value) => W.setSetValue(ex.id, si, field, value)}
                      />
                      {si === 0 ? (
                        <WarmUpSetToggle
                          layout="compact"
                          checked={Boolean(s.warmUp)}
                          onChange={(enabled) => W.toggleSetWarmUp(ex.id, enabled)}
                        />
                      ) : (
                        <span style={{ width: WARMUP_COLUMN_WIDTH, flexShrink: 0 }} />
                      )}
                      <div
                        style={{
                          width: 72,
                          display: "flex",
                          justifyContent: "flex-end",
                          alignItems: "center",
                          gap: 4,
                          flexShrink: 0,
                        }}
                      >
                        <MButton
                          onClick={() => W.removeSet(ex.id, si)}
                          variant="secondary"
                          size="icon"
                          aria-label="Satz entfernen"
                          style={{ color: M.mut2 }}
                        >
                          <Icon name="minus" size={16} stroke={2.4} />
                        </MButton>
                        <MButton
                          onClick={() => handleToggleSet(ex.id, si)}
                          variant={s.done ? "primary" : "secondary"}
                          size="icon"
                          aria-label={s.done ? "Satz als offen markieren" : "Satz abschließen"}
                          style={s.done ? undefined : { background: "transparent", color: M.mut }}
                        >
                          <Icon name="check" size={17} stroke={2.6} />
                        </MButton>
                      </div>
                    </div>
                  ))}
                  <MButton
                    onClick={() => W.addSet(ex.id)}
                    variant="ghost"
                    size="sm"
                    fullWidth
                    style={{
                      marginTop: 10,
                      border: "1px dashed " + M.line,
                      color: M.fg,
                      fontFamily: M.disp,
                      letterSpacing: 0.4,
                    }}
                  >
                    <Icon name="plus" size={14} stroke={2.4} /> Satz hinzufügen
                  </MButton>
                </div>
              )}
            </div>
          );
          };

          if (seg.kind === "single") {
            return renderExerciseCard(seg.exercise as Exercise, seg.index);
          }
          return (
            <SupersetBlock key={seg.exercises.map((e) => e.id).join("-")}>
              {(seg.exercises as Exercise[]).map((ex, i) =>
                renderExerciseCard(ex, seg.startIndex + i),
              )}
            </SupersetBlock>
          );
        })}
      </div>
      <div style={{ margin: "0 18px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
        {W.restActive ? (
          <div
            style={{
              background: M.acc,
              borderRadius: 16,
              padding: "13px 18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              color: M.accInk,
              boxSizing: "border-box",
            }}
          >
            <span style={{ fontWeight: 700, fontSize: 13, letterSpacing: 1 }}>PAUSE</span>
            <span style={{ fontFamily: M.disp, fontWeight: 700, fontSize: 30, fontVariantNumeric: "tabular-nums" }}>
              {fmt(W.rest)}
            </span>
            <MButton
              onClick={W.stopRest}
              variant="secondary"
              size="sm"
              style={{ borderColor: "rgba(255,255,255,.25)", color: M.accInk, background: "transparent" }}
            >
              Skip
            </MButton>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
            <MButton
              disabled={finishing}
              onClick={() => setFinishSheet(true)}
              variant="secondary"
              size="md"
              loading={finishing}
              style={{ flex: 1, minWidth: 0, background: M.cardHi, fontFamily: M.disp, letterSpacing: 0.6 }}
            >
              Workout beenden
            </MButton>
            <MButton
              type="button"
              aria-label="Übung hinzufügen"
              onClick={() => setPicker(true)}
              variant="secondary"
              size="icon"
              style={{ flexShrink: 0 }}
            >
              <Icon name="plus" size={18} stroke={2.4} color={M.fg} />
            </MButton>
          </div>
        )}
      </div>
      {finishSheet && (
        <WorkoutFinishSheet
          name={W.wo.name}
          durationSec={elapsedSec}
          doneSets={W.doneSets}
          totalSets={W.totalSets}
          volumeKg={W.volume}
          busy={finishing}
          exercises={W.wo.exercises.map((e) => e.name)}
          onSave={handleSave}
          onDiscard={handleDiscard}
          onClose={() => setFinishSheet(false)}
        />
      )}
      <ExercisePickerSheet
        open={picker}
        onClose={() => setPicker(false)}
        onSelect={addFromLibrary}
        library={exLibrary}
        loading={libraryLoading}
        title="Übung hinzufügen"
        showFreeText={isCustom}
        onFreeText={(name) => addExerciseFromPicker(name)}
        allowCreate
        onLibraryChange={() => reloadExercises()}
      />
      <ExerciseHistorySheet
        open={Boolean(historyExercise)}
        onClose={() => setHistoryExercise(null)}
        exerciseName={historyExercise}
      />
      {videoExercise && (
        <ExerciseVideoSheet
          open
          exerciseName={videoExercise.name}
          youtubeUrl={videoExercise.youtubeUrl}
          onClose={() => setVideoExercise(null)}
        />
      )}
      <OneRmCalculatorSheet
        open={oneRmOpen}
        onClose={() => setOneRmOpen(false)}
        initialWeight={oneRmPrefill.weight}
        initialReps={oneRmPrefill.reps}
        resetKey={open}
      />
      {removeTarget && (
        <ConfirmSheet
          title="Übung entfernen?"
          message={`${removeTarget.name} wird nur aus dieser Trainingssession entfernt. Das Workout in der Library und dein Plan bleiben unverändert.`}
          confirmLabel="Aus Session entfernen"
          icon="trash"
          onConfirm={handleConfirmRemoveExercise}
          onCancel={() => setRemoveTarget(null)}
        />
      )}
    </div>
  );
}
