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
  onEditSets?: () => void;
  onGuide?: () => void;
  onHistory: () => void;
  onNotes?: () => void;
  onRemove: () => void;
  onToggleSuperset?: () => void;
  /** Nur Sätze bearbeiten + Aus Session entfernen (Verlauf/Video/Supersatz ausgeblendet). */
  variant?: "full" | "actions";
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
  onEditSets,
  onGuide,
  onHistory,
  onNotes,
  onRemove,
  onToggleSuperset,
  variant = "full",
}: TrackExerciseMenuSheetProps) {
  const compact = variant === "actions";

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
        {hasVideo && onVideo && !compact ? (
          <MenuAction
            label="Video ansehen"
            icon="play"
            onClick={() => {
              onClose();
              onVideo();
            }}
          />
        ) : null}
        {onEditSets ? (
          <MenuAction
            label="Sätze bearbeiten"
            icon="edit"
            onClick={() => {
              onClose();
              onEditSets();
            }}
          />
        ) : null}
        {onGuide ? (
          <MenuAction
            label="Anleitung"
            icon="list"
            onClick={() => {
              onClose();
              onGuide();
            }}
          />
        ) : null}
        {onNotes ? (
          <MenuAction
            label="Notizen"
            icon="edit"
            onClick={() => {
              onClose();
              onNotes();
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
        {showSupersetAction && onToggleSuperset && !compact ? (
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
