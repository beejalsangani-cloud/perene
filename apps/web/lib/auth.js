// Server-side request authentication. Verifies the Supabase access token sent
// as `Authorization: Bearer <token>` and returns the authenticated user id.
//
// This is the single source of truth for "who is calling" on every API route.
// Routes must NOT trust a userId supplied in the request body — that lets any
// caller act as any user, since the routes run with the RLS-bypassing service
// role. Always derive the id from the token here.
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * @param {Request} request
 * @returns {Promise<string|null>} the user id, or null if no/invalid token
 */
export async function getUserIdFromRequest(request) {
  const header = request.headers.get("authorization") ?? "";
  const token = header.toLowerCase().startsWith("bearer ")
    ? header.slice(7).trim()
    : null;
  if (!token) return null;

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error) return null;
  return data?.user?.id ?? null;
}

/**
 * Convenience wrapper: returns { userId } or a ready-to-return 401 Response.
 * Usage:
 *   const auth = await requireUser(request);
 *   if (auth.response) return auth.response;
 *   const { userId } = auth;
 */
export async function requireUser(request) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) {
    return { userId: null, response: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { userId, response: null };
}
