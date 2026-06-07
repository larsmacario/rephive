import type { CSSProperties, ReactNode } from "react";
import {
  EXERCISE_ROW,
  exerciseRowEllipsis,
  exerciseRowStyle,
  M,
  type ExerciseRowBackground,
} from "../theme";
import { Icon } from "./Icon";

export interface ExerciseListRowProps {
  title: ReactNode;
  subtitle?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  onClick?: () => void;
  background?: ExerciseRowBackground;
  borderRadius?: number;
  style?: CSSProperties;
}

function TextBlock({ title, subtitle }: { title: ReactNode; subtitle?: string }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div
        style={{
          color: M.fg,
          fontWeight: 600,
          fontSize: EXERCISE_ROW.titleSize,
          lineHeight: 1.2,
          minWidth: 0,
          ...(typeof title === "string" ? exerciseRowEllipsis : null),
        }}
      >
        {title}
      </div>
      {subtitle ? (
        <div
          style={{
            color: M.mut,
            fontSize: EXERCISE_ROW.metaSize,
            marginTop: 1,
            fontWeight: 500,
            lineHeight: 1.2,
            ...exerciseRowEllipsis,
          }}
        >
          {subtitle}
        </div>
      ) : null}
    </div>
  );
}

export function ExerciseListRow({
  title,
  subtitle,
  leading,
  trailing,
  onClick,
  background = "panel",
  borderRadius,
  style,
}: ExerciseListRowProps) {
  const shellStyle = { ...exerciseRowStyle({ background, borderRadius }), ...style };

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        style={{
          ...shellStyle,
          cursor: "pointer",
          textAlign: "left",
          font: "inherit",
          color: "inherit",
        }}
      >
        {leading}
        <TextBlock title={title} subtitle={subtitle} />
        {trailing}
      </button>
    );
  }

  return (
    <div style={shellStyle}>
      {leading}
      <TextBlock title={title} subtitle={subtitle} />
      {trailing}
    </div>
  );
}

export function ExerciseListRowText({ title, subtitle }: { title: ReactNode; subtitle?: string }) {
  return <TextBlock title={title} subtitle={subtitle} />;
}

export function ExerciseListRowDumbbellIcon() {
  return (
    <div
      style={{
        width: EXERCISE_ROW.iconSize,
        height: EXERCISE_ROW.iconSize,
        borderRadius: EXERCISE_ROW.iconRadius,
        background: M.accSoft,
        color: M.acc,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flex: "0 0 auto",
      }}
    >
      <Icon name="dumbbell" size={17} stroke={2} />
    </div>
  );
}
