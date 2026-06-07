import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const adminClient = createClient(supabaseUrl, supabaseServiceKey);

async function deleteUserStorageFolder(bucket: string, userId: string): Promise<void> {
  const { data, error } = await adminClient.storage.from(bucket).list(userId, { limit: 1000 });
  if (error) throw error;
  if (!data?.length) return;

  const paths = data.map((item) => `${userId}/${item.name}`);
  const chunkSize = 100;
  for (let i = 0; i < paths.length; i += chunkSize) {
    const chunk = paths.slice(i, i + chunkSize);
    const { error: removeError } = await adminClient.storage.from(bucket).remove(chunk);
    if (removeError) throw removeError;
  }
}

async function deleteUserBodyPhotos(userId: string): Promise<void> {
  await deleteUserStorageFolder("body-photos", userId);
}

async function deleteUserAvatars(userId: string): Promise<void> {
  await deleteUserStorageFolder("avatars", userId);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed", message: "Nur POST erlaubt." }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: "unauthorized", message: "Authentifizierung erforderlich." }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) {
    return new Response(
      JSON.stringify({ error: "unauthorized", message: "Authentifizierung erforderlich." }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const userId = authData.user.id;

  try {
    await deleteUserBodyPhotos(userId);
    await deleteUserAvatars(userId);
  } catch (err) {
    console.error("Storage-Löschung fehlgeschlagen:", err);
    return new Response(
      JSON.stringify({
        error: "storage_delete_failed",
        message: "Nutzerdaten im Storage konnten nicht gelöscht werden. Bitte später erneut versuchen.",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
  if (deleteError) {
    console.error("Auth-Löschung fehlgeschlagen:", deleteError);
    return new Response(
      JSON.stringify({
        error: "delete_failed",
        message: deleteError.message || "Konto konnte nicht gelöscht werden.",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
