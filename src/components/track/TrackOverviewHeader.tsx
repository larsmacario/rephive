import { M } from "../../theme";
import { Icon } from "../Icon";
import { MButton } from "../MButton";

export interface TrackOverviewHeaderProps {
  elapsedSec: number;
  sessionName: string;
  isCustom: boolean;
  onSessionNameChange?: (name: string) => void;
  onPause: () => void;
}

function fmtUp(sec: number): string {
  sec = Math.max(0, Math.floor(sec));
  const m = Math.floor(sec / 60);
  const ss = sec % 60;
  return `${m}:${String(ss).padStart(2, "0")}`;
}

export function TrackOverviewHeader({
  elapsedSec,
  sessionName,
  isCustom,
  onSessionNameChange,
  onPause,
}: TrackOverviewHeaderProps) {
  return (
    <div style={{ padding: "2px 18px 10px" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div style={{ justifySelf: "start" }}>
          <MButton onClick={onPause} variant="secondary" size="icon" aria-label="Workout pausieren">
            <Icon name="chevD" size={18} stroke={2.2} />
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
        <div style={{ justifySelf: "end", width: 40, flexShrink: 0 }} aria-hidden />
      </div>
      {isCustom ? (
        <input
          value={sessionName}
          onChange={(e) => onSessionNameChange?.(e.target.value)}
          style={{
            width: "100%",
            fontFamily: M.disp,
            fontWeight: 700,
            fontSize: 18,
            lineHeight: 1.2,
            marginTop: 10,
            background: "transparent",
            border: "none",
            color: M.mut,
            outline: "none",
            padding: 0,
            textAlign: "center",
          }}
        />
      ) : (
        <div
          style={{
            fontFamily: M.disp,
            fontWeight: 700,
            fontSize: 18,
            lineHeight: 1.2,
            marginTop: 10,
            textAlign: "center",
            color: M.mut,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {sessionName}
        </div>
      )}
    </div>
  );
}
