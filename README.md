# Perene — monorepo

AI personal stylist. npm-workspaces monorepo.

```
apps/
  web/        Next.js app + the /api/* routes (the backend for both surfaces)
  mobile/     Expo / React Native iOS app
packages/
  shared/     brand tokens, wardrobe constants, shared TypeScript types
```

## Why this shape

The Next.js API routes in `apps/web/app/api` are the single backend. The native
app does not reimplement any Claude prompting, background removal, weather, or
affiliate logic — it calls those same routes over HTTP with a Supabase Bearer
token. Only platform-agnostic values (constants, types) live in
`packages/shared`; both surfaces import them.

## Setup

```bash
npm install            # installs all workspaces from the root
```

- Web: `npm run web` (→ `apps/web` dev server). See `apps/web/README.md`.
- Mobile: `npm run mobile` (→ Expo). See `apps/mobile/README.md`.

## Deploy notes

- **Vercel:** set the project's **Root Directory** to `apps/web`. The build
  command and output stay the default Next.js values.
- Each app keeps its own `.env.local` (web: server keys; mobile: `EXPO_PUBLIC_*`).
