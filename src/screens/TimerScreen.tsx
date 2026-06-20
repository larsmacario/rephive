import { contentMaxWidth, useBreakpoint } from "../lib/responsive";
import type { SaveSessionInput } from "../lib/db";
import { IntervalTimerWizard } from "../components/intervalTimer/IntervalTimerWizard";

export interface TimerScreenProps {
  onSaveSession: (input: SaveSessionInput) => Promise<void>;
  onBack: () => void;
}

export function TimerScreen({ onSaveSession, onBack }: TimerScreenProps) {
  const breakpoint = useBreakpoint();
  const maxW = contentMaxWidth(breakpoint);

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        width: "100%",
        maxWidth: maxW,
        margin: maxW ? "0 auto" : undefined,
        padding: "0 22px",
        boxSizing: "border-box",
      }}
    >
      <IntervalTimerWizard
        variant="screen"
        onSaveSession={onSaveSession}
        onExit={onBack}
        showHeader
      />
    </div>
  );
}
