import { M } from "../theme";
import { Icon } from "./Icon";
import { BottomSheet } from "./BottomSheet";
import { MButton } from "./MButton";

export interface TimerLeaveSheetProps {
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  message?: string;
  confirmLabel?: string;
}

export function TimerLeaveSheet({
  onConfirm,
  onCancel,
  title = "Timer stoppen?",
  message = "Ein Timer läuft. Beim Tab-Wechsel wird der Timer gestoppt.",
  confirmLabel = "FORTFAHREN",
}: TimerLeaveSheetProps) {
  return (
    <BottomSheet open onClose={onCancel} position="absolute" zIndex={40} aria-label={title}>
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          background: M.accSoft,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 14,
          flexShrink: 0,
        }}
      >
        <Icon name="timer" size={22} stroke={2.2} color={M.acc} />
      </div>
      <div style={{ fontFamily: M.disp, fontWeight: 700, fontSize: 22, marginBottom: 8, flexShrink: 0 }}>{title}</div>
      <div style={{ color: M.mut, fontSize: 14, marginBottom: 18, lineHeight: 1.45, flexShrink: 0 }}>{message}</div>
      <MButton type="button" onClick={onConfirm} variant="primary" size="md" fullWidth style={{ marginBottom: 10, flexShrink: 0 }}>
        {confirmLabel}
      </MButton>
      <MButton type="button" onClick={onCancel} variant="ghost" size="md" fullWidth style={{ flexShrink: 0 }}>
        Abbrechen
      </MButton>
    </BottomSheet>
  );
}
