import { useState, useEffect, useRef } from "react";
import { brandSelectionStyle, M } from "../theme";
import { useAuth } from "../lib/auth";
import { usePreferences } from "../lib/preferences";
import { Icon } from "../components/Icon";
import { BirthDateField } from "../components/BirthDateField";
import { OneRmPercentInfoCard } from "../components/OneRmPercentInfoCard";
import { createBodyMeasurement, generateAndSaveAITrainingPlan, fetchRecentSessionsWithExercises, useBodyMeasurements } from "../lib/db";
import { buildNutrition, ageFromBirthDate } from "../lib/nutrition";
import {
  createAiConsentGrant,
  hasAiConsent,
  normalizeSleepHours,
  normalizeStressLevel,
  type TrainingSplitDays,
  type TrainingStructure,
} from "../lib/preferences";
import { useBreakpoint } from "../lib/responsive";
import { MUSCLE_GROUP_SECTIONS } from "../lib/exerciseCatalog";
import { normalizeMusclePriorities, type MusclePriorities } from "../lib/musclePriorities";
import { MusclePrioritySliderRow } from "../components/MusclePrioritySliderRow";
import { getExerciseCountHint } from "../lib/ai-plan-volume";
import { MButton } from "../components/MButton";
import { AiConsentStep } from "../components/AiConsentStep";

function formatSleepHours(hours: number): string {
  const rounded = Math.round(hours * 2) / 2;
  const str = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1).replace(".", ",");
  return `${str} h`;
}

const GENERATION_LOADING_TEXTS = [
  "Analysiere Anamnesedaten...",
  "Bewerte körperliche Einschränkungen...",
  "Die KI generiert deinen Trainingsplan...",
  "Speichere Trainingsplan in der Datenbank...",
] as const;

/** Phasen an typischen Laufzeiten (Speichern → KI → DB). */
function getGenerationLoadingStep(elapsedSec: number): number {
  if (elapsedSec < 3) return 0;
  if (elapsedSec < 7) return 1;
  if (elapsedSec < 14) return 2;
  return 3;
}

function formatGenerationTimeHint(elapsedSec: number): string {
  const prefix = "Bitte schließe die App nicht. ";
  if (elapsedSec < 4) {
    return prefix + "Dieser Vorgang dauert etwa 10–15 Sekunden.";
  }
  if (elapsedSec < 12) {
    const remaining = Math.max(3, 15 - elapsedSec);
    return prefix + `Noch etwa ${remaining} Sekunden …`;
  }
  if (elapsedSec < 20) {
    return prefix + "Gleich fertig — nur noch einen Moment.";
  }
  if (elapsedSec < 40) {
    return prefix + "Die KI braucht etwas länger — bitte weiter warten.";
  }
  return prefix + "Das dauert ungewöhnlich lange. Prüfe deine Verbindung und warte noch kurz.";
}

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
  ...brandSelectionStyle(selected),
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
  ...brandSelectionStyle(selected),
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

/** Gleiche Maße wie „Trainingstage pro Woche“ — inkl. sichtbarer +/- Farbe. */
const stepperBtnStyle: React.CSSProperties = {
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
};

function getHtvClassification(htv: number, gender: string | null): { text: string; color: string } {
  if (gender === "male") {
    if (htv < 0.90) return { text: "Geringes Risiko (Normalwert)", color: M.brand };
    if (htv < 1.0) return { text: "Mäßiges Risiko (Übergewicht)", color: "#9ca3af" };
    return { text: "Hohes Risiko (Adipositas)", color: "#6b7280" };
  } else if (gender === "female") {
    if (htv < 0.80) return { text: "Geringes Risiko (Normalwert)", color: M.brand };
    if (htv < 0.85) return { text: "Mäßiges Risiko (Übergewicht)", color: "#9ca3af" };
    return { text: "Hohes Risiko (Adipositas)", color: "#6b7280" };
  } else {
    if (htv < 0.85) return { text: "Geringes Risiko (Normalwert)", color: M.brand };
    if (htv < 0.92) return { text: "Mäßiges Risiko (Übergewicht)", color: "#9ca3af" };
    return { text: "Hohes Risiko (Adipositas)", color: "#6b7280" };
  }
}

const SPLIT_OPTIONS: { days: TrainingSplitDays; label: string; hint: string }[] = [
  { days: 2, label: "2er-Split", hint: "Ober- / Unterkörper" },
  { days: 3, label: "3er-Split", hint: "Push / Pull / Beine" },
  { days: 4, label: "4er-Split", hint: "4 Muskelgruppen-Rotation" },
  { days: 5, label: "5er-Split", hint: "Klassischer 5-Tage-Split" },
  { days: 6, label: "6er-Split", hint: "1 Fokus pro Tag" },
];

const STANDARD_EQUIPMENT = [
  { id: "dumbbells", name: "Kurzhanteln" },
  { id: "barbell", name: "Langhantel" },
  { id: "pullup_bar", name: "Klimmzugstange" },
  { id: "bench", name: "Trainingsbank" },
  { id: "bands", name: "Widerstandsbänder" },
  { id: "kettlebell", name: "Kettlebell" },
];

const INTRO_BENEFITS = [
  "Individueller Trainingsplan mit Übungen, Sätzen und Intensität als % deines 1RM (kg trägst du selbst ein)",
  "Ernährungs-Richtwerte: Kalorien, Makros und Trinkmenge — lokal berechnet und nachvollziehbar",
  "Persönliche Empfehlungen: Trainingsfokus, Ernährung, Regeneration, Hydration und empfohlene Plan-Dauer",
  "Plan wird in der App gespeichert und kann sofort als aktiver Trainingsplan genutzt werden",
];

interface AITrainingPlanWizardProps {
  onBack: () => void;
  onPlanGenerated: (planId: string) => void;
}

export function AITrainingPlanWizard({ onBack, onPlanGenerated }: AITrainingPlanWizardProps) {
  const { user, profile, updateBirthDate } = useAuth();
  const { preferences, updatePreferences, saving: prefsSaving } = usePreferences();
  const { data: measurements, loading: measurementsLoading } = useBodyMeasurements();
  const breakpoint = useBreakpoint();
  const bodyValuesPrefilled = useRef(false);

  const legalBaseUrl = (import.meta.env.VITE_LEGAL_BASE_URL ?? "https://rephive.app").replace(/\/$/, "");
  const openDatenschutz = () => {
    window.open(`${legalBaseUrl}/datenschutz`, "_blank", "noopener,noreferrer");
  };

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

  // Schritt 4: Muskelgruppen-Priorität
  const [musclePriorities, setMusclePriorities] = useState<MusclePriorities>(() =>
    normalizeMusclePriorities(preferences.anamnesis?.musclePriorities)
  );

  // Schritt 4: Trainingsort & Frequenz
  const [trainingLocation, setTrainingLocation] = useState<"gym" | "home_equipment" | "bodyweight">(
    preferences.anamnesis?.trainingLocation ?? "gym"
  );
  const [weeklyDays, setWeeklyDays] = useState<number>(preferences.weeklyDays || 3);
  const [trainingStructure, setTrainingStructure] = useState<TrainingStructure | null>(
    preferences.anamnesis?.trainingStructure ?? null
  );
  const [trainingSplitDays, setTrainingSplitDays] = useState<TrainingSplitDays | null>(
    preferences.anamnesis?.trainingSplitDays ?? null
  );
  const [minutesPerSession, setMinutesPerSession] = useState<number>(
    preferences.anamnesis?.minutesPerSession ?? 60
  );

  // Schritt 3: Ernährung
  const [dietPreference, setDietPreference] = useState<
    "omnivore" | "vegetarian" | "vegan" | "pescetarian" | null
  >(preferences.anamnesis?.dietPreference ?? "omnivore");
  const [dietAllergies, setDietAllergies] = useState<string[]>(preferences.anamnesis?.dietAllergies ?? []);
  const [tempAllergy, setTempAllergy] = useState("");

  // Schritt 6: Alltag & Regeneration
  const [occupation, setOccupation] = useState<"sedentary" | "standing" | "physical" | null>(
    preferences.anamnesis?.occupation ?? null
  );
  const [shiftWork, setShiftWork] = useState<boolean>(preferences.anamnesis?.shiftWork ?? false);
  const [sleepHours, setSleepHours] = useState<number>(
    normalizeSleepHours(preferences.anamnesis?.sleepHours)
  );
  const [stressLevel, setStressLevel] = useState<number>(
    normalizeStressLevel(preferences.anamnesis?.stressLevel) ?? 5
  );

  // Schritt 5: Schmerzen & Einschränkungen
  const [painZones, setPainZones] = useState<string[]>([]);

  // Schritt 6: Andere Sportarten
  const [otherSports, setOtherSports] = useState<{ sport: string; frequency: number }[]>([]);
  const [tempSport, setTempSport] = useState<string>("");
  const [tempFreq, setTempFreq] = useState<number>(1);

  // Schritt 7 & 8: Bezahlung & Generierung
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedPlanId, setGeneratedPlanId] = useState<string | null>(null);
  const [genElapsedSec, setGenElapsedSec] = useState(0);
  const generationStartedAtRef = useRef<number | null>(null);

  const addAllergy = () => {
    const trimmed = tempAllergy.trim();
    if (!trimmed || dietAllergies.includes(trimmed)) return;
    setDietAllergies((prev) => [...prev, trimmed]);
    setTempAllergy("");
  };

  useEffect(() => {
    if (step !== 12 || !busy) {
      if (step !== 12) {
        generationStartedAtRef.current = null;
        setGenElapsedSec(0);
      }
      return;
    }
    const tick = () => {
      const start = generationStartedAtRef.current;
      if (start == null) return;
      setGenElapsedSec(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
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
    if (step === 7) {
      if (!trainingStructure) {
        setError("Bitte wähle Ganzkörper oder Split-Training.");
        return;
      }
      if (trainingStructure === "split" && !trainingSplitDays) {
        setError("Bitte wähle die Split-Größe (2er bis 6er).");
        return;
      }
      if (trainingStructure === "split" && trainingSplitDays && weeklyDays < trainingSplitDays) {
        setError(
          `Für einen ${trainingSplitDays}er-Split brauchst du mindestens ${trainingSplitDays} Trainingstage pro Woche.`
        );
        return;
      }
      if (!minutesPerSession) {
        setError("Bitte wähle die Zeit pro Trainingseinheit.");
        return;
      }
    }
    if (step === 9) {
      if (!occupation) {
        setError("Bitte wähle deine berufliche Alltagsaktivität.");
        return;
      }
      if (stressLevel < 1 || stressLevel > 10) {
        setError("Bitte wähle dein Stresslevel (1–10).");
        return;
      }
      if (sleepHours < 4 || sleepHours > 12 || !Number.isInteger(sleepHours * 2)) {
        setError("Bitte gib eine realistische Schlafdauer (4–12 Stunden, in 0,5h-Schritten) an.");
        return;
      }
    }
    if (step === 10) {
      setStep(11);
      return;
    }
    setStep((s) => s + 1);
  };

  const prevStep = () => {
    setError(null);
    setStep((s) => s - 1);
  };

  const startGenerationFlow = (options?: { consentGranted?: boolean }) => {
    if (!options?.consentGranted && !hasAiConsent(preferences)) {
      setError("Bitte erteile zuerst deine Einwilligung zur KI-Nutzung.");
      setStep(11);
      return;
    }
    setStep(12);
    void runGeneration(options?.consentGranted);
  };

  const handleGrantConsent = async () => {
    setError(null);
    try {
      await updatePreferences({ aiConsent: createAiConsentGrant() }, true);
      startGenerationFlow({ consentGranted: true });
    } catch {
      setError("Die Einwilligung konnte nicht gespeichert werden. Bitte erneut versuchen.");
    }
  };

  const runGeneration = async (consentGranted = false) => {
    if (!user) return;
    if (!consentGranted && !hasAiConsent(preferences)) {
      setError("Für die KI-Planerstellung ist deine Einwilligung erforderlich.");
      setStep(11);
      return;
    }
    generationStartedAtRef.current = Date.now();
    setGenElapsedSec(0);
    setBusy(true);
    setError(null);

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
        minutesPerSession,
        occupation,
        shiftWork,
        sleepHours,
        stressLevel,
        dietPreference,
        dietAllergies,
        trainingStructure,
        trainingSplitDays: trainingStructure === "split" ? trainingSplitDays : null,
        musclePriorities,
      };

      const nutrition = buildNutrition({
        gender,
        birthDate: birthDate.trim() || profile?.birth_date,
        heightCm: parsedHeight,
        weightKg: parsedWeight,
        fitnessGoal,
        experienceLevel,
        weeklyDays,
        minutesPerSession,
        occupation,
        otherSports,
      });

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
        birthDate: birthDate.trim() || profile?.birth_date,
        heightCm: parsedHeight,
        weightKg: parsedWeight,
        fitnessGoal,
        experienceLevel,
        weeklyDays,
        anamnesis: anamnesisObj,
        nutrition,
        recentSessions,
        exerciseFeedback: preferences.exerciseFeedback,
      });

      setGeneratedPlanId(planId);
    } catch (e: any) {
      console.error("Fehler bei der KI-Generierung:", e);
      setError(e.message || "Es ist ein Fehler bei der Generierung aufgetreten. Bitte versuche es erneut.");
      setStep(12); // Zurück zum Generierungsschritt im Fehlerfall
    } finally {
      setBusy(false);
    }
  };

  // Steps Configuration
  const stepsCount = 13;
  const progressPercent = step === 0 ? 0 : Math.min(100, (step / (stepsCount - 1)) * 100);
  /** Header + Footer fix; nur der Mittelteil scrollt (Step 6 Split-Abfrage etc.). */
  const scrollableMain = step <= 11;

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
        overflowY: scrollableMain ? "hidden" : "auto",
      }}
    >
      {/* Header und Progressbar */}
      {step < 12 && (
        <div style={{ width: "100%", maxWidth: 460, flexShrink: 0 }}>
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
                  background: M.brand,
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
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: scrollableMain ? "flex-start" : "center",
          margin: "12px 0 24px 0",
          overflowY: scrollableMain ? "auto" : undefined,
          WebkitOverflowScrolling: scrollableMain ? "touch" : undefined,
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
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 18,
                    background: M.brandSoft,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: M.brand,
                  }}
                >
                  <Icon name="sparkles" size={28} color={M.brand} />
                </div>
              </div>
              <h1 style={{ fontFamily: M.disp, fontSize: 36, fontWeight: 800, margin: 0, letterSpacing: 0.5, lineHeight: 1.1 }}>
                DEIN KI-TRAININGSPLAN
              </h1>
              <p style={{ color: M.mut, fontSize: 16, lineHeight: 1.5, margin: "12px 0 0 0" }}>
                Beantworte ein paar Fragen zu Ziel, Alltag und Voraussetzungen — du erhältst einen maßgeschneiderten Plan plus
                nachlesbare Empfehlungen zu Training und Ernährung.
              </p>
            </div>

            <div
              style={{
                padding: "14px 16px",
                borderRadius: 14,
                background: M.card,
                border: "1px solid " + M.line,
                textAlign: "left",
              }}
            >
              <div style={{ fontSize: 11, letterSpacing: 1.4, color: M.mut, fontWeight: 700, marginBottom: 10 }}>
                DAS BEKOMMST DU
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {INTRO_BENEFITS.map((text) => (
                  <div key={text} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14 }}>
                    <span style={{ color: M.brand, fontWeight: 700, flexShrink: 0 }}>✓</span>
                    <span style={{ color: M.fg, lineHeight: 1.45 }}>{text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 11, letterSpacing: 1.4, color: M.mut, fontWeight: 700, marginBottom: 8 }}>
                WARUM DAS SINN MACHT
              </div>
              <p style={{ color: M.mut, fontSize: 13, lineHeight: 1.55, margin: "0 0 8px 0" }}>
                Ziel, verfügbare Zeit, Regeneration und Einschränkungen werden zusammen betrachtet — statt nur einzelne Übungen
                aus dem Bauchgefühl zu wählen.
              </p>
              <p style={{ color: M.mut, fontSize: 13, lineHeight: 1.55, margin: "0 0 8px 0" }}>
                In ca. 3–5 Minuten Eingabe erhältst du einen strukturierten Plan, ohne stundenlang recherchieren zu müssen.
              </p>
              <p style={{ color: M.mut2, fontSize: 12, lineHeight: 1.5, margin: 0 }}>
                Alle Angaben sind Richtwerte und ersetzen keine medizinische oder ernährungstherapeutische Beratung.
              </p>
            </div>

            <div
              style={{
                padding: "12px 14px",
                borderRadius: 12,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid " + M.line2,
                textAlign: "left",
              }}
            >
              <p style={{ color: M.mut2, fontSize: 11.5, lineHeight: 1.45, margin: 0 }}>
                Deine Angaben werden in deinem rephive-Konto gespeichert. Für die Plan-Erstellung werden relevante Daten an
                <strong> Anthropic</strong> übermittelt — dazu holen wir vor der Generierung eine separate Einwilligung ein
                (kein automatisches Opt-in). Es erfolgt keine Weitergabe zu Werbezwecken.{" "}
                <button
                  type="button"
                  onClick={openDatenschutz}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    color: M.mut,
                    fontSize: "inherit",
                    fontFamily: "inherit",
                    textDecoration: "underline",
                    textUnderlineOffset: 2,
                    cursor: "pointer",
                  }}
                >
                  Datenschutzerklärung
                </button>
              </p>
            </div>
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
                    background: metricMode === "kfa" ? M.brand : "transparent",
                    color: metricMode === "kfa" ? M.brandInk : M.fg,
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
                    background: metricMode === "htv" ? M.brand : "transparent",
                    color: metricMode === "htv" ? M.brandInk : M.fg,
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
                  <Icon name="bolt" size={20} color={fitnessGoal === "muscle_building" ? M.brand : M.fg} />
                  <span>Muskelaufbau</span>
                </button>
                <button type="button" onClick={() => setFitnessGoal("fat_loss")} style={tileStyle(fitnessGoal === "fat_loss")}>
                  <Icon name="flame" size={20} color={fitnessGoal === "fat_loss" ? M.brand : M.fg} />
                  <span>Fettverbrennung</span>
                </button>
                <button type="button" onClick={() => setFitnessGoal("fitness")} style={tileStyle(fitnessGoal === "fitness")}>
                  <Icon name="timer" size={20} color={fitnessGoal === "fitness" ? M.brand : M.fg} />
                  <span>Fitness & Fit</span>
                </button>
                <button type="button" onClick={() => setFitnessGoal("strength")} style={tileStyle(fitnessGoal === "strength")}>
                  <Icon name="dumbbell" size={20} color={fitnessGoal === "strength" ? M.brand : M.fg} />
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
                  {experienceLevel === "beginner" && <Icon name="check" size={16} color={M.brand} />}
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
                  {experienceLevel === "intermediate" && <Icon name="check" size={16} color={M.brand} />}
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
                  {experienceLevel === "advanced" && <Icon name="check" size={16} color={M.brand} />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Muskelgruppen-Priorität */}
        {step === 4 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <h2 style={{ fontFamily: M.disp, fontSize: 24, fontWeight: 700, margin: "0 0 6px 0", textTransform: "uppercase", letterSpacing: 0.5 }}>
                Muskelgruppen-Priorität
              </h2>
              <p style={{ color: M.mut, fontSize: 14, margin: 0 }}>
                Bewerte die Bedeutung jeder Muskelgruppe für deine Ziele. Die KI plant mehr Volumen für wichtige Bereiche.
              </p>
            </div>

            {MUSCLE_GROUP_SECTIONS.map((section) => (
              <div key={section.id}>
                <span
                  style={{
                    display: "block",
                    fontSize: 11,
                    color: M.mut,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: 0.8,
                    marginBottom: 4,
                  }}
                >
                  {section.label}
                </span>
                {section.groups.map((group) => (
                  <MusclePrioritySliderRow
                    key={group}
                    group={group}
                    value={musclePriorities[group]}
                    onChange={(value) => setMusclePriorities((prev) => ({ ...prev, [group]: value }))}
                  />
                ))}
              </div>
            ))}
          </div>
        )}

        {/* STEP 5: Ernährung */}
        {step === 5 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div>
              <h2 style={{ fontFamily: M.disp, fontSize: 24, fontWeight: 700, margin: "0 0 6px 0", textTransform: "uppercase", letterSpacing: 0.5 }}>
                Ernährung
              </h2>
              <p style={{ color: M.mut, fontSize: 14, margin: 0 }}>
                Deine Ernährungspräferenz fließt in die KI-Empfehlungen ein.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 12, color: M.mut, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Ernährungspräferenz
              </span>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <button type="button" onClick={() => setDietPreference("omnivore")} style={tileStyle(dietPreference === "omnivore")}>
                  <span>Keine Vorgabe</span>
                </button>
                <button type="button" onClick={() => setDietPreference("vegetarian")} style={tileStyle(dietPreference === "vegetarian")}>
                  <span>Vegetarisch</span>
                </button>
                <button type="button" onClick={() => setDietPreference("vegan")} style={tileStyle(dietPreference === "vegan")}>
                  <span>Vegan</span>
                </button>
                <button type="button" onClick={() => setDietPreference("pescetarian")} style={tileStyle(dietPreference === "pescetarian")}>
                  <span>Pescetarisch</span>
                </button>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <input
                  type="text"
                  placeholder="Allergie z.B. Nüsse"
                  value={tempAllergy}
                  onChange={(e) => setTempAllergy(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addAllergy()}
                  style={{ ...inputStyle, textAlign: "left", flex: 1, padding: "10px 12px" }}
                />
                <MButton type="button" onClick={addAllergy} variant="secondary" size="sm" style={{ width: 36, minWidth: 36 }}>
                  +
                </MButton>
              </div>
              {dietAllergies.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {dietAllergies.map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setDietAllergies((prev) => prev.filter((x) => x !== a))}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 20,
                        border: "1px solid " + M.line,
                        background: M.card,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      {a} ×
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 6: Trainingsort */}
        {step === 6 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div>
              <h2 style={{ fontFamily: M.disp, fontSize: 24, fontWeight: 700, margin: "0 0 6px 0", textTransform: "uppercase", letterSpacing: 0.5 }}>
                Trainingsort
              </h2>
              <p style={{ color: M.mut, fontSize: 14, margin: 0 }}>
                Wo willst du trainieren?
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
                  {trainingLocation === "gym" && <Icon name="check" size={16} color={M.brand} />}
                </button>
                <button type="button" onClick={() => setTrainingLocation("home_equipment")} style={listTileStyle(trainingLocation === "home_equipment")}>
                  <div>
                    <div style={{ fontWeight: 700 }}>Home Gym mit Ausrüstung</div>
                    <div style={{ fontSize: 11, color: M.mut, fontWeight: 400 }}>Kurzhanteln, Bänder, Klimmzugstange</div>
                  </div>
                  {trainingLocation === "home_equipment" && <Icon name="check" size={16} color={M.brand} />}
                </button>
                <button type="button" onClick={() => setTrainingLocation("bodyweight")} style={listTileStyle(trainingLocation === "bodyweight")}>
                  <div>
                    <div style={{ fontWeight: 700 }}>Nur Eigengewicht (Bodyweight)</div>
                    <div style={{ fontSize: 11, color: M.mut, fontWeight: 400 }}>Keinerlei Geräte oder Gewichte nötig</div>
                  </div>
                  {trainingLocation === "bodyweight" && <Icon name="check" size={16} color={M.brand} />}
                </button>
              </div>
            </div>

            {trainingLocation === "home_equipment" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: -8, paddingLeft: 12, borderLeft: "2px solid " + M.brandSoft }}>
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
                          border: selected ? `2px solid ${M.brand}` : `1px solid ${M.line}`,
                          background: selected ? M.brandSoft : M.card,
                          color: selected ? M.brand : M.fg,
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
          </div>
        )}

        {/* STEP 7: Frequenz & Zeit */}
        {step === 7 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div>
              <h2 style={{ fontFamily: M.disp, fontSize: 24, fontWeight: 700, margin: "0 0 6px 0", textTransform: "uppercase", letterSpacing: 0.5 }}>
                Training & Zeit
              </h2>
              <p style={{ color: M.mut, fontSize: 14, margin: 0 }}>
                Struktur, Häufigkeit und Dauer deiner Einheiten — die KI baut deinen Wochenplan danach auf.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 12, color: M.mut, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Trainingsstruktur
              </span>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => {
                    setTrainingStructure("full_body");
                    setTrainingSplitDays(null);
                  }}
                  style={tileStyle(trainingStructure === "full_body")}
                >
                  <span>Ganzkörper</span>
                  <span style={{ fontSize: 11, color: M.mut, fontWeight: 500 }}>Jede Einheit: ganzer Körper</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTrainingStructure("split")}
                  style={tileStyle(trainingStructure === "split")}
                >
                  <span>Split-Training</span>
                  <span style={{ fontSize: 11, color: M.mut, fontWeight: 500 }}>Muskelgruppen getrennt</span>
                </button>
              </div>
            </div>

            {trainingStructure === "split" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <span style={{ fontSize: 12, color: M.mut, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Split-Größe
                </span>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {SPLIT_OPTIONS.map((opt) => (
                    <button
                      key={opt.days}
                      type="button"
                      onClick={() => setTrainingSplitDays(opt.days)}
                      style={listTileStyle(trainingSplitDays === opt.days)}
                    >
                      <span>
                        {opt.label}
                        <span style={{ display: "block", fontSize: 11, color: M.mut, fontWeight: 500, marginTop: 2 }}>
                          {opt.hint}
                        </span>
                      </span>
                      {trainingSplitDays === opt.days && <Icon name="check" size={18} color={M.brand} />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {trainingStructure === "full_body" && weeklyDays > 3 && (
              <p style={{ color: M.mut2, fontSize: 12, lineHeight: 1.45, margin: 0 }}>
                Ganzkörper-Training ist oft mit 2–3 Einheiten pro Woche am sinnvollsten — du kannst trotzdem mehr wählen.
              </p>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 12, color: M.mut, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Trainingstage pro Woche
              </span>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20, background: M.card, padding: "12px", borderRadius: 14, border: "1px solid " + M.line }}>
                <button
                  type="button"
                  onClick={() => setWeeklyDays(Math.max(1, weeklyDays - 1))}
                  style={stepperBtnStyle}
                  aria-label="Trainingstage reduzieren"
                >
                  -
                </button>
                <div style={{ textAlign: "center", minWidth: 80 }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: M.brand, fontFamily: M.disp }}>{weeklyDays}</div>
                  <div style={{ fontSize: 11, color: M.mut }}>{weeklyDays === 1 ? "Tag" : "Tage"} / Woche</div>
                </div>
                <button
                  type="button"
                  onClick={() => setWeeklyDays(Math.min(7, weeklyDays + 1))}
                  style={stepperBtnStyle}
                  aria-label="Trainingstage erhöhen"
                >
                  +
                </button>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 12, color: M.mut, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Zeit pro Trainingseinheit
              </span>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[30, 45, 60, 90].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setMinutesPerSession(mins)}
                    style={tileStyle(minutesPerSession === mins)}
                  >
                    <span>{mins} Min</span>
                  </button>
                ))}
              </div>
              {experienceLevel && fitnessGoal && (
                <p style={{ color: M.mut, fontSize: 13, margin: 0 }}>
                  {getExerciseCountHint(minutesPerSession, experienceLevel, fitnessGoal, {
                    sleepHours,
                    stressLevel,
                  }, ageFromBirthDate(birthDate.trim() || profile?.birth_date))}
                </p>
              )}
            </div>
          </div>
        )}

        {/* STEP 8: Schmerzen & Einschränkungen */}
        {step === 8 && (
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

        {/* STEP 9: Alltag & Regeneration */}
        {step === 9 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div>
              <h2 style={{ fontFamily: M.disp, fontSize: 24, fontWeight: 700, margin: "0 0 6px 0", textTransform: "uppercase", letterSpacing: 0.5 }}>
                Alltag & Regeneration
              </h2>
              <p style={{ color: M.mut, fontSize: 14, margin: 0 }}>
                Beruf, Schlaf und Stress helfen der KI, Volumen und Erholung realistisch zu planen.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 12, color: M.mut, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Beruf / Alltagsaktivität
              </span>
              <button type="button" onClick={() => setOccupation("sedentary")} style={listTileStyle(occupation === "sedentary")}>
                <div>
                  <div style={{ fontWeight: 700 }}>Überwiegend sitzend</div>
                  <div style={{ fontSize: 11, color: M.mut }}>Büro, Homeoffice</div>
                </div>
                {occupation === "sedentary" && <Icon name="check" size={16} color={M.brand} />}
              </button>
              <button type="button" onClick={() => setOccupation("standing")} style={listTileStyle(occupation === "standing")}>
                <div>
                  <div style={{ fontWeight: 700 }}>Überwiegend stehend</div>
                  <div style={{ fontSize: 11, color: M.mut }}>Einzelhandel, Pflege</div>
                </div>
                {occupation === "standing" && <Icon name="check" size={16} color={M.brand} />}
              </button>
              <button type="button" onClick={() => setOccupation("physical")} style={listTileStyle(occupation === "physical")}>
                <div>
                  <div style={{ fontWeight: 700 }}>Körperlich belastend</div>
                  <div style={{ fontSize: 11, color: M.mut }}>Handwerk, Logistik</div>
                </div>
                {occupation === "physical" && <Icon name="check" size={16} color={M.brand} />}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShiftWork((v) => !v)}
              style={listTileStyle(shiftWork)}
            >
              <span>Schichtarbeit</span>
              {shiftWork && <Icon name="check" size={16} color={M.brand} />}
            </button>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 12, color: M.mut, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Ø Schlaf pro Nacht (Stunden)
              </span>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20, background: M.card, padding: "12px", borderRadius: 14, border: "1px solid " + M.line }}>
                <button
                  type="button"
                  onClick={() => setSleepHours((h) => Math.max(4, Math.round((h - 0.5) * 2) / 2))}
                  style={stepperBtnStyle}
                  aria-label="Schlaf reduzieren"
                >
                  -
                </button>
                <div style={{ textAlign: "center", minWidth: 80 }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: M.brand, fontFamily: M.disp }}>{formatSleepHours(sleepHours)}</div>
                  <div style={{ fontSize: 11, color: M.mut }}>pro Nacht</div>
                </div>
                <button
                  type="button"
                  onClick={() => setSleepHours((h) => Math.min(12, Math.round((h + 0.5) * 2) / 2))}
                  style={stepperBtnStyle}
                  aria-label="Schlaf erhöhen"
                >
                  +
                </button>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 12, color: M.mut, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Stresslevel (1 = sehr niedrig, 10 = sehr hoch)
              </span>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20, background: M.card, padding: "12px", borderRadius: 14, border: "1px solid " + M.line }}>
                <button
                  type="button"
                  onClick={() => setStressLevel((s) => Math.max(1, s - 1))}
                  style={stepperBtnStyle}
                  aria-label="Stress reduzieren"
                >
                  -
                </button>
                <div style={{ textAlign: "center", minWidth: 80 }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: M.brand, fontFamily: M.disp }}>{stressLevel}</div>
                  <div style={{ fontSize: 11, color: M.mut }}>von 10</div>
                </div>
                <button
                  type="button"
                  onClick={() => setStressLevel((s) => Math.min(10, s + 1))}
                  style={stepperBtnStyle}
                  aria-label="Stress erhöhen"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 10: Andere Sportarten */}
        {step === 10 && (
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
                    background: M.brand,
                    color: M.brandInk,
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
                        background: tempFreq === f ? M.brand : "transparent",
                        color: tempFreq === f ? M.brandInk : M.fg,
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
                        {s.sport} <span style={{ color: M.brand, marginLeft: 4 }}>({s.frequency}x/Woche)</span>
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

        {/* STEP 11: KI-Einwilligung (Anthropic) — explizite Einwilligung vor generate-training-plan */}
        {step === 11 && (
          <AiConsentStep
            onOpenPrivacy={openDatenschutz}
            onAccept={() => void handleGrantConsent()}
            onBack={prevStep}
            showActions
            saving={prefsSaving}
          />
        )}

        {/* STEP 12: Generierung & Fertigstellung */}
        {step === 12 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24, textAlign: "center", alignItems: "center" }}>
            {busy ? (
              <>
                {/* Wunderschöne Puls-Animation */}
                <div
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: "50%",
                    background: M.brandSoft,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: M.brand,
                    animation: "pulse 1.8s infinite ease-in-out",
                  }}
                >
                  <Icon name="timer" size={40} color={M.brand} />
                </div>
                <style>{`
                  @keyframes pulse {
                    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255,255,255, 0.3); }
                    70% { transform: scale(1); box-shadow: 0 0 0 16px rgba(255,255,255, 0); }
                    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255,255,255, 0); }
                  }
                `}</style>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <h3 style={{ fontFamily: M.disp, fontSize: 24, fontWeight: 700, margin: 0 }}>
                    DEIN PLAN WIRD GENERIERT
                  </h3>
                  <p style={{ color: M.brand, fontWeight: 700, fontSize: 16, margin: 0 }}>
                    {GENERATION_LOADING_TEXTS[getGenerationLoadingStep(genElapsedSec)]}
                  </p>
                  <p style={{ color: M.mut, fontSize: 13, margin: 0 }}>
                    {formatGenerationTimeHint(genElapsedSec)}
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
                    background: M.brand,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: M.brandInk,
                  }}
                >
                  <Icon name="check" size={44} color={M.brandInk} stroke={3} />
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
                <MButton
                  type="button"
                  onClick={() => generatedPlanId && onPlanGenerated(generatedPlanId)}
                  variant="primary"
                  size="md"
                  fullWidth
                  style={{ marginTop: 12 }}
                >
                  TRAININGSPLAN ANSEHEN
                  <Icon name="play" size={18} color={M.brandInk} />
                </MButton>
              </>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <p style={{ color: "#ff8a8a", fontWeight: 600 }}>Generierung fehlgeschlagen.</p>
                <MButton type="button" onClick={() => void runGeneration(true)} variant="primary" size="md">
                  Erneut versuchen
                </MButton>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer-Navigationsbar */}
      {step === 0 && (
        <div style={{ width: "100%", maxWidth: 460, flexShrink: 0 }}>
          <MButton type="button" onClick={nextStep} variant="primary" size="md" fullWidth>
            JETZT STARTEN <Icon name="chevR" size={16} color={M.brandInk} />
          </MButton>
        </div>
      )}

      {step > 0 && step < 11 && (
        <div style={{ width: "100%", maxWidth: 460, flexShrink: 0, display: "flex", justifyContent: "space-between", gap: 12 }}>
          <MButton type="button" onClick={prevStep} variant="secondary" size="md">
            <Icon name="chevL" size={16} /> ZURÜCK
          </MButton>
          <MButton type="button" onClick={nextStep} variant="primary" size="md">
            WEITER <Icon name="chevR" size={16} />
          </MButton>
        </div>
      )}
    </div>
  );
}
