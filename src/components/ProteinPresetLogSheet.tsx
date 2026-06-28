import { useEffect, useMemo, useState } from "react";
import { M } from "../theme";
import { BottomSheet } from "./BottomSheet";
import { MButton } from "./MButton";
import { NutritionStepperStack } from "./NutritionStepperStack";
import { createProteinLog, type ProteinLogSource } from "../lib/db";
import { calcProteinG } from "../lib/foodProduct";
import type { RecoveryFoodPreset } from "../lib/recoveryEngine";

export interface ProteinPresetLogSheetProps {
  open: boolean;
  preset: RecoveryFoodPreset | null;
  onClose: () => void;
  onSaved: () => void;
  userId: string;
  logSource?: Extract<ProteinLogSource, "quick" | "post_workout">;
}

export function ProteinPresetLogSheet({
  open,
  preset,
  onClose,
  onSaved,
  userId,
  logSource = "quick",
}: ProteinPresetLogSheetProps) {
  const [proteinPer100g, setProteinPer100g] = useState(20);
  const [amountG, setAmountG] = useState(100);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !preset) return;
    setProteinPer100g(preset.proteinPer100g);
    setAmountG(preset.defaultAmountG);
    setBusy(false);
    setError(null);
  }, [open, preset?.id]);

  const previewProtein = useMemo(
    () =>
      preset
        ? calcProteinG({
            amountG,
            proteinPer100g,
            basis: "per_100g",
          })
        : 0,
    [preset, amountG, proteinPer100g],
  );

  const handleSave = async () => {
    if (!preset || proteinPer100g <= 0 || amountG <= 0) {
      setError("Protein pro 100 g und Menge müssen größer als 0 sein.");
      return;
    }
    if (previewProtein <= 0) {
      setError("Protein-Menge muss größer als 0 sein.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createProteinLog(userId, {
        proteinG: previewProtein,
        label: preset.label,
        amountG,
        source: logSource,
      });
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  };

  if (!preset) return null;

  return (
    <BottomSheet open={open} onClose={onClose} aria-label={`${preset.label} loggen`}>
      <div style={{ fontFamily: M.disp, fontWeight: 700, fontSize: 20, marginBottom: 8 }}>{preset.label}</div>
      <p style={{ margin: "0 0 16px", fontSize: 13, color: M.mut, lineHeight: 1.45 }}>
        Schätzwert — Nährwert und Portion anpassen. Protein wird berechnet.
      </p>

      {error ? (
        <div style={{ color: "#ef4444", fontSize: 13, marginBottom: 12, lineHeight: 1.45 }}>{error}</div>
      ) : null}

      <NutritionStepperStack
        fields={[
          {
            id: "proteinPer100g",
            label: "Protein pro 100 g",
            value: Math.round(proteinPer100g * 10) / 10,
            step: 0.5,
            min: 0.5,
            onChange: setProteinPer100g,
          },
          {
            id: "amountG",
            label: preset.amountHint ?? "Menge in g",
            value: amountG,
            step: preset.id === "shake" ? 5 : 10,
            min: 5,
            onChange: setAmountG,
          },
        ]}
      />
      <div style={{ fontSize: 14, color: M.brand, fontWeight: 700, marginTop: 16, marginBottom: 16, textAlign: "center" }}>
        ≈ {previewProtein} g Protein
      </div>
      <MButton type="button" variant="primary" size="md" fullWidth disabled={busy} onClick={() => void handleSave()}>
        Hinzufügen
      </MButton>
    </BottomSheet>
  );
}
