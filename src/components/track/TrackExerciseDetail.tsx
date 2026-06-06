import type { ReactNode } from "react";
import { fmtUp } from "../../lib/engine";
import { M } from "../../theme";
import { HorizontalSlidePager } from "../HorizontalSlidePager";
import { Icon } from "../Icon";
import { MButton } from "../MButton";

export interface TrackExerciseDetailProps {
  elapsedSec: number;
  activeIndex: number;
  onIndexChange: (index: number) => void;
  onBack: () => void;
  onOpenOneRm: () => void;
  onOpenTimer: () => void;
  slides: ReactNode[];
}

export function TrackExerciseDetail({
  elapsedSec,
  activeIndex,
  onIndexChange,
  onBack,
  onOpenOneRm,
  onOpenTimer,
  slides,
}: TrackExerciseDetailProps) {
  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center",
          gap: 12,
          padding: "8px 18px 20px",
          flexShrink: 0,
        }}
      >
        <div style={{ justifySelf: "start" }}>
          <MButton onClick={onBack} variant="secondary" size="icon" aria-label="Zur Übersicht">
            <Icon name="chevL" size={18} stroke={2.2} />
          </MButton>
        </div>
        <div
          style={{
            textAlign: "center",
            fontFamily: M.disp,
            fontWeight: 700,
            fontSize: 22,
            fontVariantNumeric: "tabular-nums",
            color: M.fg,
            whiteSpace: "nowrap",
          }}
        >
          {fmtUp(elapsedSec)}
        </div>
        <div style={{ justifySelf: "end", display: "flex", alignItems: "center", gap: 8 }}>
          <MButton
            type="button"
            aria-label="1RM-Rechner"
            onClick={onOpenOneRm}
            variant="secondary"
            size="icon"
            style={{ flexShrink: 0, color: M.fg }}
          >
            <Icon name="calculator" size={17} stroke={2} />
          </MButton>
          <MButton
            type="button"
            aria-label="Intervall-Timer"
            onClick={onOpenTimer}
            variant="secondary"
            size="icon"
            style={{ flexShrink: 0, color: M.fg }}
          >
            <Icon name="timer" size={17} stroke={2} />
          </MButton>
        </div>
      </div>

      <HorizontalSlidePager
        count={slides.length}
        activeIndex={activeIndex}
        onIndexChange={onIndexChange}
        ariaLabel="Übungen"
        indicatorVariant="dots"
        showIndicators={slides.length > 1}
      >
        {slides}
      </HorizontalSlidePager>
    </div>
  );
}
