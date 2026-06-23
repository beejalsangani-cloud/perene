// Discover inspiration feed. Native mirror of the web's query-building logic in
// apps/web/app/components/InspirationFeed.js — personalize the Unsplash search
// from the user's quiz answers, fanning out one query per typical occasion and
// pooling the results. Hits the same public /api/inspiration proxy the web uses.
import type { StyleProfile } from "@perene/shared";
import { apiGet } from "./api";

export interface Photo {
  id: string;
  url: string;
  thumb: string;
  alt: string;
  credit: string;
  profileUrl: string;
  color: string;
}

interface InspirationResponse {
  photos?: Photo[];
  total?: number;
}

const PHOTOS_PER_PAGE = 12;

// gender → Unsplash keyword (null = no keyword, e.g. "Prefer not to say").
function genderTerm(g?: string | null): string | null {
  if (g === "Man") return "menswear";
  if (g === "Woman") return "womenswear";
  if (g === "Non-binary") return "androgynous fashion";
  return null;
}

// One Unsplash query string from gender + up to 2 style descriptors + occasion.
function buildOccasionQuery(
  profile: StyleProfile | null | undefined,
  occasion: string | null
): string {
  const parts = [
    genderTerm(profile?.gender),
    ...(profile?.style_descriptors ?? []).slice(0, 2),
    occasion ?? "editorial",
  ].filter(Boolean);
  return parts.join(" ") + " outfit";
}

// Distribute `total` items across `n` buckets as evenly as possible.
function planQuotas(total: number, n: number): number[] {
  if (n <= 0) return [];
  const base = Math.floor(total / n);
  const extra = total % n;
  return Array.from({ length: n }, (_, i) => base + (i < extra ? 1 : 0));
}

// Fisher-Yates, in place.
function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function fetchQuery(q: string, page: number): Promise<Photo[]> {
  const data = await apiGet<InspirationResponse>(
    `/api/inspiration?q=${encodeURIComponent(q)}&page=${page}`
  );
  return data.photos ?? [];
}

// Stable signature of the profile fields that affect the feed — used to key the
// React Query cache so the feed refetches when the user edits their profile.
export function inspirationSignature(
  profile: StyleProfile | null | undefined
): string {
  return JSON.stringify({
    g: profile?.gender ?? null,
    s: profile?.style_descriptors ?? [],
    e: profile?.typical_events ?? [],
  });
}

// Fetch one page of inspiration. With occasions on the profile, fan out one
// query per occasion in parallel and pool the results (quota-balanced pick,
// gap-fill from surplus buckets, dedupe by id, shuffle so occasions interleave).
// Without occasions, a single generic query — same behaviour as the web feed.
export async function fetchInspirationPage(
  profile: StyleProfile | null | undefined,
  page: number
): Promise<Photo[]> {
  const events = profile?.typical_events ?? [];

  if (events.length === 0) {
    try {
      return await fetchQuery(buildOccasionQuery(profile, null), page);
    } catch (err) {
      console.error("[inspiration] generic query failed:", err);
      return [];
    }
  }

  const buckets = await Promise.all(
    events.map(async (occasion) => {
      try {
        return await fetchQuery(buildOccasionQuery(profile, occasion), page);
      } catch (err) {
        console.error(`[inspiration] failed for occasion "${occasion}":`, err);
        return [];
      }
    })
  );

  const quotas = planQuotas(PHOTOS_PER_PAGE, events.length);
  const picked: Photo[] = [];
  for (let i = 0; i < buckets.length; i++) {
    picked.push(...buckets[i].slice(0, quotas[i]));
  }
  let shortfall = PHOTOS_PER_PAGE - picked.length;
  for (let i = 0; i < buckets.length && shortfall > 0; i++) {
    const leftover = buckets[i].slice(quotas[i]);
    const take = Math.min(shortfall, leftover.length);
    picked.push(...leftover.slice(0, take));
    shortfall -= take;
  }

  const seen = new Set<string>();
  const deduped = picked.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));
  return shuffleInPlace(deduped);
}
