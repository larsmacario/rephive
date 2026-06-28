import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAiConsent } from "../_shared/aiConsent.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ANTHROPIC_MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-sonnet-4-6";
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const NUTRITION_LABEL_TOOL = {
  name: "extract_nutrition_label",
  description: "Extrahiert Nährwerte aus einem Lebensmittel-Etikett (DE/EU).",
  input_schema: {
    type: "object",
    properties: {
      name: { type: "string", description: "Produktname laut Etikett" },
      protein_per_100g: { type: "number", description: "Protein in g pro 100 g" },
      basis: {
        type: "string",
        enum: ["per_100g", "per_serving"],
        description: "Ob protein_per_100g wirklich pro 100g ist oder pro Portion angegeben wurde",
      },
      serving_g: { type: "number", description: "Portionsgröße in g, wenn basis=per_serving" },
      carbs_per_100g: { type: "number" },
      fat_per_100g: { type: "number" },
      kcal_per_100g: { type: "number" },
      confidence: { type: "string", enum: ["high", "low"] },
    },
    required: ["name", "protein_per_100g", "basis", "confidence"],
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const consentBlock = await requireAiConsent(
    req,
    corsHeaders,
    supabaseUrl,
    supabaseAnonKey,
    supabaseServiceKey,
    "Für die Etikett-Erkennung ist deine Einwilligung zur KI-Nutzung (Anthropic) erforderlich.",
  );
  if (consentBlock) return consentBlock;

  try {
    const body = await req.json();
    const imageBase64 = typeof body?.imageBase64 === "string" ? body.imageBase64 : "";
    const mediaType =
      body?.mediaType === "image/png" || body?.mediaType === "image/jpeg"
        ? body.mediaType
        : "image/jpeg";
    const eanHint = typeof body?.ean === "string" ? body.ean : undefined;

    if (!imageBase64 || imageBase64.length < 100) {
      return new Response(JSON.stringify({ error: "Ungültiges Bild." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "KI nicht konfiguriert." }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const promptText = [
      "Extrahiere Nährwerte aus diesem Lebensmittel-Etikett.",
      "Unterscheide strikt zwischen Angaben pro 100 g und pro Portion.",
      "Wenn nur pro Portion angegeben: basis=per_serving und serving_g setzen; protein_per_100g trotzdem auf den Etikett-Wert setzen (auch wenn pro Portion).",
      "Bei unleserlichem Etikett: confidence=low.",
      "Bei völlig unleserlich: lehne ab mit kurzer Begründung im name-Feld und confidence=low.",
      eanHint ? `EAN-Hinweis: ${eanHint}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 1024,
        tools: [NUTRITION_LABEL_TOOL],
        tool_choice: { type: "tool", name: "extract_nutrition_label" },
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: mediaType, data: imageBase64 },
              },
              { type: "text", text: promptText },
            ],
          },
        ],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error("Anthropic error:", errText);
      return new Response(JSON.stringify({ error: "Etikett-Erkennung fehlgeschlagen." }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anthropicData = await anthropicRes.json();
    const toolBlock = (anthropicData.content ?? []).find(
      (block: { type?: string }) => block.type === "tool_use",
    );

    if (!toolBlock?.input) {
      return new Response(JSON.stringify({ error: "Keine Nährwerte erkannt." }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const input = toolBlock.input as Record<string, unknown>;
    const protein = Number(input.protein_per_100g);
    if (!Number.isFinite(protein) || protein <= 0) {
      return new Response(JSON.stringify({ error: "Proteinwert konnte nicht erkannt werden." }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const basis = input.basis === "per_serving" ? "per_serving" : "per_100g";
    const result = {
      name: String(input.name ?? "Unbekanntes Produkt").trim(),
      proteinPer100g: Math.round(protein * 10) / 10,
      basis,
      servingG:
        basis === "per_serving" && typeof input.serving_g === "number"
          ? Math.round(input.serving_g)
          : undefined,
      carbsPer100g: typeof input.carbs_per_100g === "number" ? input.carbs_per_100g : undefined,
      fatPer100g: typeof input.fat_per_100g === "number" ? input.fat_per_100g : undefined,
      kcalPer100g: typeof input.kcal_per_100g === "number" ? input.kcal_per_100g : undefined,
      confidence: input.confidence === "low" ? "low" : "high",
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Interner Fehler." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
