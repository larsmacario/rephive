import { M } from "../theme";
import { Icon } from "./Icon";
import { BottomSheet } from "./BottomSheet";

export interface AlertSheetProps {
  title: string;
  message: string;
  buttonLabel?: string;
  icon?: string;
  onClose: () => void;
}

export function AlertSheet({
  title,
  message,
  buttonLabel = "OK",
  icon,
  onClose,
}: AlertSheetProps) {
  return (
    <BottomSheet open onClose={onClose} position="absolute" zIndex={40} aria-label={title}>
      {icon && (
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
          <Icon name={icon} size={22} stroke={2.2} color={M.acc} />
        </div>
      )}
      <div style={{ fontFamily: M.disp, fontWeight: 700, fontSize: 22, marginBottom: 8, flexShrink: 0 }}>{title}</div>
      <div style={{ color: M.mut, fontSize: 14, marginBottom: 18, lineHeight: 1.45, flexShrink: 0 }}>{message}</div>
      <button
        type="button"
        onClick={onClose}
        style={{
          width: "100%",
          padding: "14px 0",
          borderRadius: 14,
          border: "none",
          background: M.acc,
          color: M.accInk,
          fontFamily: M.disp,
          fontWeight: 700,
          fontSize: 17,
          letterSpacing: 0.8,
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        {buttonLabel}
      </button>
    </BottomSheet>
  );
}
