# Phase 04 — Customer Screens

## Goal
Build all 7 customer-facing route files. The progress tracker screen is the demo centerpiece — it gets the most polish.

Prerequisite: Phase 03 complete (all hooks available).

---

## Files to Create

| File | Screen | Key Hook(s) |
|---|---|---|
| `app/(customer)/_layout.tsx` | Tab bar | — |
| `app/(customer)/(home)/_layout.tsx` | Stack | — |
| `app/(customer)/(home)/index.tsx` | Request form | `useSubmitRequest` |
| `app/(customer)/(requests)/_layout.tsx` | Stack | — |
| `app/(customer)/(requests)/index.tsx` | Request history | `useRequestList` |
| `app/(customer)/(requests)/[id].tsx` | Progress tracker | `useRequestDetail` |
| `app/(customer)/(bookings)/_layout.tsx` | Stack | — |
| `app/(customer)/(bookings)/index.tsx` | Bookings list | `useUserBookings` |
| `app/(customer)/(bookings)/[id].tsx` | Booking detail | `useBookingDetail` |
| `app/(customer)/(profile)/_layout.tsx` | Stack | — |
| `app/(customer)/(profile)/index.tsx` | Profile | `useAuth`, ModeContext |

---

## app/(customer)/_layout.tsx — Tab Bar

Four tabs: Home, Requests, Bookings, Profile.

```typescript
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/colors';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({ name, color, size }: { name: IoniconsName; color: string; size: number }) {
  return <Ionicons name={name} size={size} color={color} />;
}

<Tabs
  screenOptions={{
    tabBarActiveTintColor: colors.accent,
    tabBarInactiveTintColor: colors.labelTertiary,
    tabBarStyle: { backgroundColor: colors.background, borderTopColor: colors.separatorOpaque },
    headerShown: false,
  }}
>
  <Tabs.Screen
    name="(home)"
    options={{
      title: 'Home',
      tabBarIcon: ({ color, size }) => <TabIcon name="sparkles-outline" color={color} size={size} />,
    }}
  />
  <Tabs.Screen
    name="(requests)"
    options={{
      title: 'Requests',
      tabBarIcon: ({ color, size }) => <TabIcon name="time-outline" color={color} size={size} />,
    }}
  />
  <Tabs.Screen
    name="(bookings)"
    options={{
      title: 'Bookings',
      tabBarIcon: ({ color, size }) => <TabIcon name="calendar-outline" color={color} size={size} />,
    }}
  />
  <Tabs.Screen
    name="(profile)"
    options={{
      title: 'Profile',
      tabBarIcon: ({ color, size }) => <TabIcon name="person-circle-outline" color={color} size={size} />,
    }}
  />
</Tabs>
```

---

## Stack Layout Pattern (all 4 stacks)

All 4 `_layout.tsx` files inside customer tabs share these Stack options:

```typescript
<Stack
  screenOptions={{
    headerTransparent: true,
    headerLargeTitle: true,
    headerLargeTitleShadowVisible: false,
    headerShadowVisible: false,
    headerBackButtonDisplayMode: 'minimal',
    headerTitleStyle: { color: PlatformColor('label') },
  }}
/>
```

---

## (home)/index.tsx — Request Form

**The entry point for the entire product.**

```
┌────────────────────────────────────┐
│  Seekho                 [large]    │  ← headerLargeTitle
├────────────────────────────────────┤
│                                    │
│  What service do you need?         │  ← section label
│                                    │
│  ┌──────────────────────────────┐  │
│  │ Describe in your own words...│  │  ← multiline TextInput
│  │                              │  │    min 3 lines, max 8
│  └──────────────────────────────┘  │
│                                    │
│  Examples:                         │
│  "AC repair at G-13 tomorrow AM"   │  ← tappable suggestion chips
│  "Plumber needed urgently today"   │
│  "Electrician this weekend"        │
│                                    │
│  [ Find Service Provider ]         │  ← primary button
│                                    │
└────────────────────────────────────┘
```

**Logic:**
1. User types prompt (or taps a suggestion chip which fills the input)
2. Tap "Find Service Provider":
   a. Trigger haptic: `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)`
   b. Call `submit(prompt)` from `useSubmitRequest`
   c. On success: `router.push('/(customer)/(requests)/' + id)`
   d. On error: show inline error toast
3. Button disabled + shows `ActivityIndicator` while `isSubmitting`

---

## (requests)/index.tsx — Request History

```
┌────────────────────────────────────┐
│  Requests              [large]     │
├────────────────────────────────────┤
│  FlatList of RequestCards:         │
│                                    │
│  ┌──────────────────────────────┐  │
│  │ "AC repair at G-13..."       │  │
│  │ ● Completed  · 2h ago        │  │
│  └──────────────────────────────┘  │
│  ┌──────────────────────────────┐  │
│  │ "Plumber needed urgently"    │  │
│  │ ⟳ Processing · decision      │  │
│  └──────────────────────────────┘  │
│                                    │
└────────────────────────────────────┘
```

- `FlatList` with `contentInsetAdjustmentBehavior="automatic"`
- Pull-to-refresh via `onRefresh`
- Each card is a `Link` to `/(customer)/(requests)/[id]`
- Status badge: green dot for completed, spinner for processing, red for failed

---

## (requests)/[id].tsx — Progress Tracker (Demo Centerpiece)

This screen is the primary demo screen. It must be polished.

```
┌────────────────────────────────────┐
│  ← Back     Request Detail         │
├────────────────────────────────────┤
│  ScrollView                        │
│                                    │
│  "AC repair at G-13 tomorrow AM"   │  ← prompt (selectable text)
│  Submitted 2 min ago               │
│                                    │
│  ─── AI Pipeline ───────────────   │
│                                    │
│  ●─────────────────────────────    │
│  │ Intent         ✓ Done  (812ms) │  ← StageIndicator × 4
│  │                                 │
│  │ Discovery      ✓ Done (1340ms) │
│  │                                 │
│  │ Decision       ⟳ Running...    │  ← animated pulsing indicator
│  │                                 │
│  ○ Booking       — Waiting        │
│                                    │
│  ─── Result ────────────────────   │
│                                    │
│  [BookingCard appears here when    │
│   stage = 'completed']             │
│                                    │
└────────────────────────────────────┘
```

**Logic:**
1. Mount: call `useRequestDetail(id)` — internally polls every 2s
2. `stage` drives the `ProgressTracker` component (see Phase 06)
3. When `isComplete`:
   a. Stop polling (handled inside hook)
   b. Trigger haptic: `Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)`
   c. Animate in the BookingCard with `entering={FadeInDown}`
4. When `isFailed`:
   a. Trigger haptic: `Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)`
   b. Show error state with which stage failed
5. "View Trace" button → expands accordion showing `AgentTrace` entries (reasoning log, execution time per stage) — useful for hackathon demo/judging

---

## (bookings)/index.tsx — Bookings List

```
┌────────────────────────────────────┐
│  Bookings              [large]     │
├────────────────────────────────────┤
│  [All] [Pending] [Confirmed] [Done]│  ← filter chips (SegmentedControl)
│                                    │
│  FlatList of BookingCards          │
│                                    │
└────────────────────────────────────┘
```

- `SegmentedControl` from `@react-native-community/segmented-control` to filter by status
- Pull-to-refresh

---

## (bookings)/[id].tsx — Booking Detail

```
┌────────────────────────────────────┐
│  ← Back     Booking                │
├────────────────────────────────────┤
│                                    │
│  Ali AC Services                   │  ← ProviderCard
│  ★ 4.7  ·  2.1 km away            │
│                                    │
│  Scheduled: Tomorrow 10:00 AM      │
│  Estimated cost: Rs. 1,500         │
│  Status: Confirmed  ●              │
│                                    │
│  Confirmation: #BOOK-UUID          │  ← selectable
│                                    │
│  ─────────────────────────────     │
│                                    │
│  [ Cancel Booking ]                │  ← destructive, shows confirm alert
│                                    │
└────────────────────────────────────┘
```

Cancel flow: `Alert.alert` confirmation → `cancel()` from hook → refresh → show "Cancelled" status.

---

## (profile)/index.tsx — Profile

```
┌────────────────────────────────────┐
│  Profile               [large]     │
├────────────────────────────────────┤
│                                    │
│  [Avatar placeholder]              │
│  Muhammad Waqas                    │
│  404mwaqas@gmail.com               │
│                                    │
│  ─────────────────────────────     │
│                                    │
│  [ Switch to Provider Mode ]       │  ← only shown if hasProviderProfile
│  [ Become a Provider ]             │  ← only shown if !hasProviderProfile
│                                    │
│  ─────────────────────────────     │
│                                    │
│  [ Sign Out ]                      │  ← red text
│                                    │
└────────────────────────────────────┘
```

- "Switch to Provider" → `setMode('provider')` → root layout redirects
- "Become a Provider" → call `POST /providers/me/sync` → `setHasProviderProfile(true)` → `setMode('provider')`
- "Sign Out" → `signOut()` from `useAuth`

---

## Verification

After this phase, the customer flow is end-to-end:
1. Sign in → lands on Home
2. Type "I need an electrician in Islamabad tomorrow" → tap submit
3. Navigates to progress tracker → watch stages animate through
4. Booking card appears when complete
5. Navigate to Bookings tab → see the booking
6. Navigate to Profile → sign out → back to sign-in
