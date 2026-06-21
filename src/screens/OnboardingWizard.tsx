import { useState, useEffect } from "react";
import { APP_NAME, M } from "../theme";
import { useAuth } from "../lib/auth";
import { usePreferences } from "../lib/preferences";
import { Icon } from "../components/Icon";
import { BirthDateField } from "../components/BirthDateField";
import { AppLogo } from "../components/AppLogo";
import { MButton } from "../components/MButton";
import { createBodyMeasurement } from "../lib/db";
import { useBreakpoint, FOOTER_BAR_PADDING_BOTTOM } from "../lib/responsive";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
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

export function OnboardingWizard() {
  const { user, profile, updateDisplayName, updateBirthDate } = useAuth();
  const { updatePreferences } = usePreferences();
  const breakpoint = useBreakpoint();
  
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other" | null>(null);
  const [fitnessGoal, setFitnessGoal] = useState<"muscle_building" | "fat_loss" | "fitness" | "strength" | null>(null);
  const [experienceLevel, setExperienceLevel] = useState<"beginner" | "intermediate" | "advanced" | null>(null);
  const [weeklyDays, setWeeklyDays] = useState<number>(3);
  const [birthDate, setBirthDate] = useState<string>("");
  const [heightCm, setHeightCm] = useState<string>("");
  const [weightKg, setWeightKg] = useState<string>("");
  
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load displayName from profile once available
  useEffect(() => {
    if (profile?.display_name) {
      setDisplayName(profile.display_name);
    }
  }, [profile?.display_name]);

  useEffect(() => {
    if (profile?.birth_date) {
      setBirthDate(profile.birth_date);
    }
  }, [profile?.birth_date]);

  const nextStep = () => {
    if (step === 0 && !displayName.trim()) {
      setError("Bitte gib einen Namen an, damit wir dich ansprechen können.");
      return;
    }
    setError(null);
    setStep((s) => s + 1);
  };

  const prevStep = () => {
    setError(null);
    setStep((s) => s - 1);
  };

  const handleFinish = async () => {
    if (!user) return;
    setBusy(true);
    setError(null);

    try {
      // 1. Update display name in Auth if changed
      if (displayName.trim() && displayName.trim() !== profile?.display_name) {
        const { error: nameErr } = await updateDisplayName(displayName.trim());
        if (nameErr) {
          setError(nameErr);
          setBusy(false);
          return;
        }
      }

      // 2. Parse height and weight
      const parsedHeight = heightCm ? parseInt(heightCm, 10) : null;
      const parsedWeight = weightKg ? parseFloat(weightKg) : null;
      const normalizedBirthDate = birthDate.trim() ? birthDate.trim() : null;

      // 3. Save birth date (optional)
      if (normalizedBirthDate !== null) {
        const { error: birthDateErr } = await updateBirthDate(normalizedBirthDate);
        if (birthDateErr) {
          setError(birthDateErr);
          setBusy(false);
          return;
        }
      }

      // 4. Create weight measurement if input exists
      if (parsedWeight && !isNaN(parsedWeight)) {
        await createBodyMeasurement(user.id, {
          weightKg: parsedWeight,
        });
      }

      // 5. Update user preferences and mark as onboarded
      await updatePreferences(
        {
          onboarded: true,
          gender,
          fitnessGoal,
          experienceLevel,
          heightCm: parsedHeight && !isNaN(parsedHeight) ? parsedHeight : null,
          weeklyDays,
        },
        true // save immediately
      );
    } catch (e: any) {
      console.error("Fehler beim Abschließen des Onboardings:", e);
      setError(e.message || "Es ist ein Fehler aufgetreten. Bitte versuche es erneut.");
    } finally {
      setBusy(false);
    }
  };

  // Steps Configuration
  const stepsCount = 4;
  const progressPercent = ((step + 1) / stepsCount) * 100;

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
        ...(breakpoint === "desktop"
          ? { padding: "40px 24px" }
          : {
              paddingTop: 24,
              paddingLeft: 22,
              paddingRight: 22,
              paddingBottom: FOOTER_BAR_PADDING_BOTTOM,
            }),
        fontFamily: M.body,
      }}
    >
      {/* Header and Progress Bar */}
      <div style={{ width: "100%", maxWidth: 460 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <AppLogo size={32} />
            <div style={{ fontFamily: M.disp, fontWeight: 700, fontSize: 18, letterSpacing: 0.3, lineHeight: 1.1 }}>
              {APP_NAME}
            </div>
          </div>
          <div style={{ fontSize: 13, color: M.mut, fontWeight: 600 }}>
            Schritt {step + 1} von {stepsCount}
          </div>
        </div>

        {/* Progress Bar Line */}
        <div style={{ width: "100%", height: 3, background: M.line, borderRadius: 1.5, overflow: "hidden", marginBottom: 32 }}>
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
      </div>

      {/* Main Content Area */}
      <div
        style={{
          width: "100%",
          maxWidth: 460,
          flex: 1,
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

        {/* STEP 1: Name & Begrüßung */}
        {step === 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16, textAlign: "center" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
              <AppLogo size={72} />
            </div>
            <h1 style={{ fontFamily: M.disp, fontSize: 32, fontWeight: 800, margin: 0, letterSpacing: 0.5 }}>
              Willkommen bei {APP_NAME}!
            </h1>
            <p style={{ color: M.mut, fontSize: 15, lineHeight: 1.5, margin: "0 0 8px 0" }}>
              Lass uns kurz deine Ziele und körperlichen Voraussetzungen klären, um deine Workouts optimal zu tracken.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, textAlign: "left", marginTop: 8 }}>
              <label style={{ fontSize: 13, color: M.mut, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Wie dürfen wir dich nennen?
              </label>
              <input
                type="text"
                placeholder="Dein Anzeigename"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                style={inputStyle}
                autoFocus
              />
            </div>
          </div>
        )}

        {/* STEP 2: Geschlecht & Fitnessziel */}
        {step === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <h2 style={{ fontFamily: M.disp, fontSize: 24, fontWeight: 700, margin: "0 0 6px 0", textTransform: "uppercase", letterSpacing: 0.5 }}>
                Persönliche Daten
              </h2>
              <p style={{ color: M.mut, fontSize: 14, margin: 0 }}>
                Wähle dein Geschlecht und dein Hauptziel.
              </p>
            </div>

            {/* Gender Selection */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 13, color: M.mut, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Geschlecht
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setGender("male")}
                  style={tileStyle(gender === "male")}
                >
                  <span style={{ fontSize: 20 }}>♂</span>
                  Männlich
                </button>
                <button
                  type="button"
                  onClick={() => setGender("female")}
                  style={tileStyle(gender === "female")}
                >
                  <span style={{ fontSize: 20 }}>♀</span>
                  Weiblich
                </button>
                <button
                  type="button"
                  onClick={() => setGender("other")}
                  style={tileStyle(gender === "other")}
                >
                  <span style={{ fontSize: 20 }}>⚧</span>
                  Divers
                </button>
              </div>
            </div>

            <BirthDateField value={birthDate} onChange={setBirthDate} />

            {/* Fitness Goal Selection */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 13, color: M.mut, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Dein primäres Fitnessziel
              </span>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setFitnessGoal("muscle_building")}
                  style={tileStyle(fitnessGoal === "muscle_building")}
                >
                  <Icon name="bolt" size={20} color={fitnessGoal === "muscle_building" ? M.acc : M.fg} />
                  <span>Muskelaufbau</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFitnessGoal("fat_loss")}
                  style={tileStyle(fitnessGoal === "fat_loss")}
                >
                  <Icon name="flame" size={20} color={fitnessGoal === "fat_loss" ? M.acc : M.fg} />
                  <span>Fettverbrennung</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFitnessGoal("fitness")}
                  style={tileStyle(fitnessGoal === "fitness")}
                >
                  <Icon name="timer" size={20} color={fitnessGoal === "fitness" ? M.acc : M.fg} />
                  <span>Ausdauer & Fit</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFitnessGoal("strength")}
                  style={tileStyle(fitnessGoal === "strength")}
                >
                  <Icon name="dumbbell" size={20} color={fitnessGoal === "strength" ? M.acc : M.fg} />
                  <span>Maximalkraft</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Trainingserfahrung & Frequenz */}
        {step === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div>
              <h2 style={{ fontFamily: M.disp, fontSize: 24, fontWeight: 700, margin: "0 0 6px 0", textTransform: "uppercase", letterSpacing: 0.5 }}>
                Trainingsalltag
              </h2>
              <p style={{ color: M.mut, fontSize: 14, margin: 0 }}>
                Wie oft und wie intensiv möchtest du trainieren?
              </p>
            </div>

            {/* Experience Selection */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 13, color: M.mut, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Deine Trainingserfahrung
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setExperienceLevel("beginner")}
                  style={{
                    ...tileStyle(experienceLevel === "beginner"),
                    flexDirection: "row",
                    justifyContent: "flex-start",
                    gap: 12,
                    padding: "12px 14px",
                  }}
                >
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#d4d4d4" }} />
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontWeight: 700 }}>Anfänger</div>
                    <div style={{ fontSize: 13, color: M.mut, fontWeight: 400 }}>0 bis 1 Jahre Erfahrung</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setExperienceLevel("intermediate")}
                  style={{
                    ...tileStyle(experienceLevel === "intermediate"),
                    flexDirection: "row",
                    justifyContent: "flex-start",
                    gap: 12,
                    padding: "12px 14px",
                  }}
                >
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#9ca3af" }} />
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontWeight: 700 }}>Fortgeschritten</div>
                    <div style={{ fontSize: 13, color: M.mut, fontWeight: 400 }}>1 bis 3 Jahre Erfahrung</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setExperienceLevel("advanced")}
                  style={{
                    ...tileStyle(experienceLevel === "advanced"),
                    flexDirection: "row",
                    justifyContent: "flex-start",
                    gap: 12,
                    padding: "12px 14px",
                  }}
                >
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#6b7280" }} />
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontWeight: 700 }}>Profi</div>
                    <div style={{ fontSize: 13, color: M.mut, fontWeight: 400 }}>Über 3 Jahre Erfahrung</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Weekly Days Stepper */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 13, color: M.mut, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Trainingstage pro Woche
              </span>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20, background: M.card, padding: "12px", borderRadius: 14, border: "1px solid " + M.line }}>
                <button
                  type="button"
                  onClick={() => setWeeklyDays(Math.max(1, weeklyDays - 1))}
                  style={{
                    width: 44,
                    height: 44,
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
                  <div style={{ fontSize: 13, color: M.mut }}>{weeklyDays === 1 ? "Tag" : "Tage"} / Woche</div>
                </div>
                <button
                  type="button"
                  onClick={() => setWeeklyDays(Math.min(7, weeklyDays + 1))}
                  style={{
                    width: 44,
                    height: 44,
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

        {/* STEP 4: Körperwerte */}
        {step === 3 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div>
              <h2 style={{ fontFamily: M.disp, fontSize: 24, fontWeight: 700, margin: "0 0 6px 0", textTransform: "uppercase", letterSpacing: 0.5 }}>
                Körperdaten
              </h2>
              <p style={{ color: M.mut, fontSize: 14, margin: 0 }}>
                Deine Größe und dein Gewicht helfen uns bei Berechnungen und der Verlaufs-Statistik (optional).
              </p>
            </div>

            {/* Height Input */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={{ fontSize: 13, color: M.mut, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Körpergröße (cm)
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type="number"
                  placeholder="z.B. 180"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  style={inputStyle}
                  min="50"
                  max="280"
                />
                <div style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: M.mut, fontWeight: 600 }}>
                  cm
                </div>
              </div>
            </div>

            {/* Weight Input */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={{ fontSize: 13, color: M.mut, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Aktuelles Gewicht (kg)
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type="number"
                  placeholder="z.B. 78.5"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  style={inputStyle}
                  step="0.1"
                  min="20"
                  max="300"
                />
                <div style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: M.mut, fontWeight: 600 }}>
                  kg
                </div>
              </div>
              <p style={{ fontSize: 13, color: M.mut, margin: "4px 0 0 0", textAlign: "center" }}>
                Wenn du ein Gewicht einträgst, wird automatisch dein erster Logeintrag im Gewichtstracker angelegt!
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer Navigation Bar */}
      <div
        style={{
          width: "100%",
          maxWidth: 460,
          display: "flex",
          justifyContent: step > 0 ? "space-between" : "center",
          gap: 12,
        }}
      >
        {step > 0 && (
          <MButton type="button" onClick={prevStep} variant="secondary" size="md" disabled={busy}>
            <Icon name="chevL" size={16} />
            ZURÜCK
          </MButton>
        )}

        {step < stepsCount - 1 ? (
          <MButton
            type="button"
            onClick={nextStep}
            variant="primary"
            size="md"
            fullWidth={step === 0}
          >
            WEITER
            <Icon name="chevR" size={16} />
          </MButton>
        ) : (
          <MButton
            type="button"
            onClick={handleFinish}
            variant="primary"
            size="md"
            disabled={busy}
          >
            {busy ? "SPEICHERT..." : "LOSLEGEN"}
            {!busy && <Icon name="check" size={16} />}
          </MButton>
        )}
      </div>
    </div>
  );
}
