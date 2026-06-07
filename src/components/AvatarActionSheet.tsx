import { BottomSheet } from "./BottomSheet";
import { MButton } from "./MButton";
import { M } from "../theme";

export interface AvatarActionSheetProps {
  open: boolean;
  onClose: () => void;
  onChoosePhoto: () => void;
  onRemovePhoto: () => void;
}

export function AvatarActionSheet({ open, onClose, onChoosePhoto, onRemovePhoto }: AvatarActionSheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose} position="absolute" zIndex={30} aria-label="Profilbild-Aktionen">
      <div style={{ fontFamily: M.disp, fontWeight: 700, fontSize: 20, marginBottom: 14 }}>Profilbild</div>
      <MButton
        type="button"
        onClick={() => {
          onClose();
          onChoosePhoto();
        }}
        variant="primary"
        size="md"
        fullWidth
        style={{ marginBottom: 10 }}
      >
        Neues Bild wählen
      </MButton>
      <MButton
        type="button"
        onClick={() => {
          onClose();
          onRemovePhoto();
        }}
        variant="ghost"
        size="md"
        fullWidth
        style={{ color: "#ff8a8a" }}
      >
        Profilbild entfernen
      </MButton>
    </BottomSheet>
  );
}
