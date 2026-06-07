import { useEffect, useRef, type ReactNode } from "react";
import { animate, motion, useMotionValue, type PanInfo } from "framer-motion";
import { prefersReducedMotion } from "../lib/haptics";
import { EXERCISE_ROW, M } from "../theme";
import { Icon } from "./Icon";

const REVEAL_PX = 72;
const OPEN_THRESHOLD_PX = 36;
const SWIPE_HINT_STORAGE_KEY = "rephive.turboSetup.swipeDeleteHint";
const PEEK_DELAY_MS = 600;
const PEEK_HOLD_MS = 480;

export interface SwipeRevealRowProps {
  children: ReactNode;
  rowId: string;
  openRowId: string | null;
  onOpenRowIdChange: (id: string | null) => void;
  onDelete: () => void;
  deleteAriaLabel: string;
  /** Einmalige Peek-Animation für die Swipe-Geste (nur erste Zeile). */
  showSwipeHint?: boolean;
}

function swipeHintSeen(): boolean {
  try {
    return localStorage.getItem(SWIPE_HINT_STORAGE_KEY) === "1";
  } catch {
    return true;
  }
}

function markSwipeHintSeen(): void {
  try {
    localStorage.setItem(SWIPE_HINT_STORAGE_KEY, "1");
  } catch {
    /* ignore */
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function SwipeRevealRow({
  children,
  rowId,
  openRowId,
  onOpenRowIdChange,
  onDelete,
  deleteAriaLabel,
  showSwipeHint = false,
}: SwipeRevealRowProps) {
  const x = useMotionValue(0);
  const reducedMotion = prefersReducedMotion();
  const isOpen = openRowId === rowId;
  const peekingRef = useRef(false);
  const openRowIdRef = useRef(openRowId);

  openRowIdRef.current = openRowId;

  useEffect(() => {
    if (peekingRef.current && !isOpen) return;

    x.stop();
    const target = isOpen ? -REVEAL_PX : 0;
    if (reducedMotion) {
      x.set(target);
      return;
    }
    void animate(x, target, { type: "spring", stiffness: 420, damping: 34 });
  }, [isOpen, reducedMotion, x]);

  useEffect(() => {
    if (!showSwipeHint || reducedMotion || swipeHintSeen()) return;

    let cancelled = false;

    const runPeek = async () => {
      await delay(PEEK_DELAY_MS);
      if (cancelled || openRowIdRef.current != null) return;

      peekingRef.current = true;
      x.stop();

      await animate(x, -REVEAL_PX, {
        duration: 0.34,
        ease: [0.22, 1, 0.36, 1],
      }).finished;
      if (cancelled) return;

      await delay(PEEK_HOLD_MS);
      if (cancelled || openRowIdRef.current === rowId) {
        peekingRef.current = false;
        return;
      }

      x.stop();
      await animate(x, 0, {
        duration: 0.38,
        ease: [0.22, 1, 0.36, 1],
      }).finished;
      if (cancelled) return;

      markSwipeHintSeen();
      peekingRef.current = false;
    };

    void runPeek();

    return () => {
      cancelled = true;
      peekingRef.current = false;
      x.stop();
      if (!openRowIdRef.current) {
        x.set(0);
      }
    };
  }, [showSwipeHint, reducedMotion, rowId, x]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    peekingRef.current = false;
    const shouldOpen = info.offset.x < -OPEN_THRESHOLD_PX || info.velocity.x < -500;
    onOpenRowIdChange(shouldOpen ? rowId : null);
  };

  const handleDelete = () => {
    onOpenRowIdChange(null);
    onDelete();
  };

  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 10,
        flexShrink: 0,
        width: "100%",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          width: REVEAL_PX,
          display: "flex",
          alignItems: "stretch",
        }}
      >
        <button
          type="button"
          aria-label={deleteAriaLabel}
          onClick={handleDelete}
          style={{
            width: "100%",
            border: "none",
            background: "#ef4444",
            color: "#fff",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="trash" size={18} stroke={2.2} color="#fff" />
        </button>
      </div>

      <motion.div
        drag="x"
        dragConstraints={{ left: -REVEAL_PX, right: 0 }}
        dragElastic={0.05}
        dragMomentum={false}
        dragDirectionLock
        onDragEnd={handleDragEnd}
        style={{
          x,
          position: "relative",
          zIndex: 1,
          width: "100%",
          height: EXERCISE_ROW.height,
          boxSizing: "border-box",
          touchAction: "pan-y",
          background: M.card,
          border: "1px solid " + M.line2,
          borderRadius: 10,
          display: "flex",
          alignItems: "center",
        }}
      >
        <div style={{ width: "100%", height: "100%", boxSizing: "border-box" }}>{children}</div>
      </motion.div>
    </div>
  );
}
