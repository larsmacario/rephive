import { useEffect, useState, type ReactNode } from "react";
import { M } from "../theme";
import { BottomSheet } from "./BottomSheet";
import { MButton } from "./MButton";

export interface DeleteConfirmDialogProps {
  open?: boolean;
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
  open = true,
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

  useEffect(() => {
    if (!open) setStep(1);
  }, [open]);

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
      open={open}
      onClose={handleCancel}
      position="absolute"
      zIndex={40}
      wrapScroll={false}
      aria-label={displayTitle}
    >
      <div style={{ fontFamily: M.disp, fontWeight: 700, fontSize: 22, marginBottom: 8, flexShrink: 0 }}>{displayTitle}</div>
      <div style={{ color: M.mut, fontSize: 14, marginBottom: 18, lineHeight: 1.45, flexShrink: 0 }}>{displayMessage}</div>
      <MButton
        type="button"
        disabled={busy && isFinalStep}
        onClick={handlePrimary}
        variant={isFinalStep ? "danger" : "secondary"}
        size="md"
        fullWidth
        style={{ marginBottom: 10, flexShrink: 0, background: isFinalStep ? "rgba(245,180,180,.08)" : undefined }}
      >
        {busy && isFinalStep ? "…" : isFinalStep ? "Löschen" : "Weiter"}
      </MButton>
      <MButton type="button" onClick={handleCancel} variant="ghost" size="md" fullWidth style={{ flexShrink: 0 }}>
        Abbrechen
      </MButton>
    </BottomSheet>
  );
}
