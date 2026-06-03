import { useState, type ReactNode } from "react";
import { M } from "../theme";
import { BottomSheet } from "./BottomSheet";

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
    <BottomSheet
      open
      onClose={handleCancel}
      position="absolute"
      zIndex={40}
      wrapScroll={false}
      aria-label={displayTitle}
    >
      <div style={{ fontFamily: M.disp, fontWeight: 700, fontSize: 22, marginBottom: 8, flexShrink: 0 }}>{displayTitle}</div>
      <div style={{ color: M.mut, fontSize: 14, marginBottom: 18, lineHeight: 1.45, flexShrink: 0 }}>{displayMessage}</div>
      <button
        type="button"
        disabled={busy && isFinalStep}
        onClick={handlePrimary}
        style={{
          width: "100%",
          padding: "14px 0",
          borderRadius: 14,
          border: "none",
          background: isFinalStep ? "#c44" : M.card,
          color: isFinalStep ? "#fff" : M.fg,
          fontFamily: M.disp,
          fontWeight: 700,
          fontSize: 17,
          letterSpacing: isFinalStep ? 0 : undefined,
          cursor: busy && isFinalStep ? "wait" : "pointer",
          opacity: busy && isFinalStep ? 0.7 : 1,
          marginBottom: 10,
          flexShrink: 0,
        }}
      >
        {busy && isFinalStep ? "…" : isFinalStep ? "Löschen" : "Weiter"}
      </button>
      <button
        type="button"
        onClick={handleCancel}
        style={{
          width: "100%",
          padding: "12px 0",
          borderRadius: 14,
          border: "none",
          background: "transparent",
          color: M.mut,
          fontFamily: M.body,
          fontWeight: 600,
          fontSize: 15,
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        Abbrechen
      </button>
    </BottomSheet>
  );
}
