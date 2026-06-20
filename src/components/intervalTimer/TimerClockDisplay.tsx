import { splitClockFixed } from "../../lib/engine";
import { M } from "../../theme";

export interface TimerClockDisplayProps {
  seconds: number;
  countUp: boolean;
  fontSize: string;
  color: string;
  minHeight: string;
  marginTop: number;
}

export function TimerClockDisplay({
  seconds,
  countUp,
  fontSize,
  color,
  minHeight,
  marginTop,
}: TimerClockDisplayProps) {
  const { minutes, seconds: secs, minuteSlots } = splitClockFixed(seconds, countUp);
  const ariaLabel = `${minutes}:${secs}`;

  const digitStyle = {
    fontFamily: M.disp,
    fontWeight: 700,
    fontSize,
    lineHeight: 0.82,
    fontVariantNumeric: "tabular-nums" as const,
    fontFeatureSettings: '"tnum" 1',
    letterSpacing: -2,
    color,
  };

  return (
    <span
      role="timer"
      aria-live="off"
      aria-label={ariaLabel}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight,
        marginTop,
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          fontKerning: "none",
        }}
      >
        <span
          style={{
            ...digitStyle,
            display: "inline-block",
            width: `${minuteSlots}ch`,
            textAlign: "right",
          }}
        >
          {minutes}
        </span>
        <span
          style={{
            ...digitStyle,
            display: "inline-block",
            width: "0.28em",
            textAlign: "center",
            letterSpacing: 0,
            lineHeight: 1,
            flexShrink: 0,
          }}
        >
          :
        </span>
        <span
          style={{
            ...digitStyle,
            display: "inline-block",
            width: "2ch",
            textAlign: "left",
          }}
        >
          {secs}
        </span>
      </span>
    </span>
  );
}
