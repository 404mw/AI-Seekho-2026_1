# Implementation Plan — Frontend Overview

## Phase Dependency Map

```
01_structure ──┐
               ▼
          02_auth ──────────┐
                            ▼
                     03_api_layer
                            │
                            ▼
                   06_shared_components        ← build before screens
                            │
               ┌────────────┴────────────┐
               ▼                         ▼
      04_customer_screens       05_provider_screens
```

## Phase Summary

| # | File | Creates | Prerequisite | Status |
|---|------|---------|--------------|--------|
| 01 | `01_structure.md` | Expo project init, deps, tsconfig paths, directory tree, tokens | None | ✅ DONE |
| 02 | `02_auth.md` | Supabase client, AuthContext, ModeContext, root layout gate, sign-in/sign-up screens | 01 | ⏳ TODO |
| 03 | `03_api_layer.md` | `lib/api.ts`, `lib/types.ts`, `hooks/use-poll.ts`, all domain hooks | 02 | ⏳ TODO |
| 06 | `06_shared_components.md` | 5 UI components, 3 form components — built and verified before any screen | 03 | ⏳ TODO |
| 04 | `04_customer_screens.md` | All customer route files (compose from Phase 06 components) | 06 | ⏳ TODO |
| 05 | `05_provider_screens.md` | All provider route files (compose from Phase 06 components) | 06 | ⏳ TODO |

**Why 06 before 04/05:** Component-first approach — screens are pure compositions. Building components first forces clean prop interfaces, isolates UI from data, and means screens are thin by construction.

## Total File Count

| Category | Count |
|---|---|
| Route files (`app/`) | 22 |
| Components (`components/`) | 8 |
| Hooks (`hooks/`) | 6 |
| Context (`context/`) | 2 |
| Lib (`lib/`) | 3 |
| Constants (`constants/`) | 3 (`config.ts`, `colors.ts`, `tokens.ts`) |
| Config (`app.json`, `tsconfig.json`, `.env.local`) | 3 |
| **Total** | **~47** |

## Key Design Decisions

| Decision | Choice | Why |
|---|---|---|
| Build order | Components before screens | Screens are compositions; clean prop interfaces emerge naturally |
| Theme | White/light theme, explicit static values | Predictable, premium look; no PlatformColor adaptive behavior until dark mode is scoped |
| Design tokens | `constants/tokens.ts` + `constants/colors.ts` | No magic numbers anywhere — all spacing, color, radius, shadow, typography from tokens |
| Tab implementation | `<Tabs>` from `expo-router` | Cross-platform Android bottom nav bar |
| HTTP client | Raw `fetch` in `lib/api.ts` | No axios — small bundle |
| Polling | `use-poll.ts` with `setInterval` | Simple, no WebSocket needed |
| Mode storage | `expo-secure-store` | Same store as Supabase tokens |
| Styling | Inline styles + token imports | Apple HIG, no library overhead |
| Icons | `Ionicons` from `@expo/vector-icons` | Cross-platform, ships with Expo, no extra install, no SVG dep |
| Color palette | Desaturated iOS system colors | No neon; premium on white background |
| Safe area | `contentInsetAdjustmentBehavior="automatic"` | Smarter than SafeAreaView |
| Auth | Supabase SDK only | No custom auth routes on backend |

## Running the App

```bash
cd frontend
npx expo start   # scan QR with Expo Go — no custom build needed
```

## Environment Variables

```bash
# frontend/.env.local  (never committed — .gitignore covers *.local)
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
EXPO_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
```

## Rules

| Rule | Requirement | Phases |
|---|---|---|
| R1 Component-first | Build and verify components in isolation before building any screen that uses them | 06 before 04/05 |
| R2 Token-only styling | Every color, spacing, radius, shadow, and typography value must come from `@/constants/colors` or `@/constants/tokens`. Zero magic numbers. | All |
| R3 White theme | Use explicit static color values from `@/constants/colors`. No `PlatformColor` until dark mode is explicitly scoped. | All |
| R4 No neon colors | No fully-saturated electric colors (`#00FF00`, `#FF00FF`, `#00FFFF`, etc.). If it glows on a dark background, it is forbidden. | All |
| R5 Ionicons only, no SVGs | Use `Ionicons` from `@expo/vector-icons` for every icon. Never install `react-native-svg` or `lucide-react-native`. No `.svg` files. Never use `expo-image` for icons. | All |
| R6 Routes only in `app/` | Never co-locate components, hooks, or types in `app/` | All |
| R7 Kebab-case filenames | `progress-tracker.tsx` not `ProgressTracker.tsx` | All |
| R8 No legacy RN modules | No `SafeAreaView`/`AsyncStorage`/`Picker` from RN core | All |
| R9 ScrollView first | Every Stack route's first child is `<ScrollView contentInsetAdjustmentBehavior="automatic">` | 04, 05 |
| R10 No hardcoded URLs/keys | `.env.local` only | 02, 03 |
| R11 Premium UI defaults | Generous spacing (`spacing.xl`/`xxl` between sections), `radius.card` + `borderCurve:'continuous'` on cards, `shadows.card` on elevated surfaces | 04–06 |
