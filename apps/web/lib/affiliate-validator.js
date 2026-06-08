// ────────────────────────────────────────────────────────────────────────────
// Server-side affiliate URL validator
// ────────────────────────────────────────────────────────────────────────────
//
// Probes a retailer search URL to confirm it resolves to something usable, and
// caches the result in public.affiliate_url_checks. Used by
// /api/affiliate/validate to filter dead retailer suggestions out of the
// "Shop the look" UI on /outfits/[id] before they reach the user.
//
// Three buckets of retailers, set in VALIDATION_MODE below:
//   content  → GET, 200, body contains a known marker (search title, canonical
//              link, "$"-prices, etc.). Used for SSR retailers we can sniff.
//   status   → GET, 200. Used for JS-rendered SPAs where the server response
//              is just the shell. We can't see whether products render — only
//              that the URL is structurally valid.
//   skip     → never probe; always return valid. Used for retailers that
//              403-block all non-browser traffic (Nordstrom/N-a-P/Saks).
//              Treating their 403s as failure would erase 27% of the roster
//              including the entire premium tier, so we fail open.
//
// Fail-open everywhere: timeouts, network errors, unknown retailers, and
// affiliate-wrapper URLs all return true. The downside of a false-positive
// (showing a slightly broken link) is much smaller than a false-negative
// (hiding a working store from a shopper).

import crypto from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { findRetailer } from "@/lib/affiliate";

const TTL_SUCCESS_MS    = 24 * 60 * 60 * 1000; // 24h for valid URLs
const TTL_FAILURE_MS    =       60 * 60 * 1000; // 1h for failures — retry sooner on transient errors
const PROBE_TIMEOUT_MS  = 5000;
const BROWSER_UA        = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";

// Affiliate-network redirect hosts. When affiliate IDs are filled in upstream,
// buildShopUrl wraps bare URLs through these — we can't probe a redirect URL
// meaningfully, so we skip them.
const AFFILIATE_WRAPPER_HOSTS = ["click.linksynergy.com", "awin1.com", "shareasale.com", "anrdoezrs.net"];

const VALIDATION_MODE = {
  // Sniffable SSR retailers — content marker check
  "ASOS":              { mode: "content", marker: /<title>[^<]*Search:|class="[^"]*price/i },
  "Anthropologie":     { mode: "content", marker: /<link[^>]+rel="canonical"[^>]+\/search\?q=/i },
  "Free People":       { mode: "content", marker: /<link[^>]+rel="canonical"[^>]+\/search/i },
  "Reformation":       { mode: "content", marker: /<title>[^<]*Search Results/i },
  "Revolve":           { mode: "content", marker: /(\/v\/|add[- ]to[- ]cart|class="price)/i },

  // SPA retailers — status code only (server response is the page shell)
  "Mejuri":            { mode: "status" },
  "Sézane":            { mode: "status" },
  "Aritzia":           { mode: "status" },

  // Bot-blocked retailers — never probe, always trust
  "Nordstrom":         { mode: "skip" },
  "Net-a-Porter":      { mode: "skip" },
  "Saks Fifth Avenue": { mode: "skip" },
};

function cacheKey(retailer, url) {
  return crypto.createHash("sha256").update(`${retailer}|${url}`).digest("hex");
}

function isAffiliateWrapper(url) {
  try {
    const host = new URL(url).hostname;
    return AFFILIATE_WRAPPER_HOSTS.some((h) => host.includes(h));
  } catch {
    return false;
  }
}

function isCacheFresh(row) {
  const ageMs = Date.now() - new Date(row.checked_at).getTime();
  return row.is_valid ? ageMs < TTL_SUCCESS_MS : ageMs < TTL_FAILURE_MS;
}

async function readCache(retailer, url) {
  const key = cacheKey(retailer, url);
  const { data, error } = await supabaseAdmin
    .from("affiliate_url_checks")
    .select("is_valid, failure_reason, checked_at")
    .eq("cache_key", key)
    .maybeSingle();
  if (error || !data) return null;
  if (!isCacheFresh(data)) return null;
  return data;
}

async function writeCache({ retailer, url, isValid, failureReason }) {
  const key = cacheKey(retailer, url);
  // Pull search_query from the URL for log queries — best-effort, never throws
  let searchQuery = "";
  try {
    const u = new URL(url);
    searchQuery = u.searchParams.get("q") ?? u.searchParams.get("query") ?? u.searchParams.get("keywords") ?? u.searchParams.get("keyword") ?? "";
  } catch { /* ignore */ }

  await supabaseAdmin
    .from("affiliate_url_checks")
    .upsert(
      {
        cache_key:      key,
        retailer,
        search_query:   searchQuery,
        is_valid:       isValid,
        failure_reason: failureReason ?? null,
        checked_at:     new Date().toISOString(),
      },
      { onConflict: "cache_key" }
    );
}

// Returns { ok: boolean | null, reason: string }. ok === null means "couldn't
// determine" — fail open in caller, but don't cache.
async function probeUrl(retailer, url) {
  const mode = VALIDATION_MODE[retailer];
  if (!mode || mode.mode === "skip") {
    return { ok: true, reason: "skip_unverifiable" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method:   "GET",
      redirect: "follow",
      signal:   controller.signal,
      headers: {
        "User-Agent":      BROWSER_UA,
        "Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      // 403 → bot detection (Akamai/Cloudflare/etc.) rejected our probe; the
      //       URL itself may be perfectly fine in a real browser. Fail open.
      // 5xx → retailer-side transient outage. Fail open (cached 1h via TTL_FAILURE_MS).
      // Other 4xx (404, 410, 451, etc.) → URL is structurally broken. INVALID.
      if (res.status === 403)  return { ok: null, reason: "status_403_blocked" };
      if (res.status >= 500)   return { ok: null, reason: `status_${res.status}_transient` };
      return { ok: false, reason: `status_${res.status}` };
    }
    if (mode.mode === "status") return { ok: true, reason: "status_200" };

    const text = await res.text();
    if (mode.marker.test(text)) return { ok: true, reason: "content_marker_found" };
    return { ok: false, reason: "content_marker_missing" };
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === "AbortError") return { ok: null, reason: "timeout" };
    return { ok: null, reason: `network_${err.code || err.name || "error"}` };
  }
}

/**
 * Validate an affiliate-or-retailer search URL. Returns true if verified valid
 * OR if we couldn't determine — fail open in all uncertainty paths.
 *
 * @param {string} url       The URL the user would land on (bare retailer URL preferred; affiliate wrappers are skipped)
 * @param {string} retailer  Retailer display name (e.g. "Reformation"), matched case/accent-insensitively against the roster
 * @returns {Promise<boolean>}
 */
export async function validateAffiliateURL(url, retailer) {
  if (typeof url !== "string" || typeof retailer !== "string") return true;
  if (!/^https?:\/\//i.test(url)) return true;
  if (isAffiliateWrapper(url)) return true;

  const config = findRetailer(retailer);
  if (!config) return true;

  // Cache check — silent failure falls through to a fresh probe
  try {
    const cached = await readCache(config.name, url);
    if (cached) return cached.is_valid;
  } catch (err) {
    console.error("[validate] cache read error:", err);
  }

  const result = await probeUrl(config.name, url);

  // Couldn't determine — don't cache, return true (fail open)
  if (result.ok === null) {
    console.log(`[validate] retailer=${config.name} url=${url} valid=true reason=${result.reason} mode=fail_open`);
    return true;
  }

  if (!result.ok) {
    console.log(`[validate] retailer=${config.name} url=${url} valid=false reason=${result.reason}`);
  }

  try {
    await writeCache({ retailer: config.name, url, isValid: result.ok, failureReason: result.ok ? null : result.reason });
  } catch (err) {
    console.error("[validate] cache write error:", err);
  }

  return result.ok;
}
