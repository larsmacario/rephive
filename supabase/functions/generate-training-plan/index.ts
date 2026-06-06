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

const EXERCISE_ITEM_SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string" },
    metric: {
      type: "string",
      description:
        'Tracking-Typ: "weight_reps" für Kraftübungen; "time" für zeitbasiertes Cardio (Warm-up); "distance_time" für Distanz+Zeit (Rudergerät, Laufband)',
    },
    muscleGroup: { type: "string" },
    equipment: {
      type: "string",
      description: 'Gerätetyp, z.B. "Langhantel", "Kabel" oder "Cardiogerät" für Ergometer/Warm-up',
    },
    note: {
      type: "string",
      description:
        "Kraft: Sätze, Wdh. und % 1RM (z.B. 3x8 @ 75% 1RM). Cardio: Dauer/Distanz ohne % 1RM (z.B. 5 min leichtes Tempo)",
    },
    sets: {
      type: "array",
      items: {
        type: "object",
        properties: {
          reps: { type: "number", description: "Wiederholungen (Kraft) oder 0 bei Cardio" },
          kg: {
            type: "number",
            description: "Immer 0 — Nutzer ermittelt kg selbst via 1RM-Rechner",
          },
          durationSec: {
            type: "number",
            description: "Dauer in Sekunden (Cardio: metric time oder distance_time)",
          },
          distanceM: {
            type: "number",
            description: "Distanz in Metern (nur metric distance_time, z.B. 500 für 500 m)",
          },
        },
        required: ["reps", "kg"],
      },
    },
  },
  required: ["name", "metric", "muscleGroup", "equipment", "note", "sets"],
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
            note: { type: "string" },
            enabledBlocks: {
              type: "array",
              items: { type: "string", enum: [...BLOCK_TYPES] },
              description: "Aktive Bausteine an diesem Tag (Standard: alle vier)",
            },
            blocks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string", enum: [...BLOCK_TYPES] },
                  exercises: {
                    type: "array",
                    items: EXERCISE_ITEM_SCHEMA,
                  },
                },
                required: ["type", "exercises"],
              },
              description:
                "Pro Baustein passende Übungen: warmup (5–8 Min Cardio/Mobilität), skill (Technik, niedrige Last), strength (Hauptlift + Assistance), metcon (8–12 Min AMRAP/EMOM/Circuit)",
            },
          },
          required: ["name", "blocks"],
        },
      },
      advice: {
        type: "object",
        description: "Begleitende Empfehlungen (nur Text + Plan-Nutzungsdauer in Wochen, keine kg/kcal).",
        properties: {
          trainingFocus: { type: "string" },
          nutritionTips: { type: "string" },
          recoveryTips: { type: "string" },
          hydrationTips: { type: "string" },
          planDuration: {
            type: "object",
            properties: {
              weeksMin: { type: "number" },
              weeksMax: { type: "number" },
              note: { type: "string" },
            },
            required: ["weeksMin", "weeksMax", "note"],
          },
        },
        required: ["trainingFocus", "nutritionTips", "recoveryTips", "hydrationTips", "planDuration"],
      },
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
      activePlan,
      mode = "new",
    } = await req.json();

    const ageYears = ageFromBirthDate(birthDate);
    const ageBand = getAgeBand(ageYears);

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    let planData: any = null;

    // Falls kein API-Schlüssel vorhanden ist, nutzen wir den Mock-Fallback
    if (!apiKey) {
      console.warn("ANTHROPIC_API_KEY ist nicht gesetzt. Nutze Mock-Plan-Generierung.");
      planData = generateMockPlan({
        gender,
        heightCm,
        weightKg,
        birthDate,
        fitnessGoal,
        experienceLevel,
        weeklyDays,
        anamnesis,
        mode,
      });
    } else {
      // Bereite historische Daten für den Prompt vor
      let historyText = "";
      if (recentSessions && recentSessions.length > 0) {
        historyText = recentSessions.map((s: any) => {
          const performedAt = s.performedAt ? new Date(s.performedAt).toLocaleDateString("de-DE") : "";
          const exercisesText = s.exercises ? s.exercises.map((e: any) => {
            const setsText = e.sets ? e.sets.map((set: any) => `${set.reps} Wdh.`).join(", ") : "";
            return `- ${e.name}: ${setsText}`;
          }).join("\n") : "";
          return `Training am ${performedAt} (${s.name}):\n${exercisesText}`;
        }).join("\n\n");
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

      let activePlanText = "";
      if (mode === "adapt" && activePlan) {
        const daysText = activePlan.days ? activePlan.days.map((day: any, idx: number) => {
          const exercises = day.exercises ?? day.workout?.exercises ?? [];
          const exercisesList = exercises.map((e: any) => e.name).join(", ");
          const dayName = day.name ?? day.workout?.name ?? `Tag ${idx + 1}`;
          return `Tag ${idx + 1}: ${dayName} (${exercisesList})`;
        }).join("\n") : "";
        activePlanText = `Aktueller Plan:\n${daysText}`;
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

      // Prompt für KI vorbereiten
      const prompt = `Du bist ein hochqualifizierter Personal Trainer und Sportwissenschaftler. 
${
  mode === "adapt"
    ? "Passe den bestehenden Trainingsplan des Nutzers periodisiert an. Behalte die grundlegende Split-Struktur und Frequenz bei, aber variiere Übungen, ersetze unbeliebte oder schmerzhafte Übungen und passe Wiederholungen, Sätze und %-Intensität des 1RM an."
    : "Erstelle einen komplett neuen, maßgeschneiderten Trainingsplan."
}

Hier sind die Anamnesedaten des Nutzers:
- Geschlecht: ${gender || "Keine Angabe"}
- Alter: ${ageYears} Jahre (${formatAgeBandLabel(ageBand)})
- Größe: ${heightCm ? `${heightCm} cm` : "Keine Angabe"}
- Gewicht: ${weightKg ? `${weightKg} kg` : "Keine Angabe"}
- Fitness-Ziel: ${translateGoal(fitnessGoal)}
- Trainingserfahrung: ${translateExperience(experienceLevel)}
- Geplante Trainingstage: ${weeklyDays || 3} Tage pro Woche
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
${activePlanText ? `${activePlanText}\n` : ""}

Erstelle einen logischen Trainingsplan mit genau ${weeklyDays || 3} Trainingstagen (keine Ruhetage).

4-BAUSTEINE-SYSTEM (Pflicht pro Trainingstag):
Jeder Tag besteht aus blocks[] in fester Reihenfolge: warmup → skill → strength → metcon.
${blockStructureRules}

${ageBandRules}

Wichtige Regeln:
1. Nutze das Tool create_training_plan — kein Freitext. Pro Tag blocks[] mit type und exercises[].
2. ${exerciseCountRule} (gilt nur für den strength-Block; Warm-up/Skill/MetCon separat.)
3. sets[].kg IMMER 0 — schätze NIEMals absolute kg-Werte aus Körpergewicht oder Historie.
4. note PFLICHT pro Übung: Bei Kraft metric "weight_reps": Satzanzahl, Wdh.-Ziel und Intensität als % des 1RM (z.B. 3x8 @ 75% 1RM). Bei Cardio (metric "time" oder "distance_time"): KEIN % 1RM — stattdessen Dauer/Distanz (z.B. "5 min leichtes Tempo, Puls aufbauen" oder "500 m leichtes Rudern").
5. Richtwerte Ziel → typische % 1RM (nur Kraft): Kraft 85–95%, Hypertrophie 70–80%, Ausdauer/Technik 60–70%, Anfänger eher 65–75%.
6. Schmerzzonen und Feedback (Dislike/Schmerzen) strikt beachten. Bei Reha/Einschränkung MetCon optional weglassen → enabledBlocks ohne metcon setzen.
7. metric und equipment nach Übungstyp: Kraftübungen → metric "weight_reps", passendes Gerät. Warm-up: Cardio/Mobilität → equipment "Cardiogerät" oder "Keines", metric "time". Skill: leichte Technikübungen, niedrige Last, KEIN Ausbelasten. MetCon: AMRAP/EMOM/Circuit 8–12 Min in der note. Übungsnamen auf Deutsch.
8. Wenig Schlaf (<7h) oder Stress ≥ 8/10 → konservativeres Volumen in den notes.
9. advice-Objekt PFLICHT: trainingFocus, nutritionTips (diätpräferenz-konform, keine Kalorienzahlen), recoveryTips, hydrationTips.
10. advice.planDuration: weeksMin/weeksMax empfehlen — Anfänger oder Stress ≥ 8/wenig Schlaf: 10–14 Wochen; Fortgeschritten: 8–12; Advanced: 4–8. note: 1–2 Sätze wann Plan wechseln (Plateau, Deload), kein medizinischer Rat.
11. Trainingsstruktur strikt umsetzen: full_body → jeder Tag ein Ganzkörper-Tag (deutsche Namen z. B. „Ganzkörper A/B“); split + N → genau N verschiedene Split-Einheiten pro Woche rotieren (2er: Ober-/Unterkörper; 3er: Push/Pull/Beine; 4er–6er: passende Muskelgruppen-Namen). days[].name beschreibt die Einheit, nicht den Wochentag.
12. days[].name NIEMALS mit „Tag 1“, „Tag 2“, „Tag A“ o. Ä. beginnen — keine Tag-Nummern im Namen (Reihenfolge ergibt sich aus dem Plan). Beispiele erlaubt: „Unterkörper“, „Push“, „Rücken & Bizeps“. Verboten: „Tag 3 – Brust, Trizeps“.
13. Muskelgruppen-Prioritäten (1–5) beeinflussen Volumen und Übungsauswahl im strength-Block: Priorität ≥4 → mehr Übungen/Sätze für diese Gruppe; Priorität ≤2 → reduziertes Volumen; Priorität 3 → ausgewogen. Schmerzzonen und Feedback haben Vorrang vor Prioritäten.`;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: ANTHROPIC_MODEL,
          max_tokens: 8192,
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

    normalizePlanDaysStructure(planData);
    normalizePlanBlocks(planData, fitnessGoal, ageBand, anamnesis);
    normalizePlanSets(planData, fitnessGoal, experienceLevel, anamnesis?.minutesPerSession, anamnesis, ageYears);
    sanitizePlanDayNames(planData);
    if (!planData.advice) {
      planData.advice = buildDefaultAdvice(experienceLevel, fitnessGoal, anamnesis);
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

function buildDefaultAdvice(experienceLevel?: string, fitnessGoal?: string, anamnesis?: any): any {
  const goalName = translateGoal(fitnessGoal);
  const diet = translateDiet(anamnesis?.dietPreference);
  let weeksMin = 8;
  let weeksMax = 12;
  let durationNote = "Nutze diesen Plan etwa 8–12 Wochen, danach Deload oder Planwechsel.";

  if (experienceLevel === "beginner" || isHighStress(anamnesis?.stressLevel) || (anamnesis?.sleepHours != null && anamnesis.sleepHours < 7)) {
    weeksMin = 10;
    weeksMax = 14;
    durationNote = "Als Anfänger oder bei hoher Belastung: 10–14 Wochen für stabile Gewöhnung, dann neu bewerten.";
  } else if (experienceLevel === "advanced") {
    weeksMin = 4;
    weeksMax = 8;
    durationNote = "Kürzerer Mesozyklus (4–8 Wochen), danach Variation oder angepasster Plan.";
  }

  return {
    trainingFocus: `Fokus auf ${goalName} mit sauberer Technik und progressiver Steigerung.`,
    nutritionTips: `Ernährung (${diet}): proteinreiche Mahlzeiten passend zu deinem Ziel, ohne Kalorien zu schätzen.`,
    recoveryTips: "Ruhetage einhalten, Schlaf priorisieren und Belastung aus Beruf und anderen Sportarten beachten.",
    hydrationTips: "Ausreichend über den Tag trinken, besonders vor und nach dem Training.",
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
      return "Altersband 40–49: Mobilität ernst nehmen, nachhaltige Progression, keine ständigen Max-Versuche.";
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
    `- warmup: ${warmupDur} Cardio + Mobilität, leicht, metric time/distance_time\n` +
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
      if (!ex.metric) ex.metric = "weight_reps";
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
      if (isCardioMetric(ex.metric)) {
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
  const mode = data.mode || "new";

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

      const metconEx = {
        name: "AMRAP 10 Min",
        metric: "weight_reps",
        muscleGroup: "Ganzkörper",
        equipment: "Körpergewicht",
        note: "10 Min AMRAP: Burpees, Liegestütze, Ausfallschritte — moderates Tempo",
        sets: [{ reps: 0, kg: 0 }],
      };

      const location = data.anamnesis?.trainingLocation || "gym";
      const blocks: { type: string; exercises: unknown[] }[] = [];
      if (location === "gym") {
        blocks.push({ type: "warmup", exercises: [cardioWarmup] });
      }
      if (skillEx) {
        blocks.push({ type: "skill", exercises: [skillEx] });
      }
      blocks.push({ type: "strength", exercises: strengthExs.length > 0 ? strengthExs : selectedExs });
      if (painZones.length === 0) {
        blocks.push({ type: "metcon", exercises: [metconEx] });
      }

      days.push({
        name: dayLabel,
        note: `Trainingseinheit ${workoutNum} für dein Ziel: ${goalName}`,
        enabledBlocks: blocks.map((b) => b.type),
        blocks,
      });
  }

  return {
    name: mode === "adapt" ? `KI ${goalName.split(" ")[0]} Plan (Angepasst)` : `KI ${goalName.split(" ")[0]} Plan`,
    sub: mode === "adapt" 
      ? `Periodisierte Anpassung für ${locationName}. Berücksichtigt Feedback & Verlauf.` 
      : `Individuell erstellt für ${locationName}. Rücksicht auf Schmerzpunkte: ${painZones.length > 0 ? painZones.join(", ") : "Keine"}.`,
    days,
    advice: buildDefaultAdvice(data.experienceLevel, data.fitnessGoal, data.anamnesis),
  };
}
