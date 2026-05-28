// Shared art + renderer for the Perene PWA app icon.
//
// Mark: a hand-lettered, calligraphic capital "P" — broad-nib thick-to-thin
// weight, a generous crescent bowl, and a signature left-swooping curled tail,
// with a gentle italic lean. Cream (#F5F1E8) on a full-bleed forest (#2A3D2E)
// field. Drawn as filled SVG contours (so the stroke can swell thick-to-thin
// like a pen, which a constant-width stroke can't) and rasterized to PNG by
// next/og (Satori + resvg) via an <img> data URI, so it stays crisp at every
// size.

import { ImageResponse } from "next/og";
import { createElement as h } from "react";

const FOREST = "#2A3D2E";
const CREAM = "#F5F1E8";

export const ICON_SIZES = [152, 180, 192, 512];

// The P glyph. The viewBox frames it at ~65% with margin; the italic skew and
// the two filled contours (stem + swooping tail, then the crescent bowl) are
// the approved artwork — do not alter without re-previewing.
function pSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="8 24 176 176" width="200" height="200">
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
  </g>
</svg>`;
}

// maskable=true insets the P (extra forest padding) so Android's circular
// adaptive-icon crop never clips the bowl or tail. The artwork is unchanged —
// only the surrounding margin grows.
export function renderIcon({ size, maskable = false }) {
  const src = `data:image/svg+xml;base64,${Buffer.from(pSvg()).toString("base64")}`;
  const px = maskable ? Math.round(size * 0.82) : size;

  return new ImageResponse(
    h(
      "div",
      {
        style: {
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: FOREST,
        },
      },
      h("img", { src, width: px, height: px, alt: "" })
    ),
    { width: size, height: size }
  );
}
