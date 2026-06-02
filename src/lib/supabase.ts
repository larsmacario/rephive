import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error("VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY müssen in .env gesetzt sein.");
}

export const supabase = createClient<Database>(url, anonKey);
