import { useEffect, useMemo, useRef, useState } from "react";
import { brandButtonStyle, M } from "../theme";
import type { LibraryExercise } from "../data";
import { fmt, resolveExerciseRestSeconds, useWorkout, type Workout, type WorkoutSet } from "../lib/engine";

import { useExercises, sumProteinToday, useProteinLogsToday } from "../lib/db";
import { computeRecoveryContext } from "../lib/recoveryEngine";
import { useRecoveryTarget } from "../lib/recoveryTarget";
import { useAuth } from "../lib/auth";
import { useAutopilotPrefill } from "../lib/useAutopilotPrefill";
import { computeNextTarget, inferExerciseBlockFormat, inferTargetRepRange, isWorkingSetPr, resolveWeightIncrement } from "../lib/progressionEngine";
import { usePreferences } from "../lib/preferences";
import { useRestTimerSounds } from "../lib/useTimerSounds";
import { DEFAULT_TIMER_SOUND_PACK_ID } from "../lib/timerSoundPacks";
import { useContentColumnStyle, CONTENT_HORIZONTAL_PADDING } from "../lib/responsive";
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
import { ExerciseListRow, ExerciseListRowDumbbellIcon } from "../components/ExerciseListRow";
import { MStat } from "../components/widgets";
import { WorkoutFinishSheet } from "../components/WorkoutFinishSheet";
import { AlertSheet } from "../components/AlertSheet";
import { ExerciseHistorySheet } from "../components/ExerciseHistorySheet";
import { ExerciseDetailSheet } from "../components/ExerciseDetailSheet";
import { ExerciseVideoSheet } from "../components/ExerciseVideoSheet";
import { resolveExerciseVideoUrl } from "../lib/youtube";
import { resolveLibraryExercise } from "../lib/resolveLibraryExercise";
import { OneRmCalculatorSheet } from "../components/OneRmCalculatorSheet";
import { getOneRmPrefillFromExercise } from "../lib/oneRepMax";
import { SupersetBlock } from "../components/SupersetBlock";
import { isLinkedWithPrevious, nextInSupersetBlock, segmentExercises } from "../lib/superset";
import type { Exercise } from "../lib/engine";
import { MButton } from "../components/MButton";
import { ConfirmSheet } from "../components/ConfirmSheet";
import { TrackOverviewHeader } from "../components/track/TrackOverviewHeader";
import { TrackSessionHeader } from "../components/track/TrackSessionHeader";
import { HeartRateConnectSheet } from "../components/track/HeartRateConnectSheet";
import { useHeartRateMonitor } from "../lib/heartRate/useHeartRateMonitor";
import type { HeartRateSample } from "../lib/heartRate/heartRateZones";
import { TrackExerciseRow } from "../components/track/TrackExerciseRow";
import { TrackExerciseMenuSheet } from "../components/track/TrackExerciseMenuSheet";
import { TrackExerciseDetail } from "../components/track/TrackExerciseDetail";
import { TrackExerciseSlide } from "../components/track/TrackExerciseSlide";
import { TrackExerciseNoteSheet } from "../components/track/TrackExerciseNoteSheet";
import { IntervalTimerSheet } from "../components/IntervalTimerSheet";
import { MetconBlockView } from "../components/track/MetconBlockView";
import { ExpressTrackingView } from "../components/track/ExpressTrackingView";
import { ExpressWorkoutCompleteView } from "../components/track/ExpressWorkoutCompleteView";
import { ExerciseSetEditSheet } from "../components/track/ExerciseSetEditSheet";
import { TrackAutopilotBootOverlay } from "../components/track/TrackAutopilotBootOverlay";
import type { SaveSessionInput } from "../lib/db";
import type { PlanDayBlock } from "../data";
import {
  configFromPlanDayBlock,
  formatAmrapResult,
  formatMetconBlockBadge,
  formatMetconSessionResult,
  isMetconFormat,
} from "../lib/metcon";
import { isWorkoutExpressEligible, findNextExpressTarget } from "../lib/expressTrackingFlow";
import { EXPRESS_TRACKING_TAG } from "../lib/expressTracking";
import { isOwnerLabsVisible, useOwnerLabs } from "../lib/ownerLabs";
import { ExercisePickerSheet } from "../components/ExercisePickerSheet";

export interface TrackScreenProps {
  session: Workout;
  startedAt: number;
  planDayId?: string;
  tags: string[];
  planId?: string;
  expressTracking?: boolean;
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
    metconResults?: Record<string, import("../lib/metcon").MetconSessionResult>;
    exercises: {
      name: string;
      note?: string;
      blockType?: TrainingBlockType;
      supersetId?: string;
      catalogExerciseId?: string;
      blockFormat?: import("../lib/planBlocks").BlockFormat;
      blockId?: string;
      perceivedEffort?: import("../lib/progressionEngine").PerceivedEffort;
      metric?: import("../lib/exerciseCatalog").ExerciseMetric;
      sets: WorkoutSet[];
    }[];
  }) => void | Promise<void>;
}

type TrackView = "overview" | "exercise" | "express" | "metcon" | "complete";

export function TrackScreen({ session, startedAt, planDayId, tags, planId, expressTracking = false, onPause, onDiscard, onSaveTimerSession, onFinish }: TrackScreenProps) {
  const isCustom = !planDayId;
  const { user, profile } = useAuth();
  const { flags: labFlags } = useOwnerLabs(profile);
  const expressLabOn = isOwnerLabsVisible(profile) && labFlags.frictionKillerTurbo;
  const [setEditSheetExerciseId, setSetEditSheetExerciseId] = useState<string | null>(null);
  const columnStyle = useContentColumnStyle();
  const { preferences, updatePreferences } = usePreferences();
  const { data: library, loading: libraryLoading, reload: reloadExercises } = useExercises();
  const W = useWorkout(session, {
    restSeconds: preferences.restSeconds,
    autoRest: preferences.autoRest,
  });
  useRestTimerSounds(W.rest, W.restActive, preferences.timerSounds, DEFAULT_TIMER_SOUND_PACK_ID);

  const [view, setView] = useState<TrackView>("overview");
  const [activeExerciseIndex, setActiveExerciseIndex] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [timerPaused, setTimerPaused] = useState(false);
  const timerAccumSecRef = useRef(0);
  const timerSegmentStartRef = useRef(startedAt);
  const timerPausedRef = useRef(false);
  const [finishing, setFinishing] = useState(false);
  const [finishSheet, setFinishSheet] = useState(false);
  const [recoveryDismissed, setRecoveryDismissed] = useState(false);
  const [loggedRecoveryLabel, setLoggedRecoveryLabel] = useState<string | null>(null);
  const [proteinRefreshKey, setProteinRefreshKey] = useState(0);
  const { data: proteinLogsToday } = useProteinLogsToday(proteinRefreshKey);
  const { proteinTargetG } = useRecoveryTarget();
  const [picker, setPicker] = useState(false);
  const [pickerTargetBlock, setPickerTargetBlock] = useState<TrainingBlockType | null>(null);
  const [historyExercise, setHistoryExercise] = useState<string | null>(null);
  const [videoExercise, setVideoExercise] = useState<{ name: string; youtubeUrl: string } | null>(null);
  const [oneRmOpen, setOneRmOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<{ id: string; name: string } | null>(null);
  const [menuTarget, setMenuTarget] = useState<Exercise | null>(null);
  const [menuVariant, setMenuVariant] = useState<"full" | "actions">("full");
  const [guideExercise, setGuideExercise] = useState<LibraryExercise | null>(null);
  const [noteTarget, setNoteTarget] = useState<Exercise | null>(null);
  const [timerSheetOpen, setTimerSheetOpen] = useState(false);
  const [timerMounted, setTimerMounted] = useState(false);
  const [skippedBlocks, setSkippedBlocks] = useState<TrainingBlockType[]>(session.skippedBlocks ?? []);
  const [heartRateSheetOpen, setHeartRateSheetOpen] = useState(false);
  const heartRate = useHeartRateMonitor();
  const [hrSamples, setHrSamples] = useState<HeartRateSample[]>([]);
  const lastHrSampleKeyRef = useRef<string | null>(null);

  const enabledBlocks = session.enabledBlocks ?? DEFAULT_ENABLED_BLOCKS;
  const useBlockLayout = Boolean(planDayId);
  const visibleExercises = useMemo(
    () => filterExercisesForSession(W.wo.exercises, enabledBlocks, skippedBlocks),
    [W.wo.exercises, enabledBlocks, skippedBlocks],
  );
  const pagerExercises = useMemo(
    () => visibleExercises.filter((e) => e.blockType !== "metcon"),
    [visibleExercises],
  );
  const expressEligible = useMemo(() => isWorkoutExpressEligible(pagerExercises), [pagerExercises]);
  const useExpressTrack = expressEligible && (expressTracking || expressLabOn);
  const metconBlock = useMemo(
    () => W.wo.blocks?.find((b) => b.blockType === "metcon"),
    [W.wo.blocks],
  );
  const metconExercises = useMemo(
    () => visibleExercises.filter((e) => e.blockType === "metcon"),
    [visibleExercises],
  );
  const metconComplete = Boolean(metconBlock && W.wo.metconResults?.[metconBlock.id]);

  const visibleDoneSets = visibleExercises.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0);
  const visibleTotalSets = visibleExercises.reduce((a, e) => a + e.sets.length, 0);
  const visibleVolumeKg = visibleExercises.reduce(
    (a, e) =>
      a + e.sets.filter((s) => s.done).reduce((b, s) => b + setVolumeKg(s, e.metric ?? "weight_reps"), 0),
    0,
  );
  const pct = visibleTotalSets ? Math.round((visibleDoneSets / visibleTotalSets) * 100) : 0;
  const exLibrary = library ?? [];

  useEffect(() => {
    if (finishSheet) {
      setRecoveryDismissed(false);
      setLoggedRecoveryLabel(null);
    }
  }, [finishSheet]);

  const proteinLoggedTodayG = useMemo(() => sumProteinToday(proteinLogsToday ?? []), [proteinLogsToday]);

  const recoveryContext = useMemo(
    () =>
      computeRecoveryContext({
        doneSets: visibleDoneSets,
        volumeKg: visibleVolumeKg,
        blockTypes: visibleExercises.map((e) => e.blockType ?? "strength"),
        proteinLoggedTodayG,
        proteinTargetG,
      }),
    [visibleDoneSets, visibleVolumeKg, visibleExercises, proteinLoggedTodayG, proteinTargetG],
  );

  const handleRecoveryLogged = (label: string) => {
    setLoggedRecoveryLabel(label);
  };

  const handleRecoveryRefresh = () => {
    setProteinRefreshKey((k) => k + 1);
  };

  const finishRecovery =
    finishSheet &&
    !recoveryDismissed &&
    recoveryContext.showPostWorkoutBlock &&
    user
      ? {
          sessionLine: recoveryContext.sessionSummaryLine,
          remainingG: recoveryContext.remainingG,
          suggestionPresetIds: recoveryContext.postWorkoutSuggestions.map((s) => s.presetId),
          userId: user.id,
          onLogged: handleRecoveryLogged,
          onRefresh: handleRecoveryRefresh,
          onDismiss: () => setRecoveryDismissed(true),
          loggedSuggestionLabel: loggedRecoveryLabel,
        }
      : null;

  const { loading: prefillLoading, prefills } = useAutopilotPrefill(
    user?.id,
    W.wo.exercises,
    preferences,
    exLibrary,
  );
  const needsAutopilot = Boolean(user?.id && W.wo.exercises.length > 0);
  const prefillAppliedRef = useRef(false);
  const prevPrefillLoadingRef = useRef(false);
  const initialBootDoneRef = useRef(false);
  const [autopilotReady, setAutopilotReady] = useState(false);
  const [exerciseInsights, setExerciseInsights] = useState<
    Record<string, { hint?: string | null; progressionNote?: string; trendLabel?: string | null; plateaued?: boolean; plateauReason?: string }>
  >({});
  const [prToast, setPrToast] = useState<string | null>(null);
  const expressAutoStartedRef = useRef(false);

  useEffect(() => {
    if (!prToast) return;
    const id = window.setTimeout(() => setPrToast(null), 3500);
    return () => window.clearTimeout(id);
  }, [prToast]);

  useEffect(() => {
    if (prevPrefillLoadingRef.current === false && prefillLoading) {
      prefillAppliedRef.current = false;
      if (!initialBootDoneRef.current) {
        setAutopilotReady(false);
      }
    }
    prevPrefillLoadingRef.current = prefillLoading;
  }, [prefillLoading]);

  useEffect(() => {
    if (!needsAutopilot) {
      setAutopilotReady(true);
      initialBootDoneRef.current = true;
      return;
    }
    if (prefillLoading) return;
    if (prefillAppliedRef.current) {
      setAutopilotReady(true);
      return;
    }

    const insights: typeof exerciseInsights = {};
    for (const [exerciseId, prefill] of prefills) {
      const exercise = W.wo.exercises.find((e) => e.id === exerciseId);
      if (!exercise || exercise.sets.some((s) => s.done || s.suggested)) continue;
      W.applyExercisePrefill(exerciseId, prefill.suggestions);
      insights[exerciseId] = {
        hint: prefill.hint,
        progressionNote: prefill.progressionNote,
        trendLabel: prefill.trendLabel,
        plateaued: prefill.plateaued,
        plateauReason: prefill.plateauReason,
      };
    }
    if (Object.keys(insights).length > 0) {
      setExerciseInsights((prev) => ({ ...prev, ...insights }));
    }
    prefillAppliedRef.current = true;
    initialBootDoneRef.current = true;
    setAutopilotReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsAutopilot, prefillLoading, prefills]);

  const activeExercise = pagerExercises[activeExerciseIndex] ?? null;

  const oneRmPrefill = useMemo(
    () => getOneRmPrefillFromExercise(activeExercise),
    [activeExercise],
  );

  useEffect(() => {
    if (!autopilotReady) return;
    if (useExpressTrack && !expressAutoStartedRef.current) {
      expressAutoStartedRef.current = true;
      setView("express");
    }
  }, [autopilotReady, useExpressTrack]);

  useEffect(() => {
    if (view === "complete" && findNextExpressTarget(pagerExercises)) {
      setView(useExpressTrack ? "express" : "overview");
    }
  }, [view, pagerExercises, useExpressTrack]);

  useEffect(() => {
    timerAccumSecRef.current = 0;
    timerSegmentStartRef.current = startedAt;
    timerPausedRef.current = false;
    setTimerPaused(false);
    setElapsedSec(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
  }, [startedAt]);

  useEffect(() => {
    timerPausedRef.current = timerPaused;
  }, [timerPaused]);

  useEffect(() => {
    if (timerPaused) return;
    const tick = () => {
      const next =
        timerAccumSecRef.current +
        Math.max(0, Math.floor((Date.now() - timerSegmentStartRef.current) / 1000));
      setElapsedSec(next);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt, timerPaused]);

  useEffect(() => {
    if (timerPaused || heartRate.bpm == null) return;
    const key = `${elapsedSec}:${heartRate.bpm}`;
    if (lastHrSampleKeyRef.current === key) return;
    lastHrSampleKeyRef.current = key;
    setHrSamples((prev) => [...prev, { elapsedSec, bpm: heartRate.bpm! }]);
  }, [elapsedSec, heartRate.bpm, timerPaused]);

  const getWorkoutElapsedSec = () => {
    if (timerPausedRef.current) return timerAccumSecRef.current;
    return (
      timerAccumSecRef.current +
      Math.max(0, Math.floor((Date.now() - timerSegmentStartRef.current) / 1000))
    );
  };

  const handleToggleTimerPause = () => {
    if (timerPausedRef.current) {
      timerSegmentStartRef.current = Date.now();
      timerPausedRef.current = false;
      setTimerPaused(false);
      return;
    }
    const frozen = getWorkoutElapsedSec();
    timerAccumSecRef.current = frozen;
    setElapsedSec(frozen);
    timerPausedRef.current = true;
    setTimerPaused(true);
  };

  useEffect(() => {
    if (activeExerciseIndex >= pagerExercises.length) {
      setActiveExerciseIndex(Math.max(0, pagerExercises.length - 1));
    }
    if (view === "exercise" && pagerExercises.length === 0) {
      setView("overview");
    }
    if (view === "express" && pagerExercises.length === 0) {
      setView("overview");
    }
  }, [pagerExercises.length, activeExerciseIndex, view]);

  const openExerciseAt = (exId: string) => {
    if (useExpressTrack) {
      openExpressTrack();
      return;
    }
    const idx = pagerExercises.findIndex((e) => e.id === exId);
    if (idx < 0) return;
    setActiveExerciseIndex(idx);
    setView("exercise");
  };

  const openSetEditSheet = (exId: string) => {
    setSetEditSheetExerciseId(exId);
  };

  const openExpressTrack = () => {
    setView("express");
  };

  const setEditSheetExercise = useMemo(
    () => (setEditSheetExerciseId ? pagerExercises.find((e) => e.id === setEditSheetExerciseId) ?? null : null),
    [setEditSheetExerciseId, pagerExercises],
  );

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

  const isBlockComplete = (block: TrainingBlockType, exercises: Exercise[]) => {
    if (block === "metcon") {
      return metconComplete;
    }
    return (
      exercises.length > 0 &&
      exercises.every((ex) => ex.sets.length > 0 && ex.sets.every((s) => s.done))
    );
  };

  const setsForPersistence = (sets: WorkoutSet[]): WorkoutSet[] =>
    sets.map(({ suggested: _suggested, ...rest }) => rest);

  const buildFinishPayload = () => {
    const volumeInVisible = visibleExercises.reduce(
      (a, e) =>
        a + e.sets.filter((s) => s.done).reduce((b, s) => b + setVolumeKg(s, e.metric ?? "weight_reps"), 0),
      0,
    );
    return {
      name: W.wo.name,
      tags: expressTracking || isCustom ? [EXPRESS_TRACKING_TAG] : tags,
      durationMin: Math.max(1, Math.round(elapsedSec / 60)),
      volumeKg: volumeInVisible,
      setCount: visibleDoneSets,
      planDayId,
      planId,
      skippedBlocks,
      metconResults: W.wo.metconResults,
      exercises: W.wo.exercises.map((e) => ({
        name: e.name,
        note: e.note,
        blockType: e.blockType,
        blockFormat: e.blockFormat ?? inferExerciseBlockFormat(e),
        blockId: e.blockId,
        supersetId: e.supersetId,
        catalogExerciseId: e.catalogExerciseId,
        perceivedEffort: e.perceivedEffort,
        metric: e.metric,
        sets: setsForPersistence(e.sets),
      })),
    };
  };

  const applyDeloadForExercise = (exercise: Exercise) => {
    const prefill = prefills.get(exercise.id);
    const muscleGroup = exLibrary.find((x) => x.id === exercise.catalogExerciseId)?.group;
    const { min, max } = inferTargetRepRange(exercise.sets);
    const suggestions = computeNextTarget({
      lastPerformance: prefill?.history[0] ?? null,
      planSets: exercise.sets,
      format: inferExerciseBlockFormat(exercise),
      metric: exercise.metric,
      targetRepsMin: min,
      targetRepsMax: max,
      weightIncrementKg: resolveWeightIncrement(muscleGroup, preferences),
      muscleGroup,
      applyDeload: true,
    });
    W.applyExercisePrefill(exercise.id, suggestions);
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
    const elapsed = getWorkoutElapsedSec();
    onPause({
      session: {
        ...(JSON.parse(JSON.stringify(W.wo)) as Workout),
        enabledBlocks,
        skippedBlocks,
      },
      startedAt: Date.now() - elapsed * 1000,
      planDayId,
      tags,
      planId,
      expressTracking,
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
      const prExercise = visibleExercises.find((ex) => {
        const prefill = prefills.get(ex.id);
        return prefill && isWorkingSetPr(ex.sets, prefill.history, ex.metric);
      });
      if (prExercise) setPrToast(`Neuer PR bei ${prExercise.name}`);
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

  const handleMetconComplete = (roundsCompleted: number, durationSec: number) => {
    if (!metconBlock) return;
    const format = isMetconFormat(metconBlock.format) ? metconBlock.format : "amrap";
    const label =
      format === "amrap"
        ? formatAmrapResult(roundsCompleted, durationSec)
        : format === "emom"
          ? `${roundsCompleted} Runden EMOM`
          : `${roundsCompleted} Runden Circuit`;
    W.setMetconResult(metconBlock.id, {
      format,
      roundsCompleted,
      durationSec,
      label,
    });
  };

  const metconHistoryHint = useMemo(() => {
    const first = metconExercises[0];
    if (!first) return null;
    return exerciseInsights[first.id]?.hint ?? prefills.get(first.id)?.hint ?? null;
  }, [metconExercises, exerciseInsights, prefills]);

  const renderMetconOverview = (block: PlanDayBlock, blockExercises: Exercise[]) => {
    const cfg = configFromPlanDayBlock(block);
    const badge = cfg ? formatMetconBlockBadge(cfg) : "MetCon";
    const result = W.wo.metconResults?.[block.id];
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: 0.8,
            color: "#f97316",
            textTransform: "uppercase",
          }}
        >
          {badge}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {blockExercises.map((ex) => (
            <ExerciseListRow
              key={ex.id}
              title={ex.name}
              subtitle={ex.sets[0]?.reps ? `${ex.sets[0].reps} Wdh.` : undefined}
              leading={<ExerciseListRowDumbbellIcon />}
              background="panel"
            />
          ))}
        </div>
        {result ? (
          <div style={{ fontSize: 13, color: M.brand, fontWeight: 600 }}>
            {formatMetconSessionResult(result)}
          </div>
        ) : (
          <MButton
            type="button"
            variant="secondary"
            size="sm"
            fullWidth
            onClick={() => setView("metcon")}
            style={{ fontFamily: M.disp, letterSpacing: 0.4, marginTop: 4 }}
          >
            MetCon starten
          </MButton>
        )}
      </div>
    );
  };

  const renderOverviewSegmentList = (exerciseList: Exercise[], indexOffset = 0) => {
    let runningIndex = indexOffset;
    const segments = segmentExercises(exerciseList).map((seg) => {
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
            onOpenMenu={() => {
              setMenuVariant("full");
              setMenuTarget(ex);
            }}
          />
        );
      };

      if (seg.kind === "single") {
        return renderRow(seg.exercise as Exercise);
      }

      return (
        <SupersetBlock key={seg.exercises.map((e) => e.id).join("-")} showLabel={false}>
          <div style={{ padding: "0 0 2px", fontSize: 13, fontWeight: 600, color: M.fg }}>
            Supersatz
            <span style={{ color: M.mut, fontWeight: 500, marginLeft: 6 }}>
              · {seg.exercises.length} Übungen
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {(seg.exercises as Exercise[]).map((ex) => renderRow(ex))}
          </div>
        </SupersetBlock>
      );
    });

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {segments}
      </div>
    );
  };

  const hasAutopilotPrefills = Object.keys(exerciseInsights).length > 0;

  const exerciseSlides = pagerExercises.map((ex) => {
    const insight = exerciseInsights[ex.id];
    return (
      <TrackExerciseSlide
        key={ex.id}
        exercise={ex}
        restSeconds={resolveExerciseRestSeconds(ex, W.wo, preferences.restSeconds)}
        onRestSecondsChange={(seconds, scope) => {
          if (scope === "workout") W.setSessionRestSeconds(seconds);
          else W.setExerciseRestSeconds(ex.id, seconds);
        }}
        historyHint={insight?.hint ?? undefined}
        trendLabel={insight?.trendLabel ?? undefined}
        progressionBadge={insight?.progressionNote}
        plateaued={insight?.plateaued}
        plateauReason={insight?.plateauReason}
        onApplyDeload={() => applyDeloadForExercise(ex)}
        onConfirmAllSuggested={() => W.confirmAllSuggested(ex.id)}
        onPerceivedEffort={(effort) => W.setPerceivedEffort(ex.id, effort)}
        onBumpSet={(si, field, delta) => W.editSet(ex.id, si, field, delta)}
        onSetValue={(si, field, value) => W.setSetValue(ex.id, si, field, value)}
        onToggleSet={(si) => handleToggleSet(ex.id, si)}
        onRemoveSet={(si) => W.removeSet(ex.id, si)}
        onAddSet={() => W.addSet(ex.id)}
        onWarmUpChange={(enabled) => W.toggleSetWarmUp(ex.id, enabled)}
        onOpenMenu={() => {
          setMenuVariant("full");
          setMenuTarget(ex);
        }}
      />
    );
  });

  const menuVideoUrl = menuTarget ? resolveExerciseVideoUrl(menuTarget, exLibrary) : null;
  const menuGuideExercise = menuTarget ? resolveLibraryExercise(menuTarget, exLibrary) : null;

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        width: "100%",
        ...columnStyle,
        position: "relative",
      }}
    >
      {!autopilotReady ? (
        <TrackAutopilotBootOverlay />
      ) : (
        <>
      {prToast ? (
        <div
          role="status"
          style={{
            position: "absolute",
            top: 12,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 30,
            padding: "10px 16px",
            borderRadius: 999,
            background: M.brandSoft,
            border: "1px solid " + M.brandBorder,
            color: M.brand,
            fontSize: 13,
            fontWeight: 700,
            fontFamily: M.disp,
            whiteSpace: "nowrap",
            pointerEvents: "none",
          }}
        >
          {prToast}
        </div>
      ) : null}
      {view === "overview" ? (
        <>
          <TrackOverviewHeader
            elapsedSec={elapsedSec}
            sessionName={W.wo.name}
            isCustom={isCustom}
            onSessionNameChange={W.setName}
            onPause={handlePause}
          />
          <div style={{ padding: `0 ${CONTENT_HORIZONTAL_PADDING}px 12px` }}>
            <div style={{ display: "flex", gap: 10 }}>
              <MStat label="SÄTZE" value={`${visibleDoneSets}/${visibleTotalSets}`} />
              <MStat label="VOLUMEN" value={`${(W.volume / 1000).toFixed(1)}t`} />
              <MStat label="FORTSCHRITT" value={`${pct}%`} />
            </div>
            {hasAutopilotPrefills ? (
              <div style={{ fontSize: 13, color: M.mut, marginTop: 10, lineHeight: 1.4 }}>
                Auto-Pilot: Vorschläge aus deiner Historie — tippe ✓ zum Bestätigen.
              </div>
            ) : null}
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
            <div style={{ padding: `0 ${CONTENT_HORIZONTAL_PADDING}px 16px` }}>
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
                      .reduce(
                        (sum, item) =>
                          sum + (item.block === "metcon" ? 0 : item.exercises.length),
                        0,
                      );
                    return (
                      <PlanBlockSection
                        key={block}
                        block={block}
                        complete={isBlockComplete(block, blockExercises)}
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
                            style={{ color: M.mut2, fontSize: 13, padding: "4px 8px", flexShrink: 0 }}
                          >
                            Heute überspringen
                          </MButton>
                        }
                      >
                        <div>
                          {block === "metcon" && metconBlock && blockExercises.length > 0 ? (
                            renderMetconOverview(metconBlock, blockExercises)
                          ) : blockExercises.length > 0 ? (
                            renderOverviewSegmentList(blockExercises, indexOffset)
                          ) : (
                            <div style={{ fontSize: 13, color: M.mut, fontWeight: 500, padding: "4px 2px 12px" }}>
                              Noch keine Übungen
                            </div>
                          )}
                          {block !== "metcon" ? (
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
                                fontSize: 13,
                              }}
                            >
                              <Icon name="plus" size={14} stroke={2.6} /> Übung hinzufügen
                            </MButton>
                          ) : metconComplete ? (
                            <MButton
                              type="button"
                              variant="ghost"
                              size="sm"
                              fullWidth
                              onClick={() => setView("metcon")}
                              style={{
                                marginTop: 8,
                                color: M.mut,
                                fontSize: 13,
                              }}
                            >
                              MetCon erneut ansehen
                            </MButton>
                          ) : null}
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
                          style={{ color: M.mut2, fontSize: 13, padding: "4px 8px", flexShrink: 0 }}
                        >
                          Wieder aktivieren
                        </MButton>
                      }
                    >
                      <div style={{ fontSize: 13, color: M.mut, fontWeight: 500 }}>
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
      ) : view === "metcon" && metconBlock ? (
        <MetconBlockView
          block={metconBlock}
          exercises={metconExercises}
          historyHint={metconHistoryHint}
          onBack={() => setView("overview")}
          onComplete={handleMetconComplete}
        />
      ) : view === "express" && useExpressTrack ? (
        <ExpressTrackingView
          exercises={pagerExercises}
          elapsedSec={elapsedSec}
          restActive={W.restActive}
          restSec={W.rest}
          onSkipRest={W.stopRest}
          onBack={() => setView("overview")}
          onBumpSet={(exId, si, field, delta) => W.editSet(exId, si, field, delta)}
          onSetValues={(exId, si, kg, reps) => {
            W.setSetValue(exId, si, "kg", kg);
            W.setSetValue(exId, si, "reps", reps);
          }}
          onToggleSet={handleToggleSet}
          onAddSet={(exId) => W.addSet(exId)}
          onRemoveSet={(exId, si) => W.removeSet(exId, si)}
          onOpenExerciseMenu={(exId) => {
            const ex = pagerExercises.find((e) => e.id === exId);
            if (ex) {
              setMenuVariant("actions");
              setMenuTarget(ex);
            }
          }}
          onAllSetsDone={() => setView("complete")}
        />
      ) : view === "complete" && useExpressTrack ? (
        <ExpressWorkoutCompleteView
          exercises={pagerExercises}
          sessionName={W.wo.name}
          elapsedSec={elapsedSec}
          onBack={() => setView("overview")}
        />
      ) : (
        <TrackExerciseDetail
          activeIndex={activeExerciseIndex}
          onIndexChange={setActiveExerciseIndex}
          slides={exerciseSlides}
          elapsedSec={elapsedSec}
          onBack={() => setView("overview")}
          onOpenOneRm={() => setOneRmOpen(true)}
          onOpenTimer={openTimerSheet}
          metricsFooter={
            <TrackSessionHeader
              variant="exerciseFooter"
              elapsedSec={elapsedSec}
              heartRateBpm={heartRate.bpm}
              heartRateConnected={heartRate.isConnected}
              heartRateDeviceName={heartRate.deviceName}
              heartRateSupported={heartRate.isSupported}
              hrSamples={hrSamples}
              birthDate={profile?.birth_date}
              onOpenHeartRate={() => setHeartRateSheetOpen(true)}
              timerPaused={timerPaused}
              onToggleTimerPause={handleToggleTimerPause}
            />
          }
        />
      )}

      <div
        style={{
          flexShrink: 0,
          padding: `10px ${CONTENT_HORIZONTAL_PADDING}px 14px`,
          borderTop: "1px solid " + M.line2,
          background: M.bg,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {W.restActive && view !== "express" ? (
          <div
            style={{
              ...brandButtonStyle(),
              borderRadius: 16,
              padding: `13px ${CONTENT_HORIZONTAL_PADDING}px`,
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
        {view === "overview" || view === "complete" ? (
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
        recovery={finishRecovery}
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
      <ExerciseDetailSheet
        open={!!guideExercise}
        exercise={guideExercise}
        onClose={() => setGuideExercise(null)}
        onEdit={() => {}}
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
        variant={menuVariant}
        hasVideo={Boolean(menuVideoUrl)}
        showSupersetAction={isCustom && Boolean(menuTarget && pagerExercises.findIndex((e) => e.id === menuTarget.id) > 0)}
        linkedToPrevious={menuTarget ? isLinkedWithPrevious(W.wo.exercises, menuTarget.id) : false}
        onClose={() => {
          setMenuTarget(null);
          setMenuVariant("full");
        }}
        onVideo={
          menuTarget && menuVideoUrl
            ? () => setVideoExercise({ name: menuTarget.name, youtubeUrl: menuVideoUrl })
            : undefined
        }
        onHistory={() => menuTarget && setHistoryExercise(menuTarget.name)}
        onNotes={() => menuTarget && setNoteTarget(menuTarget)}
        onEditSets={
          menuTarget && (menuVariant === "actions" || isCustom)
            ? () => openSetEditSheet(menuTarget.id)
            : undefined
        }
        onGuide={
          menuGuideExercise ? () => setGuideExercise(menuGuideExercise) : undefined
        }
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
      <ExerciseSetEditSheet
        open={Boolean(setEditSheetExercise)}
        exercise={setEditSheetExercise}
        historyHint={
          setEditSheetExercise
            ? exerciseInsights[setEditSheetExercise.id]?.hint ??
              prefills.get(setEditSheetExercise.id)?.hint ??
              undefined
            : undefined
        }
        hintSuggested={Boolean(
          setEditSheetExercise?.sets.some((s) => s.suggested && !s.done) &&
            Boolean(
              exerciseInsights[setEditSheetExercise.id]?.hint ??
                prefills.get(setEditSheetExercise.id)?.hint,
            ),
        )}
        onClose={() => setSetEditSheetExerciseId(null)}
        onBumpSet={(si, field, delta) =>
          setEditSheetExercise && W.editSet(setEditSheetExercise.id, si, field, delta)
        }
        onSetValue={(si, field, value) =>
          setEditSheetExercise && W.setSetValue(setEditSheetExercise.id, si, field, value)
        }
        onToggleSet={(si) => setEditSheetExercise && handleToggleSet(setEditSheetExercise.id, si)}
        onRemoveSet={(si) => setEditSheetExercise && W.removeSet(setEditSheetExercise.id, si)}
        onAddSet={() => setEditSheetExercise && W.addSet(setEditSheetExercise.id)}
        onWarmUpChange={(enabled) =>
          setEditSheetExercise && W.toggleSetWarmUp(setEditSheetExercise.id, enabled)
        }
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
      <HeartRateConnectSheet
        open={heartRateSheetOpen}
        onClose={() => setHeartRateSheetOpen(false)}
        status={heartRate.status}
        bpm={heartRate.bpm}
        deviceName={heartRate.deviceName}
        isSupported={heartRate.isSupported}
        isBusy={heartRate.isBusy}
        onConnect={() => void heartRate.connect()}
        onDisconnect={() => void heartRate.disconnect()}
      />
      <AlertSheet
        open={!!heartRate.error}
        title="Herzfrequenz"
        message={heartRate.error ?? ""}
        icon="alertCircle"
        onClose={heartRate.clearError}
      />
        </>
      )}
    </div>
  );
}
