import { useEffect, useMemo, useState } from "react";
import { M } from "../theme";
import { BottomSheet } from "./BottomSheet";
import { MButton } from "./MButton";
import { NutritionStepperStack } from "./NutritionStepperStack";
import { createProteinLog } from "../lib/db";
import { calcProteinG } from "../lib/foodProduct";

export interface ManualProteinLogSheetProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  userId: string;
}

export function ManualProteinLogSheet({ open, onClose, onSaved, userId }: ManualProteinLogSheetProps) {
  const [proteinPer100g, setProteinPer100g] = useState(20);
  const [amountG, setAmountG] = useState(100);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setProteinPer100g(20);
    setAmountG(100);
    setLabel("");
    setBusy(false);
    setError(null);
  }, [open]);

  const previewProtein = useMemo(
    () =>
      calcProteinG({
        amountG,
        proteinPer100g,
        basis: "per_100g",
      }),
    [amountG, proteinPer100g],
  );

  const handleSave = async () => {
    if (proteinPer100g <= 0 || amountG <= 0) {
      setError("Protein pro 100 g und Menge müssen größer als 0 sein.");
      return;
    }
    if (previewProtein <= 0) {
      setError("Berechnetes Protein muss größer als 0 sein.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createProteinLog(userId, {
        proteinG: previewProtein,
        label: label.trim() || "Protein",
        amountG,
        source: "manual",
      });
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} aria-label="Protein manuell loggen">
      <div style={{ fontFamily: M.disp, fontWeight: 700, fontSize: 20, marginBottom: 8 }}>Protein manuell</div>
      <p style={{ margin: "0 0 16px", fontSize: 13, color: M.mut, lineHeight: 1.45 }}>
        Nährwert vom Etikett eingeben — Protein wird aus Menge berechnet.
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
            label: "Menge in g",
            value: amountG,
            step: 5,
            min: 5,
            onChange: setAmountG,
          },
        ]}
      />
      <input
        type="text"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Bezeichnung (optional)"
        style={{
          width: "100%",
          marginTop: 16,
          padding: "10px 12px",
          borderRadius: 10,
          border: "1px solid " + M.line2,
          background: M.panel,
          color: M.fg,
          fontSize: 14,
        }}
      />
      <div style={{ fontSize: 14, color: M.brand, fontWeight: 700, marginTop: 16, marginBottom: 16, textAlign: "center" }}>
        ≈ {previewProtein} g Protein
      </div>
      <MButton
        type="button"
        variant="primary"
        size="md"
        fullWidth
        disabled={busy}
        onClick={() => void handleSave()}
      >
        Hinzufügen
      </MButton>
    </BottomSheet>
  );
}
