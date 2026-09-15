import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server-side client that reads the session from the request cookies.
// Uses the anon key (RLS-gated) + the user's session cookie.
export function supabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  const cookieStore = cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const c of cookiesToSet) cookieStore.set(c.name, c.value, c.options);
        } catch {
          // ignore - called from Server Component where cookies cannot be set
        }
      },
    },
  });
}