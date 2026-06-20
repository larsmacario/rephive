import { AnimatePresence, motion, useDragControls } from "framer-motion";
import type { PointerEvent } from "react";
import type { SaveSessionInput } from "../lib/db";
import { useActiveTimer } from "../lib/activeTimer";
import { M } from "../theme";
import { IntervalTimerWizard } from "./intervalTimer/IntervalTimerWizard";

const DISMISS_OFFSET_PX = 72;
const DISMISS_VELOCITY = 500;
const PANEL_TRANSITION = { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const };

export interface IntervalTimerSheetProps {
  open: boolean;
  onClose: () => void;
  onSaveSession: (input: SaveSessionInput) => Promise<void>;
}

export function IntervalTimerSheet({ open, onClose, onSaveSession }: IntervalTimerSheetProps) {
  const dragControls = useDragControls();
  const { active: timerActive } = useActiveTimer();

  const tryClose = () => {
    if (timerActive) return;
    onClose();
  };

  const handleDragEnd = (_: unknown, info: { offset: { y: number }; velocity: { y: number } }) => {
    if (timerActive) return;
    if (info.offset.y > DISMISS_OFFSET_PX || info.velocity.y > DISMISS_VELOCITY) {
      onClose();
    }
  };

  const startDrag = (e: PointerEvent) => {
    dragControls.start(e);
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.button
            type="button"
            aria-label="Intervall-Timer schließen"
            key="interval-timer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            onClick={tryClose}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 29,
              border: "none",
              padding: 0,
              cursor: "pointer",
              background: "rgba(5,7,5,.6)",
              backdropFilter: "blur(4px)",
            }}
          />
        )}
      </AnimatePresence>
      <motion.div
        role="dialog"
        aria-modal={open}
        aria-hidden={!open}
        aria-label="Intervall-Timer"
        drag={open && !timerActive ? "y" : false}
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.6 }}
        dragSnapToOrigin
        onDragEnd={handleDragEnd}
        initial={false}
        animate={{ y: open ? 0 : "108%" }}
        transition={PANEL_TRANSITION}
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 30,
          margin: "0 auto",
          maxWidth: 480,
          maxHeight: "min(92dvh, 92vh)",
          background: M.panel,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          borderTop: "1px solid " + M.line,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          padding: "16px 18px 24px",
          boxSizing: "border-box",
          pointerEvents: open ? "auto" : "none",
        }}
      >
        <div
          onPointerDown={startDrag}
          style={{
            flexShrink: 0,
            padding: "4px 0 14px",
            cursor: open && !timerActive ? "grab" : "default",
            touchAction: "none",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div style={{ width: 40, height: 4, borderRadius: 2, background: M.line }} />
        </div>
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              fontFamily: M.disp,
              fontWeight: 700,
              fontSize: 20,
              color: M.fg,
              marginBottom: 4,
              flexShrink: 0,
            }}
          >
            Intervall-Timer
          </div>
          <IntervalTimerWizard
            variant="sheet"
            onSaveSession={onSaveSession}
            onExit={tryClose}
          />
        </div>
      </motion.div>
    </>
  );
}
