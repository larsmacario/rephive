import { useState } from "react";
import { M } from "../theme";
import { useAuth } from "../lib/auth";
import { deletePlan, setActivePlan, usePlan, useWorkouts } from "../lib/db";
import { Icon } from "../components/Icon";
import { DeleteConfirmDialog } from "../components/DeleteConfirmDialog";
import { PlanAdviceCollapsible } from "../components/PlanAdviceCollapsible";
import { PlanDayAccordion } from "../components/PlanDayAccordion";
import { OneRmPercentInfoCard } from "../components/OneRmPercentInfoCard";
import { MStat, MTag } from "../components/widgets";

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
  const [expandedDayId, setExpandedDayId] = useState<string | null>(null);

  const workoutList = workouts ?? [];

  const handleToggleDay = (dayId: string) => {
    setExpandedDayId((prev) => (prev === dayId ? null : dayId));
  };

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
        <button
          onClick={onBack}
          style={{
            padding: "10px 16px",
            borderRadius: 12,
            border: "none",
            background: M.acc,
            color: M.accInk,
            fontFamily: M.disp,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Zurück
        </button>
      </div>
    );
  }

  const workoutDays = plan.days.filter((d) => !d.isRestDay).length;
  const restDays = plan.days.filter((d) => d.isRestDay).length;
  const isAiPlan =
    plan.name.toLowerCase().startsWith("ki ") ||
    plan.days.some((d) => d.workout?.tags?.some((t) => t.toLowerCase() === "ki"));

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

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "0 22px 16px" }}>
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

        <div style={{ marginTop: 18, fontSize: 11, letterSpacing: 1.5, color: M.mut, fontWeight: 700 }}>TAGE</div>
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
          {plan.days.map((day) => {
            const isCurrent = plan.isActive && day.position === plan.currentDay;
            const workout = day.workout ? workoutList.find((w) => w.id === day.workout?.id) ?? null : null;
            return (
              <PlanDayAccordion
                key={day.id}
                dayId={day.id}
                dayNumber={day.position + 1}
                label={day.isRestDay ? "Ruhetag" : day.workout?.name ?? "Workout"}
                isRestDay={day.isRestDay}
                isCurrent={isCurrent}
                workout={workout}
                expanded={expandedDayId === day.id}
                onToggle={handleToggleDay}
                variant="detail"
              />
            );
          })}
        </div>
      </div>

      <div style={{ padding: "12px 22px 18px", display: "flex", flexDirection: "column", gap: 10, borderTop: "1px solid " + M.line2 }}>
        {plan.isActive ? (
          <div
            style={{
              padding: "13px 0",
              borderRadius: 12,
              border: "1px solid " + M.line,
              background: M.accSoft,
              color: M.acc,
              fontFamily: M.disp,
              fontWeight: 700,
              fontSize: 15,
              letterSpacing: 0.5,
              textAlign: "center",
            }}
          >
            Aktiver Plan
          </div>
        ) : (
          <button
            disabled={busy}
            onClick={handleActivate}
            style={{
              padding: "13px 0",
              borderRadius: 12,
              border: "none",
              background: M.acc,
              color: M.accInk,
              fontFamily: M.disp,
              fontWeight: 700,
              fontSize: 15,
              letterSpacing: 0.5,
              cursor: busy ? "wait" : "pointer",
              opacity: busy ? 0.7 : 1,
            }}
          >
            Als aktiv setzen
          </button>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button
            disabled={busy}
            onClick={() => onEdit(plan.id)}
            style={{
              flex: 1,
              padding: "13px 0",
              borderRadius: 12,
              border: "1px solid " + M.line,
              background: M.card,
              color: M.fg,
              fontFamily: M.disp,
              fontWeight: 700,
              fontSize: 15,
              cursor: busy ? "wait" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              opacity: busy ? 0.7 : 1,
            }}
          >
            <Icon name="edit" size={18} stroke={2} color={M.acc} />
            Bearbeiten
          </button>
          <button
            disabled={busy}
            onClick={() => setDeleteConfirmOpen(true)}
            style={{
              padding: "13px 16px",
              borderRadius: 12,
              border: "1px solid " + M.line,
              background: "transparent",
              color: M.mut2,
              cursor: busy ? "wait" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: busy ? 0.7 : 0.65,
            }}
          >
            <Icon name="trash" size={18} stroke={2} color={M.mut2} />
          </button>
        </div>
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
