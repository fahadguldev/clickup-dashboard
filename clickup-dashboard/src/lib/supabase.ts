import { createClient } from "@supabase/supabase-js";

// Server-side only. The service role key bypasses RLS and must NEVER be
// imported from client components. All browser access goes through /api/time.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabase =
  url && key ? createClient(url, key) : null;

export function isSupabaseConfigured(): boolean {
  return supabase !== null;
}