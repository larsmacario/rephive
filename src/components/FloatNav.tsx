import { M, Z } from "../theme";
import { CONTENT_HORIZONTAL_PADDING } from "../lib/responsive";
import { Icon } from "./Icon";

export type Tab = "home" | "plans" | "ai-plan" | "workouts" | "timer" | "history";

export const NAV: { id: Tab; label: string; icon: string }[] = [
  { id: "home", label: "Start", icon: "home" },
  { id: "plans", label: "Pläne", icon: "layers" },
  { id: "ai-plan", label: "KI Plan", icon: "sparkles" },
  { id: "workouts", label: "Workouts", icon: "dumbbell" },
  { id: "history", label: "Verlauf", icon: "history" },
];

export const FLOAT_NAV_EDGE_MARGIN = 12;
export const FLOAT_NAV_ICON_SIZE = 36;
export const FLOAT_NAV_PADDING_Y = 5;
export const FLOAT_NAV_BOTTOM_MARGIN = 8;
/** Bottom padding for tab scroll areas — matches gap above the nav bar. */
export const FLOAT_NAV_SCROLL_BOTTOM_GAP = FLOAT_NAV_BOTTOM_MARGIN;
export const FLOAT_NAV_ACTIVE_EDGE_INSET = 6;

/** Same offset as nav `bottom` — must match floatNavContentInset or iOS shows extra gap above nav. */
export const FLOAT_NAV_BOTTOM_OFFSET_CSS = `max(${FLOAT_NAV_BOTTOM_MARGIN}px, calc(env(safe-area-inset-bottom, 0px) - 24px))`;

/** Visual height of the bottom nav bar (excludes safe-area — added separately). */
export const FLOAT_NAV_BAR_SIZE =
  FLOAT_NAV_PADDING_Y + FLOAT_NAV_ICON_SIZE + FLOAT_NAV_PADDING_Y;

/** Content inset so scroll areas clear the fixed nav on mobile/tablet. */
export function floatNavContentInset(placement: "bottom" | "left"): string {
  if (placement === "bottom") {
    return `calc(${FLOAT_NAV_BAR_SIZE}px + ${FLOAT_NAV_SCROLL_BOTTOM_GAP}px + ${FLOAT_NAV_BOTTOM_OFFSET_CSS})`;
  }
  return `calc(${FLOAT_NAV_BAR_SIZE}px + ${FLOAT_NAV_EDGE_MARGIN}px + env(safe-area-inset-left, 0px))`;
}

export function FloatNav({
  tab,
  onTab,
  timerActive: _timerActive,
  placement,
}: {
  tab: Tab;
  onTab: (t: Tab) => void;
  timerActive?: boolean;
  placement: "bottom" | "left";
}) {
  const horizontal = placement === "bottom";

  return (
    <nav
      aria-label="Hauptnavigation"
      style={{
        position: horizontal ? "absolute" : "fixed",
        zIndex: Z.nav,
        pointerEvents: "none",
        ...(horizontal
          ? {
              left: CONTENT_HORIZONTAL_PADDING,
              right: CONTENT_HORIZONTAL_PADDING,
              bottom: FLOAT_NAV_BOTTOM_OFFSET_CSS,
            }
          : {
              left: `calc(${FLOAT_NAV_EDGE_MARGIN}px + env(safe-area-inset-left, 0px))`,
              top: "50%",
              transform: "translateY(-50%)",
            }),
      }}
    >
      <div
        style={{
          pointerEvents: "auto",
          display: "flex",
          flexDirection: horizontal ? "row" : "column",
          alignItems: "center",
          justifyContent: horizontal ? "space-evenly" : undefined,
          gap: horizontal ? 0 : 3,
          padding: horizontal
            ? `${FLOAT_NAV_PADDING_Y}px ${FLOAT_NAV_ACTIVE_EDGE_INSET}px`
            : 6,
          width: horizontal ? "100%" : undefined,
          borderRadius: horizontal ? 18 : 20,
          background: M.card,
          border: "1px solid " + M.line,
          boxShadow: horizontal
            ? "0 8px 32px rgba(0,0,0,.4), 0 0 0 1px rgba(255,255,255,.04) inset"
            : "0 8px 32px rgba(0,0,0,.45), 0 0 0 1px rgba(255,255,255,.04) inset",
        }}
      >
        {NAV.map((n) => {
          const on = tab === n.id;
          return (
            <button
              key={n.id}
              type="button"
              onClick={() => onTab(n.id)}
              aria-label={n.label}
              aria-current={on ? "page" : undefined}
              title={n.label}
              style={{
                width: FLOAT_NAV_ICON_SIZE,
                height: FLOAT_NAV_ICON_SIZE,
                flex: "0 0 auto",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: on ? `2px solid ${M.brand}` : "2px solid transparent",
                borderRadius: "50%",
                cursor: "pointer",
                background: "transparent",
                color: on ? M.brand : M.mut,
                position: "relative",
                transition: "all 0.15s ease",
                ...(on ? { boxShadow: M.brandGlow } : null),
              }}
            >
              <span style={{ position: "relative", display: "flex" }}>
                <Icon
                  name={n.icon}
                  size={20}
                  stroke={2}
                  color={on ? M.brand : M.mut}
                />
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
