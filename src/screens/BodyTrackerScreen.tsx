import { useState, useMemo, useEffect } from "react";
import { M } from "../theme";
import { Icon } from "../components/Icon";
import { useAuth } from "../lib/auth";
import { usePreferences } from "../lib/preferences";
import { AlertSheet } from "../components/AlertSheet";
import { DeleteConfirmDialog } from "../components/DeleteConfirmDialog";
import { TrendLineChart } from "../components/TrendLineChart";
import { buildWeightSeries } from "../lib/bodyChart";
import {
  useBodyMeasurements,
  createBodyMeasurement,
  updateBodyMeasurement,
  deleteBodyMeasurement,
  type BodyMeasurement,
} from "../lib/db";

export interface BodyTrackerScreenProps {
  onBack: () => void;
}

function formatDateDe(isoString: string): string {
  const d = new Date(isoString);
  const weekday = d.toLocaleDateString("de-DE", { weekday: "short" }).replace(".", "");
  const day = d.toLocaleDateString("de-DE", { day: "numeric", month: "short" });
  return `${weekday}, ${day}`;
}

function toInputDateString(isoString: string): string {
  const d = new Date(isoString);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const ALL_ADDITIONAL_FIELDS = [
  { id: "muscleMass", label: "Muskelmasse (kg)", stateKey: "muscleMass" },
  { id: "waterPct", label: "Wasseranteil (%)", stateKey: "waterPct" },
  { id: "chest", label: "Brust (cm)", stateKey: "chest" },
  { id: "shoulders", label: "Schulter (cm)", stateKey: "shoulders" },
  { id: "upperArmL", label: "Oberarm L (cm)", stateKey: "upperArmL" },
  { id: "upperArmR", label: "Oberarm R (cm)", stateKey: "upperArmR" },
  { id: "lowerArmL", label: "Unterarm L (cm)", stateKey: "lowerArmL" },
  { id: "lowerArmR", label: "Unterarm R (cm)", stateKey: "lowerArmR" },
  { id: "thighL", label: "Oberschenkel L (cm)", stateKey: "thighL" },
  { id: "thighR", label: "Oberschenkel R (cm)", stateKey: "thighR" },
  { id: "calfL", label: "Wade L (cm)", stateKey: "calfL" },
  { id: "calfR", label: "Wade R (cm)", stateKey: "calfR" },
] as const;

export function BodyTrackerScreen({ onBack }: BodyTrackerScreenProps) {
  const { user } = useAuth();
  const { preferences, updatePreferences } = usePreferences();
  console.log("BodyTrackerScreen rendering. User:", user?.id);
  const [refreshKey, setRefreshKey] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<BodyMeasurement | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [alertSheet, setAlertSheet] = useState<{ title: string; message: string } | null>(null);
  const { data: measurements, loading, error, reload } = useBodyMeasurements(refreshKey);

  // Dynamic visible fields for advanced metrics
  const [visibleFields, setVisibleFields] = useState<string[]>([]);

  // Compact states
  const [weight, setWeight] = useState<string>("80.0");
  const [bodyFat, setBodyFat] = useState<string>("");
  const [date, setDate] = useState<string>(toInputDateString(new Date().toISOString()));

  // Advanced states
  const [muscleMass, setMuscleMass] = useState<string>("");
  const [waterPct, setWaterPct] = useState<string>("");
  const [chest, setChest] = useState<string>("");
  const [shoulders, setShoulders] = useState<string>("");
  const [upperArmL, setUpperArmL] = useState<string>("");
  const [upperArmR, setUpperArmR] = useState<string>("");
  const [lowerArmL, setLowerArmL] = useState<string>("");
  const [lowerArmR, setLowerArmR] = useState<string>("");
  const [thighL, setThighL] = useState<string>("");
  const [thighR, setThighR] = useState<string>("");
  const [calfL, setCalfL] = useState<string>("");
  const [calfR, setCalfR] = useState<string>("");
  const [hips, setHips] = useState<string>("");
  const [waist, setWaist] = useState<string>("");

  const liveWHR = useMemo(() => {
    const wVal = parseFloat(waist.replace(",", "."));
    const hVal = parseFloat(hips.replace(",", "."));
    if (isNaN(wVal) || isNaN(hVal) || hVal <= 0) return null;
    return wVal / hVal;
  }, [waist, hips]);

  const whrEvaluation = useMemo(() => {
    if (liveWHR === null || !preferences.gender) return null;
    const gender = preferences.gender;
    
    let label = "Normal";
    let color: string = M.acc;
    let bg: string = M.accSoft;
    
    if (gender === "male") {
      if (liveWHR >= 1.00) {
        label = "Hoch";
        color = "#ff5e5e";
        bg = "rgba(255, 94, 94, 0.12)";
      } else if (liveWHR >= 0.90) {
        label = "Erhöht";
        color = M.prep;
        bg = "color-mix(in oklab, " + M.prep + " 16%, transparent)";
      }
    } else if (gender === "female") {
      if (liveWHR >= 0.85) {
        label = "Hoch";
        color = "#ff5e5e";
        bg = "rgba(255, 94, 94, 0.12)";
      } else if (liveWHR >= 0.80) {
        label = "Erhöht";
        color = M.prep;
        bg = "color-mix(in oklab, " + M.prep + " 16%, transparent)";
      }
    } else if (gender === "other") {
      if (liveWHR >= 0.92) {
        label = "Hoch";
        color = "#ff5e5e";
        bg = "rgba(255, 94, 94, 0.12)";
      } else if (liveWHR >= 0.85) {
        label = "Erhöht";
        color = M.prep;
        bg = "color-mix(in oklab, " + M.prep + " 16%, transparent)";
      }
    }
    
    return { ratio: liveWHR, label, color, bg };
  }, [liveWHR, preferences.gender]);

  // Edit states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    reload();
  }, [refreshKey, reload]);

  // Set default values from latest measurement if available
  useEffect(() => {
    if (measurements && measurements.length > 0 && !editingId && weight === "80.0" && bodyFat === "" && muscleMass === "") {
      setWeight(measurements[0].weightKg.toFixed(1));
      if (measurements[0].bodyFatPct !== undefined) {
        setBodyFat(measurements[0].bodyFatPct.toFixed(1));
      }
      if (measurements[0].muscleMassKg !== undefined) {
        setMuscleMass(measurements[0].muscleMassKg.toFixed(1));
      }
      if (measurements[0].waterPct !== undefined) {
        setWaterPct(measurements[0].waterPct.toFixed(1));
      }
      if (measurements[0].chestCm !== undefined) {
        setChest(measurements[0].chestCm.toFixed(1));
      }
      if (measurements[0].shouldersCm !== undefined) {
        setShoulders(measurements[0].shouldersCm.toFixed(1));
      }
      if (measurements[0].upperArmLCm !== undefined) {
        setUpperArmL(measurements[0].upperArmLCm.toFixed(1));
      }
      if (measurements[0].upperArmRCm !== undefined) {
        setUpperArmR(measurements[0].upperArmRCm.toFixed(1));
      }
      if (measurements[0].lowerArmLCm !== undefined) {
        setLowerArmL(measurements[0].lowerArmLCm.toFixed(1));
      }
      if (measurements[0].lowerArmRCm !== undefined) {
        setLowerArmR(measurements[0].lowerArmRCm.toFixed(1));
      }
      if (measurements[0].thighLCm !== undefined) {
        setThighL(measurements[0].thighLCm.toFixed(1));
      }
      if (measurements[0].thighRCm !== undefined) {
        setThighR(measurements[0].thighRCm.toFixed(1));
      }
      if (measurements[0].calfLCm !== undefined) {
        setCalfL(measurements[0].calfLCm.toFixed(1));
      }
      if (measurements[0].calfRCm !== undefined) {
        setCalfR(measurements[0].calfRCm.toFixed(1));
      }
      if (measurements[0].hipsCm !== undefined) {
        setHips(measurements[0].hipsCm.toFixed(1));
      }
      if (measurements[0].waistCm !== undefined) {
        setWaist(measurements[0].waistCm.toFixed(1));
      }
    }
  }, [measurements, editingId, weight, bodyFat, muscleMass]);

  const weightChartPoints = useMemo(() => {
    if (!measurements) return [];
    return buildWeightSeries(measurements);
  }, [measurements]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!preferences.gender) {
      setAlertSheet({ title: "Geschlecht fehlt", message: "Bitte wähle dein Geschlecht aus." });
      return;
    }

    const wNum = parseFloat(weight.replace(",", "."));
    if (isNaN(wNum) || wNum <= 0) {
      setAlertSheet({ title: "Ungültiges Gewicht", message: "Bitte ein gültiges Gewicht eingeben." });
      return;
    }

    const bfNum = bodyFat ? parseFloat(bodyFat.replace(",", ".")) : undefined;

    const hasField = (id: string) => visibleFields.includes(id);
    const parseVal = (valStr: string) => valStr ? parseFloat(valStr.replace(",", ".")) : undefined;

    const inputData = {
      weightKg: wNum,
      bodyFatPct: bfNum,
      performedAt: new Date(date + "T12:00:00").toISOString(),
      hipsCm: parseVal(hips),
      waistCm: parseVal(waist),
      muscleMassKg: hasField("muscleMass") ? parseVal(muscleMass) : undefined,
      waterPct: hasField("waterPct") ? parseVal(waterPct) : undefined,
      chestCm: hasField("chest") ? parseVal(chest) : undefined,
      shouldersCm: hasField("shoulders") ? parseVal(shoulders) : undefined,
      upperArmLCm: hasField("upperArmL") ? parseVal(upperArmL) : undefined,
      upperArmRCm: hasField("upperArmR") ? parseVal(upperArmR) : undefined,
      lowerArmLCm: hasField("lowerArmL") ? parseVal(lowerArmL) : undefined,
      lowerArmRCm: hasField("lowerArmR") ? parseVal(lowerArmR) : undefined,
      thighLCm: hasField("thighL") ? parseVal(thighL) : undefined,
      thighRCm: hasField("thighR") ? parseVal(thighR) : undefined,
      calfLCm: hasField("calfL") ? parseVal(calfL) : undefined,
      calfRCm: hasField("calfR") ? parseVal(calfR) : undefined,
    };

    setSaving(true);
    try {
      if (editingId) {
        await updateBodyMeasurement(editingId, inputData);
        setEditingId(null);
      } else {
        await createBodyMeasurement(user.id, inputData);
      }

      // Reset form fields
      setBodyFat("");
      setMuscleMass("");
      setWaterPct("");
      setChest("");
      setShoulders("");
      setUpperArmL("");
      setUpperArmR("");
      setLowerArmL("");
      setLowerArmR("");
      setThighL("");
      setThighR("");
      setCalfL("");
      setCalfR("");
      setHips("");
      setWaist("");
      setVisibleFields([]);
      setEditingId(null);
      setDate(toInputDateString(new Date().toISOString()));
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      setAlertSheet({
        title: "Speichern fehlgeschlagen",
        message: err instanceof Error ? err.message : "Fehler beim Speichern",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (m: BodyMeasurement) => {
    setEditingId(m.id);
    setWeight(m.weightKg.toString());
    setBodyFat(m.bodyFatPct !== undefined ? m.bodyFatPct.toString() : "");
    setDate(toInputDateString(m.performedAt));

    // Fill in extended values
    setMuscleMass(m.muscleMassKg !== undefined ? m.muscleMassKg.toString() : "");
    setWaterPct(m.waterPct !== undefined ? m.waterPct.toString() : "");
    setChest(m.chestCm !== undefined ? m.chestCm.toString() : "");
    setShoulders(m.shouldersCm !== undefined ? m.shouldersCm.toString() : "");
    setUpperArmL(m.upperArmLCm !== undefined ? m.upperArmLCm.toString() : "");
    setUpperArmR(m.upperArmRCm !== undefined ? m.upperArmRCm.toString() : "");
    setLowerArmL(m.lowerArmLCm !== undefined ? m.lowerArmLCm.toString() : "");
    setLowerArmR(m.lowerArmRCm !== undefined ? m.lowerArmRCm.toString() : "");
    setThighL(m.thighLCm !== undefined ? m.thighLCm.toString() : "");
    setThighR(m.thighRCm !== undefined ? m.thighRCm.toString() : "");
    setCalfL(m.calfLCm !== undefined ? m.calfLCm.toString() : "");
    setCalfR(m.calfRCm !== undefined ? m.calfRCm.toString() : "");
    setHips(m.hipsCm !== undefined ? m.hipsCm.toString() : "");
    setWaist(m.waistCm !== undefined ? m.waistCm.toString() : "");

    // Automatically fill visibleFields with fields that have data
    const activeFields: string[] = [];
    if (m.muscleMassKg !== undefined) activeFields.push("muscleMass");
    if (m.waterPct !== undefined) activeFields.push("waterPct");
    if (m.chestCm !== undefined) activeFields.push("chest");
    if (m.shouldersCm !== undefined) activeFields.push("shoulders");
    if (m.upperArmLCm !== undefined) activeFields.push("upperArmL");
    if (m.upperArmRCm !== undefined) activeFields.push("upperArmR");
    if (m.lowerArmLCm !== undefined) activeFields.push("lowerArmL");
    if (m.lowerArmRCm !== undefined) activeFields.push("lowerArmR");
    if (m.thighLCm !== undefined) activeFields.push("thighL");
    if (m.thighRCm !== undefined) activeFields.push("thighR");
    if (m.calfLCm !== undefined) activeFields.push("calfL");
    if (m.calfRCm !== undefined) activeFields.push("calfR");
    setVisibleFields(activeFields);
    
    // Scroll form into view
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    if (measurements && measurements.length > 0) {
      const m = measurements[0];
      setWeight(m.weightKg.toString());
      setBodyFat(m.bodyFatPct !== undefined ? m.bodyFatPct.toString() : "");
      setMuscleMass(m.muscleMassKg !== undefined ? m.muscleMassKg.toString() : "");
      setWaterPct(m.waterPct !== undefined ? m.waterPct.toString() : "");
      setChest(m.chestCm !== undefined ? m.chestCm.toString() : "");
      setShoulders(m.shouldersCm !== undefined ? m.shouldersCm.toString() : "");
      setUpperArmL(m.upperArmLCm !== undefined ? m.upperArmLCm.toString() : "");
      setUpperArmR(m.upperArmRCm !== undefined ? m.upperArmRCm.toString() : "");
      setLowerArmL(m.lowerArmLCm !== undefined ? m.lowerArmLCm.toString() : "");
      setLowerArmR(m.lowerArmRCm !== undefined ? m.lowerArmRCm.toString() : "");
      setThighL(m.thighLCm !== undefined ? m.thighLCm.toString() : "");
      setThighR(m.thighRCm !== undefined ? m.thighRCm.toString() : "");
      setCalfL(m.calfLCm !== undefined ? m.calfLCm.toString() : "");
      setCalfR(m.calfRCm !== undefined ? m.calfRCm.toString() : "");
      setHips(m.hipsCm !== undefined ? m.hipsCm.toString() : "");
      setWaist(m.waistCm !== undefined ? m.waistCm.toString() : "");
    } else {
      setWeight("80.0");
      setBodyFat("");
      setMuscleMass("");
      setWaterPct("");
      setChest("");
      setShoulders("");
      setUpperArmL("");
      setUpperArmR("");
      setLowerArmL("");
      setLowerArmR("");
      setThighL("");
      setThighR("");
      setCalfL("");
      setCalfR("");
      setHips("");
      setWaist("");
    }
    setVisibleFields([]);
    setDate(toInputDateString(new Date().toISOString()));
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget || deleteBusy) return;

    const id = deleteTarget.id;
    setDeleteBusy(true);
    try {
      await deleteBodyMeasurement(id);
      setDeleteTarget(null);
      if (editingId === id) {
        handleCancelEdit();
      }
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      setAlertSheet({
        title: "Löschen fehlgeschlagen",
        message: err instanceof Error ? err.message : "Fehler beim Löschen",
      });
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", position: "relative" }}>
      {/* Header */}
      <div
        style={{
          padding: "2px 22px 12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <button
          onClick={onBack}
          style={{ background: "none", border: "none", cursor: "pointer", color: M.mut, display: "flex" }}
        >
          <Icon name="chevL" size={24} stroke={2.2} />
        </button>
        <span style={{ fontSize: 12, letterSpacing: 1.5, color: M.mut, fontWeight: 700 }}>
          {editingId ? "EINTRAG BEARBEITEN" : "KÖRPERWERTE"}
        </span>
        <span style={{ width: 24 }} />
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          padding: "0 22px 24px",
        }}
      >

        {/* Geschlechtstoggle für WHR-Auswertung */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 16px",
            background: M.card,
            border: !preferences.gender ? "1px solid #ff5e5e" : "1px solid " + M.line2,
            borderRadius: 14,
            marginBottom: 12,
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 700, color: !preferences.gender ? "#ff8a8a" : M.mut, letterSpacing: 0.5 }}>
            GESCHLECHT {!preferences.gender && "*"}
          </span>
          <div style={{ display: "flex", gap: 4, background: M.panel, padding: 2, borderRadius: 8, border: "1px solid " + M.line2 }}>
            <button
              type="button"
              onClick={() => updatePreferences({ gender: "male" }, true)}
              style={{
                padding: "6px 10px",
                fontSize: 11,
                fontWeight: 700,
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                background: preferences.gender === "male" ? M.acc : "transparent",
                color: preferences.gender === "male" ? M.accInk : M.mut,
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <span>♂</span> Männlich
            </button>
            <button
              type="button"
              onClick={() => updatePreferences({ gender: "female" }, true)}
              style={{
                padding: "6px 10px",
                fontSize: 11,
                fontWeight: 700,
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                background: preferences.gender === "female" ? M.acc : "transparent",
                color: preferences.gender === "female" ? M.accInk : M.mut,
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <span>♀</span> Weiblich
            </button>
            <button
              type="button"
              onClick={() => updatePreferences({ gender: "other" }, true)}
              style={{
                padding: "6px 10px",
                fontSize: 11,
                fontWeight: 700,
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                background: preferences.gender === "other" ? M.acc : "transparent",
                color: preferences.gender === "other" ? M.accInk : M.mut,
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <span>⚧</span> Divers
            </button>
          </div>
        </div>

        {/* Form Card */}
        <form
          onSubmit={handleSave}
          style={{
            background: M.card,
            border: "1px solid " + M.line2,
            borderRadius: 18,
            padding: "16px 16px 18px",
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 11, letterSpacing: 1.2, color: M.mut, fontWeight: 700, marginBottom: 12 }}>
            {editingId ? "WERTE ANPASSEN" : "MESSUNG EINTRAGEN"}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Weight & Body Fat (Always Visible) */}
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: M.mut, fontWeight: 600, display: "block", marginBottom: 5 }}>
                  Gewicht (kg)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  style={{
                    width: "100%",
                    height: 38,
                    background: M.panel,
                    border: "1px solid " + M.line,
                    borderRadius: 10,
                    color: M.fg,
                    fontFamily: M.disp,
                    fontWeight: 700,
                    fontSize: 18,
                    textAlign: "center",
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: M.mut, fontWeight: 600, display: "block", marginBottom: 5 }}>
                  Körperfett (%)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="—"
                  value={bodyFat}
                  onChange={(e) => setBodyFat(e.target.value)}
                  style={{
                    width: "100%",
                    height: 38,
                    background: M.panel,
                    border: "1px solid " + M.line,
                    borderRadius: 10,
                    color: M.fg,
                    fontFamily: M.disp,
                    fontWeight: 700,
                    fontSize: 18,
                    textAlign: "center",
                    outline: "none",
                  }}
                />
              </div>
            </div>

            {/* Hips & Waist (Always visible in form) */}
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: M.mut, fontWeight: 600, display: "block", marginBottom: 5 }}>
                  Hüfte (cm)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="—"
                  value={hips}
                  onChange={(e) => setHips(e.target.value)}
                  style={{
                    width: "100%",
                    height: 38,
                    background: M.panel,
                    border: "1px solid " + M.line,
                    borderRadius: 10,
                    color: M.fg,
                    fontFamily: M.disp,
                    fontWeight: 700,
                    fontSize: 18,
                    textAlign: "center",
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: M.mut, fontWeight: 600, display: "block", marginBottom: 5 }}>
                  Taille (cm)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="—"
                  value={waist}
                  onChange={(e) => setWaist(e.target.value)}
                  style={{
                    width: "100%",
                    height: 38,
                    background: M.panel,
                    border: "1px solid " + M.line,
                    borderRadius: 10,
                    color: M.fg,
                    fontFamily: M.disp,
                    fontWeight: 700,
                    fontSize: 18,
                    textAlign: "center",
                    outline: "none",
                  }}
                />
              </div>
            </div>

            {/* WHR Live-Auswertung Card */}
            {whrEvaluation && (
              <div
                style={{
                  background: M.panel,
                  border: "1px solid " + M.line,
                  borderRadius: 12,
                  padding: "12px 14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  marginTop: 4,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: M.mut, fontWeight: 700, letterSpacing: 1 }}>
                    TAILLE-HÜFTE-VERHÄLTNIS (WHR)
                  </span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontFamily: M.disp, fontSize: 26, fontWeight: 700, color: M.fg }}>
                    {whrEvaluation.ratio.toFixed(2)}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: whrEvaluation.color,
                      background: whrEvaluation.bg,
                      padding: "4px 10px",
                      borderRadius: 20,
                      letterSpacing: 0.5,
                      textTransform: "uppercase",
                    }}
                  >
                    {whrEvaluation.label}
                  </span>
                </div>
              </div>
            )}

            {/* Dynamisch hinzugefügte Zusatzfelder */}
            {visibleFields.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 4 }}>
                {visibleFields.map((fieldId) => {
                  const field = ALL_ADDITIONAL_FIELDS.find((f) => f.id === fieldId);
                  if (!field) return null;

                  let value = "";
                  let setValue: (val: string) => void = () => {};

                  if (fieldId === "muscleMass") { value = muscleMass; setValue = setMuscleMass; }
                  else if (fieldId === "waterPct") { value = waterPct; setValue = setWaterPct; }
                  else if (fieldId === "chest") { value = chest; setValue = setChest; }
                  else if (fieldId === "shoulders") { value = shoulders; setValue = setShoulders; }
                  else if (fieldId === "upperArmL") { value = upperArmL; setValue = setUpperArmL; }
                  else if (fieldId === "upperArmR") { value = upperArmR; setValue = setUpperArmR; }
                  else if (fieldId === "lowerArmL") { value = lowerArmL; setValue = setLowerArmL; }
                  else if (fieldId === "lowerArmR") { value = lowerArmR; setValue = setLowerArmR; }
                  else if (fieldId === "thighL") { value = thighL; setValue = setThighL; }
                  else if (fieldId === "thighR") { value = thighR; setValue = setThighR; }
                  else if (fieldId === "calfL") { value = calfL; setValue = setCalfL; }
                  else if (fieldId === "calfR") { value = calfR; setValue = setCalfR; }

                  return (
                    <div key={fieldId}>
                      <label style={{ fontSize: 11, color: M.mut, fontWeight: 600, display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                        <span>{field.label}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setVisibleFields(prev => prev.filter(f => f !== fieldId));
                            setValue("");
                          }}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "#ff5e5e",
                            fontSize: 14,
                            padding: "0 2px",
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          ✕
                        </button>
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="—"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        style={{
                          width: "100%",
                          height: 38,
                          background: M.panel,
                          border: "1px solid " + M.line,
                          borderRadius: 10,
                          color: M.fg,
                          fontFamily: M.disp,
                          fontWeight: 700,
                          fontSize: 18,
                          textAlign: "center",
                          outline: "none",
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {/* Dropdown-Menü für weitere Maße */}
            {(() => {
              const remainingFields = ALL_ADDITIONAL_FIELDS.filter((f) => !visibleFields.includes(f.id));
              if (remainingFields.length === 0) return null;
              return (
                <div style={{ position: "relative", marginTop: 4 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      height: 38,
                      borderRadius: 10,
                      border: "1px dashed " + M.line,
                      background: "transparent",
                      color: M.mut,
                      fontSize: 12.5,
                      fontWeight: 700,
                      cursor: "pointer",
                      position: "relative",
                    }}
                  >
                    <Icon name="plus" size={14} color={M.mut} style={{ marginRight: 6 }} />
                    WERT HINZUFÜGEN...
                    <select
                      value=""
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val) {
                          setVisibleFields((prev) => [...prev, val]);
                        }
                      }}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        opacity: 0,
                        cursor: "pointer",
                        WebkitAppearance: "none",
                      }}
                    >
                      <option value="" disabled>-- Wert auswählen --</option>
                      {remainingFields.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })()}

            {/* Date Picker */}
            <div>
              <label style={{ fontSize: 11, color: M.mut, fontWeight: 600, display: "block", marginBottom: 5 }}>
                Datum
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{
                  width: "100%",
                  height: 38,
                  background: M.panel,
                  border: "1px solid " + M.line,
                  borderRadius: 10,
                  color: M.fg,
                  fontFamily: M.body,
                  fontWeight: 600,
                  fontSize: 14,
                  textAlign: "center",
                  outline: "none",
                  padding: "0 8px",
                }}
              />
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
              {editingId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  style={{
                    flex: 1,
                    height: 40,
                    borderRadius: 12,
                    border: "1px solid " + M.line,
                    background: "transparent",
                    color: M.fg,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontSize: 14,
                  }}
                >
                  ABBRECHEN
                </button>
              )}
              <button
                type="submit"
                disabled={saving}
                style={{
                  flex: 2,
                  height: 40,
                  borderRadius: 12,
                  border: "none",
                  background: M.acc,
                  color: M.accInk,
                  fontWeight: 700,
                  cursor: saving ? "wait" : "pointer",
                  fontSize: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <Icon name="check" size={16} color={M.accInk} />
                {editingId ? "SPEICHERN" : "EINTRAGEN"}
              </button>
            </div>
          </div>
        </form>

        {/* Visual Chart Card */}
        {weightChartPoints.length > 1 && (
          <div
            style={{
              background: M.card,
              border: "1px solid " + M.line2,
              borderRadius: 18,
              padding: "15px 16px 12px",
              marginBottom: 20,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontSize: 11, letterSpacing: 1.4, color: M.mut, fontWeight: 700 }}>
                GEWICHTSVERLAUF (LETZTE 10)
              </span>
              <span style={{ fontFamily: M.disp, fontWeight: 700, fontSize: 15, color: M.acc }}>
                {weightChartPoints.length > 0
                  ? `${weightChartPoints[weightChartPoints.length - 1].value.toFixed(1)} kg`
                  : ""}
              </span>
            </div>

            <TrendLineChart points={weightChartPoints} unit="kg" height={100} />
          </div>
        )}

        {/* History List */}
        <div>
          <div style={{ fontSize: 11, letterSpacing: 1.5, color: M.mut, fontWeight: 700, marginBottom: 10 }}>
            HISTORIE
          </div>

          {loading && <div style={{ color: M.mut, fontSize: 14 }}>Werte werden geladen…</div>}
          {error && <div style={{ color: "#ff8a8a", fontSize: 14 }}>{error}</div>}

          {!loading && !error && measurements && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {measurements.length === 0 ? (
                <div
                  style={{
                    background: M.card,
                    border: "1px solid " + M.line2,
                    borderRadius: 14,
                    padding: "20px 16px",
                    color: M.mut,
                    fontSize: 13,
                    textAlign: "center",
                  }}
                >
                  Noch keine Körperwerte eingetragen.
                </div>
              ) : (
                measurements.map((m) => {
                  // Determine if this entry has extended body details
                  const hasDetails =
                    m.muscleMassKg !== undefined ||
                    m.waterPct !== undefined ||
                    m.chestCm !== undefined ||
                    m.shouldersCm !== undefined ||
                    m.upperArmLCm !== undefined ||
                    m.upperArmRCm !== undefined ||
                    m.lowerArmLCm !== undefined ||
                    m.lowerArmRCm !== undefined ||
                    m.thighLCm !== undefined ||
                    m.thighRCm !== undefined ||
                    m.calfLCm !== undefined ||
                    m.calfRCm !== undefined ||
                    m.hipsCm !== undefined ||
                    m.waistCm !== undefined;

                  return (
                    <div
                      key={m.id}
                      style={{
                        background: M.card,
                        border: "1px solid " + M.line,
                        borderRadius: 16,
                        padding: "14px 14px 16px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                      }}
                    >
                      {/* Top Row: Date & CRUD buttons */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 12.5, color: M.mut, fontWeight: 700 }}>
                          {formatDateDe(m.performedAt)}
                        </span>
                        <div style={{ display: "flex", gap: 12 }}>
                          <button
                            onClick={() => handleEdit(m)}
                            style={{ background: "none", border: "none", cursor: "pointer", color: M.mut2, padding: 2 }}
                          >
                            <Icon name="edit" size={16} stroke={2} />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(m)}
                            style={{ background: "none", border: "none", cursor: "pointer", color: M.mut2, padding: 2 }}
                          >
                            <Icon name="trash" size={16} stroke={2} />
                          </button>
                        </div>
                      </div>

                      {/* Weight & KFA & WHR */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                          <span style={{ fontFamily: M.disp, fontWeight: 700, fontSize: 24, color: M.fg }}>
                            {m.weightKg.toFixed(1)} <span style={{ fontSize: 13, fontWeight: 600, color: M.mut }}>kg</span>
                          </span>
                          {m.bodyFatPct !== undefined && (
                            <span style={{ fontSize: 14, color: M.acc, fontWeight: 700, fontFamily: M.disp }}>
                              {m.bodyFatPct.toFixed(1)}% KFA
                            </span>
                          )}
                        </div>

                        {m.waistCm !== undefined && m.hipsCm !== undefined && preferences.gender && (
                          (() => {
                            const ratio = m.waistCm / m.hipsCm;
                            const gender = preferences.gender;
                            let label = "Normal";
                            let color: string = M.acc;
                            let bg: string = M.accSoft;
                            
                            if (gender === "male") {
                              if (ratio >= 1.00) {
                                label = "Hoch";
                                color = "#ff5e5e";
                                bg = "rgba(255, 94, 94, 0.12)";
                              } else if (ratio >= 0.90) {
                                label = "Erhöht";
                                color = M.prep;
                                bg = "color-mix(in oklab, " + M.prep + " 16%, transparent)";
                              }
                            } else if (gender === "female") {
                              if (ratio >= 0.85) {
                                label = "Hoch";
                                color = "#ff5e5e";
                                bg = "rgba(255, 94, 94, 0.12)";
                              } else if (ratio >= 0.80) {
                                label = "Erhöht";
                                color = M.prep;
                                bg = "color-mix(in oklab, " + M.prep + " 16%, transparent)";
                              }
                            } else if (gender === "other") {
                              if (ratio >= 0.92) {
                                label = "Hoch";
                                color = "#ff5e5e";
                                bg = "rgba(255, 94, 94, 0.12)";
                              } else if (ratio >= 0.85) {
                                label = "Erhöht";
                                color = M.prep;
                                bg = "color-mix(in oklab, " + M.prep + " 16%, transparent)";
                              }
                            }

                            return (
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <span style={{ fontSize: 11, color: M.mut, fontWeight: 600 }}>WHR:</span>
                                <span style={{ fontFamily: M.disp, fontSize: 16, fontWeight: 700, color: M.fg }}>
                                  {ratio.toFixed(2)}
                                </span>
                                <span
                                  style={{
                                    fontSize: 9,
                                    fontWeight: 700,
                                    color: color,
                                    background: bg,
                                    padding: "2px 6px",
                                    borderRadius: 10,
                                    textTransform: "uppercase",
                                  }}
                                >
                                  {label}
                                </span>
                              </div>
                            );
                          })()
                        )}
                      </div>

                      {/* Advanced details sub-grid */}
                      {hasDetails && (
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: "8px 12px",
                            borderTop: "1px solid " + M.line2,
                            paddingTop: 10,
                            marginTop: 2,
                            fontSize: 12.5,
                            color: M.fg,
                          }}
                        >
                          {m.muscleMassKg !== undefined && (
                            <div>
                              <span style={{ color: M.mut2 }}>Muskelmasse: </span>
                              <span style={{ fontWeight: 600 }}>{m.muscleMassKg.toFixed(1)} kg</span>
                            </div>
                          )}
                          {m.waterPct !== undefined && (
                            <div>
                              <span style={{ color: M.mut2 }}>Wasseranteil: </span>
                              <span style={{ fontWeight: 600 }}>{m.waterPct.toFixed(1)} %</span>
                            </div>
                          )}
                          {m.waistCm !== undefined && (
                            <div>
                              <span style={{ color: M.mut2 }}>Taille: </span>
                              <span style={{ fontWeight: 600 }}>{m.waistCm.toFixed(1)} cm</span>
                            </div>
                          )}
                          {m.hipsCm !== undefined && (
                            <div>
                              <span style={{ color: M.mut2 }}>Hüfte: </span>
                              <span style={{ fontWeight: 600 }}>{m.hipsCm.toFixed(1)} cm</span>
                            </div>
                          )}
                          {m.chestCm !== undefined && (
                            <div>
                              <span style={{ color: M.mut2 }}>Brust: </span>
                              <span style={{ fontWeight: 600 }}>{m.chestCm.toFixed(1)} cm</span>
                            </div>
                          )}
                          {m.shouldersCm !== undefined && (
                            <div>
                              <span style={{ color: M.mut2 }}>Schulter: </span>
                              <span style={{ fontWeight: 600 }}>{m.shouldersCm.toFixed(1)} cm</span>
                            </div>
                          )}

                          {/* Left/Right comparisons for arms & legs */}
                          {(m.upperArmLCm !== undefined || m.upperArmRCm !== undefined) && (
                            <div style={{ gridColumn: "span 2" }}>
                              <span style={{ color: M.mut2 }}>Oberarm (L / R): </span>
                              <span style={{ fontWeight: 600 }}>
                                {m.upperArmLCm !== undefined ? `${m.upperArmLCm.toFixed(1)} cm` : "—"} /{" "}
                                {m.upperArmRCm !== undefined ? `${m.upperArmRCm.toFixed(1)} cm` : "—"}
                              </span>
                            </div>
                          )}
                          {(m.lowerArmLCm !== undefined || m.lowerArmRCm !== undefined) && (
                            <div style={{ gridColumn: "span 2" }}>
                              <span style={{ color: M.mut2 }}>Unterarm (L / R): </span>
                              <span style={{ fontWeight: 600 }}>
                                {m.lowerArmLCm !== undefined ? `${m.lowerArmLCm.toFixed(1)} cm` : "—"} /{" "}
                                {m.lowerArmRCm !== undefined ? `${m.lowerArmRCm.toFixed(1)} cm` : "—"}
                              </span>
                            </div>
                          )}
                          {(m.thighLCm !== undefined || m.thighRCm !== undefined) && (
                            <div style={{ gridColumn: "span 2" }}>
                              <span style={{ color: M.mut2 }}>Oberschenkel (L / R): </span>
                              <span style={{ fontWeight: 600 }}>
                                {m.thighLCm !== undefined ? `${m.thighLCm.toFixed(1)} cm` : "—"} /{" "}
                                {m.thighRCm !== undefined ? `${m.thighRCm.toFixed(1)} cm` : "—"}
                              </span>
                            </div>
                          )}
                          {(m.calfLCm !== undefined || m.calfRCm !== undefined) && (
                            <div style={{ gridColumn: "span 2" }}>
                              <span style={{ color: M.mut2 }}>Wade (L / R): </span>
                              <span style={{ fontWeight: 600 }}>
                                {m.calfLCm !== undefined ? `${m.calfLCm.toFixed(1)} cm` : "—"} /{" "}
                                {m.calfRCm !== undefined ? `${m.calfRCm.toFixed(1)} cm` : "—"}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {alertSheet && (
        <AlertSheet
          title={alertSheet.title}
          message={alertSheet.message}
          onClose={() => setAlertSheet(null)}
        />
      )}
      {deleteTarget && (
        <DeleteConfirmDialog
          title="Eintrag löschen?"
          message={
            <>
              Möchtest du den Eintrag vom{" "}
              <strong style={{ color: M.fg }}>{formatDateDe(deleteTarget.performedAt)}</strong> wirklich löschen?
            </>
          }
          busy={deleteBusy}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
