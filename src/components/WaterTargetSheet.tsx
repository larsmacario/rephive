import { useEffect, useState } from "react";
import {
  clampWaterTargetMl,
  formatWaterAmount,
  WATER_TARGET_MIN_ML,
  WATER_TARGET_STEP_ML,
} from "../lib/hydration";
import { M } from "../theme";
import { BottomSheet } from "./BottomSheet";
import { MButton } from "./MButton";
import { NutritionStepperStack } from "./NutritionStepperStack";

export interface WaterTargetSheetProps {
  open: boolean;
  targetMl: number;
  onClose: () => void;
  onSave: (targetMl: number | null) => void | Promise<void>;
}

export function WaterTargetSheet({ open, targetMl, onClose, onSave }: WaterTargetSheetProps) {
  const [value, setValue] = useState(targetMl);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setValue(targetMl);
    setBusy(false);
  }, [open, targetMl]);

  const save = async (next: number | null) => {
    setBusy(true);
    try {
      await onSave(next);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} aria-label="Wasserziel anpassen">
      <div style={{ fontFamily: M.disp, fontWeight: 700, fontSize: 20, marginBottom: 8 }}>Tagesziel</div>
      <p style={{ margin: "0 0 16px", fontSize: 13, color: M.mut, lineHeight: 1.45 }}>
        Persönliches Ziel festlegen oder wieder automatisch aus Plan und Profil bestimmen lassen.
      </p>
      <NutritionStepperStack
        fields={[
          {
            id: "waterTarget",
            label: "Ziel in ml",
            value,
            step: WATER_TARGET_STEP_ML,
            min: WATER_TARGET_MIN_ML,
            onChange: (next) => setValue(clampWaterTargetMl(next)),
          },
        ]}
      />
      <div style={{ color: M.brand, fontSize: 14, fontWeight: 700, margin: "16px 0", textAlign: "center" }}>
        {formatWaterAmount(value)} pro Tag
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <MButton type="button" variant="secondary" size="md" disabled={busy} onClick={() => void save(null)} style={{ flex: 1 }}>
          Automatisch
        </MButton>
        <MButton type="button" variant="primary" size="md" disabled={busy} onClick={() => void save(clampWaterTargetMl(value))} style={{ flex: 1 }}>
          Speichern
        </MButton>
      </div>
    </BottomSheet>
  );
}
