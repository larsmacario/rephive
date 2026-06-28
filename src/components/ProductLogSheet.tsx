import { useEffect, useRef, useState } from "react";
import { M } from "../theme";
import { BottomSheet } from "./BottomSheet";
import { MButton } from "./MButton";
import { SetValueStepper } from "./SetValueStepper";
import { AiConsentStep } from "./AiConsentStep";
import { Icon } from "./Icon";
import {
  createFoodProduct,
  createProteinLog,
  extractNutritionLabel,
  fetchFoodProductByEan,
  type FoodProduct,
  type ExtractedNutritionLabel,
} from "../lib/db";
import { calcProteinG, defaultAmountG, isValidEan, normalizeEan } from "../lib/foodProduct";
import { scanEan } from "../lib/barcodeScan";
import { fileToBase64Jpeg } from "../lib/nutritionLabelImage";
import { createAiConsentGrant, hasAiConsent, usePreferences } from "../lib/preferences";

type Step = "scan" | "photo" | "review" | "amount" | "consent";

export interface ProductLogSheetProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  userId: string;
  initialEan?: string;
  logSource?: "barcode" | "photo";
}

export function ProductLogSheet({
  open,
  onClose,
  onSaved,
  userId,
  initialEan,
  logSource = "barcode",
}: ProductLogSheetProps) {
  const { preferences, updatePreferences } = usePreferences();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("scan");
  const [eanInput, setEanInput] = useState("");
  const [product, setProduct] = useState<FoodProduct | null>(null);
  const [draft, setDraft] = useState<ExtractedNutritionLabel | null>(null);
  const [amountG, setAmountG] = useState(100);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consentSaving, setConsentSaving] = useState(false);
  const [entrySource, setEntrySource] = useState<"barcode" | "photo">(logSource);

  const reset = () => {
    setStep("scan");
    setEanInput(initialEan ?? "");
    setProduct(null);
    setDraft(null);
    setAmountG(100);
    setBusy(false);
    setError(null);
    setEntrySource(logSource);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const lookupEan = async (rawEan: string) => {
    const ean = normalizeEan(rawEan);
    if (!isValidEan(ean)) {
      setError("Bitte eine gültige EAN eingeben (8–14 Ziffern).");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const found = await fetchFoodProductByEan(ean);
      if (found) {
        setProduct(found);
        setEanInput(ean);
        setAmountG(defaultAmountG(found));
        setEntrySource("barcode");
        setStep("amount");
        return;
      }
      setEanInput(ean);
      setEntrySource("photo");
      setStep("photo");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Produktsuche fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  };

  const handleScan = async () => {
    setError(null);
    setBusy(true);
    try {
      const result = await scanEan();
      if (result.ok) {
        await lookupEan(result.ean);
        return;
      }
      setError(result.message);
    } finally {
      setBusy(false);
    }
  };

  const handlePhotoSelected = async (file: File) => {
    if (!hasAiConsent(preferences)) {
      setStep("consent");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { base64, mediaType } = await fileToBase64Jpeg(file);
      const extracted = await extractNutritionLabel({
        imageBase64: base64,
        mediaType,
        ean: eanInput || undefined,
      });
      setDraft(extracted);
      setStep("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Etikett-Erkennung fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  };

  const handleSaveProduct = async () => {
    if (!draft || !eanInput) return;
    setBusy(true);
    setError(null);
    try {
      await createFoodProduct(userId, {
        ean: normalizeEan(eanInput),
        name: draft.name.trim(),
        proteinPer100g: draft.proteinPer100g,
        carbsPer100g: draft.carbsPer100g,
        fatPer100g: draft.fatPer100g,
        kcalPer100g: draft.kcalPer100g,
        servingG: draft.servingG,
        basis: draft.basis,
        source: "user_photo",
      });
      const saved = await fetchFoodProductByEan(normalizeEan(eanInput));
      if (!saved) throw new Error("Produkt konnte nicht geladen werden.");
      setProduct(saved);
      setAmountG(defaultAmountG(saved));
      setStep("amount");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Speichern fehlgeschlagen.";
      if (msg.includes("duplicate") || msg.includes("unique")) {
        setError("Dieses Produkt existiert bereits — erneut suchen.");
      } else {
        setError(msg);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleSaveLog = async () => {
    if (!product) return;
    const proteinG = calcProteinG({
      amountG,
      proteinPer100g: product.proteinPer100g,
      basis: product.basis,
      servingG: product.servingG,
    });
    if (proteinG <= 0) {
      setError("Protein-Menge muss größer als 0 sein.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createProteinLog(userId, {
        proteinG,
        label: product.name,
        ean: product.ean,
        amountG,
        source: entrySource,
      });
      onSaved();
      handleClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Log speichern fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  };

  const handleAcceptConsent = async () => {
    setConsentSaving(true);
    try {
      await updatePreferences({ aiConsent: createAiConsentGrant() });
      setStep("photo");
    } finally {
      setConsentSaving(false);
    }
  };

  const previewProtein =
    product &&
    calcProteinG({
      amountG,
      proteinPer100g: product.proteinPer100g,
      basis: product.basis,
      servingG: product.servingG,
    });

  useEffect(() => {
    if (!open) return;
    reset();
    if (initialEan) {
      void lookupEan(initialEan);
    }
  }, [open, initialEan]);

  return (
    <BottomSheet open={open} onClose={handleClose} aria-label="Produkt loggen">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void handlePhotoSelected(file);
        }}
      />

      <div style={{ fontFamily: M.disp, fontWeight: 700, fontSize: 20, marginBottom: 12 }}>Produkt loggen</div>

      {error ? (
        <div style={{ color: "#ef4444", fontSize: 13, marginBottom: 12, lineHeight: 1.45 }}>{error}</div>
      ) : null}

      {step === "consent" ? (
        <AiConsentStep
          showActions
          saving={consentSaving}
          onOpenPrivacy={() => window.open("https://rephive.app/datenschutz", "_blank", "noopener,noreferrer")}
          onAccept={() => void handleAcceptConsent()}
          onBack={() => setStep("photo")}
        />
      ) : null}

      {step === "scan" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <MButton type="button" variant="primary" size="md" fullWidth disabled={busy} onClick={() => void handleScan()}>
            <Icon name="search" size={16} stroke={2} /> Barcode scannen
          </MButton>
          <input
            type="text"
            inputMode="numeric"
            placeholder="EAN manuell eingeben"
            value={eanInput}
            onChange={(e) => setEanInput(e.target.value.replace(/\D/g, ""))}
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 12,
              border: "1px solid " + M.line2,
              background: M.panel,
              color: M.fg,
              fontSize: 15,
            }}
          />
          <MButton
            type="button"
            variant="secondary"
            size="md"
            fullWidth
            disabled={busy || !eanInput}
            onClick={() => void lookupEan(eanInput)}
          >
            Produkt suchen
          </MButton>
        </div>
      ) : null}

      {step === "photo" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ margin: 0, fontSize: 14, color: M.mut, lineHeight: 1.45 }}>
            EAN {eanInput} ist unbekannt. Fotografiere die Nährwerttabelle — das Foto wird nicht gespeichert.
          </p>
          <MButton type="button" variant="primary" size="md" fullWidth disabled={busy} onClick={() => fileRef.current?.click()}>
            Etikett fotografieren
          </MButton>
          <MButton type="button" variant="ghost" size="md" fullWidth onClick={() => setStep("scan")}>
            Zurück
          </MButton>
        </div>
      ) : null}

      {step === "review" && draft ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {draft.confidence === "low" ? (
            <p style={{ margin: 0, fontSize: 13, color: M.mut, lineHeight: 1.45 }}>
              Unsichere Erkennung — bitte Werte prüfen und korrigieren.
            </p>
          ) : null}
          <label style={{ fontSize: 13, color: M.mut, fontWeight: 600 }}>Produktname</label>
          <input
            type="text"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid " + M.line2,
              background: M.panel,
              color: M.fg,
            }}
          />
          <SetValueStepper
            label="Protein (g laut Etikett)"
            value={Math.round(draft.proteinPer100g * 10) / 10}
            step={0.5}
            min={0.5}
            onChange={(v) => setDraft({ ...draft, proteinPer100g: v })}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <MButton
              type="button"
              variant={draft.basis === "per_100g" ? "primary" : "secondary"}
              size="sm"
              onClick={() => setDraft({ ...draft, basis: "per_100g" })}
            >
              pro 100 g
            </MButton>
            <MButton
              type="button"
              variant={draft.basis === "per_serving" ? "primary" : "secondary"}
              size="sm"
              onClick={() => setDraft({ ...draft, basis: "per_serving" })}
            >
              pro Portion
            </MButton>
          </div>
          {draft.basis === "per_serving" ? (
            <SetValueStepper
              label="Portion (g)"
              value={draft.servingG ?? 100}
              step={5}
              min={10}
              onChange={(v) => setDraft({ ...draft, servingG: v })}
            />
          ) : null}
          <MButton type="button" variant="primary" size="md" fullWidth disabled={busy} onClick={() => void handleSaveProduct()}>
            Produkt speichern
          </MButton>
        </div>
      ) : null}

      {step === "amount" && product ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: M.fg }}>{product.name}</div>
          <div style={{ fontSize: 13, color: M.mut }}>EAN {product.ean}</div>
          <SetValueStepper label="Menge (g)" value={amountG} step={5} min={5} onChange={setAmountG} />
          <div style={{ fontSize: 14, color: M.brand, fontWeight: 700 }}>
            ≈ {previewProtein ?? 0} g Protein
          </div>
          <MButton type="button" variant="primary" size="md" fullWidth disabled={busy} onClick={() => void handleSaveLog()}>
            Hinzufügen
          </MButton>
        </div>
      ) : null}
    </BottomSheet>
  );
}
