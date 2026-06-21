import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { motion } from "framer-motion";
import { prefersReducedMotion, triggerTapHaptic } from "../lib/haptics";
import { M } from "../theme";
import { DotIndicators } from "./track/DotIndicators";

const SWIPE_THRESHOLD_PX = 50;
const AXIS_LOCK_PX = 10;
const WHEEL_COOLDOWN_MS = 420;

const TRACK_SPRING = { type: "spring" as const, stiffness: 320, damping: 32 };

export interface HorizontalSlidePagerProps {
  count: number;
  activeIndex: number;
  onIndexChange: (index: number) => void;
  children: ReactNode[];
  /** Inhalt zwischen Karussell und Seiten-Punkten (z. B. Track-Metriken). */
  footerBeforeIndicators?: ReactNode;
  ariaLabel?: string;
  /** Text für Tab-Links und aria-label (Standard: „Tag 1“, „Tag 2“, …) */
  tabLabel?: (index: number, count: number) => string;
  showIndicators?: boolean;
  indicatorVariant?: "tabs" | "dots";
  tabListPadding?: string;
  /** Größere Tag-Tabs für Plan Builder (44px Touch-Ziel). */
  tabSize?: "md" | "lg";
  /** z. B. „+“-Button rechts neben den Tag-Tabs. */
  tabBarTrailing?: ReactNode;
}

export function HorizontalSlidePager({
  count,
  activeIndex,
  onIndexChange,
  children,
  ariaLabel = "Tages-Karussell",
  tabLabel = (i) => `Tag ${i + 1}`,
  showIndicators = true,
  indicatorVariant = "tabs",
  footerBeforeIndicators,
  tabListPadding = "10px 12px 4px",
  tabSize = "md",
  tabBarTrailing,
}: HorizontalSlidePagerProps) {
  const isLgTabs = tabSize === "lg";
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const axisLockRef = useRef<"x" | "y" | null>(null);
  const activeIndexRef = useRef(activeIndex);
  const wheelCooldownRef = useRef(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const reducedMotion = prefersReducedMotion();

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  const goTo = useCallback(
    (index: number) => {
      const next = Math.max(0, Math.min(count - 1, index));
      if (next === activeIndexRef.current) return;
      void triggerTapHaptic();
      activeIndexRef.current = next;
      onIndexChange(next);
    },
    [count, onIndexChange],
  );

  const step = useCallback(
    (direction: -1 | 1) => {
      goTo(activeIndexRef.current + direction);
    },
    [goTo],
  );

  const onTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    axisLockRef.current = null;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current || axisLockRef.current) return;
    const touch = e.touches[0];
    if (!touch) return;
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    if (Math.abs(dx) < AXIS_LOCK_PX && Math.abs(dy) < AXIS_LOCK_PX) return;
    axisLockRef.current = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    if (axisLockRef.current === "x") {
      const endX = e.changedTouches[0]?.clientX;
      if (endX != null) {
        const dx = endX - touchStartRef.current.x;
        if (dx < -SWIPE_THRESHOLD_PX) step(1);
        else if (dx > SWIPE_THRESHOLD_PX) step(-1);
      }
    }
    touchStartRef.current = null;
    axisLockRef.current = null;
  };

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const onWheel = (e: WheelEvent) => {
      const horizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.shiftKey ? e.deltaY : 0;
      if (Math.abs(horizontal) < 28) return;
      if (wheelCooldownRef.current) {
        e.preventDefault();
        return;
      }

      e.preventDefault();
      wheelCooldownRef.current = true;
      if (horizontal > 0) step(1);
      else step(-1);
      window.setTimeout(() => {
        wheelCooldownRef.current = false;
      }, WHEEL_COOLDOWN_MS);
    };

    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", onWheel);
  }, [step]);

  if (count === 0) return null;

  const safeIndex = Math.max(0, Math.min(count - 1, activeIndex));
  const trackTransition = reducedMotion ? { duration: 0 } : TRACK_SPRING;

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        width: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        ref={viewportRef}
        role="region"
        aria-roledescription="Karussell"
        aria-label={ariaLabel}
        style={{
          flex: 1,
          minHeight: 0,
          minWidth: 0,
          width: "100%",
          position: "relative",
          overflow: "hidden",
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <motion.div
          style={{
            display: "flex",
            height: "100%",
            width: `${count * 100}%`,
          }}
          animate={{ x: `-${(safeIndex / count) * 100}%` }}
          transition={trackTransition}
        >
          {children.map((slide, i) => (
            <div
              key={i}
              aria-hidden={safeIndex !== i}
              style={{
                width: `${100 / count}%`,
                flexShrink: 0,
                height: "100%",
                display: "flex",
                flexDirection: "column",
                minHeight: 0,
                minWidth: 0,
                pointerEvents: safeIndex === i ? "auto" : "none",
              }}
            >
              {slide}
            </div>
          ))}
        </motion.div>
      </div>

      {footerBeforeIndicators}

      {showIndicators && count > 1 && indicatorVariant === "dots" ? (
        <DotIndicators
          count={count}
          activeIndex={safeIndex}
          onSelect={goTo}
          ariaLabel={ariaLabel}
        />
      ) : null}
      {showIndicators && indicatorVariant === "tabs" && (count > 1 || tabBarTrailing) ? (
        <div
          role="tablist"
          aria-label="Plan-Navigation"
          style={{
            flexShrink: 0,
            padding: tabListPadding,
            display: "flex",
            flexWrap: "wrap",
            gap: isLgTabs ? "8px 12px" : "6px 14px",
            alignItems: "center",
            justifyContent: "center",
            maxWidth: "100%",
          }}
        >
          {Array.from({ length: count }, (_, i) => {
            const isActive = safeIndex === i;
            const label = tabLabel(i, count);
            return (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-current={isActive ? "true" : undefined}
                aria-label={label}
                onClick={() => goTo(i)}
                style={{
                  border: "none",
                  padding: isLgTabs ? "10px 16px" : "4px 2px",
                  minHeight: isLgTabs ? 44 : undefined,
                  boxSizing: "border-box",
                  background: "transparent",
                  cursor: "pointer",
                  flexShrink: 0,
                  fontFamily: M.disp,
                  fontSize: isLgTabs ? 16 : 13,
                  fontWeight: isActive ? 700 : 600,
                  color: isActive ? M.brand : M.mut2,
                  textDecoration: isActive ? "underline" : "none",
                  textUnderlineOffset: isLgTabs ? 5 : 4,
                  letterSpacing: isLgTabs ? 0.3 : 0.2,
                }}
              >
                {label}
              </button>
            );
          })}
          {tabBarTrailing}
        </div>
      ) : null}
    </div>
  );
}
