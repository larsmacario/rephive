import { M } from "../../theme";
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
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "14px 0",
        borderBottom: "1px solid " + M.line2,
        flexShrink: 0,
      }}
    >
      <button
        type="button"
        onClick={onOpen}
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          alignItems: "center",
          gap: 12,
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
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
            fontSize: 15,
          }}
        >
          {complete ? <Icon name="check" size={16} stroke={2.6} /> : index + 1}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              color: M.fg,
              fontWeight: 600,
              fontSize: 16,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {name}
          </div>
          <div style={{ color: M.mut, fontSize: 12, marginTop: 2 }}>
            {doneSets}/{totalSets} Sätze abgeschlossen
          </div>
        </div>
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
          padding: 8,
          flexShrink: 0,
        }}
      >
        <Icon name="moreH" size={20} stroke={2.4} color={M.mut2} />
      </button>
    </div>
  );
}
