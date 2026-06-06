import { useEffect, useMemo, useState } from "react";
import { brandButtonStyle, M } from "../theme";
import type { LibraryExercise } from "../data";
import { fmt, useWorkout, type Workout } from "../lib/engine";

import { useExercises } from "../lib/db";
import { usePreferences } from "../lib/preferences";
import { useRestTimerSounds } from "../lib/useTimerSounds";
import { contentMaxWidth, useBreakpoint } from "../lib/responsive";
import type { ActiveWorkoutSnapshot } from "../lib/activeWorkout";
import {
  BLOCK_LABELS,
  DEFAULT_ENABLED_BLOCKS,
  filterExercisesForSession,
  groupExercisesByBlock,
  BLOCK_ORDER,
  type TrainingBlockType,
} from "../lib/planBlocks";
import { setVolumeKg } from "../lib/exerciseCatalog";
import { PlanBlockSection } from "../components/PlanBlockSection";
import { Icon } from "../components/Icon";
import { MStat } from "../components/widgets";
import { WorkoutFinishSheet } from "../components/WorkoutFinishSheet";
import { ExercisePickerSheet } from "../components/ExercisePickerSheet";
import { ExerciseHistorySheet } from "../components/ExerciseHistorySheet";
import { ExerciseVideoSheet } from "../components/ExerciseVideoSheet";
import { resolveExerciseVideoUrl } from "../lib/youtube";
import { OneRmCalculatorSheet } from "../components/OneRmCalculatorSheet";
import { getOneRmPrefillFromExercise } from "../lib/oneRepMax";
import { SupersetBlock } from "../components/SupersetBlock";
import { isLinkedWithPrevious, nextInSupersetBlock, segmentExercises } from "../lib/superset";
import type { Exercise } from "../lib/engine";
import { MButton } from "../components/MButton";
import { ConfirmSheet } from "../components/ConfirmSheet";
import { TrackOverviewHeader } from "../components/track/TrackOverviewHeader";
import { TrackExerciseRow } from "../components/track/TrackExerciseRow";
import { TrackExerciseMenuSheet } from "../components/track/TrackExerciseMenuSheet";
import { TrackExerciseDetail } from "../components/track/TrackExerciseDetail";
import { TrackExerciseSlide } from "../components/track/TrackExerciseSlide";
import { TrackExerciseNoteSheet } from "../components/track/TrackExerciseNoteSheet";
import { IntervalTimerSheet } from "../components/IntervalTimerSheet";
import type { SaveSessionInput } from "../lib/db";

export interface TrackScreenProps {
  session: Workout;
  startedAt: number;
  planDayId?: string;
  tags: string[];
  planId?: string;
  onPause: (snapshot: ActiveWorkoutSnapshot) => void;
  onDiscard: () => void;
  onSaveTimerSession: (input: SaveSessionInput) => Promise<void>;
  onFinish: (payload: {
    name: string;
    tags: string[];
    durationMin: number;
    volumeKg: number;
    setCount: number;
    planDayId?: string;
    planId?: string;
    skippedBlocks?: TrainingBlockType[];
    exercises: {
      name: string;
      note?: string;
      blockType?: TrainingBlockType;
      supersetId?: string;
      metric?: import("../lib/exerciseCatalog").ExerciseMetric;
      sets: { reps: number; kg: number; done: boolean }[];
    }[];
  }) => void | Promise<void>;
}

type TrackView = "overview" | "exercise";

export function TrackScreen({ session, startedAt, planDayId, tags, planId, onPause, onDiscard, onSaveTimerSession, onFinish }: TrackScreenProps) {
  const isCustom = !planDayId;
  const breakpoint = useBreakpoint();
  const maxW = contentMaxWidth(breakpoint);
  const { preferences, updatePreferences } = usePreferences();
  const { data: library, loading: libraryLoading, reload: reloadExercises } = useExercises();
  const W = useWorkout(session, {
    restSeconds: preferences.restSeconds,
    autoRest: preferences.autoRest,
  });
  useRestTimerSounds(W.rest, W.restActive, preferences.timerSounds);

  const [view, setView] = useState<TrackView>("overview");
  const [activeExerciseIndex, setActiveExerciseIndex] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [finishSheet, setFinishSheet] = useState(false);
  const [picker, setPicker] = useState(false);
  const [pickerTargetBlock, setPickerTargetBlock] = useState<TrainingBlockType | null>(null);
  const [historyExercise, setHistoryExercise] = useState<string | null>(null);
  const [videoExercise, setVideoExercise] = useState<{ name: string; youtubeUrl: string } | null>(null);
  const [oneRmOpen, setOneRmOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<{ id: string; name: string } | null>(null);
  const [menuTarget, setMenuTarget] = useState<Exercise | null>(null);
  const [noteTarget, setNoteTarget] = useState<Exercise | null>(null);
  const [timerSheetOpen, setTimerSheetOpen] = useState(false);
  const [timerMounted, setTimerMounted] = useState(false);
  const [skippedBlocks, setSkippedBlocks] = useState<TrainingBlockType[]>(session.skippedBlocks ?? []);

  const enabledBlocks = session.enabledBlocks ?? DEFAULT_ENABLED_BLOCKS;
  const useBlockLayout = Boolean(planDayId);
  const visibleExercises = useMemo(
    () => filterExercisesForSession(W.wo.exercises, enabledBlocks, skippedBlocks),
    [W.wo.exercises, enabledBlocks, skippedBlocks],
  );
  const pagerExercises = visibleExercises;

  const visibleDoneSets = visibleExercises.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0);
  const visibleTotalSets = visibleExercises.reduce((a, e) => a + e.sets.length, 0);
  const pct = visibleTotalSets ? Math.round((visibleDoneSets / visibleTotalSets) * 100) : 0;
  const exLibrary = library ?? [];

  const activeExercise = pagerExercises[activeExerciseIndex] ?? null;

  const oneRmPrefill = useMemo(
    () => getOneRmPrefillFromExercise(activeExercise),
    [activeExercise],
  );

  useEffect(() => {
    const tick = () => setElapsedSec(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  useEffect(() => {
    if (activeExerciseIndex >= pagerExercises.length) {
      setActiveExerciseIndex(Math.max(0, pagerExercises.length - 1));
    }
    if (view === "exercise" && pagerExercises.length === 0) {
      setView("overview");
    }
  }, [pagerExercises.length, activeExerciseIndex, view]);

  const openExerciseAt = (exId: string) => {
    const idx = pagerExercises.findIndex((e) => e.id === exId);
    if (idx < 0) return;
    setActiveExerciseIndex(idx);
    setView("exercise");
  };

  const addExerciseFromPicker = (name: string, note?: string) => {
    const id = W.addExercise(name, note, undefined, undefined, pickerTargetBlock ?? undefined);
    W.addSet(id);
    setPicker(false);
    setPickerTargetBlock(null);
  };

  const addFromLibrary = (ex: LibraryExercise) => {
    const id = W.addExercise(
      ex.name,
      `${ex.group} · ${ex.equip}`,
      ex.metric,
      ex.id,
      pickerTargetBlock ?? undefined,
    );
    W.addSet(id);
    setPicker(false);
    setPickerTargetBlock(null);
  };

  const openExercisePicker = (block?: TrainingBlockType) => {
    setPickerTargetBlock(block ?? null);
    setPicker(true);
  };

  const closeExercisePicker = () => {
    setPicker(false);
    setPickerTargetBlock(null);
  };

  const openTimerSheet = () => {
    setTimerMounted(true);
    setTimerSheetOpen(true);
  };

  const toggleSkipBlock = (block: TrainingBlockType) => {
    setSkippedBlocks((prev) =>
      prev.includes(block) ? prev.filter((b) => b !== block) : [...prev, block],
    );
  };

  const isBlockComplete = (exercises: Exercise[]) =>
    exercises.length > 0 &&
    exercises.every((ex) => ex.sets.length > 0 && ex.sets.every((s) => s.done));

  const buildFinishPayload = () => {
    const volumeInVisible = visibleExercises.reduce(
      (a, e) =>
        a + e.sets.filter((s) => s.done).reduce((b, s) => b + setVolumeKg(s, e.metric ?? "weight_reps"), 0),
      0,
    );
    return {
      name: W.wo.name,
      tags: isCustom ? ["Individuell"] : tags,
      durationMin: Math.max(1, Math.round(elapsedSec / 60)),
      volumeKg: volumeInVisible,
      setCount: visibleDoneSets,
      planDayId,
      planId,
      skippedBlocks,
      exercises: W.wo.exercises.map((e) => ({
        name: e.name,
        note: e.note,
        blockType: e.blockType,
        supersetId: e.supersetId,
        metric: e.metric,
        sets: e.sets,
      })),
    };
  };

  const handleToggleSet = (exId: string, si: number) => {
    const ex = W.wo.exercises.find((e) => e.id === exId);
    const markingDone = ex && !ex.sets[si]?.done;
    W.toggleSet(exId, si);
    if (markingDone) {
      const nextId = nextInSupersetBlock(visibleExercises, exId);
      if (nextId) {
        const idx = pagerExercises.findIndex((e) => e.id === nextId);
        if (idx >= 0) setActiveExerciseIndex(idx);
      }
    }
  };

  const handlePause = () => {
    onPause({
      session: {
        ...(JSON.parse(JSON.stringify(W.wo)) as Workout),
        enabledBlocks,
        skippedBlocks,
      },
      startedAt,
      planDayId,
      tags,
      planId,
      enabledBlocks,
      skippedBlocks,
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
    const removedIndex = pagerExercises.findIndex((e) => e.id === removeTarget.id);
    W.removeExercise(removeTarget.id);
    if (view === "exercise") {
      const nextLength = pagerExercises.length - 1;
      if (nextLength <= 0) {
        setView("overview");
      } else if (removedIndex >= 0 && removedIndex <= activeExerciseIndex) {
        setActiveExerciseIndex(Math.max(0, activeExerciseIndex - 1));
      }
    }
    setRemoveTarget(null);
  };

  const renderOverviewSegmentList = (exerciseList: Exercise[], indexOffset = 0) => {
    let runningIndex = indexOffset;
    return segmentExercises(exerciseList).map((seg) => {
      const renderRow = (ex: Exercise) => {
        const idx = runningIndex;
        runningIndex += 1;
        const done = ex.sets.filter((s) => s.done).length;
        return (
          <TrackExerciseRow
            key={ex.id}
            index={idx}
            name={ex.name}
            doneSets={done}
            totalSets={ex.sets.length}
            onOpen={() => openExerciseAt(ex.id)}
            onOpenMenu={() => setMenuTarget(ex)}
          />
        );
      };

      if (seg.kind === "single") {
        return renderRow(seg.exercise as Exercise);
      }

      return (
        <SupersetBlock key={seg.exercises.map((e) => e.id).join("-")} showLabel={false}>
          <div style={{ padding: "8px 0 4px", fontSize: 13, fontWeight: 600, color: M.fg }}>
            Supersatz
            <span style={{ color: M.mut, fontWeight: 500, marginLeft: 6 }}>
              · {seg.exercises.length} Übungen
            </span>
          </div>
          {(seg.exercises as Exercise[]).map((ex) => renderRow(ex))}
        </SupersetBlock>
      );
    });
  };

  const exerciseSlides = pagerExercises.map((ex) => (
    <TrackExerciseSlide
      key={ex.id}
      exercise={ex}
      restSeconds={preferences.restSeconds}
      onBumpSet={(si, field, delta) => W.editSet(ex.id, si, field, delta)}
      onSetValue={(si, field, value) => W.setSetValue(ex.id, si, field, value)}
      onToggleSet={(si) => handleToggleSet(ex.id, si)}
      onRemoveSet={(si) => W.removeSet(ex.id, si)}
      onAddSet={() => W.addSet(ex.id)}
      onWarmUpChange={(enabled) => W.toggleSetWarmUp(ex.id, enabled)}
      onOpenHistory={() => setHistoryExercise(ex.name)}
      onOpenNotes={() => setNoteTarget(ex)}
    />
  ));

  const menuVideoUrl = menuTarget ? resolveExerciseVideoUrl(menuTarget, exLibrary) : null;

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
      {view === "overview" ? (
        <>
          <TrackOverviewHeader
            elapsedSec={elapsedSec}
            sessionName={W.wo.name}
            isCustom={isCustom}
            onSessionNameChange={W.setName}
            onPause={handlePause}
          />
          <div style={{ padding: "0 18px 12px" }}>
            <div style={{ display: "flex", gap: 10 }}>
              <MStat label="SÄTZE" value={`${visibleDoneSets}/${visibleTotalSets}`} />
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
                style={{
                  width: pct + "%",
                  height: "100%",
                  background: M.brand,
                  borderRadius: 3,
                  transition: "width .3s",
                }}
              />
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
            <div style={{ padding: "0 18px 16px" }}>
              {W.wo.exercises.length === 0 && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
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
                      background: M.brandSoft,
                      color: M.brand,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 14,
                    }}
                  >
                    <Icon name="dumbbell" size={26} stroke={2} />
                  </div>
                  <div style={{ fontFamily: M.disp, fontWeight: 700, fontSize: 20, color: M.fg }}>
                    Noch keine Übungen
                  </div>
                  <div style={{ fontSize: 14, marginTop: 8, lineHeight: 1.45, maxWidth: 260 }}>
                    {isCustom
                      ? "Tippe unten auf „Übungen hinzufügen“, um zu starten."
                      : "Füge Übungen pro Baustein hinzu."}
                  </div>
                </div>
              )}
              {useBlockLayout ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                  {groupExercisesByBlock(
                    visibleExercises,
                    enabledBlocks.filter((b) => !skippedBlocks.includes(b)),
                  ).map(({ block, exercises: blockExercises }, blockIdx, arr) => {
                    const indexOffset = arr
                      .slice(0, blockIdx)
                      .reduce((sum, item) => sum + item.exercises.length, 0);
                    return (
                      <PlanBlockSection
                        key={block}
                        block={block}
                        complete={isBlockComplete(blockExercises)}
                        blockIndex={BLOCK_ORDER.indexOf(block) + 1}
                        headerAction={
                          <MButton
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSkipBlock(block);
                            }}
                            style={{ color: M.mut2, fontSize: 11, padding: "4px 8px", flexShrink: 0 }}
                          >
                            Heute überspringen
                          </MButton>
                        }
                      >
                        <div>
                          {blockExercises.length > 0 ? (
                            renderOverviewSegmentList(blockExercises, indexOffset)
                          ) : (
                            <div style={{ fontSize: 12, color: M.mut, fontWeight: 500, padding: "4px 2px 12px" }}>
                              Noch keine Übungen
                            </div>
                          )}
                          <MButton
                            type="button"
                            variant="ghost"
                            size="sm"
                            fullWidth
                            onClick={() => openExercisePicker(block)}
                            style={{
                              marginTop: 8,
                              border: "1.5px dashed " + M.line,
                              color: M.fg,
                              fontFamily: M.disp,
                              letterSpacing: 0.3,
                              fontSize: 12,
                            }}
                          >
                            <Icon name="plus" size={14} stroke={2.6} /> Übung hinzufügen
                          </MButton>
                        </div>
                      </PlanBlockSection>
                    );
                  })}
                  {skippedBlocks.map((block) => (
                    <PlanBlockSection
                      key={`skipped-${block}`}
                      block={block}
                      skipped
                      blockIndex={BLOCK_ORDER.indexOf(block) + 1}
                      headerAction={
                        <MButton
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSkipBlock(block);
                          }}
                          style={{ color: M.mut2, fontSize: 11, padding: "4px 8px", flexShrink: 0 }}
                        >
                          Wieder aktivieren
                        </MButton>
                      }
                    >
                      <div style={{ fontSize: 12, color: M.mut, fontWeight: 500 }}>
                        Baustein für heute übersprungen
                      </div>
                    </PlanBlockSection>
                  ))}
                </div>
              ) : (
                renderOverviewSegmentList(visibleExercises)
              )}
            </div>
          </div>
        </>
      ) : (
        <TrackExerciseDetail
          elapsedSec={elapsedSec}
          activeIndex={activeExerciseIndex}
          onIndexChange={setActiveExerciseIndex}
          onBack={() => setView("overview")}
          onOpenOneRm={() => setOneRmOpen(true)}
          onOpenTimer={openTimerSheet}
          slides={exerciseSlides}
        />
      )}

      <div
        style={{
          margin: "0 18px 12px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          flexShrink: 0,
        }}
      >
        {W.restActive ? (
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
              {fmt(W.rest)}
            </span>
            <MButton
              onClick={W.stopRest}
              variant="secondary"
              size="sm"
              style={{ borderColor: "rgba(10,26,10,.25)", color: M.brandInk, background: "transparent" }}
            >
              Skip
            </MButton>
          </div>
        ) : null}
        {view === "overview" && isCustom ? (
          <MButton
            type="button"
            variant="ghost"
            size="md"
            fullWidth
            onClick={() => openExercisePicker()}
            style={{
              fontFamily: M.disp,
              letterSpacing: 0.4,
              border: "1.5px dashed " + M.line,
              color: M.fg,
            }}
          >
            <Icon name="plus" size={14} stroke={2.4} /> Übungen hinzufügen
          </MButton>
        ) : null}
        {view === "overview" ? (
          <MButton
            type="button"
            variant="primary"
            size="md"
            fullWidth
            disabled={finishing}
            loading={finishing}
            onClick={() => setFinishSheet(true)}
            style={{ fontFamily: M.disp, letterSpacing: 0.5, fontWeight: 700 }}
          >
            Workout beenden
          </MButton>
        ) : null}
      </div>

      <WorkoutFinishSheet
        open={finishSheet}
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
      <ExercisePickerSheet
        open={picker}
        onClose={closeExercisePicker}
        onSelect={addFromLibrary}
        library={exLibrary}
        loading={libraryLoading}
        title={
          pickerTargetBlock
            ? `Übung · ${BLOCK_LABELS[pickerTargetBlock]}`
            : "Übung hinzufügen"
        }
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
      <ExerciseVideoSheet
        open={!!videoExercise}
        exerciseName={videoExercise?.name ?? ""}
        youtubeUrl={videoExercise?.youtubeUrl ?? ""}
        onClose={() => setVideoExercise(null)}
      />
      <OneRmCalculatorSheet
        open={oneRmOpen}
        onClose={() => setOneRmOpen(false)}
        initialWeight={oneRmPrefill.weight}
        initialReps={oneRmPrefill.reps}
        resetKey={activeExercise?.id ?? ""}
      />
      <TrackExerciseMenuSheet
        open={!!menuTarget}
        exerciseName={menuTarget?.name ?? ""}
        hasVideo={Boolean(menuVideoUrl)}
        showSupersetAction={isCustom && Boolean(menuTarget && pagerExercises.findIndex((e) => e.id === menuTarget.id) > 0)}
        linkedToPrevious={menuTarget ? isLinkedWithPrevious(W.wo.exercises, menuTarget.id) : false}
        onClose={() => setMenuTarget(null)}
        onVideo={
          menuTarget && menuVideoUrl
            ? () => setVideoExercise({ name: menuTarget.name, youtubeUrl: menuVideoUrl })
            : undefined
        }
        onHistory={() => menuTarget && setHistoryExercise(menuTarget.name)}
        onRemove={() => menuTarget && setRemoveTarget({ id: menuTarget.id, name: menuTarget.name })}
        onToggleSuperset={
          menuTarget
            ? () => {
                if (isLinkedWithPrevious(W.wo.exercises, menuTarget.id)) {
                  W.unlinkExerciseFromSuperset(menuTarget.id);
                } else {
                  W.linkExerciseWithPrevious(menuTarget.id);
                }
              }
            : undefined
        }
      />
      <TrackExerciseNoteSheet
        open={!!noteTarget}
        exerciseName={noteTarget?.name ?? ""}
        note={noteTarget?.note ?? ""}
        onClose={() => setNoteTarget(null)}
        onSave={(note) => noteTarget && W.setExerciseNote(noteTarget.id, note)}
      />
      <ConfirmSheet
        open={!!removeTarget}
        title="Übung entfernen?"
        message={
          removeTarget
            ? `${removeTarget.name} wird nur aus dieser Trainingssession entfernt. Das Workout in der Library und dein Plan bleiben unverändert.`
            : ""
        }
        confirmLabel="Aus Session entfernen"
        icon="trash"
        onConfirm={handleConfirmRemoveExercise}
        onCancel={() => setRemoveTarget(null)}
      />
      {timerMounted ? (
        <IntervalTimerSheet
          open={timerSheetOpen}
          onClose={() => setTimerSheetOpen(false)}
          onSaveSession={onSaveTimerSession}
        />
      ) : null}
    </div>
  );
}
