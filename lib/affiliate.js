// ────────────────────────────────────────────────────────────────────────────
// Affiliate-link configuration
// ────────────────────────────────────────────────────────────────────────────
//
// Strategy: build well-formed search URLs for each retailer, then wrap them
// through the affiliate network the retailer is registered with. All tag
// values below are intentionally empty — fill them in once Perene has been
// approved into each network. Until then `buildShopUrl()` returns the bare
// search URL (passthrough), so links work today and silently start earning
// commission the moment the relevant fields are populated.

/**
 * @typedef {"rakuten"|"awin"|"shareasale"|"cj"|"direct"} AffiliateNetwork
 */

/**
 * @typedef {Object} Retailer
 * @property {string}                    name            Display name
 * @property {string}                    descriptor      Aesthetic + price-band line shown to the AI when ranking
 * @property {AffiliateNetwork}          network         Network this retailer is registered on
 * @property {string}                    merchantId      Network-assigned merchant/advertiser ID — empty until joined
 * @property {(query: string) => string} buildSearchUrl  Bare search URL builder (no affiliate wrapping)
 */

/**
 * @typedef {Object} RetailerSuggestion
 * @property {string} name          Must match a key in {@link RETAILERS}
 * @property {string} search_query  2–6 keywords from the AI
 */

// ── rel attribute (single source of truth for outbound retailer links) ─────
export const OUTBOUND_LINK_REL = "sponsored noopener noreferrer";

// ── Network credentials (fill these in once approved into each network) ────
const NETWORK_CONFIG = {
  rakuten: {
    // Rakuten Advertising publisher ID — the "id" parameter on linksynergy
    // deep-links. Sign up at https://rakutenadvertising.com, then grab it
    // from the deep-link generator in the dashboard.
    affiliateId: "",
  },
  awin: {
    // Awin publisher ID — used as "awinaffid" in cread.php links. Sign up
    // at https://www.awin.com and find it under Account → Overview.
    publisherId: "",
  },
  shareasale: {
    // ShareASale affiliate user ID — used as "u" in r.cfm links. Sign up
    // at https://www.shareasale.com, then My Account → Account Information.
    affiliateId: "",
  },
  cj: {
    // CJ Affiliate (Commission Junction) publisher ID — the first segment
    // of the click-PID-AID path. Sign up at https://www.cj.com, then find
    // it in the dashboard header.
    publisherId: "",
  },
};

// ── Retailer roster ────────────────────────────────────────────────────────
// URL patterns last checked 2026-05-01 by fetching each candidate URL with
// realistic browser headers and inspecting the returned HTML for product-card
// markers, canonical <link> tags, and price indicators. Retailers that sit
// behind Akamai/Cloudflare and 403 every probe are flagged MANUALLY VERIFY
// — they keep the most plausible pattern based on industry conventions.
// Re-verify yearly.

// Slugify a free-form query into a kebab-case URL segment.
// Used by Revolve, whose search URLs are path-based (/v/{slug}), not query-based.
function kebab(q) {
  const slug = q
    .normalize("NFD")
    .replace(/\p{Mn}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug;
}

/** @type {Record<string, Retailer>} */
export const RETAILERS = {
  Nordstrom: {
    name:           "Nordstrom",
    descriptor:     "broad department store, $50–$1000, mainstream-to-luxury",
    network:        "rakuten", // Network: Rakuten Advertising
    merchantId:     "",        // Rakuten MID for Nordstrom
    // Probed 2026-05-01: returns Akamai JS challenge (200, empty-title HTML
    // with bot-detection script) so automation can't see real results.
    // Pattern is documented as Nordstrom's canonical search URL and was
    // confirmed working in a real browser — keeping as-is.
    buildSearchUrl: (q) => `https://www.nordstrom.com/sr?keyword=${encodeURIComponent(q)}`,
  },
  ASOS: {
    name:           "ASOS",
    descriptor:     "trend-forward fast fashion, $20–$200, youthful/streetwear",
    network:        "awin", // Network: Awin
    merchantId:     "",     // Awin advertiser ID for ASOS US
    // Verified 2026-05-01: 200 OK with title "Search: black sandal - page 1
    // of 11 | ASOS" and 296 $-price tags rendered in HTML.
    buildSearchUrl: (q) => `https://www.asos.com/us/search/?q=${encodeURIComponent(q)}`,
  },
  "Net-a-Porter": {
    name:           "Net-a-Porter",
    descriptor:     "luxury designer, $300–$5000, elevated/investment pieces",
    network:        "rakuten", // Network: Rakuten Advertising
    merchantId:     "",        // Rakuten MID for Net-a-Porter
    // MANUALLY VERIFY 2026-05-01: 403 from every probe — fully bot-blocked.
    // The alternate path /en-us/search?q= returned 404 (route doesn't
    // exist), so /shop/search?keywords= is still the active pattern.
    // Confirm in a browser:
    //   https://www.net-a-porter.com/en-us/shop/search?keywords=black+sandal
    buildSearchUrl: (q) => `https://www.net-a-porter.com/en-us/shop/search?keywords=${encodeURIComponent(q)}`,
  },
  Revolve: {
    name:           "Revolve",
    descriptor:     "contemporary trend, $80–$500, going-out/influencer",
    network:        "rakuten", // Network: Rakuten Advertising
    merchantId:     "",        // Rakuten MID for Revolve
    // Verified 2026-05-01: Revolve uses /v/{kebab-case-keywords} as its
    // canonical search URL — both /search?q= and /search?keywords= now
    // 404, and /r/Search.jsp times out. Probed /v/wool-blazer (200,
    // canonical confirmed), /v/black-sandal (302 → /v/black-thong-sandals,
    // 200, 9 cart-button markers, 13 prices). Revolve's URL handler does
    // fuzzy redirects so even unmatched slugs land on a related page.
    buildSearchUrl: (q) => {
      const slug = kebab(q);
      return slug
        ? `https://www.revolve.com/v/${slug}`
        : "https://www.revolve.com/";
    },
  },
  "Saks Fifth Avenue": {
    name:           "Saks Fifth Avenue",
    descriptor:     "luxury department store, $200–$5000, polished/classic",
    network:        "rakuten", // Network: Rakuten Advertising
    merchantId:     "",        // Rakuten MID for Saks Fifth Avenue
    // MANUALLY VERIFY 2026-05-01: 403 fully blocked on /search?q= and
    // /find?q=. Salesforce Commerce Cloud convention is /search?q=, which
    // is what Saks runs on. Confirm in a browser:
    //   https://www.saksfifthavenue.com/search?q=black+sandal
    buildSearchUrl: (q) => `https://www.saksfifthavenue.com/search?q=${encodeURIComponent(q)}`,
  },
  Anthropologie: {
    name:           "Anthropologie",
    descriptor:     "bohemian-eclectic, $80–$400, romantic/textured",
    network:        "rakuten", // Network: Rakuten Advertising
    merchantId:     "",        // Rakuten MID for Anthropologie (URBN)
    // Verified 2026-05-01: 200 OK with canonical
    // <link rel="canonical" href="…/search?q=black%20sandal">, 764 prices,
    // 4 cart-button markers in HTML.
    buildSearchUrl: (q) => `https://www.anthropologie.com/search?q=${encodeURIComponent(q)}`,
  },
  "Free People": {
    name:           "Free People",
    descriptor:     "boho-festival, $50–$300, relaxed/earthy",
    network:        "rakuten", // Network: Rakuten Advertising
    merchantId:     "",        // Rakuten MID for Free People (URBN)
    // Verified 2026-05-01: 200 OK with canonical
    // <link rel="canonical" href="…/search/?q=black%20sandal">, 514 prices,
    // 8 cart-button markers. Browser follows a single 301 to the canonical
    // (trailing slash) — harmless.
    buildSearchUrl: (q) => `https://www.freepeople.com/search?q=${encodeURIComponent(q)}`,
  },
  // ── DISABLED 2026-05-11: SPA architecture means search URLs return 200 even
  // for no-results pages. Server-side validator cannot detect this. Re-enable
  // when we add headless-browser validation.
  /*
  Mejuri: {
    name:           "Mejuri",
    descriptor:     "minimalist demi-fine jewelry only, $50–$500",
    network:        "shareasale", // Network: ShareASale
    merchantId:     "",           // ShareASale merchant ID for Mejuri
    // Verified 2026-05-01: 200 OK with canonical
    // <link rel="canonical" href="https://mejuri.com/search">, page title
    // "Mejuri | Search". Mejuri is a JS-rendered SPA so curl sees the
    // search-page shell rather than rendered product cards. The /search?q=
    // pattern is correct (matches Shopify default + Mejuri's own canonical).
    // Sandals returned no products because Mejuri sells jewelry only;
    // category-relevant queries (e.g. "gold ring") will return results.
    buildSearchUrl: (q) => `https://mejuri.com/search?q=${encodeURIComponent(q)}`,
  },
  */
  Reformation: {
    name:           "Reformation",
    descriptor:     "elevated feminine, sustainable, occasion + dresses, $100–$500",
    network:        "direct", // Affiliate: direct program at thereformation.com/ref-affiliates.html OR Skimlinks
    merchantId:     "",       // Direct/Skimlinks: no merchant ID required (passthrough wrap)
    // Verified 2026-05-04: /search?query={q} returns 200 with title
    // "Search Results | Reformation" and real product cards (e.g. "wool
    // blazer" → 234 $-price tags, "black dress" → 4,098 items). Confirmed
    // pattern works for both matching and unmatched queries (graceful
    // empty-state, no homepage redirect). The alternate ?q= silently
    // 301s into category pages when the query happens to match a slug —
    // ?query= is the canonical, query-agnostic search endpoint. US is
    // the default locale (no /us-en path).
    buildSearchUrl: (q) => `https://www.thereformation.com/search?query=${encodeURIComponent(q)}`,
  },
  // ── DISABLED 2026-05-11: SPA architecture means search URLs return 200 even
  // for no-results pages. Server-side validator cannot detect this. Re-enable
  // when we add headless-browser validation.
  /*
  "Sézane": {
    name:           "Sézane",
    descriptor:     "Parisian minimalist, $80–$400, timeless/understated",
    network:        "awin", // Network: Awin
    merchantId:     "",     // Awin advertiser ID for Sézane
    // Verified 2026-05-01: 200 OK. Pattern is confirmed by Sézane's own
    // apple-itunes-app meta tag in the rendered HTML:
    //   <meta name="apple-itunes-app"
    //         content="…app-argument=https://www.sezane.com/en-en/search?q=…">
    // Sézane uses doubled language-region locales (en-en, fr-fr); /en-us
    // and /en redirect away from the search route, so /en-en is the
    // correct international-English locale. Search results are JS-rendered
    // inside <div data-search-results-container>.
    buildSearchUrl: (q) => `https://www.sezane.com/en-en/search?q=${encodeURIComponent(q)}`,
  },
  */
  Aritzia: {
    name:           "Aritzia",
    descriptor:     "elevated contemporary basics, $50–$400, polished/minimal",
    network:        "rakuten", // Network: Rakuten Advertising
    merchantId:     "",        // Rakuten MID for Aritzia
    // Verified 2026-05-01: 200 OK with 1.4MB response from a Mobify
    // (Salesforce Commerce Cloud) SPA. Title is the SPA shell ("search"),
    // product cards load post-render in JS — curl can't see them but the
    // route resolves correctly. /us/en/search?q= matches their locale
    // structure. (Recommend a browser spot-check before launch.)
    buildSearchUrl: (q) => `https://www.aritzia.com/us/en/search?q=${encodeURIComponent(q)}`,
  },
};

// Convenience exports for the AI prompt builder — keeps the prompt and the
// retailer roster in lock-step (change a descriptor here, prompt updates).
export const RETAILER_NAMES = Object.keys(RETAILERS);
export const RETAILER_PROMPT_LINES = RETAILER_NAMES.map(
  (name) => `- ${name} — ${RETAILERS[name].descriptor}`
);

// ── Lookup ─────────────────────────────────────────────────────────────────
function normalizeKey(s) {
  return s.normalize("NFD").replace(/\p{Mn}/gu, "").toLowerCase().trim();
}

/**
 * Resolve a retailer by name. Falls back to case- and accent-insensitive
 * match so lowercased or accent-stripped input still resolves to its
 * canonical roster key.
 *
 * @param {string} name
 * @returns {Retailer|null}
 */
export function findRetailer(name) {
  if (typeof name !== "string") return null;
  if (RETAILERS[name]) return RETAILERS[name];
  const target = normalizeKey(name);
  for (const [key, retailer] of Object.entries(RETAILERS)) {
    if (normalizeKey(key) === target) return retailer;
  }
  return null;
}

// ── Network wrappers ───────────────────────────────────────────────────────
function wrapWithNetwork(retailer, bareUrl) {
  switch (retailer.network) {
    case "rakuten": {
      const { affiliateId } = NETWORK_CONFIG.rakuten;
      if (!affiliateId || !retailer.merchantId) return bareUrl;
      return `https://click.linksynergy.com/deeplink?id=${affiliateId}&mid=${retailer.merchantId}&murl=${encodeURIComponent(bareUrl)}`;
    }
    case "awin": {
      const { publisherId } = NETWORK_CONFIG.awin;
      if (!publisherId || !retailer.merchantId) return bareUrl;
      return `https://www.awin1.com/cread.php?awinmid=${retailer.merchantId}&awinaffid=${publisherId}&p=${encodeURIComponent(bareUrl)}`;
    }
    case "shareasale": {
      const { affiliateId } = NETWORK_CONFIG.shareasale;
      if (!affiliateId || !retailer.merchantId) return bareUrl;
      return `https://shareasale.com/r.cfm?u=${affiliateId}&m=${retailer.merchantId}&urllink=${encodeURIComponent(bareUrl)}`;
    }
    case "cj": {
      const { publisherId } = NETWORK_CONFIG.cj;
      if (!publisherId || !retailer.merchantId) return bareUrl;
      return `https://www.anrdoezrs.net/click-${publisherId}-${retailer.merchantId}?url=${encodeURIComponent(bareUrl)}`;
    }
    case "direct":
    default:
      return bareUrl;
  }
}

// ── Public API ─────────────────────────────────────────────────────────────
/**
 * Build an affiliate-wrapped search URL for the given retailer.
 * Returns null if the retailer isn't in the roster or the query is empty.
 *
 * @param {{ retailer: string, query: string }} args
 * @returns {string|null}
 */
export function buildShopUrl({ retailer, query }) {
  if (typeof retailer !== "string" || typeof query !== "string") return null;
  const config = findRetailer(retailer);
  if (!config) return null;
  const trimmed = query.trim();
  if (!trimmed) return null;
  return wrapWithNetwork(config, config.buildSearchUrl(trimmed));
}
