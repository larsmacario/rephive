import { useEffect, useMemo, useState } from "react";
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
import { useActivePlan, useHomeStats, useWeeklyVolume, useBodyMeasurements } from "../lib/db";
import { useNetwork } from "../lib/offline/networkStatus";
import { useBreakpoint } from "../lib/responsive";
import { Icon } from "../components/Icon";
import { usePreferences } from "../lib/preferences";
import { WorkoutFinishSheet } from "../components/WorkoutFinishSheet";
import { MStat } from "../components/widgets";
import { MButton } from "../components/MButton";
import { floatNavContentInset } from "../components/FloatNav";
import { UserAvatar } from "../components/UserAvatar";
import { WeekPlannerSheet } from "../components/WeekPlannerSheet";

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
  refreshKey = 0,
  trackLoading,
}: HomeScreenProps) {
  const { profile, user } = useAuth();
  const { preferences, updatePreferences } = usePreferences();
  const breakpoint = useBreakpoint();
  const isDesktop = breakpoint === "desktop";
  const { isOnline } = useNetwork();
  const { data: activePlan, loading: planLoading, reload: reloadPlan, isStale: planStale } = useActivePlan();
  const { data: week, reload: reloadWeek } = useWeeklyVolume();
  const { data: stats, reload: reloadStats } = useHomeStats();
  const { data: measurements, reload: reloadMeasurements } = useBodyMeasurements(refreshKey);
  const [finishSheet, setFinishSheet] = useState(false);
  const [saving, setSaving] = useState(false);
  const [durationSec, setDurationSec] = useState(0);
  const [selectedIsoWeekday, setSelectedIsoWeekday] = useState(() => getTodayIsoWeekday());
  const [weekPlannerOpen, setWeekPlannerOpen] = useState(false);

  useEffect(() => {
    if (!activeWorkout) return;
    const tick = () => setDurationSec(getActiveDurationSec(activeWorkout.startedAt));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [activeWorkout?.startedAt]);

  const activeMetrics = activeWorkout ? getDraftMetrics(activeWorkout) : null;

  useEffect(() => {
    reloadPlan();
    reloadWeek();
    reloadStats();
    reloadMeasurements();
  }, [refreshKey, reloadPlan, reloadWeek, reloadStats, reloadMeasurements]);

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
                    : "rgba(255,255,255,.08)",
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

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        overflowY: "auto",
        padding: `4px 22px ${floatNavContentInset("bottom")}`,
        position: "relative",
      }}
    >
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

      {isDesktop ? (
        <>
          {weekStrip}
          {weekPlannerCard}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16, alignItems: "start" }}>
            <div>
              <div style={{ fontSize: 13, letterSpacing: 1.5, color: M.mut, fontWeight: 700 }}>HEUTE GEPLANT</div>
              {todayCard}
            </div>
            <div>
              <div style={{ fontSize: 13, letterSpacing: 1.5, color: M.mut, fontWeight: 700 }}>SCHNELLZUGRIFF</div>
              {timerLink}
              {calculatorLink}
              {bodyTrackerLink}
            </div>
          </div>
          {activeWorkoutCard}
          {statsBlock}
        </>
      ) : (
        <>
          {weekStrip}
          {weekPlannerCard}
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
        </>
      )}
      <WorkoutFinishSheet
        open={finishSheet && !!activeWorkout && !!activeMetrics}
        name={activeWorkout?.session.name ?? ""}
        durationSec={durationSec}
        doneSets={activeMetrics?.doneSets ?? 0}
        totalSets={activeMetrics?.totalSets ?? 0}
        volumeKg={activeMetrics?.volumeKg ?? 0}
        busy={saving}
        exercises={activeWorkout?.session.exercises.map((e) => e.name) ?? []}
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
    </div>
  );
}
