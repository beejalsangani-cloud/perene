# EAS Build → TestFlight — step by step

`eas.json` is configured for a production iOS build (`build.production`) with a
matching `submit.production` profile. The steps below need **your** Apple / Expo
login, so they're not automated — run them from `apps/mobile`.

## 0. One-time: login + link the project

```bash
cd apps/mobile
npx eas login          # your Expo account (you do this part)
npx eas init           # creates/links the EAS project, writes projectId into app.json
```

`eas init` replaces `extra.eas.projectId` in `app.json` (currently the
`REPLACE_WITH_EAS_PROJECT_ID` placeholder) with the real id. **That id is also
what the push-token registration reads at runtime** (`lib/push.ts`), so push
notifications won't mint a token until this is done. Commit the app.json change
afterward.

## 1. Configure push credentials (APNs)

For iOS push to work in the build:

```bash
npx eas credentials        # → iOS → Push Notifications → set up a Push Key
```

EAS can generate and upload the APNs key for you if you grant App Store Connect
access. (Not needed just to *build*, but needed before notifications will deliver.)

## 2. Production build

```bash
npx eas build --platform ios --profile production
```

- First run prompts to create the iOS **Distribution certificate** and
  **provisioning profile** — let EAS manage them (answer yes).
- `autoIncrement` + `appVersionSource: remote` means EAS owns the build number, so
  you never bump it by hand.
- Bundle id is `com.perene.app` (from `app.json`). It must match (or be created in)
  your Apple Developer account.

## 3. Submit to TestFlight

```bash
npx eas submit --platform ios --profile production --latest
```

- Fill `submit.production.ios.ascAppId` in `eas.json` with your App Store Connect
  **App ID** (the numeric id, not the bundle id), or let `eas submit` prompt you.
- Requires the app record to already exist in App Store Connect (create it once at
  appstoreconnect.apple.com → Apps → +).
- After upload, the build shows up in TestFlight in ~5–15 min once Apple finishes
  processing.

## Pre-submission checklist (blockers)

- [ ] `eas init` run, real `projectId` committed in `app.json`.
- [ ] Bundle id `com.perene.app` registered in Apple Developer.
- [ ] App record created in App Store Connect; `ascAppId` set.
- [ ] APNs push key configured (`eas credentials`) — for notifications to deliver.
- [ ] **Legal pages live**: `myperene.com/terms`, `/privacy`, `/support` must
      resolve — the paywall links to `/terms` + `/privacy` and Apple checks them.
      (These are still placeholders in `paywall.tsx` / listing copy.)
- [ ] Run the `device_push_tokens` migration (bottom of
      `apps/web/supabase/schema.sql`) in the Supabase SQL editor.
- [ ] Deploy the web `/api/push/device-token` and `/api/account/delete` routes to
      production (myperene.com).
- [ ] Screenshots taken per `screenshots.md`; listing copy finalized from
      `listing-copy.md`.
