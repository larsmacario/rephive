import { useEffect, useState } from "react";
import { createWaterLog } from "../lib/db";
import { formatWaterAmount } from "../lib/hydration";
import { M } from "../theme";
import { BottomSheet } from "./BottomSheet";
import { MButton } from "./MButton";
import { NutritionStepperStack } from "./NutritionStepperStack";

export interface WaterAmountSheetProps {
  open: boolean;
  userId: string;
  onClose: () => void;
  onSaved: () => void;
}

export function WaterAmountSheet({ open, userId, onClose, onSaved }: WaterAmountSheetProps) {
  const [amountMl, setAmountMl] = useState(250);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setAmountMl(250);
    setBusy(false);
    setError(null);
  }, [open]);

  const handleSave = async () => {
    const normalized = Math.min(3000, Math.max(50, Math.round(amountMl / 50) * 50));
    setBusy(true);
    setError(null);
    try {
      await createWaterLog(userId, { amountMl: normalized, source: "manual" });
      onSaved();
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Speichern fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} aria-label="Wassermenge eingeben">
      <div style={{ fontFamily: M.disp, fontWeight: 700, fontSize: 20, marginBottom: 8 }}>Wasser eintragen</div>
      <p style={{ margin: "0 0 16px", fontSize: 13, color: M.mut, lineHeight: 1.45 }}>
        Menge in 50-ml-Schritten anpassen.
      </p>
      {error ? <div style={{ color: "#ef4444", fontSize: 13, marginBottom: 12 }}>{error}</div> : null}
      <NutritionStepperStack
        fields={[
          {
            id: "waterAmount",
            label: "Menge in ml",
            value: amountMl,
            step: 50,
            min: 50,
            onChange: (value) => setAmountMl(Math.min(3000, value)),
          },
        ]}
      />
      <div style={{ color: M.brand, fontSize: 14, fontWeight: 700, margin: "16px 0", textAlign: "center" }}>
        {formatWaterAmount(amountMl)}
      </div>
      <MButton type="button" variant="primary" size="md" fullWidth disabled={busy} onClick={() => void handleSave()}>
        Hinzufügen
      </MButton>
    </BottomSheet>
  );
}
