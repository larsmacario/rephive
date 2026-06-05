import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const resendApiKey = Deno.env.get("RESEND_API_KEY") ?? "";
const appUrl = Deno.env.get("APP_URL") ?? "https://rephive.app";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { relationshipId } = await req.json();
    if (!relationshipId || typeof relationshipId !== "string") {
      return new Response(JSON.stringify({ error: "relationshipId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: rel, error: relError } = await supabase
      .from("coaching_relationships")
      .select("*")
      .eq("id", relationshipId)
      .single();

    if (relError || !rel) {
      return new Response(JSON.stringify({ error: "Relationship not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isAthleteInvite = rel.initiated_by === "athlete";
    const recipientEmail = isAthleteInvite ? rel.coach_email : rel.athlete_email;
    const inviterLabel = isAthleteInvite ? "Ein Athlet" : "Dein Coach";

    const subject = isAthleteInvite
      ? "Einladung als Coach bei rephive"
      : "Einladung zum Coaching bei rephive";

    const bodyText = `${inviterLabel} hat dich bei rephive eingeladen.\n\nÖffne die App und melde dich mit dieser E-Mail-Adresse an:\n${recipientEmail}\n\n${appUrl}`;

    if (!resendApiKey) {
      console.log("[send-coaching-invite] No RESEND_API_KEY — logged only:", recipientEmail, bodyText);
      return new Response(JSON.stringify({ ok: true, emailed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "rephive <noreply@rephive.app>",
        to: [recipientEmail],
        subject,
        text: bodyText,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Resend error:", errText);
      return new Response(JSON.stringify({ error: "Email send failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, emailed: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
