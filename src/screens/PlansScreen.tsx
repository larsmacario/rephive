import { useEffect } from "react";
import { M } from "../theme";
import { usePlans } from "../lib/db";
import { useNetwork } from "../lib/offline/networkStatus";
import { Icon } from "../components/Icon";
import { MTag } from "../components/widgets";
import { ScreenHeader, ScreenScroll } from "../components/ScreenScroll";
import { MButton } from "../components/MButton";

export interface PlansScreenProps {
  onOpenBuilder: () => void;
  onOpenPlan: (planId: string) => void;
  refreshKey?: number;
}

export function PlansScreen({ onOpenBuilder, onOpenPlan, refreshKey = 0 }: PlansScreenProps) {
  const { isOnline } = useNetwork();
  const { data: plans, loading, error, reload, isStale } = usePlans();

  useEffect(() => {
    reload();
  }, [refreshKey, reload]);

  const list = plans ?? [];

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <ScreenHeader>
        <div>
          <div style={{ fontFamily: M.disp, fontWeight: 700, fontSize: 30, lineHeight: 1 }}>Pläne</div>
          <div style={{ fontSize: 14, color: M.mut, marginTop: 3, fontWeight: 600 }}>
            {loading && list.length === 0
              ? "…"
              : `${list.length} Trainingspläne · nur einer aktiv${isStale && !isOnline ? " · Offline" : ""}`}
          </div>
        </div>
        <MButton onClick={onOpenBuilder} variant="primary" size="icon" aria-label="Plan erstellen">
          <Icon name="plus" size={18} stroke={2.6} color={M.accInk} />
        </MButton>
      </ScreenHeader>

      <ScreenScroll style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {loading && list.length === 0 && (
          <div style={{ color: M.mut, fontSize: 14 }}>Pläne werden geladen…</div>
        )}
        {error && <div style={{ color: "#ff8a8a", fontSize: 14 }}>{error}</div>}
        {!loading && list.length === 0 && (
          <div style={{ color: M.mut, fontSize: 14, textAlign: "center", marginTop: 24 }}>
            Noch keine Trainingspläne. Erstelle deinen ersten mit +.
          </div>
        )}
        {list.map((plan) => {
          const exerciseCount = plan.days.reduce((sum, d) => sum + d.exercises.length, 0);

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
                padding: "12px 14px",
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
                <div style={{ fontSize: 14, color: M.mut, marginTop: 5, fontWeight: 600 }}>
                  {plan.days.length} Tage · {exerciseCount} Übungen
                </div>
              </div>
              <Icon name="chevR" size={20} color={M.mut2} stroke={2.2} />
            </button>
          );
        })}
      </ScreenScroll>
    </div>
  );
}
