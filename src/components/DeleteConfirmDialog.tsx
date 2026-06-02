import { useState, type CSSProperties, type ReactNode } from "react";
import { M } from "../theme";

export interface DeleteConfirmDialogProps {
  title: string;
  message: ReactNode;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
  busy?: boolean;
  /** Schritt 2 (Pläne, Workouts, Sessions): Weiter → rotes Löschen */
  step2Title?: string;
  step2Message?: ReactNode;
}

const overlayStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  background: "rgba(5,7,5,.65)",
  backdropFilter: "blur(4px)",
  zIndex: 30,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 22,
};

const panelStyle: CSSProperties = {
  width: "100%",
  maxWidth: 340,
  background: M.panel,
  border: "1px solid " + M.line,
  borderRadius: 20,
  padding: "22px 20px 18px",
};

const cancelBtnStyle: CSSProperties = {
  flex: 1,
  padding: "12px 0",
  borderRadius: 12,
  border: "1px solid " + M.line,
  background: "transparent",
  color: M.fg,
  fontFamily: M.body,
  fontWeight: 600,
  fontSize: 14,
  cursor: "pointer",
};

const continueBtnStyle: CSSProperties = {
  flex: 1,
  padding: "12px 0",
  borderRadius: 12,
  border: "none",
  background: M.card,
  color: M.fg,
  fontFamily: M.disp,
  fontWeight: 700,
  fontSize: 15,
  cursor: "pointer",
};

const deleteBtnStyle: CSSProperties = {
  flex: 1,
  padding: "12px 0",
  borderRadius: 12,
  border: "none",
  background: "#c44",
  color: "#fff",
  fontFamily: M.disp,
  fontWeight: 700,
  fontSize: 15,
  cursor: "pointer",
};

export function DeleteConfirmDialog({
  title,
  message,
  onCancel,
  onConfirm,
  busy = false,
  step2Title,
  step2Message,
}: DeleteConfirmDialogProps) {
  const twoStep = Boolean(step2Title && step2Message);
  const [step, setStep] = useState<1 | 2>(1);

  const isFinalStep = !twoStep || step === 2;
  const displayTitle = step === 2 && step2Title ? step2Title : title;
  const displayMessage = step === 2 && step2Message ? step2Message : message;

  const handleCancel = () => {
    setStep(1);
    onCancel();
  };

  const handlePrimary = () => {
    if (twoStep && step === 1) {
      setStep(2);
      return;
    }
    void onConfirm();
  };

  return (
    <div style={overlayStyle} onClick={handleCancel}>
      <div onClick={(e) => e.stopPropagation()} style={panelStyle}>
        <div style={{ fontFamily: M.disp, fontWeight: 700, fontSize: 22, lineHeight: 1.15 }}>{displayTitle}</div>
        <div style={{ color: M.mut, fontSize: 14, marginTop: 10, lineHeight: 1.45 }}>{displayMessage}</div>
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button type="button" onClick={handleCancel} style={cancelBtnStyle}>
            Abbrechen
          </button>
          <button
            type="button"
            disabled={busy && isFinalStep}
            onClick={handlePrimary}
            style={{
              ...(isFinalStep ? deleteBtnStyle : continueBtnStyle),
              cursor: busy && isFinalStep ? "wait" : "pointer",
              opacity: busy && isFinalStep ? 0.7 : 1,
            }}
          >
            {busy && isFinalStep ? "…" : isFinalStep ? "Löschen" : "Weiter"}
          </button>
        </div>
      </div>
    </div>
  );
}
