import { M } from "../theme";
import { Icon } from "./Icon";

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
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(5,7,5,.6)",
        backdropFilter: "blur(4px)",
        zIndex: 40,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: M.panel,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          borderTop: "1px solid " + M.line,
          padding: "16px 18px 28px",
        }}
      >
        <div style={{ width: 40, height: 4, borderRadius: 2, background: M.line, margin: "0 auto 14px" }} />
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
            }}
          >
            <Icon name={icon} size={22} stroke={2.2} color={M.acc} />
          </div>
        )}
        <div style={{ fontFamily: M.disp, fontWeight: 700, fontSize: 22, marginBottom: 8 }}>{title}</div>
        <div style={{ color: M.mut, fontSize: 14, marginBottom: 18, lineHeight: 1.45 }}>{message}</div>
        <button
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
          }}
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}
