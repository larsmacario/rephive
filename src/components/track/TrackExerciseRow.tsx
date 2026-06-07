import { EXERCISE_ROW, exerciseRowStyle, M } from "../../theme";
import { ExerciseListRowText } from "../ExerciseListRow";
import { Icon } from "../Icon";

export interface TrackExerciseRowProps {
  index: number;
  name: string;
  doneSets: number;
  totalSets: number;
  onOpen: () => void;
  onOpenMenu: () => void;
}

export function TrackExerciseRow({
  index,
  name,
  doneSets,
  totalSets,
  onOpen,
  onOpenMenu,
}: TrackExerciseRowProps) {
  const complete = totalSets > 0 && doneSets === totalSets;

  return (
    <div style={exerciseRowStyle({ background: "panel" })}>
      <button
        type="button"
        onClick={onOpen}
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          alignItems: "center",
          gap: EXERCISE_ROW.gap,
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <div
          style={{
            width: EXERCISE_ROW.iconSize,
            height: EXERCISE_ROW.iconSize,
            borderRadius: "50%",
            flex: "0 0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: complete ? M.brand : "transparent",
            border: complete ? "none" : "2px solid " + M.mut2,
            color: complete ? M.brandInk : M.fg,
            fontFamily: M.disp,
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          {complete ? <Icon name="check" size={16} stroke={2.6} /> : index + 1}
        </div>
        <ExerciseListRowText
          title={name}
          subtitle={`${doneSets}/${totalSets} Sätze abgeschlossen`}
        />
      </button>
      <button
        type="button"
        aria-label="Übungsmenü"
        onClick={(e) => {
          e.stopPropagation();
          onOpenMenu();
        }}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: M.mut2,
          display: "flex",
          padding: 4,
          flexShrink: 0,
        }}
      >
        <Icon name="moreH" size={20} stroke={2.4} color={M.mut2} />
      </button>
    </div>
  );
}
