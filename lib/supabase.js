import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Returns { Authorization: "Bearer <token>" } for the current session, or {}
// if signed out. Spread this into fetch() headers for any /api/* route that
// verifies the caller server-side (see lib/auth.js) — every route that reads
// or writes user-scoped data needs this, since the server no longer trusts a
// userId passed in the request body.
export async function authHeader() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
}

