import { useState } from "react";
import { M } from "../theme";
import { useAuth } from "../lib/auth";
import { deletePlan, setActivePlan, usePlan } from "../lib/db";
import { Icon } from "../components/Icon";
import { DeleteConfirmDialog } from "../components/DeleteConfirmDialog";
import { MTag } from "../components/widgets";

export interface PlanDetailScreenProps {
  planId: string;
  onBack: () => void;
  onEdit: (planId: string) => void;
  onDeleted: () => void;
}

export function PlanDetailScreen({ planId, onBack, onEdit, onDeleted }: PlanDetailScreenProps) {
  const { user } = useAuth();
  const { data: plan, loading, error, reload } = usePlan(planId);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

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

        <div style={{ marginTop: 18, fontSize: 11, letterSpacing: 1.5, color: M.mut, fontWeight: 700 }}>TAGE</div>
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
          {plan.days.map((day) => {
            const isCurrent = plan.isActive && day.position === plan.currentDay;
            return (
              <div
                key={day.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: 12,
                  background: isCurrent ? M.accSoft : M.card,
                  border: "1px solid " + (isCurrent ? M.acc : M.line2),
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                <span style={{ color: isCurrent ? M.acc : M.mut2, minWidth: 42 }}>Tag {day.position + 1}</span>
                <span style={{ color: M.fg, flex: 1 }}>
                  {day.isRestDay ? "Ruhetag" : day.workout?.name ?? "Workout"}
                </span>
                <Icon name={day.isRestDay ? "pause" : "dumbbell"} size={16} stroke={2} color={isCurrent ? M.acc : M.mut2} />
              </div>
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
