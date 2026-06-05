import { useEffect, useState } from "react";
import { M } from "../theme";
import { useAuth } from "../lib/auth";
import { deletePlan, setActivePlan, usePlan, useWorkouts } from "../lib/db";
import { Icon } from "../components/Icon";
import { DeleteConfirmDialog } from "../components/DeleteConfirmDialog";
import { PlanAdviceCollapsible } from "../components/PlanAdviceCollapsible";
import { HorizontalSlidePager } from "../components/HorizontalSlidePager";
import { PlanDaySlide } from "../components/PlanDaySlide";
import { OneRmPercentInfoCard } from "../components/OneRmPercentInfoCard";
import { MStat, MTag } from "../components/widgets";
import { MButton } from "../components/MButton";

export interface PlanDetailScreenProps {
  planId: string;
  onBack: () => void;
  onEdit: (planId: string) => void;
  onDeleted: () => void;
}

export function PlanDetailScreen({ planId, onBack, onEdit, onDeleted }: PlanDetailScreenProps) {
  const { user } = useAuth();
  const { data: plan, loading, error, reload } = usePlan(planId);
  const { data: workouts } = useWorkouts();
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  const workoutList = workouts ?? [];

  useEffect(() => {
    if (!plan) return;
    setActiveSlideIndex(0);
  }, [plan?.id]);

  const handleActivate = async () => {
    if (!user || !plan) return;
    setBusy(true);
    setActionError(null);
    try {
      await setActivePlan(user.id, plan.id);
      reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Aktivieren fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!plan) return;
    setBusy(true);
    setActionError(null);
    try {
      await deletePlan(plan.id);
      setDeleteConfirmOpen(false);
      onDeleted();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Löschen fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: M.mut, fontSize: 14 }}>
        Plan wird geladen…
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 22 }}>
        <div style={{ color: M.mut, fontSize: 14 }}>{error ?? "Plan nicht gefunden."}</div>
        <MButton onClick={onBack} variant="primary" size="sm">
          Zurück
        </MButton>
      </div>
    );
  }

  const workoutDays = plan.days.filter((d) => !d.isRestDay).length;
  const restDays = plan.days.filter((d) => d.isRestDay).length;
  const isAiPlan =
    plan.name.toLowerCase().startsWith("ki ") ||
    plan.days.some((d) => d.workout?.tags?.some((t) => t.toLowerCase() === "ki"));

  const slideCount = 1 + plan.days.length;
  const slideLabel = (index: number, _count: number) => {
    if (index === 0) return "Übersicht";
    return `Tag ${index} von ${plan.days.length}`;
  };

  const summarySlide = (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        padding: "0 22px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          overscrollBehavior: "contain",
          paddingBottom: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ fontFamily: M.disp, fontWeight: 700, fontSize: 30, lineHeight: 1.1 }}>{plan.name}</div>
          {plan.isActive && <MTag>Aktiv</MTag>}
        </div>
        {plan.sub && <div style={{ fontSize: 13, color: M.mut, marginTop: 8, fontWeight: 600 }}>{plan.sub}</div>}

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
            <Icon name="layers" size={15} stroke={2} color={M.mut} />
            {plan.days.length} Tage
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Icon name="dumbbell" size={15} stroke={2} color={M.mut} />
            {workoutDays} Workouts
          </span>
          {restDays > 0 && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Icon name="pause" size={15} stroke={2} color={M.mut} />
              {restDays} Ruhe
            </span>
          )}
        </div>

        {plan.isActive && (
          <div
            style={{
              marginTop: 14,
              padding: "10px 14px",
              borderRadius: 12,
              background: M.accSoft,
              color: M.acc,
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            Aktiver Plan · aktuell Tag {plan.currentDay + 1}
          </div>
        )}

        {isAiPlan && <OneRmPercentInfoCard style={{ marginTop: 14 }} />}

        {plan.summary && (
          <div style={{ marginTop: 18 }}>
            <div style={{ fontSize: 11, letterSpacing: 1.5, color: M.mut, fontWeight: 700 }}>DEINE EMPFEHLUNG</div>

            <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
              <MStat
                label="NUTZUNGSDAUER"
                value={`${plan.summary.advice.planDuration.weeksMin}–${plan.summary.advice.planDuration.weeksMax}`}
                sub="Wochen"
              />
              <MStat
                label="KALORIEN"
                value={String(plan.summary.nutrition.targetKcal)}
                sub="kcal / Tag"
              />
            </div>

            <p style={{ margin: "10px 0 0", fontSize: 13, color: M.fg, lineHeight: 1.5, fontWeight: 500 }}>
              {plan.summary.advice.planDuration.note}
            </p>

            <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
              <MStat label="PROTEIN" value={`${plan.summary.nutrition.protein_g}g`} />
              <MStat label="KH" value={`${plan.summary.nutrition.carbs_g}g`} />
              <MStat label="FETT" value={`${plan.summary.nutrition.fat_g}g`} />
              <MStat
                label="TRINKEN"
                value={
                  plan.summary.nutrition.water_ml >= 1000
                    ? `${(plan.summary.nutrition.water_ml / 1000).toFixed(1)}l`
                    : `${plan.summary.nutrition.water_ml}ml`
                }
                sub="pro Tag"
              />
            </div>

            <PlanAdviceCollapsible>
              <div style={{ paddingTop: 14 }}>
                <div style={{ fontSize: 11, color: M.acc, fontWeight: 700, letterSpacing: 1, marginBottom: 4 }}>TRAININGSFOKUS</div>
                <p style={{ margin: 0, fontSize: 13, color: M.fg, lineHeight: 1.5 }}>{plan.summary.advice.trainingFocus}</p>
              </div>
              <div>
                <div style={{ fontSize: 11, color: M.acc, fontWeight: 700, letterSpacing: 1, marginBottom: 4 }}>ERNÄHRUNG</div>
                <p style={{ margin: 0, fontSize: 13, color: M.fg, lineHeight: 1.5 }}>{plan.summary.advice.nutritionTips}</p>
              </div>
              <div>
                <div style={{ fontSize: 11, color: M.acc, fontWeight: 700, letterSpacing: 1, marginBottom: 4 }}>REGENERATION</div>
                <p style={{ margin: 0, fontSize: 13, color: M.fg, lineHeight: 1.5 }}>{plan.summary.advice.recoveryTips}</p>
              </div>
              <div>
                <div style={{ fontSize: 11, color: M.acc, fontWeight: 700, letterSpacing: 1, marginBottom: 4 }}>HYDRATION</div>
                <p style={{ margin: 0, fontSize: 13, color: M.fg, lineHeight: 1.5 }}>{plan.summary.advice.hydrationTips}</p>
              </div>
              <p style={{ margin: 0, fontSize: 11, color: M.mut2, lineHeight: 1.4 }}>
                Richtwerte basierend auf deinen Angaben — kein medizinischer oder ernährungstherapeutischer Rat.
              </p>
            </PlanAdviceCollapsible>
          </div>
        )}
      </div>
    </div>
  );

  const daySlides = plan.days.map((day) => {
    const isCurrent = plan.isActive && day.position === plan.currentDay;
    const workout = day.workout ? workoutList.find((w) => w.id === day.workout?.id) ?? null : null;
    return (
      <div
        key={day.id}
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          padding: "0 22px",
          boxSizing: "border-box",
        }}
      >
        <PlanDaySlide
          dayNumber={day.position + 1}
          label={day.isRestDay ? "Ruhetag" : day.workout?.name ?? "Workout"}
          isRestDay={day.isRestDay}
          isCurrent={isCurrent}
          workout={workout}
          variant="detail"
        />
      </div>
    );
  });

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <div
        style={{
          padding: "2px 22px 12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: M.mut, display: "flex" }}>
          <Icon name="chevL" size={24} stroke={2.2} />
        </button>
        <span style={{ fontSize: 12, letterSpacing: 1.5, color: M.mut, fontWeight: 700 }}>PLAN</span>
        <div style={{ width: 24 }} />
      </div>

      {actionError && <div style={{ padding: "0 22px 8px", color: "#ff8a8a", fontSize: 13 }}>{actionError}</div>}

      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", padding: "0 0 8px" }}>
        <HorizontalSlidePager
          key={plan.id}
          count={slideCount}
          activeIndex={activeSlideIndex}
          onIndexChange={setActiveSlideIndex}
          ariaLabel="Plan-Übersicht und Tage"
          slideLabel={slideLabel}
        >
          {[summarySlide, ...daySlides]}
        </HorizontalSlidePager>
      </div>

      <div
        style={{
          padding: "10px 22px 14px",
          display: "flex",
          flexDirection: "row",
          alignItems: "stretch",
          gap: 8,
          flexWrap: "nowrap",
          borderTop: "1px solid " + M.line2,
        }}
      >
        {plan.isActive ? (
          <MButton
            type="button"
            disabled
            variant="secondary"
            size="sm"
            style={{ flex: 1, minWidth: 0, background: M.accSoft, color: M.fg, opacity: 1 }}
          >
            Aktiv
          </MButton>
        ) : (
          <MButton
            type="button"
            disabled={busy}
            onClick={handleActivate}
            variant="primary"
            size="sm"
            style={{ flex: 1, minWidth: 0 }}
          >
            Aktivieren
          </MButton>
        )}
        <MButton
          type="button"
          disabled={busy}
          onClick={() => onEdit(plan.id)}
          variant="secondary"
          size="sm"
          style={{ flex: 1, minWidth: 0, background: M.card }}
        >
          <Icon name="edit" size={16} stroke={2} color={M.fg} />
          Bearbeiten
        </MButton>
        <MButton
          type="button"
          disabled={busy}
          onClick={() => setDeleteConfirmOpen(true)}
          variant="danger"
          size="icon"
          aria-label="Plan löschen"
          style={{ flexShrink: 0 }}
        >
          <Icon name="trash" size={16} stroke={2} color={M.mut2} />
        </MButton>
      </div>

      {deleteConfirmOpen && plan && (
        <DeleteConfirmDialog
          title="Plan löschen?"
          message={
            <>
              Möchtest du <strong style={{ color: M.fg }}>{plan.name}</strong> wirklich löschen?
            </>
          }
          step2Title="Endgültig löschen?"
          step2Message={
            <>
              Diese Aktion kann nicht rückgängig gemacht werden. Plan{" "}
              <strong style={{ color: M.fg }}>{plan.name}</strong> unwiderruflich entfernen?
            </>
          }
          busy={busy}
          onCancel={() => setDeleteConfirmOpen(false)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
