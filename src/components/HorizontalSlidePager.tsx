import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { prefersReducedMotion, triggerTapHaptic } from "../lib/haptics";
import { M } from "../theme";

const SWIPE_THRESHOLD_PX = 50;
const AXIS_LOCK_PX = 10;
const WHEEL_COOLDOWN_MS = 420;

const TRACK_SPRING = { type: "spring" as const, stiffness: 320, damping: 32 };
const DOT_SPRING = { type: "spring" as const, stiffness: 400, damping: 28 };

export interface HorizontalSlidePagerProps {
  count: number;
  activeIndex: number;
  onIndexChange: (index: number) => void;
  children: ReactNode[];
  ariaLabel?: string;
  slideLabel?: (index: number, count: number) => string;
  showIndicators?: boolean;
}

export function HorizontalSlidePager({
  count,
  activeIndex,
  onIndexChange,
  children,
  ariaLabel = "Tages-Karussell",
  slideLabel = (i, total) => `Tag ${i + 1} von ${total}`,
  showIndicators = true,
}: HorizontalSlidePagerProps) {
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
  const dotTransition = reducedMotion ? { duration: 0 } : DOT_SPRING;
  const labelTransition = reducedMotion ? { duration: 0 } : { duration: 0.15 };

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

      {showIndicators && count > 1 && (
        <div
          style={{
            flexShrink: 0,
            padding: "10px 0 4px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <button
              type="button"
              aria-label="Vorherige Folie"
              disabled={safeIndex === 0}
              onClick={() => step(-1)}
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                border: "1px solid " + M.line2,
                background: M.card,
                color: safeIndex === 0 ? M.line : M.fg,
                cursor: safeIndex === 0 ? "default" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                opacity: safeIndex === 0 ? 0.4 : 1,
              }}
            >
              ‹
            </button>
            <div
              style={{
                flex: 1,
                minWidth: 0,
                display: "flex",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              <AnimatePresence mode="wait">
                <motion.span
                  key={safeIndex}
                  initial={reducedMotion ? false : { opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reducedMotion ? undefined : { opacity: 0, y: -4 }}
                  transition={labelTransition}
                  style={{
                    fontSize: 11,
                    letterSpacing: 1.2,
                    color: M.mut2,
                    fontWeight: 700,
                    textAlign: "center",
                  }}
                >
                  {slideLabel(safeIndex, count).toUpperCase()}
                </motion.span>
              </AnimatePresence>
            </div>
            <button
              type="button"
              aria-label="Nächste Folie"
              disabled={safeIndex === count - 1}
              onClick={() => step(1)}
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                border: "1px solid " + M.line2,
                background: M.card,
                color: safeIndex === count - 1 ? M.line : M.fg,
                cursor: safeIndex === count - 1 ? "default" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                opacity: safeIndex === count - 1 ? 0.4 : 1,
              }}
            >
              ›
            </button>
          </div>
          <div
            role="tablist"
            aria-label="Tages-Folien"
            style={{
              display: "flex",
              gap: 6,
              alignItems: "center",
              flexWrap: "wrap",
              justifyContent: "center",
              maxWidth: "100%",
              padding: "0 8px",
            }}
          >
            {Array.from({ length: count }, (_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={safeIndex === i}
                aria-current={safeIndex === i ? "true" : undefined}
                aria-label={slideLabel(i, count)}
                onClick={() => goTo(i)}
                style={{
                  width: 32,
                  height: 32,
                  border: "none",
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "transparent",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                <motion.span
                  animate={{
                    width: safeIndex === i ? 22 : 8,
                    borderRadius: safeIndex === i ? 5 : 4,
                    backgroundColor: safeIndex === i ? M.brand : M.line,
                  }}
                  transition={dotTransition}
                  style={{
                    height: 8,
                    display: "block",
                    boxShadow: safeIndex === i ? M.brandGlow : undefined,
                  }}
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
