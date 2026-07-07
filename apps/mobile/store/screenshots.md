# App Store screenshots — 6.7" iPhone spec

## The spec (what App Store Connect requires)

- **Device class:** 6.7" Super Retina XDR (iPhone 15 Pro Max / 14 Pro Max / 16 Plus).
  This is the one **required** size — App Store Connect scales it down for smaller
  phones, so you only *have* to provide this set.
- **Exact pixel size:** **1290 × 2796 px, portrait.** (Apple also accepts
  1284 × 2778 from the 6.5"/12-13 Pro Max in this slot, but shoot **1290 × 2796**.)
- **Format:** PNG or JPEG, RGB, **flattened — no alpha/transparency**, 72 dpi.
- **Count:** 3–10 images. **Aim for 5–6.** The first 1–3 are what most people see
  without swiping, so front-load the strongest.
- **Content rules:** no rounded corners / device frame required (Apple adds none);
  status bar should look clean (full battery, no debug clutter). Use the iOS
  Simulator for a pristine status bar, or a real device.

## How to capture (fastest path)

1. Run the app in the **iPhone 15 Pro Max** simulator:
   `cd apps/mobile && npx expo start` → press `i`, then pick that simulator.
2. Simulator → **Device ▸ Trigger Screenshot** (⌘S). It saves a native-resolution
   1290 × 2796 PNG to the Desktop — already the correct size, no resizing needed.
3. Sign in with a demo account that has a **populated closet and a couple of saved
   looks** so the screens don't look empty.

## Shot list (in upload order)

Pick 5–6 of these. Order = the story you want to tell.

1. **Today's Suggestions** (`(tabs)/index.tsx`) — the daily-outfit hero. Best
   opener: it's the core value in one glance. Make sure the weather widget and both
   daytime/evening cards are populated.
2. **Outfit detail** (`outfits/[id].tsx`) — a single generated outfit with the
   styling reasoning + items. Shows the "AI stylist" depth.
3. **Discover** (`(tabs)/discover.tsx`) — the inspiration feed. Visually rich,
   communicates "browse looks."
4. **Closet** (`(tabs)/closet.tsx`) — a full grid of tagged items. Proves the
   digital-wardrobe angle. Have ~9–12 items uploaded.
5. **Style Profile** (`(tabs)/profile.tsx`) — the chips/quiz. Shows personalization.
6. **Paywall** (`paywall.tsx`) — *optional*; only include if the plans read well as
   a value summary. Skip if it feels salesy as a screenshot.

## Caption overlays (optional but recommended)

Bare screenshots convert worse than ones with a short headline band. If you want
them, add a cream (#F5F1E8) or forest (#2A3D2E) band at the top with one line in
Playfair Display, e.g.:

1. "Your outfit, planned every morning"
2. "An AI stylist that knows your closet"
3. "Endless looks to steal"
4. "Your whole wardrobe, in your pocket"
5. "Style that's actually *yours*"

Keep them consistent (same band, same font, brand colors). I can generate framed
overlays if you want — just say the word.

## Other store images you'll also be asked for

- **App icon:** already generated → `../assets/icon.png` (1024×1024). App Store
  Connect pulls this from the build; you don't upload it separately.
- **iPad screenshots:** not needed — `app.json` sets `ios.supportsTablet: false`.
- **App preview video:** optional, skip for v1.
