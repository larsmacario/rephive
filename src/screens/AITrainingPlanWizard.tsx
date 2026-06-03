import { useState, useEffect, useRef } from "react";
import { M } from "../theme";
import { useAuth } from "../lib/auth";
import { usePreferences } from "../lib/preferences";
import { Icon } from "../components/Icon";
import { BirthDateField } from "../components/BirthDateField";
import { OneRmPercentInfoCard } from "../components/OneRmPercentInfoCard";
import { createBodyMeasurement, generateAndSaveAITrainingPlan, fetchRecentSessionsWithExercises, useBodyMeasurements } from "../lib/db";
import { useBreakpoint } from "../lib/responsive";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: 12,
  border: "1px solid " + M.line,
  background: M.card,
  color: M.fg,
  fontFamily: M.body,
  fontSize: 16,
  outline: "none",
  boxSizing: "border-box",
  textAlign: "center",
};

const tileStyle = (selected: boolean): React.CSSProperties => ({
  flex: 1,
  padding: "18px 14px",
  borderRadius: 14,
  border: selected ? `2px solid ${M.acc}` : `1px solid ${M.line}`,
  background: selected ? M.accSoft : M.card,
  color: selected ? M.acc : M.fg,
  fontFamily: M.body,
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  transition: "all 0.2s ease",
  minWidth: 100,
  textAlign: "center",
});

const listTileStyle = (selected: boolean): React.CSSProperties => ({
  width: "100%",
  padding: "16px 18px",
  borderRadius: 14,
  border: selected ? `2px solid ${M.acc}` : `1px solid ${M.line}`,
  background: selected ? M.accSoft : M.card,
  color: selected ? M.acc : M.fg,
  fontFamily: M.body,
  fontSize: 15,
  fontWeight: 600,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  transition: "all 0.2s ease",
  textAlign: "left",
  boxSizing: "border-box",
});

const btnPrimary: React.CSSProperties = {
  padding: "15px 32px",
  borderRadius: 14,
  border: "none",
  background: M.acc,
  color: M.accInk,
  fontFamily: M.disp,
  fontWeight: 700,
  fontSize: 18,
  letterSpacing: 1,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
};

const btnSecondary: React.CSSProperties = {
  padding: "15px 24px",
  borderRadius: 14,
  border: "1px solid " + M.line,
  background: "transparent",
  color: M.fg,
  fontFamily: M.disp,
  fontWeight: 600,
  fontSize: 18,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
};

function getHtvClassification(htv: number, gender: string | null): { text: string; color: string } {
  if (gender === "male") {
    if (htv < 0.90) return { text: "Geringes Risiko (Normalwert)", color: M.acc };
    if (htv < 1.0) return { text: "Mäßiges Risiko (Übergewicht)", color: "#ffeb3b" };
    return { text: "Hohes Risiko (Adipositas)", color: "#ff5050" };
  } else if (gender === "female") {
    if (htv < 0.80) return { text: "Geringes Risiko (Normalwert)", color: M.acc };
    if (htv < 0.85) return { text: "Mäßiges Risiko (Übergewicht)", color: "#ffeb3b" };
    return { text: "Hohes Risiko (Adipositas)", color: "#ff5050" };
  } else {
    if (htv < 0.85) return { text: "Geringes Risiko (Normalwert)", color: M.acc };
    if (htv < 0.92) return { text: "Mäßiges Risiko (Übergewicht)", color: "#ffeb3b" };
    return { text: "Hohes Risiko (Adipositas)", color: "#ff5050" };
  }
}

const STANDARD_EQUIPMENT = [
  { id: "dumbbells", name: "Kurzhanteln" },
  { id: "barbell", name: "Langhantel" },
  { id: "pullup_bar", name: "Klimmzugstange" },
  { id: "bench", name: "Trainingsbank" },
  { id: "bands", name: "Widerstandsbänder" },
  { id: "kettlebell", name: "Kettlebell" },
];

interface AITrainingPlanWizardProps {
  onBack: () => void;
  onPlanGenerated: () => void;
}

export function AITrainingPlanWizard({ onBack, onPlanGenerated }: AITrainingPlanWizardProps) {
  const { user, profile, updateBirthDate } = useAuth();
  const { preferences, updatePreferences } = usePreferences();
  const { data: measurements, loading: measurementsLoading } = useBodyMeasurements();
  const breakpoint = useBreakpoint();
  const bodyValuesPrefilled = useRef(false);

  const [step, setStep] = useState(0);

  // Schritt 1: Profil · Schritt 2: Körperwerte
  const [gender, setGender] = useState<"male" | "female" | "other" | null>(preferences.gender || null);
  const [birthDate, setBirthDate] = useState<string>(profile?.birth_date || "");
  const [heightCm, setHeightCm] = useState<string>(preferences.heightCm ? String(preferences.heightCm) : "");
  const [weightKg, setWeightKg] = useState<string>("");
  const [kfa, setKfa] = useState<string>("");
  const [metricMode, setMetricMode] = useState<"kfa" | "htv">("kfa");
  const [waistCm, setWaistCm] = useState<string>("");
  const [hipsCm, setHipsCm] = useState<string>("");
  const [homeEquipment, setHomeEquipment] = useState<string[]>([]);

  // Schritt 3: Ziel & Erfahrung
  const [fitnessGoal, setFitnessGoal] = useState<"muscle_building" | "fat_loss" | "fitness" | "strength" | null>(
    preferences.fitnessGoal || null
  );
  const [experienceLevel, setExperienceLevel] = useState<"beginner" | "intermediate" | "advanced" | null>(
    preferences.experienceLevel || null
  );

  // Schritt 4: Trainingsort & Frequenz
  const [trainingLocation, setTrainingLocation] = useState<"gym" | "home_equipment" | "bodyweight">("gym");
  const [weeklyDays, setWeeklyDays] = useState<number>(preferences.weeklyDays || 3);

  // Schritt 5: Schmerzen & Einschränkungen
  const [painZones, setPainZones] = useState<string[]>([]);

  // Schritt 6: Andere Sportarten
  const [otherSports, setOtherSports] = useState<{ sport: string; frequency: number }[]>([]);
  const [tempSport, setTempSport] = useState<string>("");
  const [tempFreq, setTempFreq] = useState<number>(1);

  // Schritt 7 & 8: Bezahlung & Generierung
  const [loadingStep, setLoadingStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedPlanId, setGeneratedPlanId] = useState<string | null>(null);

  // Lade Lade-Texte
  const loadingTexts = [
    "Analysiere Anamnesedaten...",
    "Bewerte körperliche Einschränkungen...",
    "Die KI generiert deinen Trainingsplan...",
    "Speichere Trainingsplan in der Datenbank...",
  ];

  useEffect(() => {
    if (step === 8 && busy) {
      const interval = setInterval(() => {
        setLoadingStep((s) => (s < loadingTexts.length - 1 ? s + 1 : s));
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [step, busy]);

  useEffect(() => {
    if (bodyValuesPrefilled.current || measurementsLoading) return;

    const latest = measurements?.[0];
    const anamnesis = preferences.anamnesis;

    if (latest) {
      setWeightKg(String(latest.weightKg));
      if (latest.bodyFatPct !== undefined) {
        setKfa(String(latest.bodyFatPct));
        setMetricMode("kfa");
      } else if (latest.waistCm !== undefined || latest.hipsCm !== undefined) {
        if (latest.hipsCm !== undefined) setHipsCm(String(latest.hipsCm));
        if (latest.waistCm !== undefined) setWaistCm(String(latest.waistCm));
        setMetricMode("htv");
      }
    } else if (anamnesis) {
      if (anamnesis.kfa != null && !isNaN(anamnesis.kfa)) {
        setKfa(String(anamnesis.kfa));
        setMetricMode("kfa");
      } else if (anamnesis.waistCm != null || anamnesis.hipsCm != null) {
        if (anamnesis.hipsCm != null) setHipsCm(String(anamnesis.hipsCm));
        if (anamnesis.waistCm != null) setWaistCm(String(anamnesis.waistCm));
        setMetricMode("htv");
      }
    }

    bodyValuesPrefilled.current = true;
  }, [measurements, measurementsLoading, preferences.anamnesis]);

  const togglePainZone = (zone: string) => {
    if (zone === "none") {
      setPainZones([]);
      return;
    }
    setPainZones((prev) => {
      if (prev.includes(zone)) {
        return prev.filter((z) => z !== zone);
      } else {
        return [...prev.filter((z) => z !== "none"), zone];
      }
    });
  };

  const addSport = () => {
    if (!tempSport.trim()) return;
    setOtherSports((prev) => [...prev, { sport: tempSport.trim(), frequency: tempFreq }]);
    setTempSport("");
    setTempFreq(1);
  };

  const removeSport = (idx: number) => {
    setOtherSports((prev) => prev.filter((_, i) => i !== idx));
  };

  const nextStep = () => {
    setError(null);
    if (step === 1) {
      if (!gender) {
        setError("Bitte wähle dein Geschlecht aus.");
        return;
      }
    }
    if (step === 2) {
      if (!heightCm.trim() || isNaN(parseInt(heightCm))) {
        setError("Bitte gib eine gültige Körpergröße an.");
        return;
      }
      if (!weightKg.trim() || isNaN(parseFloat(weightKg))) {
        setError("Bitte gib ein gültiges Körpergewicht an.");
        return;
      }
      if (metricMode === "kfa" && kfa.trim() && isNaN(parseFloat(kfa))) {
        setError("Bitte gib einen gültigen Körperfettanteil an.");
        return;
      }
      if (metricMode === "htv") {
        if (waistCm.trim() && isNaN(parseFloat(waistCm))) {
          setError("Bitte gib einen gültigen Taillenumfang an.");
          return;
        }
        if (hipsCm.trim() && isNaN(parseFloat(hipsCm))) {
          setError("Bitte gib einen gültigen Hüftumfang an.");
          return;
        }
        if ((waistCm.trim() && !hipsCm.trim()) || (!waistCm.trim() && hipsCm.trim())) {
          setError("Bitte fülle sowohl Taillen- als auch Hüftumfang aus, um das HTV zu berechnen.");
          return;
        }
      }
    }
    if (step === 3) {
      if (!fitnessGoal) {
        setError("Bitte wähle ein Fitnessziel aus.");
        return;
      }
      if (!experienceLevel) {
        setError("Bitte wähle deine Trainingserfahrung aus.");
        return;
      }
    }
    setStep((s) => s + 1);
  };

  const prevStep = () => {
    setError(null);
    setStep((s) => s - 1);
  };

  const handleCheckout = () => {
    setBusy(true);
    // Simuliere Bezahlvorgang für 1.5 Sekunden
    setTimeout(() => {
      setBusy(false);
      setStep(8); // Gehe zum Generierungs-Ladebildschirm
      void runGeneration();
    }, 1800);
  };

  const runGeneration = async () => {
    if (!user) return;
    setBusy(true);
    setError(null);
    setLoadingStep(0);

    try {
      const parsedHeight = parseInt(heightCm, 10);
      const parsedWeight = parseFloat(weightKg);
      const parsedKfa = metricMode === "kfa" && kfa ? parseFloat(kfa) : null;
      const parsedWaist = metricMode === "htv" && waistCm ? parseFloat(waistCm) : null;
      const parsedHips = metricMode === "htv" && hipsCm ? parseFloat(hipsCm) : null;
      const parsedHtv = parsedWaist && parsedHips && parsedHips > 0 ? parsedWaist / parsedHips : null;

      // 1. Körperdaten in body_measurements speichern
      await createBodyMeasurement(user.id, {
        weightKg: parsedWeight,
        bodyFatPct: parsedKfa && !isNaN(parsedKfa) ? parsedKfa : undefined,
        waistCm: parsedWaist && !isNaN(parsedWaist) ? parsedWaist : undefined,
        hipsCm: parsedHips && !isNaN(parsedHips) ? parsedHips : undefined,
        performedAt: new Date().toISOString(),
      });

      // 2. Geburtsdatum in Auth aktualisieren falls eingegeben
      if (birthDate.trim() && birthDate.trim() !== profile?.birth_date) {
        await updateBirthDate(birthDate.trim());
      }

      const anamnesisObj = {
        painZones,
        trainingLocation,
        homeEquipment: trainingLocation === "home_equipment" ? homeEquipment : [],
        otherSports,
        kfa: parsedKfa,
        waistCm: parsedWaist,
        hipsCm: parsedHips,
        htv: parsedHtv,
      };

      // 3. Preferences aktualisieren
      await updatePreferences(
        {
          gender,
          fitnessGoal,
          experienceLevel,
          heightCm: parsedHeight,
          weeklyDays,
          anamnesis: anamnesisObj,
        },
        true // Sofort in DB speichern
      );

      // 4. Lade Lern- und Verlaufsdaten für die KI
      let recentSessions: any[] = [];
      try {
        recentSessions = await fetchRecentSessionsWithExercises(10);
      } catch (historyErr) {
        console.warn("Konnte Trainings-Historie nicht laden, fahre ohne fort:", historyErr);
      }

      // 5. KI Edge-Function zur Planerstellung aufrufen
      const planId = await generateAndSaveAITrainingPlan(user.id, {
        gender,
        heightCm: parsedHeight,
        weightKg: parsedWeight,
        fitnessGoal,
        experienceLevel,
        weeklyDays,
        anamnesis: anamnesisObj,
        recentSessions,
        exerciseFeedback: preferences.exerciseFeedback,
      });

      setGeneratedPlanId(planId);
    } catch (e: any) {
      console.error("Fehler bei der KI-Generierung:", e);
      setError(e.message || "Es ist ein Fehler bei der Generierung aufgetreten. Bitte versuche es erneut.");
      setStep(7); // Zurück zum Checkout im Fehlerfall
    } finally {
      setBusy(false);
    }
  };

  // Steps Configuration
  const stepsCount = 8;
  const progressPercent = step === 0 ? 0 : Math.min(100, (step / (stepsCount - 1)) * 100);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: M.bg,
        color: M.fg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        boxSizing: "border-box",
        padding: breakpoint === "desktop" ? "40px 24px" : "24px 22px",
        fontFamily: M.body,
        overflowY: "auto",
      }}
    >
      {/* Header und Progressbar */}
      {step < 8 && (
        <div style={{ width: "100%", maxWidth: 460 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <button
              onClick={onBack}
              style={{
                background: "none",
                border: "none",
                color: M.mut,
                cursor: "pointer",
                padding: 0,
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontFamily: M.disp,
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              <Icon name="chevL" size={16} color={M.mut} /> ABBRECHEN
            </button>
            {step > 0 && (
              <div style={{ fontSize: 13, color: M.mut, fontWeight: 600 }}>
                Schritt {step} von {stepsCount - 1}
              </div>
            )}
          </div>

          {/* Progress Bar Line */}
          {step > 0 && (
            <div style={{ width: "100%", height: 3, background: M.line, borderRadius: 1.5, overflow: "hidden", marginBottom: 24 }}>
              <div
                style={{
                  height: "100%",
                  width: `${progressPercent}%`,
                  background: M.acc,
                  borderRadius: 1.5,
                  transition: "width 0.3s ease",
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Hauptinhalt */}
      <div
        style={{
          width: "100%",
          maxWidth: 460,
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          margin: "12px 0 24px 0",
        }}
      >
        {error && (
          <div
            style={{
              background: "rgba(255,80,80,.12)",
              border: "1px solid rgba(255,80,80,.25)",
              borderRadius: 12,
              padding: "12px 14px",
              color: "#ff8a8a",
              fontSize: 13,
              marginBottom: 20,
              textAlign: "center",
            }}
          >
            {error}
          </div>
        )}

        {/* STEP 0: Startseite / Intro */}
        {step === 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16, textAlign: "center" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
              <div
                style={{
                  width: 90,
                  height: 90,
                  borderRadius: 24,
                  background: M.accSoft,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: M.acc,
                }}
              >
                <Icon name="bolt" size={48} color={M.acc} />
              </div>
            </div>
            <h1 style={{ fontFamily: M.disp, fontSize: 36, fontWeight: 800, margin: 0, letterSpacing: 0.5, lineHeight: 1.1 }}>
              DEIN KI-TRAININGSPLAN
            </h1>
            <p style={{ color: M.mut, fontSize: 16, lineHeight: 1.5, margin: "0 0 16px 0" }}>
              Beantworte ein paar Fragen zu deinen Voraussetzungen und Zielen. Die KI wertet diese aus und erstellt deinen individuellen Plan.
            </p>

            <button type="button" onClick={nextStep} style={{ ...btnPrimary, width: "100%", marginTop: 8 }}>
              JETZT STARTEN
              <Icon name="chevR" size={18} color={M.accInk} />
            </button>
          </div>
        )}

        {/* STEP 1: Profil */}
        {step === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20, minWidth: 0 }}>
            <div>
              <h2 style={{ fontFamily: M.disp, fontSize: 24, fontWeight: 700, margin: "0 0 6px 0", textTransform: "uppercase", letterSpacing: 0.5 }}>
                Profil
              </h2>
              <p style={{ color: M.mut, fontSize: 14, margin: 0 }}>
                Erzähl uns kurz etwas über dich — die KI nutzt diese Angaben für personalisierte Empfehlungen.
              </p>
            </div>

            {/* Geschlecht */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 12, color: M.mut, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Geschlecht
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" onClick={() => setGender("male")} style={tileStyle(gender === "male")}>
                  <span style={{ fontSize: 20 }}>♂</span> Männlich
                </button>
                <button type="button" onClick={() => setGender("female")} style={tileStyle(gender === "female")}>
                  <span style={{ fontSize: 20 }}>♀</span> Weiblich
                </button>
                <button type="button" onClick={() => setGender("other")} style={tileStyle(gender === "other")}>
                  <span style={{ fontSize: 20 }}>⚧</span> Divers
                </button>
              </div>
            </div>

            <BirthDateField value={birthDate} onChange={setBirthDate} />
          </div>
        )}

        {/* STEP 2: Körperwerte */}
        {step === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20, minWidth: 0 }}>
            <div>
              <h2 style={{ fontFamily: M.disp, fontSize: 24, fontWeight: 700, margin: "0 0 6px 0", textTransform: "uppercase", letterSpacing: 0.5 }}>
                Körperwerte
              </h2>
              <p style={{ color: M.mut, fontSize: 14, margin: 0 }}>
                Deine Körperwerte helfen der KI, deinen Kalorienbedarf und deine körperlichen Potenziale zu berechnen.
              </p>
            </div>

            {/* Größe & Gewicht */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label style={{ fontSize: 12, color: M.mut, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Körpergröße (cm)
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type="number"
                    placeholder="z.B. 180"
                    value={heightCm}
                    onChange={(e) => setHeightCm(e.target.value)}
                    style={inputStyle}
                  />
                  <div style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: M.mut, fontWeight: 600 }}>
                    cm
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label style={{ fontSize: 12, color: M.mut, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Gewicht (kg)
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type="number"
                    placeholder="z.B. 80.5"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    style={inputStyle}
                    step="0.1"
                  />
                  <div style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: M.mut, fontWeight: 600 }}>
                    kg
                  </div>
                </div>
              </div>
            </div>

            {/* KFA oder HTV Selector */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 12, color: M.mut, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Körperfett oder Hüft-Taillen-Verhältnis
              </span>
              <div style={{ display: "flex", background: M.card, borderRadius: 12, padding: 4, border: "1px solid " + M.line }}>
                <button
                  type="button"
                  onClick={() => setMetricMode("kfa")}
                  style={{
                    flex: 1,
                    padding: "10px",
                    borderRadius: 8,
                    border: "none",
                    background: metricMode === "kfa" ? M.acc : "transparent",
                    color: metricMode === "kfa" ? M.accInk : M.fg,
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: "pointer",
                    fontFamily: M.disp,
                  }}
                >
                  KÖRPERFETT (KFA)
                </button>
                <button
                  type="button"
                  onClick={() => setMetricMode("htv")}
                  style={{
                    flex: 1,
                    padding: "10px",
                    borderRadius: 8,
                    border: "none",
                    background: metricMode === "htv" ? M.acc : "transparent",
                    color: metricMode === "htv" ? M.accInk : M.fg,
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: "pointer",
                    fontFamily: M.disp,
                  }}
                >
                  HÜFT-TAILLE (HTV)
                </button>
              </div>
            </div>

            {metricMode === "kfa" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label style={{ fontSize: 12, color: M.mut, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Körperfettanteil (optional, %)
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type="number"
                    placeholder="z.B. 15"
                    value={kfa}
                    onChange={(e) => setKfa(e.target.value)}
                    style={inputStyle}
                  />
                  <div style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: M.mut, fontWeight: 600 }}>
                    % KFA
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <label style={{ fontSize: 12, color: M.mut, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                      Hüftumfang (cm)
                    </label>
                    <div style={{ position: "relative" }}>
                      <input
                        type="number"
                        placeholder="z.B. 95"
                        value={hipsCm}
                        onChange={(e) => setHipsCm(e.target.value)}
                        style={inputStyle}
                      />
                      <div style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: M.mut, fontWeight: 600 }}>
                        cm
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <label style={{ fontSize: 12, color: M.mut, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                      Taillenumfang (cm)
                    </label>
                    <div style={{ position: "relative" }}>
                      <input
                        type="number"
                        placeholder="z.B. 85"
                        value={waistCm}
                        onChange={(e) => setWaistCm(e.target.value)}
                        style={inputStyle}
                      />
                      <div style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: M.mut, fontWeight: 600 }}>
                        cm
                      </div>
                    </div>
                  </div>
                </div>

                {/* WHR Ergebnis */}
                {(() => {
                  const w = parseFloat(waistCm);
                  const h = parseFloat(hipsCm);
                  if (!isNaN(w) && !isNaN(h) && h > 0) {
                    const ratio = w / h;
                    const classification = getHtvClassification(ratio, gender);
                    return (
                      <div
                        style={{
                          background: M.card,
                          border: "1px solid " + M.line,
                          borderRadius: 12,
                          padding: "12px 14px",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <div style={{ fontSize: 12, color: M.mut, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                          Berechnetes HTV / WHR
                        </div>
                        <div style={{ fontSize: 32, fontFamily: M.disp, fontWeight: 800, color: M.fg }}>
                          {ratio.toFixed(2)}
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: classification.color }}>
                          {classification.text}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            )}
          </div>
        )}

        {/* STEP 3: Ziel & Erfahrung */}
        {step === 3 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div>
              <h2 style={{ fontFamily: M.disp, fontSize: 24, fontWeight: 700, margin: "0 0 6px 0", textTransform: "uppercase", letterSpacing: 0.5 }}>
                Ziel & Erfahrung
              </h2>
              <p style={{ color: M.mut, fontSize: 14, margin: 0 }}>
                Gib an, welches Ziel du erreichen willst und wie erfahren du bist.
              </p>
            </div>

            {/* Fitnessziel */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 12, color: M.mut, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Dein Primäres Ziel
              </span>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <button type="button" onClick={() => setFitnessGoal("muscle_building")} style={tileStyle(fitnessGoal === "muscle_building")}>
                  <Icon name="bolt" size={20} color={fitnessGoal === "muscle_building" ? M.acc : M.fg} />
                  <span>Muskelaufbau</span>
                </button>
                <button type="button" onClick={() => setFitnessGoal("fat_loss")} style={tileStyle(fitnessGoal === "fat_loss")}>
                  <Icon name="flame" size={20} color={fitnessGoal === "fat_loss" ? M.acc : M.fg} />
                  <span>Fettverbrennung</span>
                </button>
                <button type="button" onClick={() => setFitnessGoal("fitness")} style={tileStyle(fitnessGoal === "fitness")}>
                  <Icon name="timer" size={20} color={fitnessGoal === "fitness" ? M.acc : M.fg} />
                  <span>Fitness & Fit</span>
                </button>
                <button type="button" onClick={() => setFitnessGoal("strength")} style={tileStyle(fitnessGoal === "strength")}>
                  <Icon name="dumbbell" size={20} color={fitnessGoal === "strength" ? M.acc : M.fg} />
                  <span>Kraftaufbau</span>
                </button>
              </div>
            </div>

            {/* Erfahrung */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 12, color: M.mut, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Deine Trainingserfahrung
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setExperienceLevel("beginner")}
                  style={{ ...listTileStyle(experienceLevel === "beginner"), padding: "12px 16px" }}
                >
                  <div>
                    <div style={{ fontWeight: 700 }}>Anfänger</div>
                    <div style={{ fontSize: 11, color: M.mut, fontWeight: 400 }}>Unter 1 Jahr Erfahrung</div>
                  </div>
                  {experienceLevel === "beginner" && <Icon name="check" size={16} color={M.acc} />}
                </button>
                <button
                  type="button"
                  onClick={() => setExperienceLevel("intermediate")}
                  style={{ ...listTileStyle(experienceLevel === "intermediate"), padding: "12px 16px" }}
                >
                  <div>
                    <div style={{ fontWeight: 700 }}>Fortgeschritten</div>
                    <div style={{ fontSize: 11, color: M.mut, fontWeight: 400 }}>1 bis 3 Jahre Erfahrung</div>
                  </div>
                  {experienceLevel === "intermediate" && <Icon name="check" size={16} color={M.acc} />}
                </button>
                <button
                  type="button"
                  onClick={() => setExperienceLevel("advanced")}
                  style={{ ...listTileStyle(experienceLevel === "advanced"), padding: "12px 16px" }}
                >
                  <div>
                    <div style={{ fontWeight: 700 }}>Profi</div>
                    <div style={{ fontSize: 11, color: M.mut, fontWeight: 400 }}>Über 3 Jahre Erfahrung</div>
                  </div>
                  {experienceLevel === "advanced" && <Icon name="check" size={16} color={M.acc} />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Trainingsort & Frequenz */}
        {step === 4 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div>
              <h2 style={{ fontFamily: M.disp, fontSize: 24, fontWeight: 700, margin: "0 0 6px 0", textTransform: "uppercase", letterSpacing: 0.5 }}>
                Trainingsort & Frequenz
              </h2>
              <p style={{ color: M.mut, fontSize: 14, margin: 0 }}>
                Wo willst du trainieren und an wie vielen Tagen pro Woche?
              </p>
            </div>

            {/* Trainingsort */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 12, color: M.mut, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Trainingsort
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button type="button" onClick={() => setTrainingLocation("gym")} style={listTileStyle(trainingLocation === "gym")}>
                  <div>
                    <div style={{ fontWeight: 700 }}>Fitnessstudio (Gym)</div>
                    <div style={{ fontSize: 11, color: M.mut, fontWeight: 400 }}>Alle Geräte, Freihanteln, Kabelzüge</div>
                  </div>
                  {trainingLocation === "gym" && <Icon name="check" size={16} color={M.acc} />}
                </button>
                <button type="button" onClick={() => setTrainingLocation("home_equipment")} style={listTileStyle(trainingLocation === "home_equipment")}>
                  <div>
                    <div style={{ fontWeight: 700 }}>Home Gym mit Ausrüstung</div>
                    <div style={{ fontSize: 11, color: M.mut, fontWeight: 400 }}>Kurzhanteln, Bänder, Klimmzugstange</div>
                  </div>
                  {trainingLocation === "home_equipment" && <Icon name="check" size={16} color={M.acc} />}
                </button>
                <button type="button" onClick={() => setTrainingLocation("bodyweight")} style={listTileStyle(trainingLocation === "bodyweight")}>
                  <div>
                    <div style={{ fontWeight: 700 }}>Nur Eigengewicht (Bodyweight)</div>
                    <div style={{ fontSize: 11, color: M.mut, fontWeight: 400 }}>Keinerlei Geräte oder Gewichte nötig</div>
                  </div>
                  {trainingLocation === "bodyweight" && <Icon name="check" size={16} color={M.acc} />}
                </button>
              </div>
            </div>

            {trainingLocation === "home_equipment" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: -8, paddingLeft: 12, borderLeft: "2px solid " + M.accSoft }}>
                <span style={{ fontSize: 12, color: M.mut, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Vorhandene Ausrüstung im Home Gym
                </span>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {STANDARD_EQUIPMENT.map((eq) => {
                    const selected = homeEquipment.includes(eq.id);
                    return (
                      <button
                        key={eq.id}
                        type="button"
                        onClick={() => {
                          setHomeEquipment((prev) =>
                            prev.includes(eq.id) ? prev.filter((id) => id !== eq.id) : [...prev, eq.id]
                          );
                        }}
                        style={{
                          padding: "10px 12px",
                          borderRadius: 10,
                          border: selected ? `2px solid ${M.acc}` : `1px solid ${M.line}`,
                          background: selected ? M.accSoft : M.card,
                          color: selected ? M.acc : M.fg,
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        {eq.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Frequenz Stepper */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 12, color: M.mut, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Trainingstage pro Woche
              </span>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20, background: M.card, padding: "12px", borderRadius: 14, border: "1px solid " + M.line }}>
                <button
                  type="button"
                  onClick={() => setWeeklyDays(Math.max(1, weeklyDays - 1))}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    border: "1px solid " + M.line,
                    background: M.bg,
                    color: M.fg,
                    fontSize: 20,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  -
                </button>
                <div style={{ textAlign: "center", minWidth: 80 }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: M.acc, fontFamily: M.disp }}>{weeklyDays}</div>
                  <div style={{ fontSize: 11, color: M.mut }}>{weeklyDays === 1 ? "Tag" : "Tage"} / Woche</div>
                </div>
                <button
                  type="button"
                  onClick={() => setWeeklyDays(Math.min(7, weeklyDays + 1))}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    border: "1px solid " + M.line,
                    background: M.bg,
                    color: M.fg,
                    fontSize: 20,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  +
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: Schmerzen & Einschränkungen */}
        {step === 5 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <h2 style={{ fontFamily: M.disp, fontSize: 24, fontWeight: 700, margin: "0 0 6px 0", textTransform: "uppercase", letterSpacing: 0.5 }}>
                Schmerzen & Einschränkungen
              </h2>
              <p style={{ color: M.mut, fontSize: 14, margin: 0 }}>
                Hast du Schmerzen in bestimmten Gelenken oder Zonen? Die KI wird Übungen für diese Bereiche meiden oder anpassen.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button
                type="button"
                onClick={() => togglePainZone("knees")}
                style={tileStyle(painZones.includes("knees"))}
              >
                <span>Knie</span>
              </button>
              <button
                type="button"
                onClick={() => togglePainZone("lower_back")}
                style={tileStyle(painZones.includes("lower_back"))}
              >
                <span>Unterer Rücken</span>
              </button>
              <button
                type="button"
                onClick={() => togglePainZone("shoulders")}
                style={tileStyle(painZones.includes("shoulders"))}
              >
                <span>Schultern</span>
              </button>
              <button
                type="button"
                onClick={() => togglePainZone("wrists")}
                style={tileStyle(painZones.includes("wrists"))}
              >
                <span>Handgelenke</span>
              </button>
              <button
                type="button"
                onClick={() => togglePainZone("neck")}
                style={tileStyle(painZones.includes("neck"))}
              >
                <span>Nacken / HWS</span>
              </button>
              <button
                type="button"
                onClick={() => togglePainZone("none")}
                style={tileStyle(painZones.length === 0)}
              >
                <span>Keine Beschwerden</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 6: Andere Sportarten */}
        {step === 6 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <h2 style={{ fontFamily: M.disp, fontSize: 24, fontWeight: 700, margin: "0 0 6px 0", textTransform: "uppercase", letterSpacing: 0.5 }}>
                Andere Sportarten
              </h2>
              <p style={{ color: M.mut, fontSize: 14, margin: 0 }}>
                Machst du andere Sportarten? Dies hilft der KI, die Regeneration optimal zu planen.
              </p>
            </div>

            {/* Sportart hinzufügen */}
            <div
              style={{
                background: M.card,
                border: "1px solid " + M.line,
                borderRadius: 16,
                padding: 16,
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  placeholder="z.B. Laufen, Fußball"
                  value={tempSport}
                  onChange={(e) => setTempSport(e.target.value)}
                  style={{ ...inputStyle, textAlign: "left", flex: 1, padding: "10px 12px" }}
                />
                <button
                  type="button"
                  onClick={addSport}
                  style={{
                    padding: "0 18px",
                    borderRadius: 12,
                    background: M.acc,
                    color: M.accInk,
                    border: "none",
                    fontWeight: 700,
                    fontFamily: M.disp,
                    cursor: "pointer",
                  }}
                >
                  HINZUFÜGEN
                </button>
              </div>

              {/* Frequenz für neue Sportart */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: M.mut, fontWeight: 600 }}>Häufigkeit:</span>
                <div style={{ display: "flex", gap: 6 }}>
                  {[1, 2, 3, 4, 5].map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setTempFreq(f)}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        border: "1px solid " + M.line,
                        background: tempFreq === f ? M.acc : "transparent",
                        color: tempFreq === f ? M.accInk : M.fg,
                        fontWeight: 700,
                        cursor: "pointer",
                        fontSize: 12,
                      }}
                    >
                      {f}x
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Liste hinzugefügter Sportarten */}
            {otherSports.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                <span style={{ fontSize: 12, color: M.mut, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Eingetragene Sportarten
                </span>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {otherSports.map((s, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 14px",
                        background: M.card,
                        border: "1px solid " + M.line,
                        borderRadius: 12,
                        fontSize: 14,
                        fontWeight: 600,
                      }}
                    >
                      <span>
                        {s.sport} <span style={{ color: M.acc, marginLeft: 4 }}>({s.frequency}x/Woche)</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => removeSport(idx)}
                        style={{ background: "none", border: "none", color: "#ff8a8a", cursor: "pointer", padding: 4 }}
                      >
                        Entfernen
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 7: Premium Checkout (Bezahlen) */}
        {step === 7 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  display: "inline-flex",
                  padding: "6px 12px",
                  background: M.accSoft,
                  borderRadius: 20,
                  fontSize: 11,
                  color: M.acc,
                  fontWeight: 700,
                  letterSpacing: 1,
                  marginBottom: 10,
                }}
              >
                PREMIUM
              </div>
              <h2 style={{ fontFamily: M.disp, fontSize: 28, fontWeight: 800, margin: 0, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Dein individueller Trainingsplan
              </h2>
            </div>

            {/* Preis-Box */}
            <div
              style={{
                background: "linear-gradient(160deg, #182218, #0e120e)",
                border: "1px solid " + M.acc,
                borderRadius: 20,
                padding: "24px 20px",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div style={{ textDecoration: "line-through", color: M.mut, fontSize: 16 }}>
                9,99 €
              </div>
              <div style={{ fontSize: 42, fontFamily: M.disp, fontWeight: 800, color: M.acc, lineHeight: 1 }}>
                4,99 € <span style={{ fontSize: 16, color: M.fg, fontWeight: 600 }}>einmalig</span>
              </div>
              <div style={{ fontSize: 12, color: M.mut, marginTop: 4 }}>
                Lebenslanger Zugriff · Keine versteckten Abos
              </div>
            </div>

            {/* Feature-Liste */}
            {(() => {
              const painZoneTranslations: Record<string, string> = {
                knees: "Knie",
                lower_back: "Unterer Rücken",
                shoulders: "Schultern",
                wrists: "Handgelenke",
                neck: "Nacken / HWS",
              };
              const locationTranslations: Record<string, string> = {
                gym: "Fitnessstudio",
                home_equipment: "Home Gym",
                bodyweight: "Bodyweight (Eigengewicht)",
              };
              const painText = painZones.map((z) => painZoneTranslations[z] || z).join(", ") || "keine";
              const locText = locationTranslations[trainingLocation] || trainingLocation;
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "8px 4px" }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14 }}>
                    <span style={{ color: M.acc, fontWeight: 700 }}>✓</span>
                    <span style={{ color: M.fg }}>100% maßgeschneiderte Übungsauswahl von der KI</span>
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14 }}>
                    <span style={{ color: M.acc, fontWeight: 700 }}>✓</span>
                    <span style={{ color: M.fg }}>Volle Berücksichtigung deiner Schmerzpunkte (z.B. {painText})</span>
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14 }}>
                    <span style={{ color: M.acc, fontWeight: 700 }}>✓</span>
                    <span style={{ color: M.fg }}>Perfekt angepasst an deinen Ort: {locText}</span>
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14 }}>
                    <span style={{ color: M.acc, fontWeight: 700 }}>✓</span>
                    <span style={{ color: M.fg }}>Direkt in die App importiert zum sofortigen Trainieren</span>
                  </div>
                </div>
              );
            })()}

            {/* Simulierter Bezahlbutton */}
            <button
              type="button"
              onClick={handleCheckout}
              disabled={busy}
              style={{ ...btnPrimary, width: "100%", height: 54, fontSize: 19, letterSpacing: 1.2, marginTop: 12 }}
            >
              {busy ? "BEZAHLVORGANG..." : "JETZT SICHER BEZAHLEN"}
              {!busy && <Icon name="check" size={20} color={M.accInk} />}
            </button>
          </div>
        )}

        {/* STEP 8: Generierung & Fertigstellung */}
        {step === 8 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24, textAlign: "center", alignItems: "center" }}>
            {busy ? (
              <>
                {/* Wunderschöne Puls-Animation */}
                <div
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: "50%",
                    background: M.accSoft,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: M.acc,
                    animation: "pulse 1.8s infinite ease-in-out",
                  }}
                >
                  <Icon name="timer" size={40} color={M.acc} />
                </div>
                <style>{`
                  @keyframes pulse {
                    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(140,255,140, 0.4); }
                    70% { transform: scale(1); box-shadow: 0 0 0 16px rgba(140,255,140, 0); }
                    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(140,255,140, 0); }
                  }
                `}</style>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <h3 style={{ fontFamily: M.disp, fontSize: 24, fontWeight: 700, margin: 0 }}>
                    DEIN PLAN WIRD GENERIERT
                  </h3>
                  <p style={{ color: M.acc, fontWeight: 700, fontSize: 16, margin: 0 }}>
                    {loadingTexts[loadingStep]}
                  </p>
                  <p style={{ color: M.mut, fontSize: 13, margin: 0 }}>
                    Bitte schließe die App nicht. Dieser Vorgang dauert etwa 10-15 Sekunden.
                  </p>
                </div>
              </>
            ) : generatedPlanId ? (
              <>
                <div
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: "50%",
                    background: M.acc,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: M.accInk,
                  }}
                >
                  <Icon name="check" size={44} color={M.accInk} stroke={3} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <h3 style={{ fontFamily: M.disp, fontSize: 28, fontWeight: 800, margin: 0 }}>
                    PLAN ERFOLGREICH GENERIERT!
                  </h3>
                  <p style={{ color: M.mut, fontSize: 15, lineHeight: 1.5, margin: 0 }}>
                    Dein personalisierter KI-Trainingsplan wurde erstellt und als dein aktiver Trainingsplan hinterlegt. Du kannst direkt loslegen!
                  </p>
                </div>
                <OneRmPercentInfoCard compact style={{ width: "100%", textAlign: "left" }} />
                <button
                  type="button"
                  onClick={onPlanGenerated}
                  style={{ ...btnPrimary, width: "100%", height: 50, marginTop: 12 }}
                >
                  TRAININGSPLAN ANSEHEN
                  <Icon name="play" size={18} color={M.accInk} />
                </button>
              </>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <p style={{ color: "#ff8a8a", fontWeight: 600 }}>Generierung fehlgeschlagen.</p>
                <button type="button" onClick={runGeneration} style={btnPrimary}>
                  Erneut versuchen
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer-Navigationsbar */}
      {step > 0 && step < 7 && (
        <div style={{ width: "100%", maxWidth: 460, display: "flex", justifyContent: "space-between", gap: 12 }}>
          <button type="button" onClick={prevStep} style={btnSecondary}>
            <Icon name="chevL" size={16} /> ZURÜCK
          </button>
          <button type="button" onClick={nextStep} style={btnPrimary}>
            WEITER <Icon name="chevR" size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
