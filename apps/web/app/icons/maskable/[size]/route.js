// Maskable PWA icons — the same Perene "P" with extra padding so Android's
// circular adaptive-icon crop never clips it. Referenced by the manifest's
// purpose:"maskable" entries (192 + 512).

import { renderIcon } from "@/lib/pwa-icon";

const MASKABLE_SIZES = [192, 512];

export function generateStaticParams() {
  return MASKABLE_SIZES.map((s) => ({ size: String(s) }));
}

export async function GET(_request, { params }) {
  const { size: raw } = await params;
  const n = Number(raw);
  const size = MASKABLE_SIZES.includes(n) ? n : 192;
  return renderIcon({ size, maskable: true });
}
