// Generates the native app's icon / adaptive-icon / splash PNGs from the same
// Perene "P" monogram used by the web PWA icons (apps/web/lib/pwa-icon.js). The
// glyph path data below is copied verbatim from that file — keep the two in sync
// if the artwork ever changes. We rasterize with sharp (hoisted to the repo-root
// node_modules) so there's no runtime dependency and no committed binaries to
// hand-edit: re-run `node scripts/generate-app-assets.mjs` to regenerate.
//
// Outputs (written to apps/mobile/assets/):
//   icon.png          1024×1024  full-bleed forest, cream P — App Store + iOS
//   adaptive-icon.png 1024×1024  P inset 82% for Android's circular crop
//   splash.png        1200×1200  transparent, centered cream P (forest comes
//                                from the expo-splash-screen backgroundColor)
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdir } from "node:fs/promises";

const FOREST = "#2A3D2E";
const CREAM = "#F5F1E8";

// The P glyph — two filled contours (stem + swooping tail, then crescent bowl),
// framed by the viewBox "8 24 176 176" with a gentle italic skew. Verbatim from
// apps/web/lib/pwa-icon.js:pSvg().
const P_PATHS = `
  <g transform="translate(8 0) skewX(-6)" fill="${CREAM}">
    <path d="M88 49
             C93 50 96 58 95 70
             C95 100 92 126 89 150
             C86 163 73 171 60 170
             C53 169 49 165 50 160
             C54 167 63 165 71 158
             C75 128 76 92 80 64
             C81 55 84 50 88 49
             Z"/>
    <path d="M92 58
             C120 52 147 68 146 93
             C145 114 124 125 92 121
             C112 117 127 105 126 92
             C125 74 112 63 92 67
             Z"/>
  </g>`;

// Base frame of the glyph viewBox (from pwa-icon.js).
const VB = { x: 8, y: 24, w: 176, h: 176 };

// Build an SVG at `size`px. `pad` (0–1) shrinks the glyph toward the center by
// expanding the viewBox — 0 fills the frame (icon), ~0.18 insets it (adaptive).
// `bg` null → transparent (splash); otherwise a solid fill (icon).
function buildSvg({ size, pad = 0, bg = FOREST }) {
  const grow = VB.w * (pad / (1 - pad));
  const half = grow / 2;
  const vb = `${VB.x - half} ${VB.y - half} ${VB.w + grow} ${VB.h + grow}`;
  const rect = bg
    ? `<rect x="${VB.x - half}" y="${VB.y - half}" width="${VB.w + grow}" height="${VB.h + grow}" fill="${bg}"/>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${vb}">${rect}${P_PATHS}</svg>`;
}

async function render(svg, outPath, { flatten = false } = {}) {
  // Apple rejects a marketing icon with an alpha channel, so opaque icons are
  // flattened onto forest (removes alpha); the splash keeps its transparency.
  let pipe = sharp(Buffer.from(svg));
  if (flatten) pipe = pipe.flatten({ background: FOREST });
  await pipe.png().toFile(outPath);
  console.log("  ✓", outPath.split(/[\\/]/).slice(-2).join("/"));
}

async function main() {
  const assetsDir = join(dirname(fileURLToPath(import.meta.url)), "..", "assets");
  await mkdir(assetsDir, { recursive: true });
  console.log("Generating app assets →", assetsDir);

  await render(buildSvg({ size: 1024, pad: 0, bg: FOREST }), join(assetsDir, "icon.png"), { flatten: true });
  await render(buildSvg({ size: 1024, pad: 0.18, bg: FOREST }), join(assetsDir, "adaptive-icon.png"), { flatten: true });
  // Splash: transparent, glyph inset ~40% so it reads as a small centered logo
  // against the forest splash backgroundColor.
  await render(buildSvg({ size: 1200, pad: 0.4, bg: null }), join(assetsDir, "splash.png"));

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
