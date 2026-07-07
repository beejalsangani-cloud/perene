# App Store submission kit

Everything needed for Perene's first App Store / TestFlight submission lives here.

| File | What it is |
| --- | --- |
| `../assets/icon.png` | 1024×1024 App Store + iOS app icon (no alpha) |
| `../assets/adaptive-icon.png` | 1024×1024 Android adaptive foreground |
| `../assets/splash.png` | Launch splash logo (transparent, on forest bg) |
| `screenshots.md` | Exact spec + shot list for the 6.7" screenshots you need to take |
| `listing-copy.md` | Draft name / subtitle / description / keywords / promo text |

## Regenerating the icon & splash

The icon/splash are generated from the Perene **P** monogram (shared with the web
PWA icon, `apps/web/lib/pwa-icon.js`). To regenerate after an art change:

```bash
cd apps/mobile
node scripts/generate-app-assets.mjs
```

They're wired into `app.json` (`icon`, `android.adaptiveIcon`, and the
`expo-splash-screen` plugin), so EAS Build picks them up automatically.
