import { useEffect, useState } from "react";
import { BottomSheet } from "../BottomSheet";
import { MButton } from "../MButton";
import { M } from "../../theme";

export interface TrackExerciseNoteSheetProps {
  open: boolean;
  exerciseName: string;
  note: string;
  onClose: () => void;
  onSave: (note: string) => void;
}

export function TrackExerciseNoteSheet({
  open,
  exerciseName,
  note,
  onClose,
  onSave,
}: TrackExerciseNoteSheetProps) {
  const [draft, setDraft] = useState(note);

  useEffect(() => {
    if (open) setDraft(note);
  }, [open, note]);

  return (
    <BottomSheet open={open} onClose={onClose} aria-label={`Notizen · ${exerciseName}`} fitContent>
      <div style={{ padding: "4px 20px 24px" }}>
        <div style={{ fontFamily: M.disp, fontWeight: 700, fontSize: 18, color: M.fg, marginBottom: 12 }}>
          Notizen
        </div>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="z. B. Tempo, Fokus, Schmerzen…"
          rows={4}
          style={{
            width: "100%",
            boxSizing: "border-box",
            background: M.cardHi,
            border: "1px solid " + M.line2,
            borderRadius: 12,
            color: M.fg,
            fontFamily: M.body,
            fontSize: 14,
            lineHeight: 1.45,
            padding: "12px 14px",
            resize: "vertical",
            outline: "none",
          }}
        />
        <MButton
          type="button"
          variant="primary"
          size="md"
          fullWidth
          onClick={() => {
            onSave(draft);
            onClose();
          }}
          style={{ marginTop: 14, fontFamily: M.disp, letterSpacing: 0.4 }}
        >
          Speichern
        </MButton>
      </div>
    </BottomSheet>
  );
}
