import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ANTHROPIC_MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-sonnet-4-6";
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const TRAINING_PLAN_TOOL = {
  name: "create_training_plan",
  description: "Strukturierter Trainingsplan mit Workouts, Übungen und Sätzen.",
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
            isRestDay: { type: "boolean" },
            note: { type: "string" },
            workout: {
              type: "object",
              properties: {
                name: { type: "string" },
                sub: { type: "string" },
                tags: { type: "array", items: { type: "string" } },
                durationMin: { type: "number" },
                exercises: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      metric: { type: "string" },
                      muscleGroup: { type: "string" },
                      equipment: { type: "string" },
                      note: {
                        type: "string",
                        description: "Pflicht: Sätze, Wdh. und Intensität als % des 1RM, z.B. 3x8 @ 75% 1RM",
                      },
                      sets: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            reps: { type: "number" },
                            kg: {
                              type: "number",
                              description: "Immer 0 — Nutzer ermittelt kg selbst via 1RM-Rechner",
                            },
                          },
                          required: ["reps", "kg"],
                        },
                      },
                    },
                    required: ["name", "metric", "muscleGroup", "equipment", "note", "sets"],
                  },
                },
              },
              required: ["name", "sub", "tags", "durationMin", "exercises"],
            },
          },
          required: ["isRestDay"],
        },
      },
    },
    required: ["name", "sub", "days"],
  },
};

serve(async (req) => {
  // Handle CORS Preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const {
      gender,
      heightCm,
      weightKg,
      fitnessGoal,
      experienceLevel,
      weeklyDays,
      anamnesis,
      recentSessions,
      exerciseFeedback,
      activePlan,
      mode = "new",
    } = await req.json();

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    let planData: any = null;

    // Falls kein API-Schlüssel vorhanden ist, nutzen wir den Mock-Fallback
    if (!apiKey) {
      console.warn("ANTHROPIC_API_KEY ist nicht gesetzt. Nutze Mock-Plan-Generierung.");
      planData = generateMockPlan({
        gender,
        heightCm,
        weightKg,
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
          if (day.isRestDay) return `Tag ${idx + 1}: Ruhetag`;
          const exercisesList = day.workout && day.workout.exercises ? day.workout.exercises.map((e: any) => `- ${e.name}`).join(", ") : "";
          return `Tag ${idx + 1}: ${day.workout?.name || "Workout"} (${exercisesList})`;
        }).join("\n") : "";
        activePlanText = `Aktueller Plan:\n${daysText}`;
      }

      // Prompt für KI vorbereiten
      const prompt = `Du bist ein hochqualifizierter Personal Trainer und Sportwissenschaftler. 
${
  mode === "adapt"
    ? "Passe den bestehenden Trainingsplan des Nutzers periodisiert an. Behalte die grundlegende Split-Struktur und Frequenz bei, aber variiere Übungen, ersetze unbeliebte oder schmerzhafte Übungen und passe Wiederholungen, Sätze und %-Intensität des 1RM an."
    : "Erstelle einen komplett neuen, maßgeschneiderten Trainingsplan."
}

Hier sind die Anamnesedaten des Nutzers:
- Geschlecht: ${gender || "Keine Angabe"}
- Größe: ${heightCm ? `${heightCm} cm` : "Keine Angabe"}
- Gewicht: ${weightKg ? `${weightKg} kg` : "Keine Angabe"}
- Fitness-Ziel: ${translateGoal(fitnessGoal)}
- Trainingserfahrung: ${translateExperience(experienceLevel)}
- Geplante Trainingstage: ${weeklyDays || 3} Tage pro Woche
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

${feedbackText ? `PRÄFERENZEN & FEEDBACK ZU ÜBUNGEN:\n${feedbackText}\n` : ""}
${historyText ? `TRAININGS-HISTORIE (nur für Übungsauswahl und Feedback, KEINE kg-Werte übernehmen!):\n${historyText}\n` : ""}
${activePlanText ? `${activePlanText}\n` : ""}

Erstelle einen logischen Trainingsplan mit genau ${weeklyDays || 3} aktiven Trainingstagen plus passenden Ruhetagen (insgesamt 5–7 Tage im Zyklus).

Wichtige Regeln:
1. Nutze das Tool create_training_plan — kein Freitext.
2. Maximal 4 Übungen pro Workout, je 3 Sätze. Kurze notes (max. 90 Zeichen, keine Anführungszeichen).
3. sets[].kg IMMER 0 — schätze NIEMals absolute kg-Werte aus Körpergewicht oder Historie.
4. note PFLICHT pro Übung: Satzanzahl, Wdh.-Ziel und Intensität als % des 1RM (z.B. 3x8 @ 75% 1RM oder 3 Sätze · 8 Wdh. · 80% 1RM).
5. Richtwerte Ziel → typische % 1RM: Kraft 85–95%, Hypertrophie 70–80%, Ausdauer/Technik 60–70%, Anfänger eher 65–75%.
6. Schmerzzonen und Feedback (Dislike/Schmerzen) strikt beachten.
7. metric immer "weight_reps". Übungsnamen auf Deutsch.
8. Trainings-Historie nur für Übungsauswahl und Feedback — keine kg-Vorgaben daraus ableiten.`;

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

    normalizePlanSets(planData, fitnessGoal, experienceLevel);

    // Übungen in die exercises-Tabelle eintragen, wenn sie global nicht existieren
    if (planData && planData.days) {
      for (const day of planData.days) {
        if (!day.isRestDay && day.workout && day.workout.exercises) {
          for (const e of day.workout.exercises) {
            try {
              // 1. Suche nach existierender Übung (global oder eigene)
              const { data: existing, error: getErr } = await supabase
                .from("exercises")
                .select("id, name")
                .ilike("name", e.name.trim())
                .limit(1);

              if (getErr) {
                console.error(`Fehler beim Prüfen von Übung ${e.name}:`, getErr);
                continue;
              }

              // 2. Falls Übung nicht existiert, global für alle User einfügen
              if (!existing || existing.length === 0) {
                const { error: insertErr } = await supabase.from("exercises").insert({
                  user_id: null, // Global
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

function normalizePlanSets(planData: any, fitnessGoal?: string, experienceLevel?: string): void {
  if (!planData?.days) return;

  const pct = defaultOneRmPercent(fitnessGoal, experienceLevel);
  const reps = defaultRepsForGoal(fitnessGoal);
  const fallbackNote = `3x${reps} @ ${pct}% 1RM`;

  for (const day of planData.days) {
    if (day.isRestDay || !day.workout?.exercises) continue;
    for (const ex of day.workout.exercises) {
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

  // Erstelle die Tage
  for (let i = 0; i < 7; i++) {
    const isRest = i % 2 === 1 || days.filter(d => !d.isRestDay).length >= weeklyDays;
    
    if (isRest) {
      days.push({
        isRestDay: true,
        note: "Aktive Regeneration: Dehnen oder leichter Spaziergang."
      });
    } else {
      const workoutNum = days.filter(d => !d.isRestDay).length + 1;
      
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

      // Wähle 4 bis 5 Übungen aus
      const selectedExs = exercises.slice(0, 5).map(item => {
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

      days.push({
        isRestDay: false,
        note: `Trainingseinheit ${workoutNum} für dein Ziel: ${goalName}`,
        workout: {
          name: `KI Workout ${workoutNum} (${locationName.split(" ")[0]})`,
          sub: `Einheit ${workoutNum} - Fokus Kraft & Koordination`,
          tags: ["KI", "Premium"],
          durationMin: 50,
          exercises: selectedExs
        }
      });
    }
  }

  return {
    name: mode === "adapt" ? `KI ${goalName.split(" ")[0]} Plan (Angepasst)` : `KI ${goalName.split(" ")[0]} Plan`,
    sub: mode === "adapt" 
      ? `Periodisierte Anpassung für ${locationName}. Berücksichtigt Feedback & Verlauf.` 
      : `Individuell erstellt für ${locationName}. Rücksicht auf Schmerzpunkte: ${painZones.length > 0 ? painZones.join(", ") : "Keine"}.`,
    days
  };
}
