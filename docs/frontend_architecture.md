# Frontend Architecture — Expo Mobile App

## Finalized Technology Stack

| Concern | Choice | Reason |
|---|---|---|
| Framework | Expo SDK 53+ | Managed workflow, fast iteration |
| Routing | Expo Router v4 (file-based) | Native navigation, deep links, no extra setup |
| Language | TypeScript | Strict mode, mirrors backend schemas |
| Auth | `@supabase/supabase-js` | Same Supabase instance as backend; SDK manages JWT + refresh |
| Tabs | `expo-router/unstable-native-tabs` (`NativeTabs`) | True native iOS tabs, not JS-emulated |
| Images / SF Symbols | `expo-image` | `source="sf:name"` for native SF Symbols |
| Animations | `react-native-reanimated` v3 | Runs on UI thread; entering/exiting transitions |
| Haptics | `expo-haptics` (iOS only) | Delightful feedback on key actions |
| Safe Area | `react-native-safe-area-context` | `contentInsetAdjustmentBehavior="automatic"` on scroll views |
| Secure Storage | `expo-secure-store` | JWT and session caching |
| Package Manager | npm | Expo default; broadest compatibility |

**No styling library.** Inline styles only, following Apple Human Interface Guidelines. No Tailwind, no StyleSheet.create except for hot-path reuse.

---

## Directory Structure

```text
frontend/
├── app/                          # Expo Router routes (routes ONLY — no components here)
│   ├── _layout.tsx               # Root layout: auth gate + ModeContext provider
│   ├── (auth)/
│   │   ├── _layout.tsx           # Unauthenticated Stack (no tab bar)
│   │   ├── sign-in.tsx
│   │   └── sign-up.tsx           # Includes role selection: Customer / Provider / Both
│   ├── (customer)/               # Customer mode
│   │   ├── _layout.tsx           # NativeTabs: Home, Requests, Bookings, Profile
│   │   ├── (home)/
│   │   │   ├── _layout.tsx       # Stack
│   │   │   └── index.tsx         # Natural language request form
│   │   ├── (requests)/
│   │   │   ├── _layout.tsx       # Stack
│   │   │   ├── index.tsx         # Request history list
│   │   │   └── [id].tsx          # Progress tracker (the demo centerpiece)
│   │   ├── (bookings)/
│   │   │   ├── _layout.tsx       # Stack
│   │   │   ├── index.tsx         # Bookings list
│   │   │   └── [id].tsx          # Booking detail + cancel
│   │   └── (profile)/
│   │       ├── _layout.tsx       # Stack
│   │       └── index.tsx         # Profile + "Switch to Provider" button
│   └── (provider)/               # Provider mode
│       ├── _layout.tsx           # NativeTabs: Dashboard, Bookings, Manage, Profile
│       ├── (dashboard)/
│       │   ├── _layout.tsx       # Stack
│       │   └── index.tsx         # Upcoming bookings at a glance
│       ├── (bookings)/
│       │   ├── _layout.tsx       # Stack
│       │   ├── index.tsx         # All bookings, filterable by status
│       │   └── [id].tsx          # Booking detail + Confirm / Complete actions
│       ├── (manage)/
│       │   ├── _layout.tsx       # Stack
│       │   └── index.tsx         # Offerings CRUD + weekly schedule editor
│       └── (profile)/
│           ├── _layout.tsx       # Stack
│           └── index.tsx         # Profile + "Switch to Customer" button
│
├── components/                   # Shared UI — never import from app/
│   ├── ui/
│   │   ├── progress-tracker.tsx  # Pipeline stage visualizer (Intent→Discovery→Decision→Booking)
│   │   ├── stage-indicator.tsx   # Single stage bubble (pending / active / done / failed)
│   │   ├── booking-card.tsx      # Booking list item (shared customer + provider)
│   │   ├── request-card.tsx      # Service request list item
│   │   └── provider-card.tsx     # Provider info card shown in booking detail
│   └── forms/
│       ├── request-form.tsx      # NL text input + submit button
│       ├── offering-form.tsx     # Create/edit provider offering
│       └── schedule-form.tsx     # Weekly availability editor
│
├── hooks/                        # Custom React hooks
│   ├── use-auth.ts               # Reads AuthContext; exposes session, user, signOut
│   ├── use-poll.ts               # Generic polling hook (interval, stop condition)
│   ├── use-requests.ts           # CRUD + polling for ServiceRequests
│   ├── use-bookings.ts           # Bookings (user-facing + provider-facing)
│   ├── use-providers.ts          # Provider profile, offerings, schedule, time-off
│   └── use-catalog.ts            # GET /catalog/categories (cached, rarely changes)
│
├── context/
│   ├── auth-context.tsx          # Supabase session state; exposed via use-auth.ts
│   └── mode-context.tsx          # 'customer' | 'provider'; persisted in SecureStore
│
├── lib/
│   ├── supabase.ts               # Supabase client singleton (uses expo-secure-store adapter)
│   ├── api.ts                    # Typed fetch wrapper — attaches JWT, unwraps envelope
│   └── types.ts                  # TypeScript interfaces mirroring backend response schemas
│
└── constants/
    ├── config.ts                 # API_BASE_URL, POLL_INTERVAL_MS (2000), POLL_TIMEOUT_MS (120000)
    └── colors.ts                 # PlatformColor semantic tokens (label, secondaryLabel, etc.)
```

---

## Authentication Model

Supabase owns all credential management. The app never sees raw passwords after sign-up.

```
Sign-Up Flow:
  1. User fills sign-up form (email, password, role selection)
  2. supabase.auth.signUp() → Supabase issues JWT + refresh token
  3. SDK stores tokens via expo-secure-store adapter (never in plain AsyncStorage)
  4. App calls POST /api/v1/users/me/sync (or /providers/me/sync, or both) to create the DB record
  5. Root layout detects session → redirects to (customer) or (provider) based on saved mode

Sign-In Flow:
  1. supabase.auth.signInWithPassword()
  2. JWT auto-attached to all API calls via lib/api.ts
  3. SDK handles token refresh transparently

Sign-Out:
  1. supabase.auth.signOut()
  2. Root layout redirects to /(auth)/sign-in
```

**There are no `/login` or `/register` backend routes.** All auth state comes from the Supabase SDK.

---

## Mode Switching

One Supabase account can hold both a `User` and a `Provider` DB record.

```
ModeContext {
  mode: 'customer' | 'provider'
  setMode: (mode) => void       ← persists to SecureStore
  hasProviderProfile: boolean   ← true if /providers/me/sync has been called
}
```

- Root `_layout.tsx` reads `mode` from context and renders `<Redirect href="/(customer)" />` or `<Redirect href="/(provider)" />`.
- Switching mode is instant — no re-auth, no reload.
- A user who signed up as "Customer only" sees a "Become a Provider" prompt in their profile which calls `/providers/me/sync`, sets `hasProviderProfile = true`, and sets `mode = 'provider'`.

---

## API Integration Pattern

`lib/api.ts` is a thin typed wrapper around `fetch`. It:
1. Reads the current Supabase session to get the JWT
2. Attaches `Authorization: Bearer <jwt>` to every request
3. Unwraps the standard `{ data, message, error }` envelope
4. Throws a typed `ApiError` on non-2xx responses

No external HTTP library (no axios). Raw fetch is sufficient and keeps the bundle small.

```typescript
// Usage pattern in hooks
const data = await api.get<ServiceRequest>(`/requests/${id}`)
const created = await api.post<ServiceRequest>('/requests', { prompt })
```

---

## Polling Strategy (Progress Tracker)

The `use-poll.ts` hook wraps `GET /requests/{id}/status` with a setInterval.

```
Config:
  POLL_INTERVAL_MS = 2000      ← check every 2 seconds
  POLL_TIMEOUT_MS  = 120000    ← stop after 2 minutes regardless

Stop conditions:
  status === 'completed'
  status === 'failed'
  component unmounts
  timeout exceeded
```

The interval is cleared on any stop condition. The `[id].tsx` route mounts the hook on load and receives a `{ stage, status }` object that drives the `ProgressTracker` component.

---

## Navigation Conventions

- Every tab group uses `NativeTabs` from `expo-router/unstable-native-tabs` — true native iOS tab bar
- Every tab uses a `Stack` inside it for push navigation
- Stack headers use `headerLargeTitle: true` on list screens, `false` on detail screens
- `headerBackButtonDisplayMode: "minimal"` (chevron only, no label)
- Modals for: offering create/edit, time-off create (form sheets with `presentation: "formSheet"`)
- `ScrollView` with `contentInsetAdjustmentBehavior="automatic"` is the first child of every Stack route

---

## Styling Conventions

- Inline styles only — no `StyleSheet.create` unless a style object is referenced more than twice in the same file
- `{ borderCurve: 'continuous' }` on all rounded corners
- `boxShadow` for shadows — never `elevation` or legacy shadow props
- `PlatformColor('label')`, `PlatformColor('secondaryLabel')` for adaptive text colors
- `PlatformColor('systemBackground')`, `PlatformColor('secondarySystemBackground')` for backgrounds
- `{ fontVariant: ['tabular-nums'] }` on all numeric counters
- Haptics via `expo-haptics` on: request submit, booking confirmation, status change actions (iOS only — guard with `process.env.EXPO_OS === 'ios'`)
