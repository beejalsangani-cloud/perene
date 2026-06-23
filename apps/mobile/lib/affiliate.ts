// Affiliate shop-link builder for the native app. Trimmed port of the web's
// apps/web/lib/affiliate.js — same retailer roster and the same passthrough
// behaviour: every network credential is empty, so buildShopUrl returns the
// bare retailer search URL. When the web app fills in affiliate IDs, mirror the
// change here. Keep this in lock-step with the web roster.
//
// Mobile only needs to turn a { retailer, search_query } suggestion (from the
// Claude-generated outfit's missing_items) into a tappable search URL, so the
// network-wrapping branches are reduced to the passthrough they currently
// resolve to. The full wrapping logic lives on the web side.

// rel attribute is web-only (anchor tags); native opens URLs via Linking.

type SearchUrlBuilder = (query: string) => string;

// Slugify a free-form query into a kebab-case URL segment (Revolve's pattern).
function kebab(q: string): string {
  return q
    .normalize("NFD")
    .replace(/\p{Mn}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Retailer roster — names + bare search-URL builders, mirroring the web roster
// (apps/web/lib/affiliate.js). Disabled retailers there (Mejuri, Sézane) are
// omitted here too.
const RETAILERS: Record<string, SearchUrlBuilder> = {
  Nordstrom: (q) => `https://www.nordstrom.com/sr?keyword=${encodeURIComponent(q)}`,
  ASOS: (q) => `https://www.asos.com/us/search/?q=${encodeURIComponent(q)}`,
  "Net-a-Porter": (q) =>
    `https://www.net-a-porter.com/en-us/shop/search?keywords=${encodeURIComponent(q)}`,
  Revolve: (q) => {
    const slug = kebab(q);
    return slug ? `https://www.revolve.com/v/${slug}` : "https://www.revolve.com/";
  },
  "Saks Fifth Avenue": (q) =>
    `https://www.saksfifthavenue.com/search?q=${encodeURIComponent(q)}`,
  Anthropologie: (q) => `https://www.anthropologie.com/search?q=${encodeURIComponent(q)}`,
  "Free People": (q) => `https://www.freepeople.com/search?q=${encodeURIComponent(q)}`,
  Reformation: (q) =>
    `https://www.thereformation.com/search?query=${encodeURIComponent(q)}`,
  Aritzia: (q) => `https://www.aritzia.com/us/en/search?q=${encodeURIComponent(q)}`,
};

function normalizeKey(s: string): string {
  return s.normalize("NFD").replace(/\p{Mn}/gu, "").toLowerCase().trim();
}

// Resolve a retailer's search-URL builder by name. Case- and accent-insensitive
// fallback so lowercased / accent-stripped AI output still matches.
function findRetailer(name: string): SearchUrlBuilder | null {
  if (RETAILERS[name]) return RETAILERS[name];
  const target = normalizeKey(name);
  for (const [key, build] of Object.entries(RETAILERS)) {
    if (normalizeKey(key) === target) return build;
  }
  return null;
}

// Build a search URL for the given retailer + query. Returns null if the
// retailer isn't in the roster or the query is empty — callers should skip
// rendering a link in that case.
export function buildShopUrl({
  retailer,
  query,
}: {
  retailer: string;
  query: string;
}): string | null {
  if (typeof retailer !== "string" || typeof query !== "string") return null;
  const build = findRetailer(retailer);
  if (!build) return null;
  const trimmed = query.trim();
  if (!trimmed) return null;
  return build(trimmed);
}
