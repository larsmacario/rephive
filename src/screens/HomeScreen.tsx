import { useEffect, useMemo, useState } from "react";
import type React from "react";
import { brandSurface, M } from "../theme";
import { planDayDisplayName } from "../data";
import {
  getCurrentCalendarWeek,
  getCurrentWeekKey,
  getPlanDayIndexForIsoWeekday,
  getPlanTrainingWeekdays,
  getTodayIsoWeekday,
  weekdayLabelsFromTrainingWeekdays,
} from "../lib/trainingWeekdays";
import { useAuth } from "../lib/auth";
import {
  type ActiveWorkoutDraft,
  getActiveDurationSec,
  getDraftMetrics,
} from "../lib/activeWorkout";
import { fmtUp } from "../lib/engine";
import {
  createWaterLog,
  sumProteinToday,
  sumWaterToday,
  useActivePlan,
  useBodyMeasurements,
  useHomeStats,
  useProteinLogsSince,
  useProteinLogsToday,
  useSessions,
  useWaterLogsLastSevenDays,
  useWaterLogsToday,
  useWeeklyVolume,
} from "../lib/db";
import { computeRecoveryContext, computeWeeklyRecoveryStats, aggregateProteinByWeekday, getWeekStartMonday } from "../lib/recoveryEngine";
import { useRecoveryTargets } from "../lib/recoveryTarget";
import { aggregateWaterLastSevenDays, formatWaterAmount, shouldShowHydrationHint, toLocalDateKey } from "../lib/hydration";
import { useNetwork } from "../lib/offline/networkStatus";
import { Icon } from "../components/Icon";
import { ScreenScroll } from "../components/ScreenScroll";
import { usePreferences } from "../lib/preferences";
import { WorkoutFinishSheet } from "../components/WorkoutFinishSheet";
import { MStat } from "../components/widgets";
import { MButton } from "../components/MButton";
import { UserAvatar } from "../components/UserAvatar";
import { WeekPlannerSheet } from "../components/WeekPlannerSheet";
import { AlertSheet } from "../components/AlertSheet";

export interface HomeScreenProps {
  onStart: (planDayId: string, planId?: string) => void;
  activeWorkout?: ActiveWorkoutDraft | null;
  onResumeActive: () => void;
  onSaveActive: (draft: ActiveWorkoutDraft) => void | Promise<void>;
  onDiscardActive: () => void;
  onOpenPlans: () => void;
  onOpenTimer: () => void;
  onOpenProfile: () => void;
  onOpenStats: () => void;
  onOpenCalculator: () => void;
  onOpenBodyTracker: () => void;
  onOpenRecovery: (section?: "protein" | "water") => void;
  refreshKey?: number;
  trackLoading?: boolean;
}

export function HomeScreen({
  onStart,
  activeWorkout,
  onResumeActive,
  onSaveActive,
  onDiscardActive,
  onOpenPlans,
  onOpenTimer,
  onOpenProfile,
  onOpenStats,
  onOpenCalculator,
  onOpenBodyTracker,
  onOpenRecovery,
  refreshKey = 0,
  trackLoading,
}: HomeScreenProps) {
  const { profile, user } = useAuth();
  const { preferences, updatePreferences } = usePreferences();
  const { isOnline } = useNetwork();
  const { data: activePlan, loading: planLoading, reload: reloadPlan, isStale: planStale } = useActivePlan();
  const { data: week, reload: reloadWeek } = useWeeklyVolume();
  const { data: stats, reload: reloadStats } = useHomeStats();
  const { data: measurements, reload: reloadMeasurements } = useBodyMeasurements(refreshKey);
  const { data: proteinLogsToday, reload: reloadProteinLogs } = useProteinLogsToday(refreshKey);
  const [waterRefreshKey, setWaterRefreshKey] = useState(0);
  const {
    data: waterLogsToday,
    loading: waterLogsLoading,
    error: waterLogsError,
    reload: reloadWaterLogs,
  } = useWaterLogsToday(refreshKey + waterRefreshKey);
  const { data: waterLogsWeek, reload: reloadWaterWeek } = useWaterLogsLastSevenDays(refreshKey + waterRefreshKey);
  const { proteinTargetG, waterTargetMl, loading: recoveryTargetsLoading } = useRecoveryTargets();
  const weekStartMonday = useMemo(() => getWeekStartMonday(), []);
  const { data: proteinLogsWeek } = useProteinLogsSince(weekStartMonday, refreshKey);
  const { data: sessions } = useSessions();
  const [finishSheet, setFinishSheet] = useState(false);
  const [saving, setSaving] = useState(false);
  const [recoveryDismissed, setRecoveryDismissed] = useState(false);
  const [loggedRecoveryLabel, setLoggedRecoveryLabel] = useState<string | null>(null);
  const [proteinRefreshKey, setProteinRefreshKey] = useState(0);
  const { data: proteinLogsForFinish, reload: reloadProteinForFinish } = useProteinLogsToday(proteinRefreshKey);
  const [durationSec, setDurationSec] = useState(0);
  const [selectedIsoWeekday, setSelectedIsoWeekday] = useState(() => getTodayIsoWeekday());
  const [weekPlannerOpen, setWeekPlannerOpen] = useState(false);
  const [hydrationBusy, setHydrationBusy] = useState(false);
  const [hydrationAlert, setHydrationAlert] = useState<string | null>(null);
  const [hydrationNow, setHydrationNow] = useState(() => new Date());

  useEffect(() => {
    if (!activeWorkout) return;
    const tick = () => setDurationSec(getActiveDurationSec(activeWorkout.startedAt));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [activeWorkout?.startedAt]);

  useEffect(() => {
    const timer = window.setInterval(() => setHydrationNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const activeMetrics = activeWorkout ? getDraftMetrics(activeWorkout) : null;

  useEffect(() => {
    reloadPlan();
    reloadWeek();
    reloadStats();
    reloadMeasurements();
    reloadProteinLogs();
    reloadWaterLogs();
    reloadWaterWeek();
  }, [refreshKey, reloadPlan, reloadWeek, reloadStats, reloadMeasurements, reloadProteinLogs, reloadWaterLogs, reloadWaterWeek]);

  useEffect(() => {
    if (finishSheet) {
      setRecoveryDismissed(false);
      setLoggedRecoveryLabel(null);
      reloadProteinForFinish();
    }
  }, [finishSheet, reloadProteinForFinish]);

  useEffect(() => {
    setSelectedIsoWeekday(getTodayIsoWeekday());
  }, [activePlan?.id]);

  const latestMeasurement = useMemo(() => {
    if (!measurements || measurements.length === 0) return null;
    return measurements[0];
  }, [measurements]);

  const displayName = profile?.display_name ?? "Athlet";
  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString("de-DE", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }),
    [],
  );

  const weekData = week ?? [];
  const maxV = Math.max(...weekData.map((w) => w.v), 1);
  const proteinWeekData = useMemo(
    () => aggregateProteinByWeekday(proteinLogsWeek ?? []),
    [proteinLogsWeek],
  );
  const maxProteinV = Math.max(...proteinWeekData.map((w) => w.v), proteinTargetG, 1);
  const proteinChartBarHeight = 64;
  const proteinGoalLineBottom =
    proteinTargetG > 0 ? (proteinTargetG / maxProteinV) * proteinChartBarHeight : 0;
  const showProteinGoalLine = proteinTargetG > 0 && proteinGoalLineBottom >= 2;
  const waterWeekData = useMemo(
    () => aggregateWaterLastSevenDays(waterLogsWeek ?? []),
    [waterLogsWeek],
  );
  const maxWaterV = Math.max(...waterWeekData.map((day) => day.amountMl), waterTargetMl, 1);
  const waterChartBarHeight = 64;
  const waterGoalLineBottom =
    waterTargetMl > 0 ? (waterTargetMl / maxWaterV) * waterChartBarHeight : 0;
  const showWaterGoalLine = waterTargetMl > 0 && waterGoalLineBottom >= 2;
  const todayChartIdx = useMemo(() => {
    const day = new Date().getDay();
    return day === 0 ? 6 : day - 1;
  }, []);
  const planTrainingWeekdays = activePlan ? getPlanTrainingWeekdays(activePlan) : undefined;
  const weekdayLabels = weekdayLabelsFromTrainingWeekdays(planTrainingWeekdays);
  const calendarWeek = useMemo(
    () => getCurrentCalendarWeek(planTrainingWeekdays),
    [planTrainingWeekdays],
  );
  const hasTrainingWeekdays = (planTrainingWeekdays?.length ?? 0) > 0;
  const selectedPlanDayIndex =
    activePlan && activePlan.days.length > 0
      ? getPlanDayIndexForIsoWeekday(
          selectedIsoWeekday,
          planTrainingWeekdays,
          activePlan.days.length,
        )
      : null;
  const selectedPlanDay =
    activePlan && selectedPlanDayIndex !== null
      ? (activePlan.days[selectedPlanDayIndex] ?? null)
      : null;
  const selectedCalendarDay = calendarWeek.find((d) => d.isoWeekday === selectedIsoWeekday);
  const isSelectedToday = selectedCalendarDay?.isToday ?? false;
  const selectedDateLabel =
    selectedCalendarDay && !isSelectedToday
      ? selectedCalendarDay.date.toLocaleDateString("de-DE", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })
      : null;
  const currentWeekKey = useMemo(() => getCurrentWeekKey(), []);
  const isSunday = getTodayIsoWeekday() === 6;
  const weekPlannerDismissed = preferences.weekPlannerDismissedWeek === currentWeekKey;
  const showWeekPlannerCard = !!activePlan && isSunday && !weekPlannerDismissed;
  const recoveryWeekDismissed = preferences.recoveryWeekDismissedWeek === currentWeekKey;
  const weeklyRecoveryStats = useMemo(
    () =>
      computeWeeklyRecoveryStats(
        (sessions ?? []).map((s) => s.performedAt),
        (proteinLogsWeek ?? []).map((log) => log.loggedAt),
      ),
    [sessions, proteinLogsWeek],
  );
  const showRecoveryWeekCard =
    isSunday && !recoveryWeekDismissed && weeklyRecoveryStats.trainingDays > 0;

  const dismissRecoveryWeekCard = () => {
    updatePreferences({ recoveryWeekDismissedWeek: currentWeekKey });
  };

  const proteinLoggedTodayG = useMemo(() => sumProteinToday(proteinLogsToday ?? []), [proteinLogsToday]);
  const waterLoggedTodayMl = useMemo(() => sumWaterToday(waterLogsToday ?? []), [waterLogsToday]);
  const showHydrationHint =
    !waterLogsLoading &&
    !waterLogsError &&
    !recoveryTargetsLoading &&
    shouldShowHydrationHint({
      now: hydrationNow,
      loggedMl: waterLoggedTodayMl,
      targetMl: waterTargetMl,
      dismissedDate: preferences.hydrationHintDismissedDate,
      isOnline,
    });

  const addWaterFromHint = async () => {
    if (!user || hydrationBusy) return;
    setHydrationBusy(true);
    try {
      await createWaterLog(user.id, { amountMl: 250, source: "home_hint" });
      setWaterRefreshKey((key) => key + 1);
      reloadWaterLogs();
    } catch (cause) {
      setHydrationAlert(cause instanceof Error ? cause.message : "Wasser konnte nicht gespeichert werden.");
    } finally {
      setHydrationBusy(false);
    }
  };

  const dismissHydrationHint = () => {
    updatePreferences({ hydrationHintDismissedDate: toLocalDateKey() }, true);
  };

  const draftRecoveryContext = useMemo(() => {
    if (!activeWorkout || !activeMetrics) return null;
    return computeRecoveryContext({
      doneSets: activeMetrics.doneSets,
      volumeKg: activeMetrics.volumeKg,
      blockTypes: activeWorkout.session.exercises.map((e) => e.blockType ?? "strength"),
      proteinLoggedTodayG: sumProteinToday(proteinLogsForFinish ?? []),
      proteinTargetG,
    });
  }, [activeWorkout, activeMetrics, proteinLogsForFinish, proteinTargetG]);

  const handleRecoveryLogged = (label: string) => {
    setLoggedRecoveryLabel(label);
  };

  const handleRecoveryRefresh = () => {
    setProteinRefreshKey((k) => k + 1);
    reloadProteinLogs();
  };

  const finishRecovery =
    finishSheet &&
    !recoveryDismissed &&
    draftRecoveryContext?.showPostWorkoutBlock &&
    user
      ? {
          sessionLine: draftRecoveryContext.sessionSummaryLine,
          remainingG: draftRecoveryContext.remainingG,
          suggestionPresetIds: draftRecoveryContext.postWorkoutSuggestions.map((s) => s.presetId),
          userId: user.id,
          onLogged: handleRecoveryLogged,
          onRefresh: handleRecoveryRefresh,
          onDismiss: () => setRecoveryDismissed(true),
          loggedSuggestionLabel: loggedRecoveryLabel,
        }
      : null;

  const dismissWeekPlannerCard = () => {
    updatePreferences({ weekPlannerDismissedWeek: currentWeekKey });
  };

  const handleWeekPlannerSaved = async () => {
    updatePreferences({ weekPlannerDismissedWeek: currentWeekKey });
    await reloadPlan();
  };

  const handleSaveActive = async (feedback: Record<string, { rating: "like" | "dislike" | "pain" }>) => {
    if (!activeWorkout) return;
    setSaving(true);
    try {
      if (Object.keys(feedback).length > 0) {
        const nextFeedback = { ...(preferences.exerciseFeedback || {}) };
        for (const [name, val] of Object.entries(feedback)) {
          nextFeedback[name] = val;
        }
        updatePreferences({ exerciseFeedback: nextFeedback });
      }
      await onSaveActive(activeWorkout);
      setFinishSheet(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDiscardActive = () => {
    setFinishSheet(false);
    onDiscardActive();
  };

  const activeWorkoutCard =
    activeWorkout && activeMetrics ? (
      <div
        style={{
          marginTop: 18,
          padding: "18px 18px 16px",
          position: "relative",
          overflow: "hidden",
          ...brandSurface("hero"),
        }}
      >
        <div style={{ fontSize: 13, letterSpacing: 1.4, color: M.brand, fontWeight: 700 }}>
          AKTIVES WORKOUT · {fmtUp(durationSec)}
        </div>
        <div style={{ fontFamily: M.disp, fontWeight: 700, fontSize: 28, lineHeight: 1, marginTop: 8 }}>
          {activeWorkout.session.name}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginTop: 14,
            fontSize: 14,
            color: M.mut,
            fontWeight: 600,
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: M.brand }}>
            <Icon name="dumbbell" size={15} stroke={2} color={M.brand} />
            {activeMetrics.doneSets}/{activeMetrics.totalSets} Sätze
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: M.brand }}>
            <Icon name="bolt" size={15} stroke={2} color={M.brand} />
            {(activeMetrics.volumeKg / 1000).toFixed(1)}t
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <MButton onClick={onResumeActive} variant="primary" size="md" style={{ flex: 1 }}>
            <Icon name="play" size={16} color={M.brandInk} /> Fortsetzen
          </MButton>
          <MButton onClick={() => setFinishSheet(true)} variant="secondary" size="md" style={{ flex: 1, background: M.panel }}>
            Beenden
          </MButton>
        </div>
      </div>
    ) : null;

  const weekPlannerCard = showWeekPlannerCard ? (
    <div
      style={{
        marginTop: 18,
        padding: "18px 18px 16px",
        position: "relative",
        overflow: "hidden",
        ...brandSurface("hero"),
      }}
    >
      <div style={{ fontSize: 13, letterSpacing: 1.4, color: M.brand, fontWeight: 700 }}>
        NEUE WOCHE
      </div>
      <div style={{ fontFamily: M.disp, fontWeight: 700, fontSize: 24, lineHeight: 1.1, marginTop: 8 }}>
        Bereit für die Woche?
      </div>
      <div style={{ color: M.mut, fontSize: 14, marginTop: 10, lineHeight: 1.45 }}>
        Plane jetzt deine Trainingstage — ordne deine Workouts den Wochentagen zu und starte motiviert in die neue Woche.
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <MButton onClick={() => setWeekPlannerOpen(true)} variant="primary" size="md" style={{ flex: 1 }}>
          <Icon name="calendar" size={16} color={M.brandInk} /> Woche planen
        </MButton>
        <MButton onClick={dismissWeekPlannerCard} variant="secondary" size="md" style={{ flex: 1, background: M.panel }}>
          Später
        </MButton>
      </div>
    </div>
  ) : null;

  const recoveryWeekCard = showRecoveryWeekCard ? (
    <div
      style={{
        marginTop: 18,
        padding: "18px 18px 16px",
        borderRadius: 20,
        background: M.card,
        border: "1px solid " + M.line2,
      }}
    >
      <div style={{ fontSize: 13, letterSpacing: 1.4, color: M.brand, fontWeight: 700 }}>RECOVERY</div>
      <div style={{ fontFamily: M.disp, fontWeight: 700, fontSize: 22, lineHeight: 1.15, marginTop: 8 }}>
        Diese Woche: {weeklyRecoveryStats.loggedDays} von {weeklyRecoveryStats.trainingDays} Trainingstagen
      </div>
      <div style={{ color: M.mut, fontSize: 14, marginTop: 10, lineHeight: 1.45 }}>
        {weeklyRecoveryStats.loggedDays >= weeklyRecoveryStats.trainingDays
          ? "Stark — du bist auf Kurs."
          : "Nach dem Training reicht oft ein Tap im Finish-Dialog."}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <MButton onClick={() => onOpenRecovery("protein")} variant="primary" size="md" style={{ flex: 1 }}>
          Recovery öffnen
        </MButton>
        <MButton onClick={dismissRecoveryWeekCard} variant="secondary" size="md" style={{ flex: 1, background: M.panel }}>
          Ausblenden
        </MButton>
      </div>
    </div>
  ) : null;

  const todayCard = planLoading && !activePlan ? (
    <div style={{ marginTop: 14, color: M.mut, fontSize: 14 }}>Plan wird geladen…</div>
  ) : !activePlan ? (
    <div
      style={{
        marginTop: 14,
        borderRadius: 20,
        padding: "18px 18px 16px",
        background: M.card,
        border: "1px solid " + M.line2,
      }}
    >
      <div style={{ fontFamily: M.disp, fontWeight: 700, fontSize: 24, lineHeight: 1.1 }}>Kein aktiver Plan</div>
      <div style={{ color: M.mut, fontSize: 14, marginTop: 10, lineHeight: 1.4 }}>
        Erstelle einen Trainingsplan und lege pro Tag deine Übungen fest.
      </div>
      <MButton onClick={onOpenPlans} variant="primary" size="md" fullWidth style={{ marginTop: 16 }}>
        <Icon name="layers" size={16} color={M.brandInk} /> Plan erstellen
      </MButton>
    </div>
  ) : !selectedPlanDay ? (
    <div
      style={{
        marginTop: 14,
        borderRadius: 20,
        padding: "18px 18px 16px",
        background: M.card,
        border: "1px solid " + M.line2,
      }}
    >
      <div style={{ fontFamily: M.disp, fontWeight: 700, fontSize: 24, lineHeight: 1.1 }}>Kein Training an diesem Tag</div>
      {selectedDateLabel ? (
        <div style={{ color: M.mut, fontSize: 14, marginTop: 10, lineHeight: 1.4 }}>{selectedDateLabel}</div>
      ) : (
        <div style={{ color: M.mut, fontSize: 14, marginTop: 10, lineHeight: 1.4 }}>
          Wähle einen Trainingstag in der Woche oben.
        </div>
      )}
    </div>
  ) : (
    <div
      style={{
        marginTop: 14,
        padding: "18px 18px 16px",
        position: "relative",
        overflow: "hidden",
        ...brandSurface("hero"),
      }}
    >
      <div style={{ fontSize: 13, letterSpacing: 1.4, color: M.mut, fontWeight: 700 }}>
        {activePlan.name.toUpperCase()} · TAG {(selectedPlanDayIndex ?? 0) + 1}
      </div>
      {selectedDateLabel ? (
        <div style={{ fontSize: 13, color: M.mut, fontWeight: 600, marginTop: 6 }}>{selectedDateLabel}</div>
      ) : null}
      <div style={{ fontFamily: M.disp, fontWeight: 700, fontSize: 28, lineHeight: 1, marginTop: selectedDateLabel ? 6 : 8 }}>
        {planDayDisplayName(selectedPlanDay, weekdayLabels)}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginTop: 14,
          fontSize: 14,
          color: M.mut,
          fontWeight: 600,
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Icon name="dumbbell" size={15} stroke={2} color={M.mut} />
          {selectedPlanDay.exercises?.length ?? 0} Übung{(selectedPlanDay.exercises?.length ?? 0) === 1 ? "" : "en"}
        </span>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <MButton
          disabled={trackLoading || selectedPlanDay.exercises.length === 0}
          onClick={() => onStart(selectedPlanDay.id, activePlan.id)}
          variant="primary"
          size="md"
          style={{ flex: 1 }}
        >
          <Icon name="play" size={16} color={M.brandInk} /> Training starten
        </MButton>
      </div>
    </div>
  );

  const weekStrip =
    activePlan ? (
      <div
        style={{
          marginTop: 14,
          background: M.card,
          border: "1px solid " + M.line2,
          borderRadius: 18,
          padding: "15px 16px 14px",
        }}
      >
        <div style={{ fontSize: 13, letterSpacing: 1.4, color: M.mut, fontWeight: 700, marginBottom: 12 }}>
          DIESE WOCHE
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 4 }}>
          {calendarWeek.map((day) => {
            const isSelected = selectedIsoWeekday === day.isoWeekday;
            return (
              <MButton
                key={day.isoWeekday}
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIsoWeekday(day.isoWeekday)}
                aria-label={`${day.weekdayLabel}, ${day.dateNumber}.`}
                aria-pressed={isSelected}
                style={{
                  flex: 1,
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                  minWidth: 0,
                  height: "auto",
                  minHeight: 0,
                  padding: "4px 0",
                }}
              >
                <div
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    background: hasTrainingWeekdays && day.isTrainingDay ? M.brand : "transparent",
                  }}
                  aria-hidden
                />
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: isSelected ? M.brand : day.isToday ? M.brand : M.mut2,
                    letterSpacing: 0.2,
                  }}
                >
                  {day.weekdayLabel}
                </span>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                    fontWeight: 700,
                    fontFamily: M.disp,
                    background: isSelected ? M.brand : "transparent",
                    color: isSelected ? M.brandInk : M.fg,
                    border: isSelected
                      ? "none"
                      : day.isToday
                        ? "1px solid " + M.brand
                        : "1px solid " + M.line2,
                  }}
                >
                  {day.dateNumber}
                </div>
              </MButton>
            );
          })}
        </div>
      </div>
    ) : null;

  const statsRow = (
    <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
      <MStat label="STREAK" value={String(stats?.streakWeeks ?? 0)} sub="Wochen" />
      <MStat label="DIESE WOCHE" value={String(stats?.sessionsThisWeek ?? 0)} sub="Sessions" />
      <MStat label="VOLUMEN" value={`${stats?.volumeThisWeekT ?? 0}t`} sub="diese Woche" />
    </div>
  );

  const volumeChart = (
    <div
      style={{
        marginTop: 14,
        background: M.card,
        border: "1px solid " + M.line2,
        borderRadius: 18,
        padding: "15px 16px 12px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontSize: 13, letterSpacing: 1.4, color: M.mut, fontWeight: 700 }}>VOLUMEN / WOCHE</span>
        <span style={{ fontFamily: M.disp, fontWeight: 700, fontSize: 16, color: M.brand }}>
          {weekData.reduce((a, w) => a + w.v, 0) > 0 ? "●" : "—"}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 84, marginTop: 12 }}>
        {weekData.map((w, i) => (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div style={{ width: "100%", height: 64, display: "flex", alignItems: "flex-end" }}>
              <div
                style={{
                  width: "100%",
                  height: (w.v ? Math.max(8, (w.v / maxV) * 64) : 3) + "px",
                  borderRadius: 5,
                  background: w.v
                    ? i === weekData.length - 1
                      ? M.brand
                      : M.brandSoft
                    : M.line,
                  opacity: w.v ? (i === weekData.length - 1 ? 1 : 0.45) : 1,
                }}
              />
            </div>
            <span style={{ fontSize: 13, color: M.mut2, fontWeight: 700 }}>{w.d}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const proteinChart = (
    <MButton
      type="button"
      variant="ghost"
      onClick={() => onOpenRecovery("protein")}
      style={{
        marginTop: 14,
        width: "100%",
        height: "auto",
        minHeight: 0,
        padding: 0,
        display: "block",
        textAlign: "left",
      }}
    >
      <div
        style={{
          background: M.card,
          border: "1px solid " + M.line2,
          borderRadius: 18,
          padding: "15px 16px 12px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontSize: 13, letterSpacing: 1.4, color: M.mut, fontWeight: 700 }}>PROTEIN / WOCHE</span>
          <span style={{ fontFamily: M.disp, fontWeight: 700, fontSize: 16, color: M.brand }}>
            Heute {proteinLoggedTodayG}/{proteinTargetG} g
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 84, marginTop: 12, position: "relative" }}>
          {showProteinGoalLine ? (
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 20,
                height: proteinChartBarHeight,
                pointerEvents: "none",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: proteinGoalLineBottom,
                  borderTop: `1px dashed ${M.mut}`,
                  opacity: 0.55,
                }}
              />
            </div>
          ) : null}
          {proteinWeekData.map((w, i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div style={{ width: "100%", height: proteinChartBarHeight, display: "flex", alignItems: "flex-end" }}>
                <div
                  style={{
                    width: "100%",
                    height: (w.v ? Math.max(8, (w.v / maxProteinV) * proteinChartBarHeight) : 3) + "px",
                    borderRadius: 5,
                    background: w.v
                      ? i === todayChartIdx
                        ? M.brand
                        : M.brandSoft
                      : M.line,
                    opacity: w.v ? (i === todayChartIdx ? 1 : 0.45) : 1,
                  }}
                />
              </div>
              <span style={{ fontSize: 13, color: M.mut2, fontWeight: 700 }}>{w.d}</span>
            </div>
          ))}
        </div>
      </div>
    </MButton>
  );

  const waterChart = (
    <MButton
      type="button"
      variant="ghost"
      onClick={() => onOpenRecovery("water")}
      style={{
        marginTop: 14,
        width: "100%",
        height: "auto",
        minHeight: 0,
        padding: 0,
        display: "block",
        textAlign: "left",
      }}
    >
      <div style={{ background: M.card, border: `1px solid ${M.line2}`, borderRadius: 18, padding: "15px 16px 12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontSize: 13, letterSpacing: 1.4, color: M.mut, fontWeight: 700 }}>WASSER / WOCHE</span>
          <span style={{ fontFamily: M.disp, fontWeight: 700, fontSize: 16, color: M.brand }}>
            Heute {formatWaterAmount(waterLoggedTodayMl)}/{formatWaterAmount(waterTargetMl)}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 84, marginTop: 12, position: "relative" }}>
          {showWaterGoalLine ? (
            <div style={{ position: "absolute", left: 0, right: 0, bottom: 20, height: waterChartBarHeight, pointerEvents: "none" }}>
              <div style={{ position: "absolute", left: 0, right: 0, bottom: waterGoalLineBottom, borderTop: `1px dashed ${M.mut}`, opacity: 0.55 }} />
            </div>
          ) : null}
          {waterWeekData.map((day, index) => (
            <div key={day.dateKey} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div title={formatWaterAmount(day.amountMl)} style={{ width: "100%", height: waterChartBarHeight, display: "flex", alignItems: "flex-end" }}>
                <div
                  style={{
                    width: "100%",
                    height: `${day.amountMl ? Math.max(8, (day.amountMl / maxWaterV) * waterChartBarHeight) : 3}px`,
                    borderRadius: 5,
                    background: day.amountMl
                      ? index === waterWeekData.length - 1
                        ? M.brand
                        : M.brandSoft
                      : M.line,
                    opacity: day.amountMl ? (index === waterWeekData.length - 1 ? 1 : 0.45) : 1,
                  }}
                />
              </div>
              <span style={{ fontSize: 13, color: M.mut2, fontWeight: 700 }}>{day.label}</span>
            </div>
          ))}
        </div>
      </div>
    </MButton>
  );

  const statsBlock = (
    <div style={{ marginTop: activeWorkout ? 16 : 18 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 0,
        }}
      >
        <span style={{ fontSize: 13, letterSpacing: 1.5, color: M.mut, fontWeight: 700 }}>STATISTIK</span>
        <MButton type="button" onClick={onOpenStats} variant="ghost" size="sm" style={{ padding: 0, color: M.fg }}>
          Alle anzeigen
          <Icon name="chevR" size={14} color={M.fg} stroke={2.2} />
        </MButton>
      </div>
      {statsRow}
      {volumeChart}
      {proteinChart}
      {waterChart}
    </div>
  );

  const homeCardLinkStyle: React.CSSProperties = {
    width: "100%",
    marginTop: 14,
    padding: "12px 14px",
    borderRadius: 12,
    justifyContent: "flex-start",
    textAlign: "left",
    background: M.card,
    gap: 12,
    minHeight: 56,
    height: "auto",
  };

  const timerLink = (
    <MButton onClick={onOpenTimer} variant="secondary" size="md" fullWidth style={homeCardLinkStyle}>
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: M.brandSoft,
          color: M.brand,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flex: "0 0 auto",
        }}
      >
        <Icon name="timer" size={18} stroke={2} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ color: M.fg, fontWeight: 600, fontSize: 14 }}>Interval-Timer</div>
        <div style={{ color: M.mut, fontSize: 13, marginTop: 1 }}>EMOM · AMRAP · TABATA · For Time</div>
      </div>
      <Icon name="chevR" size={16} color={M.mut2} stroke={2.2} />
    </MButton>
  );

  const calculatorLink = (
    <MButton onClick={onOpenCalculator} variant="secondary" size="md" fullWidth style={homeCardLinkStyle}>
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: M.brandSoft,
          color: M.brand,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flex: "0 0 auto",
        }}
      >
        <Icon name="calculator" size={18} stroke={2} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ color: M.fg, fontWeight: 600, fontSize: 14 }}>1RM-Rechner</div>
        <div style={{ color: M.mut, fontSize: 13, marginTop: 1 }}>One Rep Max kalkulieren</div>
      </div>
      <Icon name="chevR" size={16} color={M.mut2} stroke={2.2} />
    </MButton>
  );

  const bodyTrackerLink = (
    <MButton onClick={onOpenBodyTracker} variant="secondary" size="md" fullWidth style={homeCardLinkStyle}>
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: M.brandSoft,
          color: M.brand,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flex: "0 0 auto",
        }}
      >
        <Icon name="scale" size={18} stroke={2} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ color: M.fg, fontWeight: 600, fontSize: 14 }}>Körperwerte</div>
        <div style={{ color: M.mut, fontSize: 13, marginTop: 1 }}>
          {latestMeasurement
            ? `${latestMeasurement.weightKg} kg ${latestMeasurement.bodyFatPct ? `· ${latestMeasurement.bodyFatPct}% KFA` : ""}`
            : "Gewicht & Fettanteil tracken"}
        </div>
      </div>
      <Icon name="chevR" size={16} color={M.mut2} stroke={2.2} />
    </MButton>
  );

  const recoverySubtitle = `Protein ${proteinLoggedTodayG}/${proteinTargetG} g · Wasser ${formatWaterAmount(waterLoggedTodayMl)}/${formatWaterAmount(waterTargetMl)}`;

  const recoveryLink = (
    <MButton onClick={() => onOpenRecovery("protein")} variant="secondary" size="md" fullWidth style={homeCardLinkStyle}>
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: M.brandSoft,
          color: M.brand,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flex: "0 0 auto",
        }}
      >
        <Icon name="heart" size={18} stroke={2} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ color: M.fg, fontWeight: 600, fontSize: 14 }}>Recovery</div>
        <div style={{ color: M.mut, fontSize: 13, marginTop: 1 }}>{recoverySubtitle}</div>
      </div>
      <Icon name="chevR" size={16} color={M.mut2} stroke={2.2} />
    </MButton>
  );

  const hydrationHint = showHydrationHint ? (
    <div style={{ marginTop: 18, padding: "18px 18px 14px", borderRadius: 20, background: M.card, border: `1px solid ${M.line2}`, flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: M.brand, fontSize: 13, letterSpacing: 1.3, fontWeight: 700 }}>
        <Icon name="droplet" size={17} color={M.brand} stroke={2} />
        HYDRATION
      </div>
      <div style={{ fontFamily: M.disp, fontWeight: 700, fontSize: 22, lineHeight: 1.15, marginTop: 8 }}>
        Heute fehlen noch {formatWaterAmount(Math.max(0, waterTargetMl - waterLoggedTodayMl))}
      </div>
      <div style={{ color: M.mut, fontSize: 14, marginTop: 8, lineHeight: 1.45 }}>
        Du hast bisher {formatWaterAmount(waterLoggedTodayMl)} von {formatWaterAmount(waterTargetMl)} erreicht.
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <MButton type="button" variant="primary" size="md" disabled={hydrationBusy} onClick={() => void addWaterFromHint()} style={{ flex: 1 }}>
          +250 ml
        </MButton>
        <MButton type="button" variant="secondary" size="md" onClick={() => onOpenRecovery("water")} style={{ flex: 1 }}>
          Öffnen
        </MButton>
      </div>
      <MButton type="button" variant="ghost" size="sm" fullWidth onClick={dismissHydrationHint} style={{ marginTop: 6, color: M.mut }}>
        Für heute ausblenden
      </MButton>
    </div>
  ) : null;

  return (
    <ScreenScroll page>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative" }}>
        <div>
          <div style={{ fontSize: 13, color: M.mut, fontWeight: 600 }}>
            {todayLabel}
            {planStale && !isOnline && (
              <span style={{ marginLeft: 8, fontSize: 13, color: M.mut2 }}>· Offline</span>
            )}
          </div>
          <div
            style={{
              fontFamily: M.disp,
              fontWeight: 700,
              fontSize: 30,
              lineHeight: 1,
              marginTop: 3,
              whiteSpace: "nowrap",
            }}
          >
            Hej, {displayName.split(" ")[0]}
          </div>
        </div>
        <MButton
          onClick={onOpenProfile}
          variant="secondary"
          size="icon"
          aria-label="Profil"
          title="Profil"
          style={{ width: 48, height: 48, borderRadius: 24, background: M.card, border: "1px solid " + M.brandBorder, padding: 0, overflow: "hidden", flexShrink: 0 }}
        >
          <UserAvatar
            size={48}
            displayName={displayName}
            avatarPath={profile?.avatar_path}
            style={{ border: "none" }}
          />
        </MButton>
      </div>

      {weekStrip}
      {weekPlannerCard}
      {hydrationHint}
      <div
        style={{
          marginTop: 16,
          fontSize: 13,
          letterSpacing: 1.5,
          color: M.mut,
          fontWeight: 700,
        }}
      >
        HEUTE GEPLANT
      </div>
      {todayCard}
      {activeWorkoutCard}
      {statsBlock}
      <div
        style={{
          marginTop: 16,
          fontSize: 13,
          letterSpacing: 1.5,
          color: M.mut,
          fontWeight: 700,
        }}
      >
        SCHNELLZUGRIFF
      </div>
      {timerLink}
      {calculatorLink}
      {bodyTrackerLink}
      {recoveryLink}
      {recoveryWeekCard}
      <WorkoutFinishSheet
        open={finishSheet && !!activeWorkout && !!activeMetrics}
        name={activeWorkout?.session.name ?? ""}
        durationSec={durationSec}
        doneSets={activeMetrics?.doneSets ?? 0}
        totalSets={activeMetrics?.totalSets ?? 0}
        volumeKg={activeMetrics?.volumeKg ?? 0}
        busy={saving}
        exercises={activeWorkout?.session.exercises.map((e) => e.name) ?? []}
        recovery={finishRecovery}
        onSave={handleSaveActive}
        onDiscard={handleDiscardActive}
        onClose={() => setFinishSheet(false)}
      />
      <WeekPlannerSheet
        open={weekPlannerOpen}
        plan={activePlan}
        userId={user?.id ?? ""}
        onClose={() => setWeekPlannerOpen(false)}
        onSaved={handleWeekPlannerSaved}
      />
      <AlertSheet
        open={!!hydrationAlert}
        title="Speichern fehlgeschlagen"
        message={hydrationAlert ?? ""}
        onClose={() => setHydrationAlert(null)}
      />
    </ScreenScroll>
  );
}
