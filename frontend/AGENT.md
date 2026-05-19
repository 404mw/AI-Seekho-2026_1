# Summon — Frontend Working State

## Target Platform
**Android (APK).** Not iOS. Any iOS-only API is forbidden.

## Stack
- **Expo SDK 54** + **Expo Router v6** (file-based routing)
- **React 19** / **React Native 0.81.5** — New Architecture enabled
- **TypeScript** strict mode, path alias `@/` → `frontend/`
- **Supabase JS** for auth (JWT-based, SDK manages tokens via expo-secure-store)
- **`<Tabs>`** from `expo-router` — cross-platform bottom tab navigator (NOT NativeTabs)
- **`@expo/vector-icons` (Ionicons)** — cross-platform icon set, ships with Expo, no extra install
- **Reanimated 4** + **Gesture Handler** for animations
- **expo-image** for raster images only (NOT for icons — use Ionicons)
- **expo-haptics** for haptic feedback (works on Android too)
- Package manager: **npm**

## Architecture Docs
- Full architecture: `../docs/frontend_architecture.md`
- API endpoints consumed: `../docs/api_endpoints.md`

## Implementation Plan (component-first order)
| Phase | File | Status |
|---|---|---|
| 01 | `plan/frontend/01_structure.md` | ✅ DONE |
| 02 | `plan/frontend/02_auth.md` | ⏳ TODO |
| 03 | `plan/frontend/03_api_layer.md` | ⏳ TODO |
| **06** | `plan/frontend/06_shared_components.md` | ⏳ TODO — **build before screens** |
| 04 | `plan/frontend/04_customer_screens.md` | ⏳ TODO |
| 05 | `plan/frontend/05_provider_screens.md` | ⏳ TODO |

## Directory Layout
```
app/          Routes ONLY — no components, hooks, or types here
components/   Shared UI (ui/ and forms/) — built before screens
hooks/        Custom React hooks
context/      AuthContext, ModeContext
lib/          supabase.ts, api.ts, types.ts
constants/    colors.ts · tokens.ts · config.ts
```

## Design System
All styling comes from two files. Import, never hardcode.

```typescript
import { colors } from '@/constants/colors';
import { spacing, typography, radius, shadows, duration } from '@/constants/tokens';
```

**Theme: white/light first.** `colors.ts` uses explicit static values — no `PlatformColor`.

## Icon Usage Pattern
```typescript
import { Ionicons } from '@expo/vector-icons';

// In components:
<Ionicons name="sparkles-outline" size={24} color={colors.accent} />
```

Common icon names to use:
| Purpose | Ionicons name |
|---|---|
| Home / AI request | `sparkles-outline` |
| Requests / history | `time-outline` |
| Bookings | `calendar-outline` |
| Profile | `person-circle-outline` |
| Dashboard | `stats-chart-outline` |
| Manage / tools | `construct-outline` |
| Success / done | `checkmark-circle` |
| Failed | `close-circle` |
| Pending / waiting | `ellipse-outline` |
| Location | `location-outline` |
| Star / rating | `star` / `star-outline` |
| Phone | `call-outline` |
| Back | `chevron-back` |

## Running & Building
```bash
# Development (Expo Go on Android — scan QR)
cd frontend && npx expo start --android

# Debug APK (requires Android Studio / connected device)
cd frontend && npx expo run:android

# Production APK via EAS (recommended for distribution)
eas build --platform android --profile preview
```

## Hard Rules — never break these

### Platform
1. **Android target** — no iOS-only APIs. Forbidden: `NativeTabs`, `expo-blur` blurType, `headerLargeTitle` as a functional feature (it is silently ignored on Android — don't rely on it), SF Symbols.

### Component & Architecture
2. **Component-first** — build and verify a component in isolation before building any screen that uses it. Screens are thin compositions.
3. **Routes only in `app/`** — never co-locate components, hooks, types, or utilities in `app/`
4. **No legacy RN modules** — no `SafeAreaView`, `AsyncStorage`, or `Picker` from React Native core
5. **`React.use` not `useContext`** — for reading context values
6. **`process.env.EXPO_OS`** not `Platform.OS`

### Icons
7. **Ionicons only — no SVGs** — use `Ionicons` from `@expo/vector-icons` for every icon. Never install `react-native-svg`, `lucide-react-native`, or any SVG-based icon library. Never use `expo-image` for icons. No `.svg` files in the project.
8. **expo-image for raster images only** — photos, thumbnails, avatars. Never the intrinsic `<img>` element.

### Styling
9. **Token-only styling** — every color, spacing, radius, shadow, and typography value must come from `@/constants/colors` or `@/constants/tokens`. Zero magic numbers.
10. **White theme** — explicit values from `@/constants/colors`. No `PlatformColor`.
11. **No neon or electric colors** — forbidden: any fully-saturated color at full brightness (`#00FF00`, `#FF00FF`, `#00FFFF`, etc.). Stick to the desaturated palette in `colors.ts`.
12. **Premium UI defaults** — generous spacing (`spacing.xl`/`xxl` between sections), `radius.card` + `borderCurve: 'continuous'` on cards, `shadows.card` on elevated surfaces.
13. **Inline styles only** — no `StyleSheet.create` unless a style object is reused more than twice in one file.
14. **`boxShadow` for shadows** — never `elevation` or legacy shadow props.

### Navigation & Layout
15. **`<Tabs>` not `NativeTabs`** — always import from `expo-router`, never from `expo-router/unstable-native-tabs`.
16. **ScrollView first** — every Stack route's first child is `<ScrollView contentInsetAdjustmentBehavior="automatic">`.
17. **Kebab-case filenames** — `progress-tracker.tsx` not `ProgressTracker.tsx`.
18. **No hardcoded URLs or keys** — `.env.local` only.

## Environment Variables
Fill in `.env.local` (already gitignored):
```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8000/api/v1   ← Android emulator loopback for localhost
```
