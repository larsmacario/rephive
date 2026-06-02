import { M, Z } from "../theme";
import { CONTENT_HORIZONTAL_PADDING } from "../lib/responsive";
import { Icon } from "./Icon";

export type Tab = "home" | "plans" | "workouts" | "timer" | "history";

export const NAV: { id: Tab; label: string; icon: string }[] = [
  { id: "home", label: "Start", icon: "home" },
  { id: "plans", label: "Pläne", icon: "layers" },
  { id: "workouts", label: "Workouts", icon: "dumbbell" },
  { id: "timer", label: "Timer", icon: "timer" },
  { id: "history", label: "Verlauf", icon: "history" },
];

export const FLOAT_NAV_EDGE_MARGIN = 12;
export const FLOAT_NAV_ICON_SIZE = 44;
export const FLOAT_NAV_PADDING_Y = 6;
export const FLOAT_NAV_CONTENT_BUFFER = 8;
export const FLOAT_NAV_BOTTOM_MARGIN = 8;
export const FLOAT_NAV_ACTIVE_EDGE_INSET = 6;

/** Visual height of the bottom nav bar (excludes safe-area — added separately). */
export const FLOAT_NAV_BAR_SIZE =
  FLOAT_NAV_PADDING_Y + FLOAT_NAV_ICON_SIZE + FLOAT_NAV_PADDING_Y;

/** Content inset so scroll areas clear the fixed nav on mobile/tablet. */
export function floatNavContentInset(placement: "bottom" | "left"): string {
  if (placement === "bottom") {
    return `calc(${FLOAT_NAV_BAR_SIZE}px + ${FLOAT_NAV_CONTENT_BUFFER}px + ${FLOAT_NAV_BOTTOM_MARGIN}px + env(safe-area-inset-bottom, 0px))`;
  }
  return `calc(${FLOAT_NAV_BAR_SIZE}px + ${FLOAT_NAV_EDGE_MARGIN}px + env(safe-area-inset-left, 0px))`;
}

export function FloatNav({
  tab,
  onTab,
  timerActive,
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
              bottom: `calc(${FLOAT_NAV_BOTTOM_MARGIN}px + env(safe-area-inset-bottom, 0px))`,
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
          gap: horizontal ? 0 : 4,
          padding: horizontal
            ? `${FLOAT_NAV_PADDING_Y}px ${tab === "history" ? FLOAT_NAV_ACTIVE_EDGE_INSET : 0}px ${FLOAT_NAV_PADDING_Y}px ${tab === "home" ? FLOAT_NAV_ACTIVE_EDGE_INSET : 0}px`
            : 6,
          width: horizontal ? "100%" : undefined,
          borderRadius: horizontal ? 20 : 22,
          background: M.card,
          border: "1px solid " + M.line,
          boxShadow: horizontal
            ? "0 8px 32px rgba(0,0,0,.4), 0 0 0 1px rgba(255,255,255,.04) inset"
            : "0 8px 32px rgba(0,0,0,.45), 0 0 0 1px rgba(255,255,255,.04) inset",
        }}
      >
        {NAV.map((n) => {
          const on = tab === n.id;
          const live = timerActive && n.id === "timer";
          return (
            <button
              key={n.id}
              type="button"
              onClick={() => onTab(n.id)}
              aria-label={n.label}
              aria-current={on ? "page" : undefined}
              title={n.label}
              style={{
                width: horizontal ? undefined : FLOAT_NAV_ICON_SIZE,
                height: FLOAT_NAV_ICON_SIZE,
                flex: horizontal ? 1 : "0 0 auto",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "none",
                borderRadius: 14,
                cursor: "pointer",
                background: on || live ? M.accSoft : "transparent",
                color: on || live ? M.acc : M.mut,
                position: "relative",
              }}
            >
              <span style={{ position: "relative", display: "flex" }}>
                <Icon name={n.icon} size={23} stroke={2} color={on || live ? M.acc : M.mut} />
                {live && (
                  <span
                    style={{
                      position: "absolute",
                      top: -2,
                      right: -4,
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      background: M.acc,
                      boxShadow: `0 0 8px ${M.acc}`,
                    }}
                  />
                )}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
