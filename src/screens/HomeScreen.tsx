import { useEffect, useMemo, useState } from "react";
import { M } from "../theme";
import type { LibraryPlan, PlanDay } from "../data";
import { useAuth } from "../lib/auth";
import {
  type ActiveWorkoutDraft,
  getActiveDurationSec,
  getDraftMetrics,
} from "../lib/activeWorkout";
import { fmtUp } from "../lib/engine";
import { useActivePlan, useHomeStats, useWeeklyVolume, useBodyMeasurements } from "../lib/db";
import { useBreakpoint } from "../lib/responsive";
import { Icon } from "../components/Icon";
import { WorkoutFinishSheet } from "../components/WorkoutFinishSheet";
import { ConfirmSheet } from "../components/ConfirmSheet";
import { MStat, MTag } from "../components/widgets";

export interface HomeScreenProps {
  onStart: (id: string, planId?: string) => void;
  onStartCustom: () => void;
  activeWorkout?: ActiveWorkoutDraft | null;
  onResumeActive: () => void;
  onSaveActive: (draft: ActiveWorkoutDraft) => void | Promise<void>;
  onDiscardActive: () => void;
  onOpenPlans: () => void;
  onAdvancePlan: (planId: string) => Promise<void>;
  onOpenTimer: () => void;
  onOpenSettings: () => void;
  onOpenProfile: () => void;
  onOpenStats: () => void;
  onOpenCalculator: () => void;
  onOpenBodyTracker: () => void;
  refreshKey?: number;
  trackLoading?: boolean;
}

function getCurrentDay(plan: LibraryPlan): PlanDay | null {
  if (plan.days.length === 0) return null;
  const index = plan.currentDay % plan.days.length;
  return plan.days[index] ?? null;
}

function getUpcomingDays(plan: LibraryPlan, count: number): { day: PlanDay; dayNumber: number }[] {
  if (plan.days.length === 0) return [];
  const result: { day: PlanDay; dayNumber: number }[] = [];
  for (let i = 1; i <= count; i++) {
    const index = (plan.currentDay + i) % plan.days.length;
    const day = plan.days[index];
    if (day) result.push({ day, dayNumber: index + 1 });
  }
  return result;
}

export function HomeScreen({
  onStart,
  onStartCustom,
  activeWorkout,
  onResumeActive,
  onSaveActive,
  onDiscardActive,
  onOpenPlans,
  onAdvancePlan,
  onOpenTimer,
  onOpenSettings,
  onOpenProfile,
  onOpenStats,
  onOpenCalculator,
  onOpenBodyTracker,
  refreshKey = 0,
  trackLoading,
}: HomeScreenProps) {
  const { profile, signOut } = useAuth();
  const breakpoint = useBreakpoint();
  const isDesktop = breakpoint === "desktop";
  const { data: activePlan, loading: planLoading, reload: reloadPlan } = useActivePlan();
  const { data: week, reload: reloadWeek } = useWeeklyVolume();
  const { data: stats, reload: reloadStats } = useHomeStats();
  const { data: measurements, reload: reloadMeasurements } = useBodyMeasurements(refreshKey);
  const [menuOpen, setMenuOpen] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [finishSheet, setFinishSheet] = useState(false);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [durationSec, setDurationSec] = useState(0);

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

  const latestMeasurement = useMemo(() => {
    if (!measurements || measurements.length === 0) return null;
    return measurements[0];
  }, [measurements]);

  const displayName = profile?.display_name ?? "Athlet";
  const initial = displayName.charAt(0).toUpperCase();
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
  const currentDay = activePlan ? getCurrentDay(activePlan) : null;
  const upcomingDays = activePlan ? getUpcomingDays(activePlan, 3) : [];

  const handleRestDay = async () => {
    if (!activePlan) return;
    setAdvancing(true);
    try {
      await onAdvancePlan(activePlan.id);
    } finally {
      setAdvancing(false);
    }
  };

  const handleSkipWorkout = () => {
    if (!activePlan) return;
    setShowSkipConfirm(true);
  };

  const handleSkipWorkoutConfirm = async () => {
    if (!activePlan) return;
    setShowSkipConfirm(false);
    setAdvancing(true);
    try {
      await onAdvancePlan(activePlan.id);
    } finally {
      setAdvancing(false);
    }
  };

  const handleSaveActive = async () => {
    if (!activeWorkout) return;
    setSaving(true);
    try {
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
          borderRadius: 20,
          padding: "18px 18px 16px",
          position: "relative",
          overflow: "hidden",
          background:
            "linear-gradient(160deg, color-mix(in oklab, var(--mom-acc, oklch(0.87 0.21 143)) 24%, #151915), #121512)",
          border: "1px solid " + M.line,
        }}
      >
        <div style={{ fontSize: 11, letterSpacing: 1.4, color: M.acc, fontWeight: 700 }}>
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
            fontSize: 12.5,
            color: M.mut,
            fontWeight: 600,
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Icon name="dumbbell" size={15} stroke={2} color={M.mut} />
            {activeMetrics.doneSets}/{activeMetrics.totalSets} Sätze
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Icon name="bolt" size={15} stroke={2} color={M.mut} />
            {(activeMetrics.volumeKg / 1000).toFixed(1)}t
          </span>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button
            onClick={onResumeActive}
            style={{
              flex: 1,
              padding: "14px 0",
              borderRadius: 14,
              border: "none",
              background: M.acc,
              color: M.accInk,
              fontFamily: M.disp,
              fontWeight: 700,
              fontSize: 17,
              letterSpacing: 0.8,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <Icon name="play" size={18} color={M.accInk} /> FORTSETZEN
          </button>
          <button
            onClick={() => setFinishSheet(true)}
            style={{
              flex: 1,
              padding: "14px 0",
              borderRadius: 14,
              border: "1px solid " + M.line,
              background: M.panel,
              color: M.fg,
              fontFamily: M.disp,
              fontWeight: 700,
              fontSize: 17,
              letterSpacing: 0.8,
              cursor: "pointer",
            }}
          >
            BEENDEN
          </button>
        </div>
      </div>
    ) : null;

  const todayCard = planLoading ? (
    <div style={{ marginTop: 14, color: M.mut, fontSize: 14 }}>Plan wird geladen…</div>
  ) : !activePlan || !currentDay ? (
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
        Erstelle einen Trainingsplan und ordne deine Workouts den Tagen zu.
      </div>
      <button
        onClick={onOpenPlans}
        style={{
          width: "100%",
          marginTop: 16,
          padding: "14px 0",
          borderRadius: 14,
          border: "none",
          background: M.acc,
          color: M.accInk,
          fontFamily: M.disp,
          fontWeight: 700,
          fontSize: 19,
          letterSpacing: 1,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        <Icon name="layers" size={20} color={M.accInk} /> PLAN ERSTELLEN
      </button>
    </div>
  ) : currentDay.isRestDay ? (
    <div
      style={{
        marginTop: 14,
        borderRadius: 20,
        padding: "18px 18px 16px",
        position: "relative",
        overflow: "hidden",
        background: M.card,
        border: "1px solid " + M.line,
      }}
    >
      <div style={{ fontSize: 11, letterSpacing: 1.4, color: M.mut, fontWeight: 700 }}>
        {activePlan.name.toUpperCase()} · TAG {activePlan.currentDay + 1}
      </div>
      <div style={{ fontFamily: M.disp, fontWeight: 700, fontSize: 28, lineHeight: 1, marginTop: 8 }}>Ruhetag</div>
      <div style={{ color: M.mut, fontSize: 14, marginTop: 10 }}>Heute ist Erholung angesagt. Gönn dir die Pause.</div>
      <button
        disabled={advancing}
        onClick={handleRestDay}
        style={{
          width: "100%",
          marginTop: 16,
          padding: "14px 0",
          borderRadius: 14,
          border: "1px solid " + M.line,
          background: M.panel,
          color: M.fg,
          fontFamily: M.disp,
          fontWeight: 700,
          fontSize: 17,
          letterSpacing: 0.8,
          cursor: advancing ? "wait" : "pointer",
          opacity: advancing ? 0.7 : 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        <Icon name="check" size={20} color={M.fg} /> RUHETAG ABHAKEN
      </button>
    </div>
  ) : (
    <div
      style={{
        marginTop: 14,
        borderRadius: 20,
        padding: "18px 18px 16px",
        position: "relative",
        overflow: "hidden",
        background:
          "linear-gradient(160deg, color-mix(in oklab, var(--mom-acc, oklch(0.87 0.21 143)) 20%, #151915), #121512)",
        border: "1px solid " + M.line,
      }}
    >
      <div style={{ fontSize: 11, letterSpacing: 1.4, color: M.mut, fontWeight: 700 }}>
        {activePlan.name.toUpperCase()} · TAG {activePlan.currentDay + 1}
      </div>
      <div style={{ fontFamily: M.disp, fontWeight: 700, fontSize: 28, lineHeight: 1, marginTop: 8 }}>
        {currentDay.workout?.name ?? "Workout"}
      </div>
      {currentDay.workout && (
        <>
          <div style={{ display: "flex", gap: 7, marginTop: 12, flexWrap: "wrap" }}>
            {currentDay.workout.tags.map((t) => (
              <MTag key={t}>{t}</MTag>
            ))}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              marginTop: 14,
              fontSize: 12.5,
              color: M.mut,
              fontWeight: 600,
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Icon name="dumbbell" size={15} stroke={2} color={M.mut} />
              {currentDay.workout.exerciseCount} Übungen
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Icon name="clock" size={15} stroke={2} color={M.mut} />~{currentDay.workout.dur} Min
            </span>
          </div>
        </>
      )}
      <button
        disabled={trackLoading || !currentDay.workout}
        onClick={() => currentDay.workout && onStart(currentDay.workout.id, activePlan.id)}
        style={{
          width: "100%",
          marginTop: 16,
          padding: "14px 0",
          borderRadius: 14,
          border: "none",
          background: M.acc,
          color: M.accInk,
          fontFamily: M.disp,
          fontWeight: 700,
          fontSize: 19,
          letterSpacing: 1,
          cursor: trackLoading ? "wait" : "pointer",
          opacity: trackLoading ? 0.7 : 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        <Icon name="play" size={20} color={M.accInk} /> WORKOUT STARTEN
      </button>
      <button
        disabled={advancing}
        onClick={handleSkipWorkout}
        style={{
          width: "100%",
          marginTop: 10,
          padding: "12px 0",
          borderRadius: 14,
          border: "1px solid " + M.line,
          background: "transparent",
          color: M.mut,
          fontFamily: M.disp,
          fontWeight: 700,
          fontSize: 16,
          letterSpacing: 0.8,
          cursor: advancing ? "wait" : "pointer",
          opacity: advancing ? 0.7 : 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        <Icon name="skipFwd" size={18} color={M.mut} /> WORKOUT ÜBERSPRINGEN
      </button>
    </div>
  );

  const planPreview =
    activePlan && upcomingDays.length > 0 ? (
      <div
        style={{
          marginTop: 14,
          background: M.card,
          border: "1px solid " + M.line2,
          borderRadius: 18,
          padding: "15px 16px 12px",
        }}
      >
        <div style={{ fontSize: 11, letterSpacing: 1.4, color: M.mut, fontWeight: 700, marginBottom: 10 }}>
          ALS NÄCHSTES IM PLAN
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {upcomingDays.map(({ day, dayNumber }) => (
            <div
              key={`${day.id}-${dayNumber}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 10px",
                borderRadius: 10,
                background: M.panel,
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              <span style={{ color: M.mut2, minWidth: 42 }}>Tag {dayNumber}</span>
              <span style={{ color: M.fg, flex: 1 }}>{day.isRestDay ? "Ruhetag" : day.workout?.name ?? "Workout"}</span>
              <Icon name={day.isRestDay ? "pause" : "dumbbell"} size={16} stroke={2} color={M.mut2} />
            </div>
          ))}
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
        <span style={{ fontSize: 11, letterSpacing: 1.4, color: M.mut, fontWeight: 700 }}>VOLUMEN / WOCHE</span>
        <span style={{ fontFamily: M.disp, fontWeight: 700, fontSize: 16, color: M.acc }}>
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
                  background: w.v ? M.acc : "rgba(255,255,255,.08)",
                  opacity: w.v ? (i === weekData.length - 1 ? 1 : 0.55) : 1,
                }}
              />
            </div>
            <span style={{ fontSize: 10, color: M.mut2, fontWeight: 700 }}>{w.d}</span>
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
        <span style={{ fontSize: 11, letterSpacing: 1.5, color: M.mut, fontWeight: 700 }}>STATISTIK</span>
        <button
          type="button"
          onClick={onOpenStats}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: M.acc,
            fontSize: 12,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: 0,
          }}
        >
          Alle anzeigen
          <Icon name="chevR" size={14} color={M.acc} stroke={2.2} />
        </button>
      </div>
      {statsRow}
      {volumeChart}
    </div>
  );

  const customTrainingLink = (
    <button
      onClick={onStartCustom}
      style={{
        width: "100%",
        marginTop: 14,
        padding: "15px 16px",
        borderRadius: 16,
        border: "1px solid " + M.line,
        background: M.card,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 13,
        textAlign: "left",
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: M.accSoft,
          color: M.acc,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flex: "0 0 auto",
        }}
      >
        <Icon name="flame" size={20} stroke={2} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ color: M.fg, fontWeight: 600, fontSize: 15 }}>Individuelles Training</div>
        <div style={{ color: M.mut, fontSize: 12, marginTop: 1 }}>Frei trainieren · ohne Plan</div>
      </div>
      <Icon name="chevR" size={18} color={M.mut2} stroke={2.2} />
    </button>
  );

  const timerLink = (
    <button
      onClick={onOpenTimer}
      style={{
        width: "100%",
        marginTop: 14,
        padding: "15px 16px",
        borderRadius: 16,
        border: "1px solid " + M.line,
        background: M.card,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 13,
        textAlign: "left",
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: M.accSoft,
          color: M.acc,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flex: "0 0 auto",
        }}
      >
        <Icon name="timer" size={20} stroke={2} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ color: M.fg, fontWeight: 600, fontSize: 15 }}>Interval-Timer</div>
        <div style={{ color: M.mut, fontSize: 12, marginTop: 1 }}>EMOM · AMRAP · TABATA · For Time</div>
      </div>
      <Icon name="chevR" size={18} color={M.mut2} stroke={2.2} />
    </button>
  );

  const calculatorLink = (
    <button
      onClick={onOpenCalculator}
      style={{
        width: "100%",
        marginTop: 14,
        padding: "15px 16px",
        borderRadius: 16,
        border: "1px solid " + M.line,
        background: M.card,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 13,
        textAlign: "left",
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: M.accSoft,
          color: M.acc,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flex: "0 0 auto",
        }}
      >
        <Icon name="calculator" size={20} stroke={2} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ color: M.fg, fontWeight: 600, fontSize: 15 }}>1RM-Rechner</div>
        <div style={{ color: M.mut, fontSize: 12, marginTop: 1 }}>One Rep Max kalkulieren</div>
      </div>
      <Icon name="chevR" size={18} color={M.mut2} stroke={2.2} />
    </button>
  );

  const bodyTrackerLink = (
    <button
      onClick={() => {
        console.log("Körperwerte button clicked");
        onOpenBodyTracker();
      }}
      style={{
        width: "100%",
        marginTop: 14,
        padding: "15px 16px",
        borderRadius: 16,
        border: "1px solid " + M.line,
        background: M.card,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 13,
        textAlign: "left",
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: M.accSoft,
          color: M.acc,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flex: "0 0 auto",
        }}
      >
        <Icon name="scale" size={20} stroke={2} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ color: M.fg, fontWeight: 600, fontSize: 15 }}>Körperwerte</div>
        <div style={{ color: M.mut, fontSize: 12, marginTop: 1 }}>
          {latestMeasurement
            ? `${latestMeasurement.weightKg} kg ${latestMeasurement.bodyFatPct ? `· ${latestMeasurement.bodyFatPct}% KFA` : ""}`
            : "Gewicht & Fettanteil tracken"}
        </div>
      </div>
      <Icon name="chevR" size={18} color={M.mut2} stroke={2.2} />
    </button>
  );

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "4px 22px 18px", position: "relative" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative" }}>
        <div>
          <div style={{ fontSize: 13, color: M.mut, fontWeight: 600 }}>{todayLabel}</div>
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
        <button
          onClick={() => setMenuOpen((o) => !o)}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            background: M.card,
            border: "1px solid " + M.line,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: M.disp,
            fontWeight: 700,
            color: M.acc,
            fontSize: 18,
            cursor: "pointer",
          }}
        >
          {initial}
        </button>
        {menuOpen && (
          <div
            style={{
              position: "absolute",
              top: 52,
              right: 0,
              background: M.panel,
              border: "1px solid " + M.line,
              borderRadius: 12,
              padding: 8,
              zIndex: 10,
              minWidth: 140,
            }}
          >
            <button
              onClick={() => {
                setMenuOpen(false);
                onOpenStats();
              }}
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "none",
                borderRadius: 8,
                background: "transparent",
                color: M.fg,
                fontFamily: M.body,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              Statistik
            </button>
            <button
              onClick={() => {
                setMenuOpen(false);
                onOpenProfile();
              }}
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "none",
                borderRadius: 8,
                background: "transparent",
                color: M.fg,
                fontFamily: M.body,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              Profil
            </button>
            <button
              onClick={() => {
                setMenuOpen(false);
                onOpenSettings();
              }}
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "none",
                borderRadius: 8,
                background: "transparent",
                color: M.fg,
                fontFamily: M.body,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              Einstellungen
            </button>
            <button
              onClick={() => signOut()}
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "none",
                borderRadius: 8,
                background: "transparent",
                color: M.fg,
                fontFamily: M.body,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              Abmelden
            </button>
          </div>
        )}
      </div>

      {isDesktop ? (
        <>
          {activeWorkoutCard}
          {statsBlock}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16, alignItems: "start" }}>
            <div>
              <div style={{ fontSize: 11, letterSpacing: 1.5, color: M.mut, fontWeight: 700 }}>HEUTE GEPLANT</div>
              {todayCard}
              {planPreview}
            </div>
            <div>
              <div style={{ fontSize: 11, letterSpacing: 1.5, color: M.mut, fontWeight: 700 }}>SCHNELLZUGRIFF</div>
              {customTrainingLink}
              {timerLink}
              {calculatorLink}
              {bodyTrackerLink}
            </div>
          </div>
        </>
      ) : (
        <>
          {activeWorkoutCard}
          {statsBlock}
          <div
            style={{
              marginTop: 16,
              fontSize: 11,
              letterSpacing: 1.5,
              color: M.mut,
              fontWeight: 700,
            }}
          >
            HEUTE GEPLANT
          </div>
          {todayCard}
          {planPreview}
          {customTrainingLink}
          {timerLink}
          {calculatorLink}
          {bodyTrackerLink}
        </>
      )}
      {finishSheet && activeWorkout && activeMetrics && (
        <WorkoutFinishSheet
          name={activeWorkout.session.name}
          durationSec={durationSec}
          doneSets={activeMetrics.doneSets}
          totalSets={activeMetrics.totalSets}
          volumeKg={activeMetrics.volumeKg}
          busy={saving}
          onSave={handleSaveActive}
          onDiscard={handleDiscardActive}
          onClose={() => setFinishSheet(false)}
        />
      )}
      {showSkipConfirm && (
        <ConfirmSheet
          title="Workout überspringen?"
          message={`Möchtest du das geplante Workout "${currentDay?.workout?.name ?? "Workout"}" wirklich überspringen? Der Plan springt damit zum nächsten Tag.`}
          confirmLabel="WORKOUT ÜBERSPRINGEN"
          icon="skipFwd"
          onConfirm={handleSkipWorkoutConfirm}
          onCancel={() => setShowSkipConfirm(false)}
        />
      )}
    </div>
  );
}
