// Brand PWA icons ("any" purpose) — the Perene calligraphic "P" monogram,
// generated with next/og so we don't commit binary PNGs. One parameterized
// route serves every size the manifest + iOS need:
//   /icons/192  /icons/512   → manifest (Android / Chrome install)
//   /icons/152  /icons/180   → apple-touch-icon (iOS home screen)
// The art lives in lib/pwa-icon.js. Maskable variants (extra padding for
// Android's circular crop) are served by /icons/maskable. generateStaticParams
// pre-renders all four at build time.

import { ICON_SIZES, renderIcon } from "@/lib/pwa-icon";

export function generateStaticParams() {
  return ICON_SIZES.map((s) => ({ size: String(s) }));
}

export async function GET(_request, { params }) {
  const { size: raw } = await params;
  const n = Number(raw);
  const size = ICON_SIZES.includes(n) ? n : 192;
  return renderIcon({ size, maskable: false });
}
