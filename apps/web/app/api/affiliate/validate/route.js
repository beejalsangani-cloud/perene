// Validates retailer URLs server-side and returns a parallel array of booleans
// the client uses to filter dead links out of the "Shop the look" UI. Auth-gated
// via the caller's Supabase access token; cache + per-retailer probe logic
// lives in lib/affiliate-validator.

import { supabaseAdmin } from "@/lib/supabase-admin";
import { validateAffiliateURL } from "@/lib/affiliate-validator";

const MAX_ITEMS = 20; // Outfits today carry at most 3 missing items × 3 retailers; 20 is comfortably above that

async function userIdFromAuthHeader(request) {
  const header = request.headers.get("authorization") ?? "";
  const token  = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : null;
  if (!token) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error) return null;
  return data?.user?.id ?? null;
}

export async function POST(request) {
  const userId = await userIdFromAuthHeader(request);
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try { body = await request.json(); }
  catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }

  const items = Array.isArray(body?.items) ? body.items : null;
  if (!items) {
    return Response.json({ error: "Body must be { items: [{ url, retailer }] }" }, { status: 400 });
  }
  if (items.length === 0) {
    return Response.json({ results: [] });
  }
  if (items.length > MAX_ITEMS) {
    return Response.json({ error: `Too many items (max ${MAX_ITEMS})` }, { status: 400 });
  }

  // Probe in parallel; per-item failure handled inside validateAffiliateURL.
  const results = await Promise.all(
    items.map(async ({ url, retailer }) => {
      const valid = await validateAffiliateURL(url, retailer);
      return { url, retailer, valid };
    })
  );

  return Response.json({ results });
}
