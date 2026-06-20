import type { ReactNode } from "react";
import { M } from "../../theme";
import { fmtUp } from "../../lib/engine";
import { HorizontalSlidePager } from "../HorizontalSlidePager";
import { Icon } from "../Icon";
import { MButton } from "../MButton";

export interface TrackExerciseDetailProps {
  activeIndex: number;
  onIndexChange: (index: number) => void;
  slides: ReactNode[];
  elapsedSec: number;
  onBack: () => void;
  onOpenOneRm: () => void;
  onOpenTimer: () => void;
  metricsFooter: ReactNode;
}

export function TrackExerciseDetail({
  activeIndex,
  onIndexChange,
  slides,
  elapsedSec,
  onBack,
  onOpenOneRm,
  onOpenTimer,
  metricsFooter,
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
          padding: "8px 18px 12px",
          flexShrink: 0,
        }}
      >
        <div style={{ justifySelf: "start" }}>
          <button
            type="button"
            onClick={onBack}
            aria-label="Zur Übersicht"
            style={{ background: "none", border: "none", cursor: "pointer", color: M.mut, display: "flex", padding: 0 }}
          >
            <Icon name="chevL" size={24} stroke={2.2} />
          </button>
        </div>
        <div
          style={{
            justifySelf: "center",
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
        <div style={{ justifySelf: "end", display: "flex", alignItems: "center", gap: 8, gridColumn: "3" }}>
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
        footerBeforeIndicators={metricsFooter}
      >
        {slides}
      </HorizontalSlidePager>
    </div>
  );
}
