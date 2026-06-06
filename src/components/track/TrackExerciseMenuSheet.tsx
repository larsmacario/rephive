import { BottomSheet } from "../BottomSheet";
import { Icon } from "../Icon";
import { M } from "../../theme";

export interface TrackExerciseMenuSheetProps {
  open: boolean;
  exerciseName: string;
  hasVideo: boolean;
  showSupersetAction: boolean;
  linkedToPrevious: boolean;
  onClose: () => void;
  onVideo?: () => void;
  onHistory: () => void;
  onRemove: () => void;
  onToggleSuperset?: () => void;
}

function MenuAction({
  label,
  icon,
  onClick,
  danger = false,
}: {
  label: string;
  icon: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "14px 4px",
        background: "none",
        border: "none",
        borderBottom: "1px solid " + M.line2,
        cursor: "pointer",
        color: danger ? "#f5b4b4" : M.fg,
        fontSize: 15,
        fontWeight: 600,
        textAlign: "left",
      }}
    >
      <Icon name={icon} size={18} stroke={2} color={danger ? "#f5b4b4" : M.mut2} />
      {label}
    </button>
  );
}

export function TrackExerciseMenuSheet({
  open,
  exerciseName,
  hasVideo,
  showSupersetAction,
  linkedToPrevious,
  onClose,
  onVideo,
  onHistory,
  onRemove,
  onToggleSuperset,
}: TrackExerciseMenuSheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose} aria-label={`Menü · ${exerciseName}`} fitContent>
      <div style={{ padding: "4px 20px 20px" }}>
        <div
          style={{
            fontFamily: M.disp,
            fontWeight: 700,
            fontSize: 18,
            color: M.fg,
            marginBottom: 8,
            paddingRight: 8,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {exerciseName}
        </div>
        {hasVideo && onVideo ? (
          <MenuAction
            label="Video ansehen"
            icon="play"
            onClick={() => {
              onClose();
              onVideo();
            }}
          />
        ) : null}
        <MenuAction
          label="Verlauf"
          icon="history"
          onClick={() => {
            onClose();
            onHistory();
          }}
        />
        {showSupersetAction && onToggleSuperset ? (
          <MenuAction
            label={linkedToPrevious ? "Supersatz lösen" : "Mit vorheriger verknüpfen"}
            icon="layers"
            onClick={() => {
              onClose();
              onToggleSuperset();
            }}
          />
        ) : null}
        <MenuAction
          label="Aus Session entfernen"
          icon="trash"
          danger
          onClick={() => {
            onClose();
            onRemove();
          }}
        />
      </div>
    </BottomSheet>
  );
}
