# Phase 01 — Project Structure

## Goal
Initialize the Expo project, install all dependencies, configure TypeScript path aliases, and create the full empty directory tree so every subsequent phase has a place to write files.

---

## Step 1 — Create Expo Project

Run from the repo root (`g:\Hackathons\Google_Antigravity_hackathon`):

```bash
npx create-expo-app@latest frontend --template blank-typescript
cd frontend
```

This scaffolds: `app.json`, `tsconfig.json`, `package.json`, `app/index.tsx`, `App.tsx` (ignore — Expo Router replaces it).

---

## Step 2 — Install Dependencies

```bash
# Routing (Expo Router is already included; install peer deps)
npx expo install expo-router react-native-safe-area-context react-native-screens \
  expo-linking expo-constants expo-status-bar

# Auth + Storage
npx expo install @supabase/supabase-js expo-secure-store

# UI + Media
npx expo install expo-image expo-haptics expo-blur

# Animations
npx expo install react-native-reanimated react-native-gesture-handler

# Native Tabs (unstable but stable enough for production use on Expo SDK 53)
npx expo install expo-router
# NativeTabs is bundled with expo-router — no separate install needed
```

**package.json main field** — Expo Router requires this entry point:
```json
{
  "main": "expo-router/entry"
}
```

---

## Step 3 — Configure TypeScript Path Aliases

Replace the generated `tsconfig.json` with:

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.d.ts", "expo-env.d.ts"]
}
```

The `@/` alias maps to the `frontend/` root. Use it everywhere: `import { api } from '@/lib/api'`.

---

## Step 4 — Configure app.json

Ensure `app.json` has the Expo Router plugin and scheme (required for deep links / auth redirects):

```json
{
  "expo": {
    "name": "Seekho",
    "slug": "seekho",
    "scheme": "seekho",
    "version": "1.0.0",
    "platforms": ["ios", "android"],
    "plugins": [
      "expo-router",
      "expo-secure-store"
    ],
    "ios": {
      "bundleIdentifier": "com.seekho.app",
      "supportsTablet": false
    },
    "android": {
      "package": "com.seekho.app"
    }
  }
}
```

---

## Step 5 — Create .env.local

```bash
# frontend/.env.local  — NEVER commit this file
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
EXPO_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
```

Add to `.gitignore`:
```
.env.local
.env
```

---

## Step 6 — Scaffold Empty Directory Tree

Create these empty directories (add a `.gitkeep` in each leaf that has no files yet):

```
frontend/
  app/
    (auth)/
    (customer)/
      (home)/
      (requests)/
      (bookings)/
      (profile)/
    (provider)/
      (dashboard)/
      (bookings)/
      (manage)/
      (profile)/
  components/
    ui/
    forms/
  hooks/
  context/
  lib/
  constants/
```

---

## Step 7 — Create constants/config.ts

```typescript
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL!;
export const POLL_INTERVAL_MS = 2000;
export const POLL_TIMEOUT_MS = 120_000;
```

---

## Step 8 — Create constants/colors.ts

```typescript
import { PlatformColor } from 'react-native';

export const colors = {
  label: PlatformColor('label'),
  secondaryLabel: PlatformColor('secondaryLabel'),
  tertiaryLabel: PlatformColor('tertiaryLabel'),
  systemBackground: PlatformColor('systemBackground'),
  secondarySystemBackground: PlatformColor('secondarySystemBackground'),
  tertiarySystemBackground: PlatformColor('tertiarySystemBackground'),
  separator: PlatformColor('separator'),
  systemBlue: PlatformColor('systemBlue'),
  systemGreen: PlatformColor('systemGreen'),
  systemRed: PlatformColor('systemRed'),
  systemOrange: PlatformColor('systemOrange'),
  systemGray: PlatformColor('systemGray'),
};
```

---

## Verification

```bash
cd frontend
npx expo start
```

Expo should start the dev server with no errors. The app may show a blank screen or the default index — that is expected. Phase 02 will replace it.

## Files Created This Phase

| File | Purpose |
|---|---|
| `package.json` | Dependencies + `"main": "expo-router/entry"` |
| `tsconfig.json` | Strict mode + `@/` path alias |
| `app.json` | Expo config with Router plugin + scheme |
| `.env.local` | Secrets (not committed) |
| `constants/config.ts` | API URL + poll config |
| `constants/colors.ts` | PlatformColor semantic tokens |
| All empty directories | Scaffolded for subsequent phases |
