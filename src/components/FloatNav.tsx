import type { CSSProperties } from "react";
import { M, Z } from "../theme";
import { CONTENT_HORIZONTAL_PADDING } from "../lib/responsive";
import { Icon } from "./Icon";

export type Tab = "home" | "plans" | "ai-plan" | "timer" | "history" | "profile";

export type NavTabId = Tab | "menu";

type NavItem = { id: NavTabId; label: string; icon: string };

export const LEFT_TABS: NavItem[] = [
  { id: "home", label: "Start", icon: "home" },
  { id: "ai-plan", label: "KI Plan", icon: "sparkles" },
];

export const RIGHT_TABS: NavItem[] = [
  { id: "plans", label: "Pläne", icon: "layers" },
  { id: "menu", label: "Menü", icon: "menu" },
];

/** @deprecated Use LEFT_TABS + RIGHT_TABS */
export const NAV: NavItem[] = [...LEFT_TABS, ...RIGHT_TABS];

export const FLOAT_NAV_EDGE_MARGIN = 12;
export const FLOAT_NAV_ICON_SIZE = 20;
export const FLOAT_NAV_LABEL_SIZE = 11;
export const FLOAT_NAV_LABEL_GAP = 2;
export const FLOAT_NAV_PADDING_Y = 8;
export const FLOAT_NAV_PADDING_X = 8;
export const FLOAT_NAV_BOTTOM_MARGIN = 8;
export const FLOAT_NAV_FAB_SIZE = 54;
export const FLOAT_NAV_FAB_LIFT = 8;
export const FLOAT_NAV_FAB_SIDE_GAP = 22;
export const FLOAT_NAV_FAB_SLOT_GAP = 10;
/** How far the FAB top extends above the glass bar top edge. */
export const FLOAT_NAV_FAB_OVERHANG = FLOAT_NAV_FAB_SIZE - FLOAT_NAV_FAB_LIFT;
/** Bottom padding for tab scroll areas — matches gap above the nav bar. */
export const FLOAT_NAV_SCROLL_BOTTOM_GAP = FLOAT_NAV_BOTTOM_MARGIN;

/** Same offset as nav `bottom` — must match floatNavContentInset or iOS shows extra gap above nav. */
export const FLOAT_NAV_BOTTOM_OFFSET_CSS = `max(${FLOAT_NAV_BOTTOM_MARGIN}px, calc(env(safe-area-inset-bottom, 0px) - 24px))`;

export const FLOAT_NAV_GLASS_HEIGHT =
  FLOAT_NAV_PADDING_Y +
  FLOAT_NAV_ICON_SIZE +
  FLOAT_NAV_LABEL_GAP +
  FLOAT_NAV_LABEL_SIZE +
  FLOAT_NAV_PADDING_Y;

/** Visual height from FAB top through glass bar (excludes safe-area — added separately). */
export const FLOAT_NAV_BAR_SIZE = FLOAT_NAV_GLASS_HEIGHT + FLOAT_NAV_FAB_OVERHANG;

/** Width of the left desktop nav bar (icon + label + padding). */
export const FLOAT_NAV_LEFT_WIDTH = 108;

const tabButtonFocus: CSSProperties = {
  outline: "none",
};

const floatNavGlass: CSSProperties = {
  background: "rgba(255,255,255,.05)",
  backdropFilter: "blur(24px) saturate(1.25)",
  WebkitBackdropFilter: "blur(24px) saturate(1.25)",
  border: "1px solid rgba(255,255,255,.1)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,.06)",
};

/** Content inset so scroll areas clear the fixed nav on mobile/tablet. */
export function floatNavContentInset(placement: "bottom" | "left"): string {
  if (placement === "bottom") {
    return `calc(${FLOAT_NAV_BAR_SIZE}px + ${FLOAT_NAV_SCROLL_BOTTOM_GAP}px + ${FLOAT_NAV_BOTTOM_OFFSET_CSS})`;
  }
  return `calc(${FLOAT_NAV_LEFT_WIDTH}px + ${FLOAT_NAV_EDGE_MARGIN}px + env(safe-area-inset-left, 0px))`;
}

/** Bottom scrim — dims scroll content under the glass nav (mobile/tablet only). */
export function FloatNavContentFade() {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: floatNavContentInset("bottom"),
        pointerEvents: "none",
        zIndex: Z.nav - 1,
        background: `linear-gradient(to top, ${M.bg} 0%, rgba(0,0,0,.55) 50%, transparent 100%)`,
      }}
    />
  );
}

function NavTabButton({
  item,
  active,
  horizontal,
  onSelect,
}: {
  item: NavItem;
  active: boolean;
  horizontal: boolean;
  onSelect: (id: NavTabId) => void;
}) {
  const color = active ? M.brand : M.mut;

  return (
    <button
      type="button"
      onClick={() => onSelect(item.id)}
      aria-label={item.label}
      aria-current={active ? "page" : undefined}
      title={item.label}
      style={{
        ...tabButtonFocus,
        flex: horizontal ? "1 1 0" : "0 0 auto",
        minWidth: 44,
        minHeight: 44,
        display: "flex",
        flexDirection: horizontal ? "column" : "row",
        alignItems: "center",
        justifyContent: "center",
        gap: horizontal ? FLOAT_NAV_LABEL_GAP : 8,
        padding: horizontal ? "4px 2px" : "6px 10px",
        border: "none",
        borderRadius: 12,
        cursor: "pointer",
        background: "transparent",
        color,
        transition: "color 0.15s ease",
      }}
    >
      <Icon name={item.icon} size={FLOAT_NAV_ICON_SIZE} stroke={2} color={color} />
      <span
        style={{
          fontSize: FLOAT_NAV_LABEL_SIZE,
          fontFamily: M.body,
          fontWeight: active ? 600 : 500,
          lineHeight: 1.1,
          letterSpacing: 0.1,
          whiteSpace: "nowrap",
        }}
      >
        {item.label}
      </span>
    </button>
  );
}

function ExpressFab({ onExpressTracking }: { onExpressTracking: () => void }) {
  return (
    <button
      type="button"
      onClick={onExpressTracking}
      aria-label="ExpressTracking starten"
      title="ExpressTracking"
      style={{
        ...tabButtonFocus,
        width: FLOAT_NAV_FAB_SIZE,
        height: FLOAT_NAV_FAB_SIZE,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "none",
        borderRadius: "50%",
        cursor: "pointer",
        background: M.brandButtonGradient,
        boxShadow: M.brandButtonGlow,
        color: M.brandInk,
        transition: "transform 0.15s ease, box-shadow 0.15s ease",
      }}
    >
      <Icon name="plus" size={24} stroke={2.5} color={M.brandInk} />
    </button>
  );
}

export function FloatNav({
  tab,
  onTab,
  onExpressTracking,
  timerActive: _timerActive,
  placement,
}: {
  tab: Tab;
  onTab: (t: NavTabId) => void;
  onExpressTracking: () => void;
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
          pointerEvents: "none",
          position: "relative",
          width: horizontal ? "100%" : FLOAT_NAV_LEFT_WIDTH,
        }}
      >
        <div
          style={{
            pointerEvents: "auto",
            display: "flex",
            flexDirection: horizontal ? "row" : "column",
            alignItems: horizontal ? "flex-end" : "stretch",
            padding: `${FLOAT_NAV_PADDING_Y}px ${FLOAT_NAV_PADDING_X}px`,
            borderRadius: horizontal ? 22 : 20,
            ...floatNavGlass,
          }}
        >
          <div
            style={
              horizontal
                ? {
                    flex: 1,
                    minWidth: 0,
                    display: "flex",
                    justifyContent: "space-evenly",
                    alignItems: "flex-end",
                  }
                : {
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                  }
            }
          >
            {LEFT_TABS.map((n) => (
              <NavTabButton
                key={n.id}
                item={n}
                active={tab === n.id}
                horizontal={horizontal}
                onSelect={onTab}
              />
            ))}
          </div>
          <div
            aria-hidden
            style={
              horizontal
                ? {
                    flex: "0 0 auto",
                    width: FLOAT_NAV_FAB_SIZE + FLOAT_NAV_FAB_SIDE_GAP * 2,
                    alignSelf: "flex-end",
                  }
                : {
                    flex: "0 0 auto",
                    height: FLOAT_NAV_FAB_SIZE + FLOAT_NAV_FAB_SLOT_GAP * 2,
                    alignSelf: "center",
                  }
            }
          />
          <div
            style={
              horizontal
                ? {
                    flex: 1,
                    minWidth: 0,
                    display: "flex",
                    justifyContent: "space-evenly",
                    alignItems: "flex-end",
                  }
                : {
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                  }
            }
          >
            {RIGHT_TABS.map((n) => (
              <NavTabButton
                key={n.id}
                item={n}
                active={tab === n.id}
                horizontal={horizontal}
                onSelect={onTab}
              />
            ))}
          </div>
        </div>
        <div
          style={{
            pointerEvents: "auto",
            position: "absolute",
            left: "50%",
            zIndex: 1,
            ...(horizontal
              ? {
                  top: 0,
                  transform: `translate(-50%, calc(-50% + ${FLOAT_NAV_FAB_LIFT}px))`,
                }
              : {
                  top: "50%",
                  transform: "translate(-50%, -50%)",
                }),
          }}
        >
          <ExpressFab onExpressTracking={onExpressTracking} />
        </div>
      </div>
    </nav>
  );
}
