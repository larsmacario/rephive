import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ANTHROPIC_MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-sonnet-4-6";
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const AI_CONSENT_VERSION = 1;

function hasAiConsentFromPreferences(raw: unknown): boolean {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
  const prefs = raw as Record<string, unknown>;
  const aiConsent = prefs.aiConsent;
  if (!aiConsent || typeof aiConsent !== "object" || Array.isArray(aiConsent)) return false;
  const consent = aiConsent as Record<string, unknown>;
  return (
    consent.provider === "anthropic" &&
    typeof consent.grantedAt === "string" &&
    consent.grantedAt.length > 0 &&
    typeof consent.version === "number" &&
    consent.version >= AI_CONSENT_VERSION
  );
}

async function requireAiConsent(req: Request): Promise<Response | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: "consent_required", message: "Authentifizierung erforderlich." }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) {
    return new Response(
      JSON.stringify({ error: "consent_required", message: "Authentifizierung erforderlich." }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("preferences")
    .eq("id", authData.user.id)
    .single();

  if (profileError) {
    return new Response(
      JSON.stringify({ error: "consent_required", message: profileError.message }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (!hasAiConsentFromPreferences(profile?.preferences)) {
    return new Response(
      JSON.stringify({
        error: "consent_required",
        message:
          "Für die KI-Planerstellung ist deine Einwilligung zur Datenübermittlung an Anthropic erforderlich.",
      }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  return null;
}

const BLOCK_TYPES = ["warmup", "skill", "strength", "metcon"] as const;
const MAX_OUTPUT_TOKENS = 4000;

const EXERCISE_ITEM_SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string" },
    note: {
      type: "string",
      description: "Kurz halten (max. ~40 Zeichen): z.B. 3x8 @ 75% 1RM, 5 min leicht, 10 Wdh./Runde",
    },
  },
  required: ["name", "note"],
};

const PLAN_ADVICE_SCHEMA = {
  type: "object",
  description:
    "Personalisierte Tipps aus der Anamnese — je Feld 1–2 Sätze (max. ~150 Zeichen), keine kg/kcal-Zahlen.",
  properties: {
    trainingFocus: {
      type: "string",
      description: "Trainingsfokus: Ziel, Erfahrung, Struktur, Prioritäten, Session-Dauer",
    },
    nutritionTips: {
      type: "string",
      description: "Ernährung passend zu Diätpräferenz und Ziel; Allergien beachten, keine Kalorien",
    },
    recoveryTips: {
      type: "string",
      description: "Regeneration: Schlaf, Stress, Beruf/Schicht, andere Sportarten, Schmerzzonen",
    },
    hydrationTips: {
      type: "string",
      description: "Trinken im Alltag und rund ums Training",
    },
    planDuration: {
      type: "object",
      properties: {
        weeksMin: { type: "number" },
        weeksMax: { type: "number" },
        note: {
          type: "string",
          description: "1–2 Sätze: wann Plan wechseln/Deload (Plateau), kein medizinischer Rat",
        },
      },
      required: ["weeksMin", "weeksMax", "note"],
    },
  },
  required: ["trainingFocus", "nutritionTips", "recoveryTips", "hydrationTips", "planDuration"],
};

const TRAINING_PLAN_TOOL = {
  name: "create_training_plan",
  description: "Strukturierter Trainingsplan mit 4 Bausteinen pro Tag (Warm-up, Skill, Kraft, MetCon).",
  input_schema: {
    type: "object",
    properties: {
      name: { type: "string" },
      sub: { type: "string" },
      days: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Tag-Name (z.B. Push, Oberkörper) — ohne Ruhetage",
            },
            blocks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string", enum: [...BLOCK_TYPES] },
                  format: {
                    type: "string",
                    enum: ["amrap", "emom", "circuit"],
                    description: "Nur metcon: AMRAP, EMOM oder Circuit (Timer wird serverseitig gesetzt)",
                  },
                  exercises: {
                    type: "array",
                    items: EXERCISE_ITEM_SCHEMA,
                  },
                },
                required: ["type", "exercises"],
              },
              description:
                "Pro Baustein Übungen. MetCon: format + 3–4 einzelne Übungen, KEIN Sammel-Eintrag.",
            },
          },
          required: ["name", "blocks"],
        },
      },
      advice: PLAN_ADVICE_SCHEMA,
    },
    required: ["name", "sub", "days", "advice"],
  },
};

serve(async (req) => {
  // Handle CORS Preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const consentBlock = await requireAiConsent(req);
  if (consentBlock) return consentBlock;

  try {
    const {
      gender,
      heightCm,
      weightKg,
      birthDate,
      fitnessGoal,
      experienceLevel,
      weeklyDays,
      anamnesis,
      recentSessions,
      exerciseFeedback,
    } = await req.json();

    const ageYears = ageFromBirthDate(birthDate);
    const ageBand = getAgeBand(ageYears);
    const resolvedWeeklyDays =
      Array.isArray(anamnesis?.trainingWeekdays) && anamnesis.trainingWeekdays.length > 0
        ? anamnesis.trainingWeekdays.length
        : weeklyDays || 3;

    const mockPlanInput = {
      gender,
      heightCm,
      weightKg,
      birthDate,
      fitnessGoal,
      experienceLevel,
      weeklyDays: resolvedWeeklyDays,
      anamnesis,
    };

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    let planData: any = null;
    let llmStopReason: string | undefined;

    // Falls kein API-Schlüssel vorhanden ist, nutzen wir den Mock-Fallback
    if (!apiKey) {
      console.warn("ANTHROPIC_API_KEY ist nicht gesetzt. Nutze Mock-Plan-Generierung.");
      planData = generateMockPlan(mockPlanInput);
    } else {
      // Bereite historische Daten für den Prompt vor
      let historyText = "";
      if (recentSessions && recentSessions.length > 0) {
        historyText = recentSessions.map((s: any) => {
          const performedAt = s.performedAt ? new Date(s.performedAt).toLocaleDateString("de-DE") : "";
          const exerciseNames = s.exercises?.map((e: any) => e.name).filter(Boolean).join(", ") ?? "";
          return exerciseNames ? `${performedAt} (${s.name}): ${exerciseNames}` : "";
        }).filter(Boolean).join("\n");
      }

      let feedbackText = "";
      if (exerciseFeedback && Object.keys(exerciseFeedback).length > 0) {
        feedbackText = Object.entries(exerciseFeedback).map(([name, f]: [string, any]) => {
          let type = "";
          if (f.rating === "like") type = "Gefällt mir sehr gut";
          else if (f.rating === "dislike") type = "Gefällt mir nicht (Bitte ersetzen)";
          else if (f.rating === "pain") type = "Verursacht Schmerzen (Ausschluss - Nicht verwenden!)";
          return `- ${name}: ${type}${f.note ? ` (${f.note})` : ""}`;
        }).join("\n");
      }

      const exerciseCountRule = formatExerciseCountRule(
        anamnesis?.minutesPerSession,
        experienceLevel,
        fitnessGoal,
        anamnesis,
        ageYears,
      );

      const ageBandRules = formatAgeBandRules(ageBand);
      const blockStructureRules = formatBlockStructureRules(fitnessGoal, ageBand, anamnesis);
      const trainingWeekdaysText = formatTrainingWeekdaysFromAnamnesis(anamnesis);

      // Prompt für KI vorbereiten
      const prompt = `Du bist ein hochqualifizierter Personal Trainer und Sportwissenschaftler. 
Erstelle einen komplett neuen, maßgeschneiderten Trainingsplan.

Hier sind die Anamnesedaten des Nutzers:
- Geschlecht: ${gender || "Keine Angabe"}
- Alter: ${ageYears} Jahre (${formatAgeBandLabel(ageBand)})
- Größe: ${heightCm ? `${heightCm} cm` : "Keine Angabe"}
- Gewicht: ${weightKg ? `${weightKg} kg` : "Keine Angabe"}
- Fitness-Ziel: ${translateGoal(fitnessGoal)}
- Trainingserfahrung: ${translateExperience(experienceLevel)}
- Geplante Trainingstage: ${resolvedWeeklyDays} Tage pro Woche${
        trainingWeekdaysText ? `\n- Gewählte Wochentage: ${trainingWeekdaysText}` : ""
      }
- Trainingsstruktur: ${translateTrainingSplitPreference(anamnesis)}
- Trainingsort/Equipment: ${translateLocation(anamnesis?.trainingLocation)} ${
        anamnesis?.trainingLocation === "home_equipment" && anamnesis?.homeEquipment?.length > 0
          ? `(Verfügbare Geräte zu Hause: ${anamnesis.homeEquipment.map((id: string) => translateEquip(id)).join(", ")})`
          : ""
      }
- Schmerzzonen (diese Bereiche unbedingt schonen/nicht überlasten): ${anamnesis?.painZones?.join(", ") || "Keine"}
- Andere Sportarten (Regeneration beachten): ${
        anamnesis?.otherSports
          ? anamnesis.otherSports.map((s: any) => `${s.sport} (${s.frequency}x/Woche)`).join(", ")
          : "Keine"
      }
- Zeit pro Trainingseinheit: ${anamnesis?.minutesPerSession ? `${anamnesis.minutesPerSession} Minuten` : "Keine Angabe (ca. 60 Min annehmen)"}
- Beruf / Alltagsaktivität: ${translateOccupation(anamnesis?.occupation)}${anamnesis?.shiftWork ? " (Schichtarbeit)" : ""}
- Durchschnittlicher Schlaf: ${anamnesis?.sleepHours != null ? `${anamnesis.sleepHours} Stunden/Nacht` : "Keine Angabe"}
- Stresslevel: ${translateStress(anamnesis?.stressLevel)}
- Ernährungspräferenz: ${translateDiet(anamnesis?.dietPreference)}${
        anamnesis?.dietAllergies?.length ? ` (Allergien/Unverträglichkeiten: ${anamnesis.dietAllergies.join(", ")})` : ""
      }
- Muskelgruppen-Prioritäten (1=nicht wichtig, 5=Top-Priorität): ${formatMusclePrioritiesForPrompt(anamnesis)}

${feedbackText ? `PRÄFERENZEN & FEEDBACK ZU ÜBUNGEN:\n${feedbackText}\n` : ""}
${historyText ? `TRAININGS-HISTORIE (nur für Übungsauswahl und Feedback, KEINE kg-Werte übernehmen!):\n${historyText}\n` : ""}

Erstelle einen logischen Trainingsplan mit genau ${resolvedWeeklyDays} Trainingstagen (keine Ruhetage).

4-BAUSTEINE-SYSTEM (Pflicht pro Trainingstag):
Jeder Tag besteht aus blocks[] in fester Reihenfolge: warmup → skill → strength → metcon.
${blockStructureRules}

${ageBandRules}

Wichtige Regeln:
1. Nutze das Tool create_training_plan — kein Freitext. Pro Tag blocks[] mit type und exercises[].
2. ${exerciseCountRule} (gilt nur für den strength-Block; Warm-up/Skill/MetCon separat.)
3. note PFLICHT pro Übung — nur name + note liefern (kein sets[], metric, equipment, muscleGroup). note kurz halten (≤40 Zeichen): Kraft z.B. 3x8 @ 75% 1RM; Cardio z.B. 5 min; MetCon z.B. 10 Wdh./Runde. Richtwerte Kraft-%: Kraft 85–95%, Hypertrophie 70–80%, Ausdauer/Technik 60–70%, Anfänger 65–75%.
4. Schmerzzonen und Feedback (Dislike/Schmerzen) strikt beachten. Bei Reha/Einschränkung MetCon weglassen (metcon-Block einfach weglassen).
5. MetCon: nur format (amrap|emom|circuit) + 3–4 Übungen — kein config, kein enabledBlocks, kein day.note. Übungsnamen auf Deutsch.
6. Wenig Schlaf (<7h) oder Stress ≥ 8/10 → konservativeres Volumen in den notes.
7. Trainingsstruktur strikt umsetzen: full_body → jeder Tag Ganzkörper (z. B. „Ganzkörper A/B“); split + N → genau N Split-Einheiten rotieren. days[].name beschreibt die Einheit, nicht den Wochentag.
8. days[].name NIEMALS mit „Tag 1“, „Tag 2“ o. Ä. beginnen. Erlaubt: „Unterkörper“, „Push“. Verboten: „Tag 3 – Brust“.
9. Muskelgruppen-Prioritäten (1–5) beeinflussen Volumen im strength-Block: ≥4 → mehr Volumen; ≤2 → reduziert. Schmerzzonen und Feedback haben Vorrang.
10. advice PFLICHT — personalisiert aus ALLEN Anamnesedaten oben: trainingFocus (Ziel, Erfahrung, Split, Prioritäten), nutritionTips (Diät + Allergien, keine kcal), recoveryTips (Schlaf, Stress, Beruf/Schicht, andere Sportarten, Schmerzzonen, ${resolvedWeeklyDays}×/Woche), hydrationTips. planDuration: Anfänger oder Stress ≥8/wenig Schlaf → 10–14 Wochen; Fortgeschritten → 8–12; Advanced → 4–8. note: wann wechseln/Deload.
11. Übungen kompakt (name + note ≤40 Zeichen): sub ≤80 Zeichen, Warm-up 1, Skill 1, MetCon max. 4 — Gesamtantwort max. ${MAX_OUTPUT_TOKENS} Tokens (advice darf ausführlicher sein).`;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: ANTHROPIC_MODEL,
          max_tokens: MAX_OUTPUT_TOKENS,
          temperature: 0.2,
          tools: [TRAINING_PLAN_TOOL],
          tool_choice: { type: "tool", name: "create_training_plan" },
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Anthropic API Fehler: ${response.status} - ${errText}`);
      }

      const result = await response.json();
      llmStopReason = result.stop_reason;
      const toolBlock = result.content?.find((block: { type?: string }) => block.type === "tool_use");

      if (toolBlock?.input) {
        planData = toolBlock.input;
      } else {
        const textBlock = result.content?.find((block: { type?: string; text?: string }) => block.type === "text");
        if (!textBlock?.text) {
          throw new Error("Keine Plan-Daten von der KI erhalten.");
        }
        planData = parsePlanJson(textBlock.text);
      }

      if (result.stop_reason === "max_tokens") {
        console.warn("KI-Antwort wurde am Token-Limit abgeschnitten — Plan könnte unvollständig sein.");
      }
    }

    const finalizePlan = (data: any) => {
      normalizePlanDaysStructure(data);
      normalizePlanBlocks(data, fitnessGoal, ageBand, anamnesis);
      normalizeMetconBlocks(data);
      normalizePlanSets(data, fitnessGoal, experienceLevel, anamnesis?.minutesPerSession, anamnesis, ageYears);
      sanitizePlanDayNames(data);
      data.advice = mergePlanAdvice(
        data.advice,
        buildDefaultAdvice(experienceLevel, fitnessGoal, anamnesis, resolvedWeeklyDays, ageYears),
      );
      return data;
    };

    planData = finalizePlan(planData ?? {});

    const planHasTrainingDays =
      Array.isArray(planData.days) &&
      planData.days.some((day: { blocks?: { exercises?: unknown[] }[]; exercises?: unknown[] }) => {
        if (Array.isArray(day.blocks)) {
          return day.blocks.some((b) => Array.isArray(b.exercises) && b.exercises.length > 0);
        }
        return Array.isArray(day.exercises) && day.exercises.length > 0;
      });

    if (!Array.isArray(planData?.days) || planData.days.length === 0 || !planHasTrainingDays) {
      if (llmStopReason === "max_tokens") {
        throw new Error(
          "KI-Antwort wurde abgeschnitten — bitte erneut versuchen (kürzere Session-Dauer oder weniger Trainingstage können helfen).",
        );
      }
      throw new Error("KI-Antwort ohne Trainingstage — bitte erneut versuchen.");
    }

    // Katalog-Sync im Hintergrund — blockiert die Antwort nicht (spart oft 5–15 s Wartezeit).
    scheduleCatalogSync(planData);

    return new Response(JSON.stringify(planData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e: any) {
    console.error("Fehler bei der Generierung des Trainingsplans:", e);
    return new Response(
      JSON.stringify({ error: e.message || "Interner Serverfehler bei der Planerstellung." }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

declare const EdgeRuntime: {
  waitUntil: (promise: Promise<unknown>) => void;
};

async function syncGeneratedExercisesToCatalog(planData: { days?: any[] } | null): Promise<void> {
  if (!planData?.days) return;

  for (const day of planData.days) {
    const exerciseLists: any[][] = [];
    if (Array.isArray(day.blocks)) {
      for (const block of day.blocks) {
        if (Array.isArray(block.exercises)) exerciseLists.push(block.exercises);
      }
    }
    if (Array.isArray(day.exercises)) exerciseLists.push(day.exercises);

    const seen = new Set<string>();
    for (const list of exerciseLists) {
      for (const e of list) {
        const key = (e.name ?? "").trim().toLowerCase();
        if (!key || seen.has(key)) continue;
        seen.add(key);
      try {
        const { data: existing, error: getErr } = await supabase
          .from("exercises")
          .select("id, name")
          .ilike("name", e.name.trim())
          .limit(1);

        if (getErr) {
          console.error(`Fehler beim Prüfen von Übung ${e.name}:`, getErr);
          continue;
        }

        if (!existing || existing.length === 0) {
          const { error: insertErr } = await supabase.from("exercises").insert({
            user_id: null,
            name: e.name.trim(),
            muscle_group: e.muscleGroup || "Ganzkörper",
            equipment: e.equipment || "Keines",
            metric_type: e.metric || "weight_reps",
          });
          if (insertErr) {
            console.error(`Fehler beim Einfügen der globalen Übung ${e.name}:`, insertErr);
          } else {
            console.log(`Globale Übung erfolgreich angelegt: ${e.name}`);
          }
        }
      } catch (dbErr) {
        console.error(`Unerwarteter Fehler bei der DB-Prüfung/Eintragung für ${e.name}:`, dbErr);
      }
      }
    }
  }
}

function scheduleCatalogSync(planData: { days?: any[] } | null): void {
  const task = syncGeneratedExercisesToCatalog(planData);
  if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
    EdgeRuntime.waitUntil(task);
    return;
  }
  task.catch((err) => console.error("Hintergrund-Katalog-Sync fehlgeschlagen:", err));
}

function parsePlanJson(raw: string): any {
  let clean = raw.trim();
  if (clean.startsWith("```")) {
    clean = clean.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  }
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start === -1 || end <= start) {
    throw new Error("KI-Antwort enthielt kein gültiges JSON-Objekt.");
  }
  return JSON.parse(clean.slice(start, end + 1));
}

// Übersetzungs-Hilfsfunktionen für den Prompt
function translateGoal(goal?: string): string {
  switch (goal) {
    case "muscle_building":
      return "Muskelaufbau (Hypertrophie)";
    case "fat_loss":
      return "Fettverbrennung / Gewichtsreduktion";
    case "fitness":
      return "Allgemeine Fitness und Ausdauer";
    case "strength":
      return "Maximalkraft steigern";
    default:
      return "Allgemeine Fitness";
  }
}

function translateExperience(exp?: string): string {
  switch (exp) {
    case "beginner":
      return "Anfänger (0-1 Jahre)";
    case "intermediate":
      return "Fortgeschritten (1-3 Jahre)";
    case "advanced":
      return "Profi (>3 Jahre)";
    default:
      return "Anfänger";
  }
}

function translateOccupation(occ?: string): string {
  switch (occ) {
    case "sedentary":
      return "Überwiegend sitzend (Büro)";
    case "standing":
      return "Überwiegend stehend";
    case "physical":
      return "Körperlich belastend";
    default:
      return "Keine Angabe";
  }
}

function isHighStress(level: unknown): boolean {
  if (typeof level === "number") return level >= 8;
  return level === "high";
}

function translateStress(level: unknown): string {
  if (typeof level === "number" && !Number.isNaN(level)) {
    const n = Math.round(level);
    if (n >= 1 && n <= 10) return `${n}/10`;
    return "Keine Angabe";
  }
  switch (level) {
    case "low":
      return "Niedrig (3/10)";
    case "medium":
      return "Mittel (5/10)";
    case "high":
      return "Hoch (8/10)";
    default:
      return "Keine Angabe";
  }
}

function translateDiet(pref?: string): string {
  switch (pref) {
    case "vegetarian":
      return "Vegetarisch";
    case "vegan":
      return "Vegan";
    case "pescetarian":
      return "Pescetarisch";
    case "omnivore":
      return "Keine Vorgabe";
    default:
      return "Keine Angabe";
  }
}

function translateTrainingStructure(structure?: string): string {
  switch (structure) {
    case "full_body":
      return "Ganzkörper (jede Einheit trainiert den ganzen Körper)";
    case "split":
      return "Split-Training (Muskelgruppen aufgeteilt)";
    default:
      return "Keine Angabe";
  }
}

function translateSplitDays(days?: number | null): string {
  switch (days) {
    case 2:
      return "2er-Split (Oberkörper / Unterkörper)";
    case 3:
      return "3er-Split (Push / Pull / Beine)";
    case 4:
      return "4er-Split (z. B. Brust+Tri / Rücken+Bi / Beine / Schultern+Arme)";
    case 5:
      return "5er-Split (klassische 5-Tage-Rotation)";
    case 6:
      return "6er-Split (ein Hauptfokus pro Tag)";
    default:
      return "Keine Angabe";
  }
}

function translateTrainingSplitPreference(anamnesis?: { trainingStructure?: string; trainingSplitDays?: number | null }): string {
  const structure = anamnesis?.trainingStructure;
  if (structure === "full_body") return translateTrainingStructure("full_body");
  if (structure === "split") {
    return `${translateTrainingStructure("split")} — ${translateSplitDays(anamnesis?.trainingSplitDays)}`;
  }
  return "Keine Angabe (KI wählt passend zur Frequenz)";
}

const WIZARD_MUSCLE_GROUPS = [
  "Brust",
  "Latissimus",
  "Oberer Rücken",
  "Unterer Rücken",
  "Schultern",
  "Bizeps",
  "Trizeps",
  "Unterarme",
  "Bauch / Core",
  "Quadrizeps",
  "Hamstrings",
  "Gesäß",
  "Waden",
] as const;

function formatMusclePrioritiesForPrompt(anamnesis?: { musclePriorities?: Record<string, number> }): string {
  const raw = anamnesis?.musclePriorities;
  if (!raw || typeof raw !== "object") {
    return WIZARD_MUSCLE_GROUPS.map((g) => `${g}: 3/5`).join(", ");
  }
  return WIZARD_MUSCLE_GROUPS.map((g) => {
    const v = raw[g];
    const n = typeof v === "number" && !Number.isNaN(v) ? Math.min(5, Math.max(1, Math.round(v))) : 3;
    return `${g}: ${n}/5`;
  }).join(", ");
}

function getSplitWorkoutLabel(anamnesis: { trainingStructure?: string; trainingSplitDays?: number | null } | undefined, workoutIndex: number): string {
  if (anamnesis?.trainingStructure !== "split") {
    const fullBodyLabels = ["Ganzkörper A", "Ganzkörper B", "Ganzkörper C"];
    return fullBodyLabels[(workoutIndex - 1) % fullBodyLabels.length];
  }
  const splitMaps: Record<number, string[]> = {
    2: ["Oberkörper", "Unterkörper"],
    3: ["Push", "Pull", "Beine"],
    4: ["Brust & Trizeps", "Rücken & Bizeps", "Beine", "Schultern & Arme"],
    5: ["Brust", "Rücken", "Beine", "Schultern", "Arme"],
    6: ["Brust", "Rücken", "Beine", "Schultern", "Bizeps", "Trizeps"],
  };
  const n = anamnesis?.trainingSplitDays ?? 3;
  const labels = splitMaps[n] || splitMaps[3];
  return labels[(workoutIndex - 1) % labels.length];
}

function formatPainZonesForAdvice(painZones?: string[]): string | null {
  if (!painZones?.length) return null;
  const labels: Record<string, string> = {
    knees: "Knie",
    lower_back: "unterer Rücken",
    shoulders: "Schultern",
    wrists: "Handgelenke",
    neck: "Nacken",
  };
  return painZones.map((z) => labels[z] ?? z).join(", ");
}

function topMusclePriorities(anamnesis?: { musclePriorities?: Record<string, number> }): string[] {
  const priorities = anamnesis?.musclePriorities;
  if (!priorities || typeof priorities !== "object") return [];
  return Object.entries(priorities)
    .filter(([, v]) => typeof v === "number" && v >= 4)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([k]) => k);
}

function pickAdviceField(llm: unknown, fallback: string): string {
  if (typeof llm === "string" && llm.trim().length >= 16) return llm.trim();
  return fallback;
}

function mergePlanAdvice(llmAdvice: unknown, localAdvice: ReturnType<typeof buildDefaultAdvice>) {
  if (!llmAdvice || typeof llmAdvice !== "object" || Array.isArray(llmAdvice)) {
    return localAdvice;
  }
  const raw = llmAdvice as Record<string, unknown>;
  const durationRaw =
    raw.planDuration && typeof raw.planDuration === "object" && !Array.isArray(raw.planDuration)
      ? (raw.planDuration as Record<string, unknown>)
      : null;
  const weeksMin =
    typeof durationRaw?.weeksMin === "number" && durationRaw.weeksMin > 0
      ? Math.round(durationRaw.weeksMin)
      : localAdvice.planDuration.weeksMin;
  const weeksMax =
    typeof durationRaw?.weeksMax === "number" && durationRaw.weeksMax >= weeksMin
      ? Math.round(durationRaw.weeksMax)
      : localAdvice.planDuration.weeksMax;

  return {
    trainingFocus: pickAdviceField(raw.trainingFocus, localAdvice.trainingFocus),
    nutritionTips: pickAdviceField(raw.nutritionTips, localAdvice.nutritionTips),
    recoveryTips: pickAdviceField(raw.recoveryTips, localAdvice.recoveryTips),
    hydrationTips: pickAdviceField(raw.hydrationTips, localAdvice.hydrationTips),
    planDuration: {
      weeksMin,
      weeksMax,
      note: pickAdviceField(durationRaw?.note, localAdvice.planDuration.note),
    },
  };
}

function buildDefaultAdvice(
  experienceLevel?: string,
  fitnessGoal?: string,
  anamnesis?: any,
  weeklyDays = 3,
  ageYears = 35,
): any {
  const goalName = translateGoal(fitnessGoal);
  const diet = translateDiet(anamnesis?.dietPreference);
  const structure = translateTrainingSplitPreference(anamnesis);
  const location = translateLocation(anamnesis?.trainingLocation);
  const sessionMins = anamnesis?.minutesPerSession ?? 60;
  const painText = formatPainZonesForAdvice(anamnesis?.painZones);
  const topPriorities = topMusclePriorities(anamnesis);

  let weeksMin = 8;
  let weeksMax = 12;
  let durationNote =
    "Nutze diesen Plan etwa 8–12 Wochen. Bei Plateau oder Ermüdung: Deload-Woche oder Planwechsel.";

  if (
    experienceLevel === "beginner" ||
    isHighStress(anamnesis?.stressLevel) ||
    (anamnesis?.sleepHours != null && anamnesis.sleepHours < 7)
  ) {
    weeksMin = 10;
    weeksMax = 14;
    durationNote =
      "Als Anfänger oder bei hoher Alltagsbelastung: 10–14 Wochen für stabile Gewöhnung, danach Ziel-Check oder Deload.";
  } else if (experienceLevel === "advanced") {
    weeksMin = 4;
    weeksMax = 8;
    durationNote =
      "Kürzerer Mesozyklus (4–8 Wochen): danach Variation, Deload oder angepasster Plan gegen Stagnation.";
  }

  if (painText) {
    durationNote += ` Schmerzzonen (${painText}) beobachten — bei Verschlechterung pausieren.`;
  }

  const priorityHint =
    topPriorities.length > 0
      ? ` Extra-Volumen für: ${topPriorities.join(", ")}.`
      : "";

  const trainingFocus =
    `${goalName}, ${translateExperience(experienceLevel)} — ${structure} an ${location}, ca. ${sessionMins} Min/Einheit, ${weeklyDays}×/Woche.` +
    priorityHint +
    " Technik vor Last, Kraft-Block progressiv steigern.";

  let nutritionTips = `Als ${diet}: proteinreiche Mahlzeiten passend zu ${goalName}, regelmäßige Essenszeiten.`;
  if (anamnesis?.dietAllergies?.length) {
    nutritionTips += ` Allergien/Unverträglichkeiten beachten: ${anamnesis.dietAllergies.join(", ")}.`;
  }
  nutritionTips += " Keine Kalorien schätzen — Richtwerte stehen oben im Plan.";

  const recoveryParts: string[] = [];
  if (anamnesis?.sleepHours != null) {
    recoveryParts.push(
      anamnesis.sleepHours < 7
        ? `Schlaf nur ~${anamnesis.sleepHours}h — Volumen moderat halten, früh ins Bett.`
        : `Schlaf ~${anamnesis.sleepHours}h/Nacht nutzen für Regeneration.`,
    );
  }
  if (isHighStress(anamnesis?.stressLevel)) {
    recoveryParts.push("Hoher Stress: weniger Zusatz-Cardio, Ruhetage ernst nehmen.");
  } else if (anamnesis?.stressLevel != null) {
    recoveryParts.push(`Stress ${anamnesis.stressLevel}/10 — Belastung aus Alltag mit einplanen.`);
  }
  if (anamnesis?.occupation) {
    recoveryParts.push(
      `${translateOccupation(anamnesis.occupation)}${anamnesis.shiftWork ? " (Schichtarbeit: Schlaf-Routine stabilisieren)" : ""}.`,
    );
  }
  if (anamnesis?.otherSports?.length) {
    const sports = anamnesis.otherSports
      .map((s: { sport?: string; frequency?: number }) =>
        s.sport ? `${s.sport}${s.frequency ? ` (${s.frequency}×/Wo.)` : ""}` : "",
      )
      .filter(Boolean)
      .join(", ");
    if (sports) recoveryParts.push(`Andere Sportarten: ${sports} — Kraft nicht überlagern.`);
  }
  if (painText) {
    recoveryParts.push(`Schmerzzonen schonen: ${painText} — keine Schmerz-Übungen forcieren.`);
  }
  if (ageYears >= 50) {
    recoveryParts.push("Ab 50: längere Aufwärmphase, langsamer steigern, Gelenke schonen.");
  }
  const recoveryTips =
    recoveryParts.length > 0
      ? recoveryParts.join(" ")
      : "Ruhetage einhalten, Schlaf priorisieren und Belastung aus Beruf und Sport beachten.";

  const hydrationTips =
    weeklyDays >= 4
      ? `Bei ${weeklyDays} Trainingstagen/Woche: über den Tag verteilt trinken, vor/nach jeder Einheit extra Flüssigkeit.`
      : "Ausreichend über den Tag trinken, besonders vor und nach dem Training." +
        (anamnesis?.shiftWork ? " Bei Schichtarbeit Flasche griffbereit halten." : "");

  return {
    trainingFocus,
    nutritionTips,
    recoveryTips,
    hydrationTips,
    planDuration: { weeksMin, weeksMax, note: durationNote },
  };
}

/** Entfernt KI-typische Präfixe wie „Tag 1 – …“ aus Tag-Namen. */
function sanitizeDayName(name: string): string {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return trimmed;
  const cleaned = trimmed
    .replace(/^Tag\s+(?:\d+|[A-Z])\s*[–—\-:.]\s*/iu, "")
    .replace(/^Workout\s+\d+\s*[–—\-:.]\s*/iu, "")
    .trim();
  return cleaned || trimmed;
}

/** Legacy-Format (isRestDay/workout) in days[] normalisieren; blocks[] bleibt erhalten. */
function normalizePlanDaysStructure(planData: { days?: any[] }): void {
  if (!planData?.days) return;
  const normalized: any[] = [];
  for (const day of planData.days) {
    if (day.isRestDay) continue;
    const hasBlocks = Array.isArray(day.blocks) && day.blocks.length > 0;
    const exercises = day.exercises ?? day.workout?.exercises;
    const hasExercises = Array.isArray(exercises) && exercises.length > 0;
    if (!hasBlocks && !hasExercises) continue;
    const rawName =
      typeof day.name === "string" && day.name.trim()
        ? day.name
        : typeof day.workout?.name === "string"
          ? day.workout.name
          : `Tag ${normalized.length + 1}`;
    normalized.push({
      name: rawName,
      note: day.note,
      enabledBlocks: day.enabledBlocks,
      blocks: hasBlocks ? day.blocks : undefined,
      exercises: hasBlocks ? undefined : exercises,
    });
  }
  planData.days = normalized;
}

type AgeBand = "under30" | "30_39" | "40_49" | "50_69" | "70_plus";

function ageFromBirthDate(birthDate?: string | null): number {
  if (!birthDate?.trim()) return 35;
  const parsed = new Date(birthDate.trim());
  if (Number.isNaN(parsed.getTime())) return 35;
  const today = new Date();
  let age = today.getFullYear() - parsed.getFullYear();
  const monthDiff = today.getMonth() - parsed.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < parsed.getDate())) {
    age -= 1;
  }
  return Math.max(16, Math.min(99, age));
}

function getAgeBand(ageYears: number): AgeBand {
  if (ageYears < 30) return "under30";
  if (ageYears < 40) return "30_39";
  if (ageYears < 50) return "40_49";
  if (ageYears < 70) return "50_69";
  return "70_plus";
}

const TRAINING_WEEKDAY_LABELS = ["Mo.", "Di.", "Mi.", "Do.", "Fr.", "Sa.", "So."];

function formatTrainingWeekdaysFromAnamnesis(anamnesis: { trainingWeekdays?: unknown } | null | undefined): string | null {
  if (!anamnesis?.trainingWeekdays || !Array.isArray(anamnesis.trainingWeekdays)) return null;
  const days = anamnesis.trainingWeekdays
    .filter((d): d is number => typeof d === "number" && Number.isInteger(d) && d >= 0 && d <= 6)
    .sort((a, b) => a - b);
  if (days.length === 0) return null;
  return days.map((d) => TRAINING_WEEKDAY_LABELS[d]).join(", ");
}

function formatAgeBandLabel(band: AgeBand): string {
  switch (band) {
    case "under30":
      return "Unter 30";
    case "30_39":
      return "30–39";
    case "40_49":
      return "40–49";
    case "50_69":
      return "50–69";
    case "70_plus":
      return "70+";
  }
}

function formatAgeBandRules(band: AgeBand): string {
  switch (band) {
    case "under30":
      return "Altersband Unter 30: Standard-Warm-up (5–8 Min), volle Progression möglich, MetCon kräftiger bei Fettabbau.";
    case "30_39":
      return "Altersband 30–39: Wie Standard, bei hohem Stress oder wenig Schlaf etwas mehr Recovery einplanen.";
    case "40_49":
      return "Altersband 40–49: Gelenkschonende Übungsauswahl, nachhaltige Progression, keine ständigen Max-Versuche.";
    case "50_69":
      return "Altersband 50–69: Warm-up 10–12 Min, gelenkschonende Übungsauswahl, Recovery einplanen.";
    case "70_plus":
      return "Altersband 70+: Kurze klare Einheiten, Stabilität und Sicherheit vor Intensität, MetCon moderat (RPE 5–6).";
  }
}

function formatBlockStructureRules(fitnessGoal?: string, ageBand?: AgeBand, anamnesis?: any): string {
  const warmupDur = ageBand === "50_69" || ageBand === "70_plus" ? "10–12 Min" : "5–8 Min";
  let metconHint = "MetCon: 8–12 Min AMRAP/EMOM/Circuit, moderate bis hohe Intensität je nach Ziel.";
  if (fitnessGoal === "fat_loss") metconHint = "MetCon: 8–12 Min, etwas intensiver (Fettabbau-Fokus).";
  if (fitnessGoal === "strength") metconHint = "MetCon: optional kurz (8 Min) oder weglassen wenn Zeit knapp.";
  const painZones = anamnesis?.painZones ?? [];
  if (painZones.length > 0) {
    metconHint += " Bei Schmerz/Reha: MetCon weglassen oder sehr leicht (enabledBlocks ohne metcon).";
  }
  return (
    `- warmup: ${warmupDur} leichtes Cardio, metric time/distance_time\n` +
    "- skill: 5–10 Min Technik, niedrige Last, kein Ausbelasten, konkrete Cues in note\n" +
    "- strength: Hauptlift + 1–3 Assistance, metric weight_reps\n" +
    `- metcon: ${metconHint}`
  );
}

function isValidBlockType(value: unknown): value is (typeof BLOCK_TYPES)[number] {
  return typeof value === "string" && (BLOCK_TYPES as readonly string[]).includes(value);
}

function defaultEnabledBlocksForGoal(fitnessGoal?: string, anamnesis?: { painZones?: string[] }): string[] {
  const pain = anamnesis?.painZones ?? [];
  if (pain.length >= 2 || fitnessGoal === "fitness") {
    return ["warmup", "skill", "strength"];
  }
  return [...BLOCK_TYPES];
}

/** Legacy exercises[] → blocks[]; enabledBlocks setzen; exercises mit blockType flach halten. */
function normalizePlanBlocks(
  planData: { days?: any[] },
  fitnessGoal?: string,
  ageBand?: AgeBand,
  anamnesis?: { painZones?: string[] },
): void {
  if (!planData?.days) return;

  for (const day of planData.days) {
    if (Array.isArray(day.blocks) && day.blocks.length > 0) {
      const blocks = day.blocks
        .filter((b: { type?: string }) => isValidBlockType(b.type))
        .map((b: { type: string; exercises?: unknown[] }) => ({
          type: b.type,
          exercises: Array.isArray(b.exercises) ? b.exercises : [],
        }));
      day.blocks = blocks;
      const fromBlocks = blocks
        .filter((b: { exercises: unknown[] }) => b.exercises.length > 0)
        .map((b: { type: string }) => b.type);
      const explicit = Array.isArray(day.enabledBlocks)
        ? day.enabledBlocks.filter((b: string) => isValidBlockType(b))
        : [];
      day.enabledBlocks =
        explicit.length > 0
          ? explicit
          : fromBlocks.length > 0
            ? fromBlocks
            : defaultEnabledBlocksForGoal(fitnessGoal, anamnesis);
    } else if (Array.isArray(day.exercises) && day.exercises.length > 0) {
      const warmup: unknown[] = [];
      const skill: unknown[] = [];
      const strength: unknown[] = [];
      const metcon: unknown[] = [];

      for (const ex of day.exercises) {
        if (isCardioExercise(ex) && (warmup.length === 0 || looksLikeCardioExercise(ex.name ?? "", ex.equipment))) {
          warmup.push({ ...ex, blockType: "warmup" });
        } else if (
          typeof ex.note === "string" &&
          /amrap|emom|circuit|metcon|for time|runden/i.test(ex.note)
        ) {
          metcon.push({ ...ex, blockType: "metcon" });
        } else if (
          typeof ex.note === "string" &&
          /tempo|technik|skill|pause|3-0-3|leicht/i.test(ex.note) &&
          skill.length < 2
        ) {
          skill.push({ ...ex, blockType: "skill" });
        } else {
          strength.push({ ...ex, blockType: "strength" });
        }
      }

      const blocks = [
        { type: "warmup", exercises: warmup },
        { type: "skill", exercises: skill },
        { type: "strength", exercises: strength },
        { type: "metcon", exercises: metcon },
      ].filter((b) => b.exercises.length > 0);

      day.blocks = blocks.length > 0 ? blocks : [{ type: "strength", exercises: day.exercises }];
      day.enabledBlocks = blocks.map((b) => b.type);
      if (day.enabledBlocks.length === 0) {
        day.enabledBlocks = defaultEnabledBlocksForGoal(fitnessGoal, anamnesis);
      }
    } else {
      day.blocks = [];
      day.enabledBlocks = defaultEnabledBlocksForGoal(fitnessGoal, anamnesis);
    }

    const flat: any[] = [];
    for (const block of day.blocks ?? []) {
      if (!isValidBlockType(block.type) || !Array.isArray(block.exercises)) continue;
      for (const ex of block.exercises) {
        if (!ex.muscleGroup) ex.muscleGroup = "Ganzkörper";
        if (!ex.equipment) ex.equipment = "Keines";
        flat.push({ ...ex, blockType: block.type });
      }
    }
    day.exercises = flat;

    if (ageBand === "50_69" || ageBand === "70_plus") {
      const warmupBlock = (day.blocks ?? []).find((b: { type: string }) => b.type === "warmup");
      if (warmupBlock && Array.isArray(warmupBlock.exercises)) {
        for (const ex of warmupBlock.exercises) {
          if (ex.metric === "time" && Array.isArray(ex.sets) && ex.sets[0]) {
            if ((ex.sets[0].durationSec ?? 0) < 480) ex.sets[0].durationSec = 600;
          }
        }
      }
    }
  }
}

function normalizeMetconBlocks(planData: { days?: any[] }): void {
  if (!planData?.days) return;

  for (const day of planData.days) {
    if (!Array.isArray(day.blocks)) continue;
    for (const block of day.blocks) {
      if (block.type !== "metcon" || !Array.isArray(block.exercises)) continue;

      const format =
        block.format === "emom" || block.format === "circuit" || block.format === "amrap"
          ? block.format
          : detectMetconFormatFromText(
              `${block.exercises[0]?.name ?? ""} ${block.exercises[0]?.note ?? ""}`,
            );
      block.format = format;

      const cfg = block.config && typeof block.config === "object" ? block.config : {};
      if (format === "amrap" && !cfg.durationSec) {
        cfg.durationSec =
          parseDurationSecFromText(block.exercises[0]?.note ?? block.exercises[0]?.name ?? "") ?? 600;
      }
      if (format === "emom" && !cfg.rounds) cfg.rounds = 12;
      if (format === "emom" && !cfg.intervalSec) cfg.intervalSec = 60;
      if (format === "circuit") {
        if (!cfg.rounds) cfg.rounds = 3;
        if (!cfg.workSec) cfg.workSec = 45;
        if (!cfg.restSec) cfg.restSec = 15;
        if (!cfg.restBetweenRoundsSec) cfg.restBetweenRoundsSec = 60;
      }
      if (!cfg.prepSec) cfg.prepSec = 5;
      block.config = cfg;

      if (block.exercises.length === 1) {
        const legacy = block.exercises[0];
        const text = `${legacy.name ?? ""} ${legacy.note ?? ""}`;
        const names = parseExerciseNamesFromMetconNote(legacy.note ?? legacy.name ?? "");
        if (names.length >= 2) {
          block.exercises = names.map((name: string) => ({
            name,
            metric: "reps",
            muscleGroup: legacy.muscleGroup ?? "Ganzkörper",
            equipment: legacy.equipment ?? "Körpergewicht",
            note: `Ziel-Wdh. pro Runde`,
            sets: [{ reps: 10, kg: 0 }],
          }));
        } else if (/amrap|emom|circuit/i.test(text)) {
          block.exercises[0].metric = block.exercises[0].metric === "time" ? "reps" : (block.exercises[0].metric ?? "reps");
        }
      }

      for (const ex of block.exercises) {
        normalizeMetconExercise(ex);
      }
    }
    syncDayExercisesFromBlocks(day);
  }
}

function syncDayExercisesFromBlocks(day: { blocks?: { type?: string; exercises?: unknown[] }[]; exercises?: unknown[] }): void {
  const flat: Record<string, unknown>[] = [];
  for (const block of day.blocks ?? []) {
    if (!isValidBlockType(block.type) || !Array.isArray(block.exercises)) continue;
    for (const ex of block.exercises) {
      flat.push({ ...(ex as Record<string, unknown>), blockType: block.type });
    }
  }
  if (flat.length > 0) day.exercises = flat;
}

function detectMetconFormatFromText(text: string): string {
  const lower = text.toLowerCase();
  if (/\bemom\b/.test(lower)) return "emom";
  if (/\bcircuit\b|\bzirkel\b/.test(lower)) return "circuit";
  return "amrap";
}

function parseDurationSecFromText(text: string): number | null {
  const m = text.match(/(\d+)\s*min/i);
  if (m) return Number(m[1]) * 60;
  return null;
}

function parseExerciseNamesFromMetconNote(note: string): string[] {
  const cleaned = note
    .replace(/^\d+\s*min\s*/i, "")
    .replace(/^(amrap|emom|circuit)\s*[:\-]?\s*/i, "")
    .trim();
  if (!cleaned) return [];
  return cleaned
    .split(/[,;·]|\s+und\s+|\s+\+\s+/i)
    .map((s) => s.trim())
    .map((s) => s.replace(/\s*[—–-]\s+.*$/, "").trim())
    .filter((s) => s.length > 1 && !/^(moderat|leicht|schnell|tempo|rpe)/i.test(s));
}

function sanitizePlanDayNames(planData: { days?: { name?: string }[] }): void {
  if (!planData?.days) return;
  for (const day of planData.days) {
    if (day.name) {
      day.name = sanitizeDayName(day.name);
    }
  }
}

function translateLocation(loc?: string): string {
  switch (loc) {
    case "gym":
      return "Gym (Zugriff auf alle Geräte und Freihanteln)";
    case "home_equipment":
      return "Home Gym (Zugriff auf Kurzhanteln und Eigengewicht)";
    case "bodyweight":
      return "Eigengewicht (Keine Geräte, Training nur mit dem Körpergewicht)";
    default:
      return "Gym";
  }
}

function defaultOneRmPercent(fitnessGoal?: string, _experienceLevel?: string): number {
  switch (fitnessGoal) {
    case "strength":
      return 88;
    case "muscle_building":
      return 75;
    case "fat_loss":
      return 68;
    case "fitness":
      return 70;
    default:
      return 72;
  }
}

function defaultRepsForGoal(fitnessGoal?: string): number {
  switch (fitnessGoal) {
    case "strength":
      return 5;
    case "muscle_building":
      return 10;
    case "fat_loss":
      return 12;
    case "fitness":
      return 12;
    default:
      return 10;
  }
}

interface ExerciseCountParams {
  minutes?: number | null;
  experienceLevel?: string;
  fitnessGoal?: string;
  anamnesis?: { sleepHours?: number | null; stressLevel?: unknown } | null;
  ageYears?: number;
}

function ageModifier(ageYears?: number): number {
  if (ageYears == null) return 0;
  if (ageYears >= 70) return -2;
  if (ageYears >= 50) return -1;
  if (ageYears < 30) return 0;
  return 0;
}

function baseMaxForMinutes(minutes?: number | null): number {
  const m = minutes ?? 60;
  if (m <= 35) return 4;
  if (m <= 50) return 5;
  if (m <= 75) return 6;
  return 7;
}

function experienceModifier(experienceLevel?: string): number {
  switch (experienceLevel) {
    case "beginner":
      return -1;
    case "advanced":
      return 2;
    default:
      return 0;
  }
}

function goalModifier(fitnessGoal?: string): number {
  switch (fitnessGoal) {
    case "strength":
      return -1;
    case "muscle_building":
      return 1;
    default:
      return 0;
  }
}

function isConservativeVolume(anamnesis?: ExerciseCountParams["anamnesis"]): boolean {
  return isHighStress(anamnesis?.stressLevel) || (anamnesis?.sleepHours != null && anamnesis.sleepHours < 7);
}

function exerciseCountBounds(params: ExerciseCountParams): { min: number; max: number } {
  let max =
    baseMaxForMinutes(params.minutes) +
    experienceModifier(params.experienceLevel) +
    goalModifier(params.fitnessGoal) +
    ageModifier(params.ageYears);

  if (isConservativeVolume(params.anamnesis)) {
    max -= 1;
  }

  max = Math.min(8, Math.max(2, max));
  const min = Math.max(2, max - 1);
  return { min, max };
}

function formatExerciseCountRule(
  minutes?: number | null,
  experienceLevel?: string,
  fitnessGoal?: string,
  anamnesis?: ExerciseCountParams["anamnesis"],
  ageYears?: number,
): string {
  const bounds = exerciseCountBounds({ minutes, experienceLevel, fitnessGoal, anamnesis, ageYears });
  const sessionMins = minutes ?? 60;
  const expLabel = translateExperience(experienceLevel);
  const goalLabel = translateGoal(fitnessGoal);
  const profiHint = experienceLevel === "advanced" ? " Strebe die obere Spanne an." : "";
  const conservativeHint = isConservativeVolume(anamnesis)
    ? " Wegen Schlaf/Stress konservativeres Volumen (untere Spanne)."
    : "";

  return (
    `Übungsanzahl im strength-Block an Dauer, Erfahrung, Ziel und Alter koppeln: ${sessionMins} Min, ${expLabel}, Ziel ${goalLabel} → ` +
    `${bounds.min}–${bounds.max} Kraftübungen anstreben.${profiHint}${conservativeHint} ` +
    `Je 3 Sätze bei Kraft. Warm-up/Skill/MetCon separat (Cardio-Warm-up zählt NICHT zur Kraft-Cap). Kurze notes (max. 90 Zeichen).`
  );
}

const CARDIO_EQUIPMENT = "Cardiogerät";

const CARDIO_NAME_KEYWORDS = [
  "rudergerät",
  "rudern am erg",
  "ergometer",
  "laufband",
  "fahrradergometer",
  "fahrrad-ergometer",
  "crosstrainer",
  "elliptical",
  "stepper",
  "air bike",
  "ski erg",
  "warm-up",
  "warmup",
  "aufwärm",
];

const TIME_ONLY_NAME_KEYWORDS = ["warm-up", "warmup", "aufwärm", "aufwärmen"];

function isCardioEquipment(equipment: string): boolean {
  return equipment.trim().toLowerCase() === CARDIO_EQUIPMENT.toLowerCase();
}

function isCardioMetric(metric?: string): boolean {
  return metric === "time" || metric === "distance_time";
}

function looksLikeCardioExercise(name: string, equipment?: string): boolean {
  if (equipment && isCardioEquipment(equipment)) return true;
  const lower = (name ?? "").trim().toLowerCase();
  return CARDIO_NAME_KEYWORDS.some((kw) => lower.includes(kw));
}

function inferCardioMetric(name: string, equipment?: string): "time" | "distance_time" {
  const lower = (name ?? "").trim().toLowerCase();
  if (TIME_ONLY_NAME_KEYWORDS.some((kw) => lower.includes(kw))) return "time";
  if (isCardioEquipment(equipment ?? "")) {
    if (lower.includes("warm") || lower.includes("aufwärm")) return "time";
  }
  return "distance_time";
}

function isCardioExercise(ex: { name?: string; equipment?: string; metric?: string }): boolean {
  return isCardioMetric(ex.metric) || looksLikeCardioExercise(ex.name ?? "", ex.equipment);
}

function applyExerciseLimit(exercises: any[], maxEx: number): any[] {
  const cardio = exercises.filter((ex) => isCardioExercise(ex));
  const strength = exercises.filter((ex) => !isCardioExercise(ex));
  const limitedStrength = strength.length > maxEx ? strength.slice(0, maxEx) : strength;
  return [...cardio.slice(0, 1), ...limitedStrength];
}

function normalizeCardioExercise(ex: any): void {
  if (!ex.note) {
    ex.note = ex.metric === "distance_time" ? "500 m leichtes Tempo" : "5 min leichtes Tempo, Puls aufbauen";
  }
  if (ex.metric === "time") {
    if (!Array.isArray(ex.sets) || ex.sets.length === 0) {
      ex.sets = [{ reps: 0, kg: 0, durationSec: 300 }];
    } else {
      ex.sets = ex.sets.slice(0, 1);
      for (const set of ex.sets) {
        set.reps = 0;
        set.kg = 0;
        if (set.durationSec == null) set.durationSec = 300;
      }
    }
    return;
  }
  if (ex.metric === "distance_time") {
    if (!Array.isArray(ex.sets) || ex.sets.length === 0) {
      ex.sets = [{ reps: 0, kg: 0, distanceM: 500, durationSec: 180 }];
    } else {
      ex.sets = ex.sets.slice(0, 1);
      for (const set of ex.sets) {
        set.reps = 0;
        set.kg = 0;
        if (set.distanceM == null) set.distanceM = 500;
        if (set.durationSec == null) set.durationSec = 180;
      }
    }
  }
}

function normalizeMetconExercise(ex: {
  metric?: string;
  equipment?: string;
  note?: string;
  blockType?: string;
  sets?: { reps?: number; kg?: number }[];
}): void {
  ex.blockType = "metcon";
  const equipment = (ex.equipment ?? "").trim();
  const bodyweight =
    !equipment || /^(keines|körpergewicht|eigengewicht|bodyweight|none|kein\s+gerät)$/i.test(equipment);
  const repFromNote = (ex.note ?? "").match(/(\d+)\s*Wdh\.?\s*pro\s*runde/i);
  const targetReps =
    typeof ex.sets?.[0]?.reps === "number" && ex.sets[0].reps > 0
      ? ex.sets[0].reps
      : repFromNote
      ? parseInt(repFromNote[1], 10)
      : 10;

  if (bodyweight || ex.metric === "reps") {
    ex.metric = "reps";
    ex.sets = [{ reps: targetReps, kg: 0 }];
  } else if (!ex.metric || ex.metric === "weight_reps") {
    ex.metric = "weight_reps";
    ex.sets = [{ reps: targetReps, kg: 0 }];
  }

  const stripOneRm = (note: string) =>
    note
      .replace(/\d+\s*x\s*\d+\s*@\s*\d+\s*%\s*1rm/gi, "")
      .replace(/@\s*\d+\s*%\s*1rm/gi, "")
      .replace(/\d+\s*%\s*1rm/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim();

  const cleaned = stripOneRm(ex.note ?? "");
  if (!cleaned || /\d+\s*%\s*1rm/i.test(ex.note ?? "")) {
    ex.note = `${targetReps} Wdh. pro Runde`;
  } else if (/wdh\.?\s*pro\s*runde/i.test(cleaned)) {
    ex.note = cleaned;
  } else {
    ex.note = `${targetReps} Wdh. pro Runde`;
  }
}

function normalizeStrengthExercise(ex: any, fallbackNote: string, reps: number): void {
  if (!ex.note || !/\d+\s*%\s*1RM/i.test(ex.note)) {
    ex.note = fallbackNote;
  }
  if (!Array.isArray(ex.sets) || ex.sets.length === 0) {
    ex.sets = [
      { reps, kg: 0 },
      { reps, kg: 0 },
      { reps, kg: 0 },
    ];
  } else {
    for (const set of ex.sets) {
      set.kg = 0;
    }
  }
}

function normalizePlanSets(
  planData: any,
  fitnessGoal?: string,
  experienceLevel?: string,
  minutesPerSession?: number | null,
  anamnesis?: ExerciseCountParams["anamnesis"],
  ageYears?: number,
): void {
  if (!planData?.days) return;

  const pct = defaultOneRmPercent(fitnessGoal, experienceLevel);
  const reps = defaultRepsForGoal(fitnessGoal);
  const fallbackNote = `3x${reps} @ ${pct}% 1RM`;
  const { min, max } = exerciseCountBounds({
    minutes: minutesPerSession,
    experienceLevel,
    fitnessGoal,
    anamnesis,
    ageYears,
  });

  for (const day of planData.days) {
    if (!Array.isArray(day.exercises) || day.exercises.length === 0) continue;

    for (const ex of day.exercises) {
      if (looksLikeCardioExercise(ex.name ?? "", ex.equipment) && (!ex.metric || ex.metric === "weight_reps")) {
        ex.equipment = CARDIO_EQUIPMENT;
        ex.metric = inferCardioMetric(ex.name ?? "", ex.equipment);
        if (!ex.muscleGroup) ex.muscleGroup = "Ganzkörper";
      }
      if (!ex.metric) {
        ex.metric = ex.blockType === "metcon" ? "reps" : "weight_reps";
      }
    }

    const byBlock: Record<string, any[]> = { warmup: [], skill: [], strength: [], metcon: [] };
    for (const ex of day.exercises) {
      const bt = isValidBlockType(ex.blockType) ? ex.blockType : "strength";
      byBlock[bt].push(ex);
    }

    byBlock.strength = applyExerciseLimit(byBlock.strength, max);
    byBlock.warmup = byBlock.warmup.slice(0, 2);
    byBlock.skill = byBlock.skill.slice(0, 3);
    byBlock.metcon = byBlock.metcon.slice(0, 3);

    const strengthCount = byBlock.strength.filter((ex) => !isCardioExercise(ex)).length;
    if (strengthCount < min) {
      console.warn(`Tag "${day.name}" hat nur ${strengthCount} Kraftübungen im strength-Block (Ziel: min. ${min})`);
    }

    const merged = [...byBlock.warmup, ...byBlock.skill, ...byBlock.strength, ...byBlock.metcon];
    day.exercises = merged;

    if (Array.isArray(day.blocks)) {
      for (const block of day.blocks) {
        if (!isValidBlockType(block.type)) continue;
        block.exercises = byBlock[block.type] ?? [];
      }
    }

    for (const ex of day.exercises) {
      if (ex.blockType === "metcon") {
        normalizeMetconExercise(ex);
      } else if (isCardioMetric(ex.metric)) {
        normalizeCardioExercise(ex);
      } else {
        normalizeStrengthExercise(ex, fallbackNote, reps);
      }
    }
  }
}

function translateEquip(id: string): string {
  switch (id) {
    case "dumbbells":
      return "Kurzhanteln";
    case "barbell":
      return "Langhantel";
    case "pullup_bar":
      return "Klimmzugstange";
    case "bench":
      return "Trainingsbank";
    case "bands":
      return "Widerstandsbänder";
    case "kettlebell":
      return "Kettlebell";
    default:
      return id;
  }
}

// Fallback Mock-Planerstellung
function generateMockPlan(data: any): any {
  const goalName = translateGoal(data.fitnessGoal);
  const locationName = translateLocation(data.anamnesis?.trainingLocation);
  const weeklyDays = data.weeklyDays || 3;
  const painZones = data.anamnesis?.painZones || [];

  const days: any[] = [];
  const exercisePool: Record<string, { name: string; group: string; equip: string }[]> = {
    gym: [
      { name: "Bankdrücken", group: "Brust", equip: "Langhantel" },
      { name: "Kniebeugen", group: "Beine", equip: "Langhantel" },
      { name: "Kreuzheben", group: "Rücken", equip: "Langhantel" },
      { name: "Latziehen", group: "Rücken", equip: "Kabel" },
      { name: "Schulterdrücken", group: "Schultern", equip: "Langhantel" },
      { name: "Beinstrecker", group: "Beine", equip: "Maschine" },
      { name: "Rudern am Kabelzug", group: "Rücken", equip: "Kabel" },
      { name: "Bizepscurls", group: "Arme", equip: "Kurzhantel" },
      { name: "Trizepsdrücken", group: "Arme", equip: "Kabel" },
    ],
    home_equipment: [
      { name: "Liegestütze", group: "Brust", equip: "Körpergewicht" },
      { name: "Kurzhantel Kniebeugen", group: "Beine", equip: "Kurzhantel" },
      { name: "Kurzhantel Schulterdrücken", group: "Schultern", equip: "Kurzhantel" },
      { name: "Kurzhantel Rudern", group: "Rücken", equip: "Kurzhantel" },
      { name: "Ausfallschritte", group: "Beine", equip: "Körpergewicht" },
      { name: "Seitheben", group: "Schultern", equip: "Kurzhantel" },
      { name: "Bizepscurls", group: "Arme", equip: "Kurzhantel" },
    ],
    bodyweight: [
      { name: "Liegestütze", group: "Brust", equip: "Körpergewicht" },
      { name: "Klimmzüge", group: "Rücken", equip: "Körpergewicht" },
      { name: "Kniebeugen (Körpergewicht)", group: "Beine", equip: "Körpergewicht" },
      { name: "Ausfallschritte", group: "Beine", equip: "Körpergewicht" },
      { name: "Dips an Stuhl", group: "Brust", equip: "Körpergewicht" },
      { name: "Plank", group: "Bauch", equip: "Körpergewicht" },
      { name: "Mountain Climbers", group: "Bauch", equip: "Körpergewicht" },
    ],
  };

  const activePool = exercisePool[data.anamnesis?.trainingLocation || "gym"] || exercisePool.gym;
  const sessionMins = data.anamnesis?.minutesPerSession ?? 60;
  const ageYears = ageFromBirthDate(data.birthDate);

  // Erstelle nur Trainingstage (keine Ruhetage)
  for (let i = 0; i < weeklyDays; i++) {
      const workoutNum = i + 1;
      const dayLabel = getSplitWorkoutLabel(data.anamnesis, workoutNum);

      // Filtere Übungen nach Schmerzpunkten
      let exercises = [...activePool];
      if (painZones.includes("knees")) {
        exercises = exercises.filter(e => !e.name.toLowerCase().includes("knie") && !e.name.toLowerCase().includes("ausfall"));
      }
      if (painZones.includes("shoulders")) {
        exercises = exercises.filter(e => !e.name.toLowerCase().includes("schulter"));
      }

      const pct = defaultOneRmPercent(data.fitnessGoal, data.experienceLevel);
      const reps = defaultRepsForGoal(data.fitnessGoal);

      const bounds = exerciseCountBounds({
        minutes: sessionMins,
        experienceLevel: data.experienceLevel,
        fitnessGoal: data.fitnessGoal,
        anamnesis: data.anamnesis,
        ageYears,
      });
      const selectedExs = exercises.slice(0, bounds.max).map(item => {
        const painHint = painZones.length > 0 ? " · saubere Technik" : "";
        return {
          name: item.name,
          metric: "weight_reps",
          muscleGroup: item.group,
          equipment: item.equip,
          note: `3x${reps} @ ${pct}% 1RM${painHint}`.slice(0, 90),
          sets: [
            { reps, kg: 0 },
            { reps, kg: 0 },
            { reps, kg: 0 },
          ],
        };
      });

      const cardioWarmup = {
        name: "Rudergerät Warm-up",
        metric: "time",
        muscleGroup: "Ganzkörper",
        equipment: CARDIO_EQUIPMENT,
        note: "5 min leichtes Tempo, Puls aufbauen",
        sets: [{ reps: 0, kg: 0, durationSec: 300 }],
      };

      const skillEx = selectedExs[0]
        ? {
            name: selectedExs[0].name,
            metric: "weight_reps",
            muscleGroup: selectedExs[0].muscleGroup,
            equipment: selectedExs[0].equipment,
            note: "2x5 leicht, Technik @ 50% 1RM, langsames Tempo",
            sets: [
              { reps: 5, kg: 0 },
              { reps: 5, kg: 0 },
            ],
          }
        : null;

      const strengthExs = selectedExs.slice(skillEx ? 1 : 0);

      const metconExercises = [
        {
          name: "Burpees",
          metric: "reps",
          muscleGroup: "Ganzkörper",
          equipment: "Körpergewicht",
          note: "Ziel-Wdh. pro Runde",
          sets: [{ reps: 8, kg: 0 }],
        },
        {
          name: "Liegestütze",
          metric: "reps",
          muscleGroup: "Brust",
          equipment: "Körpergewicht",
          note: "Ziel-Wdh. pro Runde",
          sets: [{ reps: 12, kg: 0 }],
        },
        {
          name: "Ausfallschritte",
          metric: "reps",
          muscleGroup: "Beine",
          equipment: "Körpergewicht",
          note: "Ziel-Wdh. pro Runde",
          sets: [{ reps: 10, kg: 0 }],
        },
      ];

      const location = data.anamnesis?.trainingLocation || "gym";
      const blocks: { type: string; exercises: unknown[]; format?: string; config?: unknown }[] = [];
      if (location === "gym") {
        blocks.push({ type: "warmup", exercises: [cardioWarmup] });
      }
      if (skillEx) {
        blocks.push({ type: "skill", exercises: [skillEx] });
      }
      blocks.push({ type: "strength", exercises: strengthExs.length > 0 ? strengthExs : selectedExs });
      if (painZones.length === 0) {
        blocks.push({
          type: "metcon",
          format: "amrap",
          config: { durationSec: 600, prepSec: 5 },
          exercises: metconExercises,
        });
      }

      days.push({
        name: dayLabel,
        note: `Trainingseinheit ${workoutNum} für dein Ziel: ${goalName}`,
        enabledBlocks: blocks.map((b) => b.type),
        blocks,
      });
  }

  return {
    name: `KI ${goalName.split(" ")[0]} Plan`,
    sub: `Individuell erstellt für ${locationName}. Rücksicht auf Schmerzpunkte: ${painZones.length > 0 ? painZones.join(", ") : "Keine"}.`,
    days,
    advice: buildDefaultAdvice(
      data.experienceLevel,
      data.fitnessGoal,
      data.anamnesis,
      data.weeklyDays || 3,
      ageYears,
    ),
  };
}
