# Phase 02 — Authentication & Context

## Goal
Wire up Supabase Auth, create the root auth gate, build the sign-in and sign-up screens, and establish the ModeContext for customer/provider switching.

Prerequisite: Phase 01 complete (project exists, deps installed, `.env.local` populated).

---

## Files to Create

| File | Purpose |
|---|---|
| `lib/supabase.ts` | Supabase client singleton |
| `context/auth-context.tsx` | Session state + provider |
| `context/mode-context.tsx` | customer/provider mode + persistence |
| `hooks/use-auth.ts` | Convenience hook to read AuthContext |
| `app/_layout.tsx` | Root layout: wraps contexts + auth gate |
| `app/(auth)/_layout.tsx` | Unauthenticated stack (no tab bar) |
| `app/(auth)/sign-in.tsx` | Sign-in screen |
| `app/(auth)/sign-up.tsx` | Sign-up screen + role selection |

---

## lib/supabase.ts

Initialize the Supabase client using `expo-secure-store` as the storage adapter so tokens survive app restarts without being stored in plain AsyncStorage.

```typescript
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: ExpoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
```

---

## context/auth-context.tsx

Listens to `supabase.auth.onAuthStateChange` and exposes the session everywhere.

```typescript
interface AuthContextValue {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}
```

- On mount: call `supabase.auth.getSession()` to hydrate from SecureStore
- Subscribe to `onAuthStateChange` — updates state on sign-in, sign-out, token refresh
- `signOut` calls `supabase.auth.signOut()` and clears ModeContext

---

## context/mode-context.tsx

```typescript
type Mode = 'customer' | 'provider';

interface ModeContextValue {
  mode: Mode;
  setMode: (mode: Mode) => void;
  hasProviderProfile: boolean;
  setHasProviderProfile: (v: boolean) => void;
}
```

- Persisted to `SecureStore` under key `'app_mode'`
- Default: `'customer'`
- `hasProviderProfile` is set to `true` after `/providers/me/sync` succeeds
- Persisted under key `'has_provider_profile'`

---

## app/_layout.tsx (Root Layout)

```
Responsibilities:
  1. Provide AuthContext and ModeContext to the entire app
  2. While isLoading → show splash / blank screen (prevent flash)
  3. If session is null → <Redirect href="/(auth)/sign-in" />
  4. If session exists and mode === 'customer' → <Redirect href="/(customer)" />
  5. If session exists and mode === 'provider' → <Redirect href="/(provider)" />
```

Use `expo-router`'s `<Slot />` to render the active child route. Wrap in both context providers.

---

## app/(auth)/_layout.tsx

Simple Stack with no tab bar. Header can be hidden on sign-in (full bleed design) and shown on sign-up (back button).

```typescript
<Stack screenOptions={{ headerShown: false }}>
  <Stack.Screen name="sign-in" />
  <Stack.Screen name="sign-up" options={{ headerShown: true, title: 'Create Account' }} />
</Stack>
```

---

## app/(auth)/sign-in.tsx

**Layout:**
```
┌─────────────────────────┐
│                         │
│    [App Logo / Name]    │
│                         │
│  Email ________________ │
│  Password _____________ │
│                         │
│  [ Sign In ]            │
│                         │
│  Don't have an account? │
│  → Sign up              │
│                         │
└─────────────────────────┘
```

**Logic:**
1. Call `supabase.auth.signInWithPassword({ email, password })`
2. On success → root layout redirects automatically (auth state change fires)
3. On error → show inline error message (invalid credentials, etc.)
4. Show `ActivityIndicator` while request is in-flight

---

## app/(auth)/sign-up.tsx

**Layout:**
```
┌─────────────────────────────┐
│  Full Name _____________    │
│  Email _________________    │
│  Password ______________    │
│                             │
│  I want to:                 │
│  ○ Book services            │
│  ○ Offer services           │
│  ○ Both                     │
│                             │
│  [ Create Account ]         │
└─────────────────────────────┘
```

**Logic:**
1. Call `supabase.auth.signUp({ email, password })`
2. On success, based on role selection:
   - "Book services" → call `POST /users/me/sync` → set mode to `'customer'`
   - "Offer services" → call `POST /providers/me/sync` → set `hasProviderProfile = true` → set mode to `'provider'`
   - "Both" → call both sync endpoints → set `hasProviderProfile = true` → set mode to `'customer'`
3. Body for both sync calls includes `full_name` from the form
4. Root layout handles redirect after mode is set

**Note:** The sync calls require a valid JWT — Supabase provides it immediately after `signUp()` succeeds, so no delay is needed. Read it from `supabase.auth.getSession()` before calling the backend.

---

## hooks/use-auth.ts

```typescript
import { React } from 'react';
import { AuthContext } from '@/context/auth-context';

export function useAuth() {
  return React.use(AuthContext);
}
```

Use `React.use` (not `useContext`) per project conventions.

---

## Verification

After this phase:
- Launching the app shows the sign-in screen (root layout detects no session)
- Sign-in with a valid Supabase account redirects to customer tabs (even if those screens are blank)
- Sign-out from the JS console (`supabase.auth.signOut()`) redirects back to sign-in
- Token survives app restart (SecureStore adapter working)
