# Perene — iOS (Expo / React Native)

Native app for Perene. Shares types + constants with the web app via
`@perene/shared` and calls the same Next.js `/api/*` routes (deployed with
`apps/web`) for all AI/business logic.

## Stack

- Expo SDK 54 (New Architecture) + Expo Router (file-based, typed routes)
- NativeWind v4 (Tailwind for RN) — brand palette in `tailwind.config.js`
- TanStack Query (server state) + React Context (auth)
- Supabase JS with AsyncStorage session persistence
- EAS Build + Submit for TestFlight / App Store

## First-time setup

From the **monorepo root** (`perene/`), not this folder:

```bash
npm install                 # installs all workspaces (hoisted)
cd apps/mobile
npx expo install --fix      # reconcile native dep versions to SDK 54
cp .env.example .env.local  # then fill in the values below
```

`.env.local`:

```
EXPO_PUBLIC_SUPABASE_URL=...          # same project as the web app
EXPO_PUBLIC_SUPABASE_ANON_KEY=...     # anon key (safe to ship)
EXPO_PUBLIC_API_BASE_URL=https://<your-vercel-deploy>   # the apps/web API
```

> Never put the service-role or Anthropic key here — those stay server-side in
> `apps/web`. The app only ever uses the anon key + Bearer tokens.

## Run

```bash
npm run mobile              # from repo root → expo start
# or, in apps/mobile:
npx expo start
```

Open in **Expo Go** for quick iteration. Native modules that aren't in Expo Go
(camera, secure-store, etc.) require a **development build**:

```bash
npx eas build --profile development --platform ios
```

## Build & ship

```bash
npx eas build   --profile preview    --platform ios   # TestFlight-style internal
npx eas build   --profile production --platform ios
npx eas submit  --profile production --platform ios
```

Set the EAS project id in `app.json` → `extra.eas.projectId` after running
`npx eas init` (replaces the `REPLACE_WITH_EAS_PROJECT_ID` placeholder).

## App icon / splash

Currently using a solid forest splash and Expo's default icon. Phase 5 generates
the calligraphic-P icon (from `apps/web/lib/pwa-icon.js`) at the required sizes
and wires `icon` / `splash` in `app.json`.
