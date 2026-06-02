import { useEffect } from "react";
import { M } from "../theme";
import { usePlans } from "../lib/db";
import { Icon } from "../components/Icon";
import { MTag } from "../components/widgets";

export interface PlansScreenProps {
  onOpenBuilder: () => void;
  onOpenPlan: (planId: string) => void;
  refreshKey?: number;
}

export function PlansScreen({ onOpenBuilder, onOpenPlan, refreshKey = 0 }: PlansScreenProps) {
  const { data: plans, loading, error, reload } = usePlans();

  useEffect(() => {
    reload();
  }, [refreshKey, reload]);

  const list = plans ?? [];

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <div
        style={{
          padding: "4px 22px 12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div style={{ fontFamily: M.disp, fontWeight: 700, fontSize: 30, lineHeight: 1 }}>Pläne</div>
          <div style={{ fontSize: 12.5, color: M.mut, marginTop: 3, fontWeight: 600 }}>
            {loading ? "…" : `${list.length} Trainingspläne · nur einer aktiv`}
          </div>
        </div>
        <button
          onClick={onOpenBuilder}
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            border: "none",
            background: M.acc,
            color: M.accInk,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <Icon name="plus" size={24} stroke={2.6} />
        </button>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          padding: "0 22px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {loading && <div style={{ color: M.mut, fontSize: 14 }}>Pläne werden geladen…</div>}
        {error && <div style={{ color: "#ff8a8a", fontSize: 14 }}>{error}</div>}
        {!loading && list.length === 0 && (
          <div style={{ color: M.mut, fontSize: 14, textAlign: "center", marginTop: 24 }}>
            Noch keine Trainingspläne. Erstelle deinen ersten mit +.
          </div>
        )}
        {list.map((plan) => {
          const workoutDays = plan.days.filter((d) => !d.isRestDay).length;

          return (
            <button
              key={plan.id}
              onClick={() => onOpenPlan(plan.id)}
              style={{
                width: "100%",
                textAlign: "left",
                background: plan.isActive ? M.accSoft : M.card,
                border: "1px solid " + (plan.isActive ? M.acc : M.line2),
                borderLeft: plan.isActive ? "3px solid " + M.acc : "1px solid " + M.line2,
                borderRadius: 14,
                padding: "14px 16px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <div
                    style={{
                      fontFamily: M.disp,
                      fontWeight: 700,
                      fontSize: 20,
                      lineHeight: 1.1,
                      letterSpacing: 0.2,
                      color: M.fg,
                    }}
                  >
                    {plan.name}
                  </div>
                  {plan.isActive && <MTag>Aktiv</MTag>}
                </div>
                <div style={{ fontSize: 12.5, color: M.mut, marginTop: 5, fontWeight: 600 }}>
                  {plan.days.length} Tage · {workoutDays} Workouts
                </div>
              </div>
              <Icon name="chevR" size={20} color={M.mut2} stroke={2.2} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
