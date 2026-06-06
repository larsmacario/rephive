import { contentMaxWidth, useBreakpoint } from "../lib/responsive";
import type { SaveSessionInput } from "../lib/db";
import { IntervalTimerPanel } from "../components/IntervalTimerPanel";

export interface TimerScreenProps {
  onSaveSession: (input: SaveSessionInput) => Promise<void>;
}

export function TimerScreen({ onSaveSession }: TimerScreenProps) {
  const breakpoint = useBreakpoint();
  const maxW = contentMaxWidth(breakpoint);

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        padding: "6px 22px 10px",
        minHeight: 0,
        width: "100%",
        maxWidth: maxW,
        margin: maxW ? "0 auto" : undefined,
        position: "relative",
      }}
    >
      <IntervalTimerPanel onSaveSession={onSaveSession} variant="screen" />
    </div>
  );
}
