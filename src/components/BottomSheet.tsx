import { useDragControls, motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";
import type { CSSProperties, ReactNode, PointerEvent } from "react";
import { contentColumnStyle, useBreakpoint } from "../lib/responsive";
import { M } from "../theme";

const DISMISS_OFFSET_PX = 72;
const DISMISS_VELOCITY = 500;
export const BOTTOM_SHEET_MAX_HEIGHT = "min(95dvh, 95vh)";
const BACKDROP_TRANSITION = { duration: 0.22, ease: "easeOut" as const };
const PANEL_TRANSITION = { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const };

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
  /** Shrink panel to content height; scroll only when content exceeds maxHeight. */
  fitContent?: boolean;
  lockBodyScroll?: boolean;
}

const INTERACTIVE_SELECTOR =
  "button, input, textarea, select, label, a, [contenteditable=true], [data-sheet-no-drag]";

function isInteractiveSheetTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest(INTERACTIVE_SELECTOR));
}

export function BottomSheet({
  open,
  onClose,
  children,
  zIndex = 20,
  "aria-label": ariaLabel,
  position = "fixed",
  maxHeight = BOTTOM_SHEET_MAX_HEIGHT,
  wrapScroll = true,
  fitContent = true,
  lockBodyScroll = false,
}: BottomSheetProps) {
  const breakpoint = useBreakpoint();
  const columnStyle = contentColumnStyle(breakpoint);
  const dragControls = useDragControls();

  useEffect(() => {
    if (!open || !lockBodyScroll) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open, lockBodyScroll]);

  const handleDragEnd = (_: unknown, info: { offset: { y: number }; velocity: { y: number } }) => {
    if (info.offset.y > DISMISS_OFFSET_PX || info.velocity.y > DISMISS_VELOCITY) {
      onClose();
    }
  };

  const startDrag = (e: PointerEvent) => {
    if (isInteractiveSheetTarget(e.target)) return;
    dragControls.start(e);
  };

  const overlayStyle: CSSProperties = {
    position,
    inset: 0,
    background: "rgba(20,20,20,.72)",
    backdropFilter: "blur(4px)",
    zIndex,
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-end",
  };

  const backdropTapStyle: CSSProperties = {
    flex: 1,
    minHeight: 0,
    cursor: "pointer",
  };

  const panelStyle: CSSProperties = {
    ...columnStyle,
    background: M.panel,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTop: "1px solid " + M.line,
    maxHeight,
    height: fitContent ? "auto" : undefined,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    padding: "16px 18px 24px",
    boxSizing: "border-box",
  };

  const scrollWrapStyle: CSSProperties = fitContent
    ? {
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        maxHeight: `calc(${maxHeight} - 38px)`,
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
      }
    : {
        display: "flex",
        flexDirection: "column",
        flex: "1 1 auto",
        minHeight: 0,
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
      };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="bottom-sheet-overlay"
          style={overlayStyle}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={BACKDROP_TRANSITION}
        >
          <div aria-hidden style={backdropTapStyle} onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            dragSnapToOrigin
            onDragEnd={handleDragEnd}
            onPointerDown={startDrag}
            style={panelStyle}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={PANEL_TRANSITION}
          >
            <div
              style={{
                flexShrink: 0,
                padding: "4px 0 14px",
                cursor: "grab",
                touchAction: "none",
                display: "flex",
                justifyContent: "center",
                pointerEvents: "none",
              }}
            >
              <div style={{ width: 40, height: 4, borderRadius: 2, background: M.line }} />
            </div>
            {wrapScroll ? (
              <div style={scrollWrapStyle}>{children}</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", flex: "1 1 auto", minHeight: 0, overflow: "hidden" }}>
                {children}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
