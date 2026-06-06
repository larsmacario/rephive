import { useEffect, useState } from "react";
import { normalizeWorkout, startCustomSession, startPlanDaySession } from "./data";
import type { Workout } from "./lib/engine";
import {
  type ActiveWorkoutDraft,
  type ActiveWorkoutSnapshot,
  clearActiveWorkout,
  getActiveDurationSec,
  getDraftMetrics,
  loadActiveWorkout,
  saveActiveWorkout,
  snapshotToDraft,
} from "./lib/activeWorkout";
import { advancePlan, fetchPlanDayForTracking, saveSession, type SaveSessionInput } from "./lib/db";
import type { ExerciseMetric } from "./lib/exerciseCatalog";
import type { TrainingBlockType } from "./lib/planBlocks";
import { useAuth } from "./lib/auth";
import { useBreakpoint } from "./lib/responsive";
import { PhoneShell } from "./components/PhoneShell";
import { FloatNav, floatNavContentInset, type Tab } from "./components/FloatNav";
import { ConfirmSheet } from "./components/ConfirmSheet";
import { TimerLeaveSheet } from "./components/TimerLeaveSheet";
import { HomeScreen } from "./screens/HomeScreen";
import { PlansScreen } from "./screens/PlansScreen";
import { ExercisesScreen } from "./screens/ExercisesScreen";
import { TimerScreen } from "./screens/TimerScreen";
import { HistoryScreen } from "./screens/HistoryScreen";
import { TrackScreen } from "./screens/TrackScreen";
import { PlanBuilderScreen } from "./screens/PlanBuilderScreen";
import { PlanDetailScreen } from "./screens/PlanDetailScreen";
import { SessionDetailScreen } from "./screens/SessionDetailScreen";
import { SessionEditScreen } from "./screens/SessionEditScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { ProfileScreen } from "./screens/ProfileScreen";
import { StatsScreen } from "./screens/StatsScreen";
import { CalculatorScreen } from "./screens/CalculatorScreen";
import { BodyTrackerScreen } from "./screens/BodyTrackerScreen";
import { AboutScreen } from "./screens/AboutScreen";
import { SupportScreen } from "./screens/SupportScreen";
import { ActiveTimerProvider, useActiveTimer } from "./lib/activeTimer";
import { usePreferences } from "./lib/preferences";
import { OnboardingWizard } from "./screens/OnboardingWizard";
import { AITrainingPlanWizard } from "./screens/AITrainingPlanWizard";
type Route =
  | { kind: "tracking"; session: Workout; planDayId?: string; startedAt: number; tags: string[]; planId?: string }
  | { kind: "planBuilder"; planId?: string }
  | { kind: "exercises" }
  | { kind: "sessionDetail"; sessionId: string }
  | { kind: "sessionEdit"; sessionId: string }
  | { kind: "planDetail"; planId: string }
  | { kind: "settings" }
  | { kind: "profile" }
  | { kind: "stats" }
  | { kind: "calculator" }
  | { kind: "bodyTracker" }
  | { kind: "about" }
  | { kind: "support" }
  | { kind: "aiTrainingPlanWizard" }
  | null;

type FinishPayload = {
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
    metric?: ExerciseMetric;
    sets: { reps: number; kg: number; done: boolean }[];
  }[];
};

function buildPayloadFromDraft(draft: ActiveWorkoutDraft): FinishPayload {
  const { doneSets, volumeKg } = getDraftMetrics(draft);
  const isCustom = !draft.planDayId;
  return {
    name: draft.session.name,
    tags: isCustom ? ["Individuell"] : draft.tags,
    durationMin: Math.max(1, Math.round(getActiveDurationSec(draft.startedAt) / 60)),
    volumeKg,
    setCount: doneSets,
    planDayId: draft.planDayId,
    planId: draft.planId,
    exercises: draft.session.exercises.map((e) => ({
      name: e.name,
      note: e.note,
      blockType: e.blockType,
      supersetId: e.supersetId,
      metric: e.metric,
      sets: e.sets,
    })),
    skippedBlocks: draft.skippedBlocks ?? draft.session.skippedBlocks,
  };
}

export function PhoneApp() {
  return (
    <ActiveTimerProvider>
      <PhoneAppInner />
    </ActiveTimerProvider>
  );
}

function PhoneAppInner() {
  const { user, profileReady } = useAuth();
  const { preferences } = usePreferences();
  const { active: timerActive } = useActiveTimer();
  const breakpoint = useBreakpoint();
  const navPlacement = breakpoint === "desktop" ? "left" : "bottom";
  const [tab, setTab] = useState<Tab>("home");
  const [route, setRoute] = useState<Route>(null);
  const [pendingTab, setPendingTab] = useState<Tab | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [trackLoading, setTrackLoading] = useState(false);
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkoutDraft | null>(null);
  const [replaceDraftAction, setReplaceDraftAction] = useState<(() => void) | null>(null);

  useEffect(() => {
    if (!user) {
      setActiveWorkout(null);
      return;
    }
    setActiveWorkout(loadActiveWorkout(user.id));
  }, [user?.id]);

  const persistDraft = (draft: ActiveWorkoutDraft | null) => {
    if (!user) return;
    if (draft) {
      saveActiveWorkout(user.id, draft);
      setActiveWorkout(draft);
    } else {
      clearActiveWorkout(user.id);
      setActiveWorkout(null);
    }
  };

  const runWithReplaceDraftConfirm = (action: () => void) => {
    if (!activeWorkout) {
      action();
      return;
    }
    setReplaceDraftAction(() => action);
  };

  const handleReplaceDraftConfirm = () => {
    persistDraft(null);
    const action = replaceDraftAction;
    setReplaceDraftAction(null);
    action?.();
  };

  const goTrackPlanDay = async (planDayId: string, planId?: string) => {
    runWithReplaceDraftConfirm(() => {
      void (async () => {
        setTrackLoading(true);
        try {
          const day = await fetchPlanDayForTracking(planDayId);
          if (!day) return;
          setRoute({
            kind: "tracking",
            session: startPlanDaySession(day),
            planDayId: day.id,
            startedAt: Date.now(),
            tags: ["Plan"],
            planId: planId ?? day.planId,
          });
        } finally {
          setTrackLoading(false);
        }
      })();
    });
  };

  const goCustomTrack = () => {
    runWithReplaceDraftConfirm(() => {
      setRoute({
        kind: "tracking",
        session: startCustomSession(),
        startedAt: Date.now(),
        tags: [],
      });
    });
  };

  const resumeActiveWorkout = () => {
    if (!activeWorkout) return;
    setRoute({
      kind: "tracking",
      session: normalizeWorkout(
        JSON.parse(JSON.stringify(activeWorkout.session)) as Workout,
      ),
      planDayId: activeWorkout.planDayId,
      startedAt: activeWorkout.startedAt,
      tags: activeWorkout.tags,
      planId: activeWorkout.planId,
    });
  };

  const goPlanBuild = (planId?: string) => setRoute({ kind: "planBuilder", planId });
  const goExercises = () => setRoute({ kind: "exercises" });
  const goSessionDetail = (sessionId: string) => setRoute({ kind: "sessionDetail", sessionId });
  const goSessionEdit = (sessionId: string) => setRoute({ kind: "sessionEdit", sessionId });
  const goPlanDetail = (planId: string) => setRoute({ kind: "planDetail", planId });
  const goSettings = () => setRoute({ kind: "settings" });
  const goProfile = () => setRoute({ kind: "profile" });
  const goStats = () => setRoute({ kind: "stats" });
  const goCalculator = () => setRoute({ kind: "calculator" });
  const goBodyTracker = () => {
    console.log("goBodyTracker triggered, setting route to bodyTracker");
    setRoute({ kind: "bodyTracker" });
  };
  const goAbout = () => setRoute({ kind: "about" });
  const goSupport = () => setRoute({ kind: "support" });
  const goAITrainingPlanWizard = () => setRoute({ kind: "aiTrainingPlanWizard" });
  const close = (toTab?: Tab) => {
    setRoute(null);
    if (toTab) setTab(toTab);
  };

  const handleSaveWorkout = async (payload: FinishPayload) => {
    if (!user) return;
    await saveSession(user.id, {
      planDayId: payload.planDayId,
      name: payload.name,
      tags: payload.tags,
      durationMin: payload.durationMin,
      volumeKg: payload.volumeKg,
      setCount: payload.setCount,
      skippedBlocks: payload.skippedBlocks,
      exercises: payload.exercises,
    });
    if (payload.planId) {
      await advancePlan(payload.planId);
    }
    persistDraft(null);
    setRefreshKey((k) => k + 1);
    close("history");
  };

  const handleSaveTimerSession = async (input: SaveSessionInput) => {
    if (!user) return;
    await saveSession(user.id, input);
    setRefreshKey((k) => k + 1);
  };

  const handleDiscardWorkout = () => {
    persistDraft(null);
    close("home");
  };

  const handlePauseFromTrack = (snapshot: ActiveWorkoutSnapshot) => {
    if (!user) return;
    const draft = snapshotToDraft(snapshot);
    persistDraft(draft);
    close("home");
  };

  const handleSaveFromDraft = async (draft: ActiveWorkoutDraft) => {
    await handleSaveWorkout(buildPayloadFromDraft(draft));
  };

  const handleAdvancePlan = async (planId: string) => {
    await advancePlan(planId);
    setRefreshKey((k) => k + 1);
  };

  const handleTab = (t: Tab) => {
    if (t === "ai-plan") {
      goAITrainingPlanWizard();
      return;
    }
    if (timerActive && tab === "timer" && t !== "timer") {
      setPendingTab(t);
      return;
    }
    setRoute(null);
    setTab(t);
  };

  const confirmLeaveTimer = () => {
    if (!pendingTab) return;
    setRoute(null);
    setTab(pendingTab);
    setPendingTab(null);
  };

  let body: React.ReactNode;
  let showNav = true;
  if (route?.kind === "tracking") {
    body = (
      <TrackScreen
        session={route.session}
        startedAt={route.startedAt}
        planDayId={route.planDayId}
        tags={route.tags}
        planId={route.planId}
        onPause={handlePauseFromTrack}
        onDiscard={handleDiscardWorkout}
        onSaveTimerSession={handleSaveTimerSession}
        onFinish={handleSaveWorkout}
      />
    );
    showNav = false;
  } else if (route?.kind === "exercises") {
    body = (
      <ExercisesScreen
        refreshKey={refreshKey}
        onBack={() => close("home")}
      />
    );
    showNav = false;
  } else if (route?.kind === "planBuilder") {
    body = (
      <PlanBuilderScreen
        planId={route.planId}
        onBack={() => close("plans")}
        onSave={() => {
          setRefreshKey((k) => k + 1);
          close("plans");
        }}
      />
    );
    showNav = false;
  } else if (route?.kind === "planDetail") {
    body = (
      <PlanDetailScreen
        planId={route.planId}
        onBack={() => close("plans")}
        onEdit={goPlanBuild}
        onDeleted={() => {
          setRefreshKey((k) => k + 1);
          close("plans");
        }}
      />
    );
    showNav = false;
  } else if (route?.kind === "sessionDetail") {
    body = (
      <SessionDetailScreen
        sessionId={route.sessionId}
        trackLoading={trackLoading}
        onBack={() => close("history")}
        onEdit={goSessionEdit}
        onDeleted={() => {
          setRefreshKey((k) => k + 1);
          close("history");
        }}
      />
    );
    showNav = false;
  } else if (route?.kind === "sessionEdit") {
    body = (
      <SessionEditScreen
        sessionId={route.sessionId}
        onBack={() => goSessionDetail(route.sessionId)}
        onSave={() => {
          setRefreshKey((k) => k + 1);
          goSessionDetail(route.sessionId);
        }}
      />
    );
    showNav = false;
  } else if (route?.kind === "settings") {
    body = <SettingsScreen onBack={() => close("home")} />;
    showNav = false;
  } else if (route?.kind === "profile") {
    body = <ProfileScreen onBack={() => close("home")} />;
    showNav = false;
  } else if (route?.kind === "stats") {
    body = <StatsScreen onBack={() => close()} refreshKey={refreshKey} />;
    showNav = false;
  } else if (route?.kind === "calculator") {
    body = <CalculatorScreen onBack={() => close("home")} />;
    showNav = false;
  } else if (route?.kind === "bodyTracker") {
    body = <BodyTrackerScreen onBack={() => close("home")} />;
    showNav = false;
  } else if (route?.kind === "about") {
    body = <AboutScreen onBack={() => close("home")} />;
    showNav = false;
  } else if (route?.kind === "support") {
    body = <SupportScreen onBack={() => close("home")} />;
    showNav = false;
  } else if (route?.kind === "aiTrainingPlanWizard") {
    body = (
      <AITrainingPlanWizard
        onBack={() => close("home")}
        onPlanGenerated={(planId) => {
          setRefreshKey((k) => k + 1);
          goPlanDetail(planId);
        }}
      />
    );
    showNav = false;
  } else if (tab === "home") {
    body = (
      <HomeScreen
        refreshKey={refreshKey}
        activeWorkout={activeWorkout}
        onStart={goTrackPlanDay}
        onStartCustom={goCustomTrack}
        onResumeActive={resumeActiveWorkout}
        onSaveActive={handleSaveFromDraft}
        onDiscardActive={handleDiscardWorkout}
        onOpenPlans={() => setTab("plans")}
        onAdvancePlan={handleAdvancePlan}
        onOpenTimer={() => setTab("timer")}
        onOpenSettings={goSettings}
        onOpenProfile={goProfile}
        onOpenStats={goStats}
        onOpenCalculator={goCalculator}
        onOpenBodyTracker={goBodyTracker}
        onOpenAbout={goAbout}
        onOpenSupport={goSupport}
        onOpenAITrainingPlan={goAITrainingPlanWizard}
        onOpenExercises={goExercises}
        trackLoading={trackLoading}
      />
    );
  } else if (tab === "plans") {
    body = (
      <PlansScreen
        refreshKey={refreshKey}
        onOpenBuilder={() => goPlanBuild()}
        onOpenPlan={goPlanDetail}
      />
    );
  } else if (tab === "timer") {
    body = <TimerScreen onSaveSession={handleSaveTimerSession} />;
  } else {
    body = (
      <HistoryScreen refreshKey={refreshKey} onOpenSession={goSessionDetail} onOpenStats={goStats} />
    );
  }
  if (!profileReady) {
    return null;
  }

  if (!preferences.onboarded) {
    return (
      <PhoneShell reserveBottomSafeArea={false}>
        <OnboardingWizard />
      </PhoneShell>
    );
  }

  return (
    <PhoneShell reserveBottomSafeArea={!(showNav && navPlacement === "bottom")}>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          position: "relative",
          ...(showNav
            ? navPlacement === "bottom"
              ? { paddingBottom: floatNavContentInset("bottom") }
              : { paddingLeft: floatNavContentInset("left") }
            : {}),
        }}
      >
        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>{body}</div>
      </div>
      {showNav && (
        <FloatNav tab={tab} onTab={handleTab} timerActive={timerActive} placement={navPlacement} />
      )}
      <TimerLeaveSheet
        open={!!pendingTab}
        onConfirm={confirmLeaveTimer}
        onCancel={() => setPendingTab(null)}
      />
      <ConfirmSheet
        open={!!replaceDraftAction}
        title="Entwurf verwerfen?"
        message="Es läuft bereits ein pausiertes Workout. Wenn du fortfährst, wird der Entwurf verworfen."
        confirmLabel="FORTFAHREN"
        icon="flag"
        onConfirm={handleReplaceDraftConfirm}
        onCancel={() => setReplaceDraftAction(null)}
      />
    </PhoneShell>
  );
}
