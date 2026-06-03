import { useDragControls, motion } from "framer-motion";
import { useEffect } from "react";
import type { CSSProperties, ReactNode, PointerEvent } from "react";
import { M } from "../theme";

const DISMISS_OFFSET_PX = 72;
const DISMISS_VELOCITY = 500;

export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  zIndex?: number;
  "aria-label"?: string;
  /** Use absolute when the sheet is rendered inside a positioned app shell. */
  position?: "fixed" | "absolute";
  maxHeight?: string;
  /** When false, children manage their own scroll/layout inside the panel. */
  wrapScroll?: boolean;
  lockBodyScroll?: boolean;
}

export function BottomSheet({
  open,
  onClose,
  children,
  zIndex = 20,
  "aria-label": ariaLabel,
  position = "fixed",
  maxHeight = "min(90dvh, 90vh)",
  wrapScroll = true,
  lockBodyScroll = false,
}: BottomSheetProps) {
  const dragControls = useDragControls();

  useEffect(() => {
    if (!open || !lockBodyScroll) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open, lockBodyScroll]);

  if (!open) return null;

  const handleDragEnd = (_: unknown, info: { offset: { y: number }; velocity: { y: number } }) => {
    if (info.offset.y > DISMISS_OFFSET_PX || info.velocity.y > DISMISS_VELOCITY) {
      onClose();
    }
  };

  const startDrag = (e: PointerEvent) => {
    dragControls.start(e);
  };

  const overlayStyle: CSSProperties = {
    position,
    inset: 0,
    background: "rgba(5,7,5,.6)",
    backdropFilter: "blur(4px)",
    zIndex,
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-end",
  };

  const panelStyle: CSSProperties = {
    background: M.panel,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTop: "1px solid " + M.line,
    maxHeight,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    padding: "16px 18px 24px",
    boxSizing: "border-box",
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        drag="y"
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.6 }}
        onDragEnd={handleDragEnd}
        onClick={(e) => e.stopPropagation()}
        style={panelStyle}
      >
        <div
          onPointerDown={startDrag}
          style={{
            flexShrink: 0,
            padding: "4px 0 14px",
            cursor: "grab",
            touchAction: "none",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div style={{ width: 40, height: 4, borderRadius: 2, background: M.line }} />
        </div>
        {wrapScroll ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: "1 1 auto",
              minHeight: 0,
              overflowY: "auto",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {children}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", flex: "1 1 auto", minHeight: 0, overflow: "hidden" }}>
            {children}
          </div>
        )}
      </motion.div>
    </div>
  );
}
