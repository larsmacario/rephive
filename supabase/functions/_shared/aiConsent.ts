import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

export const AI_CONSENT_VERSION = 2;

export function hasAiConsentFromPreferences(raw: unknown): boolean {
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

export async function requireAiConsent(
  req: Request,
  corsHeaders: Record<string, string>,
  supabaseUrl: string,
  supabaseAnonKey: string,
  supabaseServiceKey: string,
  consentMessage: string,
): Promise<Response | null> {
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

  const adminClient = createClient(supabaseUrl, supabaseServiceKey);
  const { data: profile, error: profileError } = await adminClient
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
      JSON.stringify({ error: "consent_required", message: consentMessage }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  return null;
}
