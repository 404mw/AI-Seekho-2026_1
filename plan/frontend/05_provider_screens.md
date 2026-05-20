# Phase 05 — Provider Screens

## Goal
Build all 7 provider-facing route files. The booking detail screen with status update actions is the key screen for closing the loop.

Prerequisite: Phase 03 complete (all hooks available).

---

## Files to Create

| File | Screen | Key Hook(s) |
|---|---|---|
| `app/(provider)/_layout.tsx` | Tab bar | — |
| `app/(provider)/(dashboard)/_layout.tsx` | Stack | — |
| `app/(provider)/(dashboard)/index.tsx` | Dashboard | `useProviderBookings` |
| `app/(provider)/(bookings)/_layout.tsx` | Stack | — |
| `app/(provider)/(bookings)/index.tsx` | All bookings | `useProviderBookings` |
| `app/(provider)/(bookings)/[id].tsx` | Booking detail + actions | `useProviderBookingDetail` |
| `app/(provider)/(manage)/_layout.tsx` | Stack | — |
| `app/(provider)/(manage)/index.tsx` | Offerings + Schedule | `useOfferings`, `useSchedule` |
| `app/(provider)/(profile)/_layout.tsx` | Stack | — |
| `app/(provider)/(profile)/index.tsx` | Profile + switch mode | `useAuth`, ModeContext |

---

## app/(provider)/_layout.tsx — Tab Bar

Four tabs: Dashboard, Bookings, Manage, Profile.

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
    name="(dashboard)"
    options={{
      title: 'Dashboard',
      tabBarIcon: ({ color, size }) => <TabIcon name="stats-chart-outline" color={color} size={size} />,
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
    name="(manage)"
    options={{
      title: 'Manage',
      tabBarIcon: ({ color, size }) => <TabIcon name="construct-outline" color={color} size={size} />,
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

## Stack Layout Pattern

Same options as customer stacks:

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

## (dashboard)/index.tsx — Dashboard

Concise overview of today's upcoming work. No pagination — just the next 5 confirmed bookings.

```
┌────────────────────────────────────┐
│  Dashboard             [large]     │
├────────────────────────────────────┤
│                                    │
│  Today's Schedule                  │  ← section header
│                                    │
│  ┌──────────────────────────────┐  │
│  │ 10:00 AM  AC Repair          │  │  ← BookingCard (compact)
│  │ Muhammad · G-13              │  │
│  │ Confirmed ●                  │  │
│  └──────────────────────────────┘  │
│  ┌──────────────────────────────┐  │
│  │ 2:00 PM   Plumbing           │  │
│  │ Ahmed · F-8                  │  │
│  │ Confirmed ●                  │  │
│  └──────────────────────────────┘  │
│                                    │
│  Pending Requests (2)              │  ← section header
│  [tap to go to Bookings tab]       │
│                                    │
└────────────────────────────────────┘
```

- Fetches `useProviderBookings('Confirmed')` and shows the next 5 by `scheduled_start`
- Also fetches `useProviderBookings('Pending')` for the pending count badge
- Tap a booking card → navigates to `/(provider)/(bookings)/[id]`

---

## (bookings)/index.tsx — All Bookings

Full list, filterable by status — mirrors the customer bookings list but uses provider-facing data.

```
┌────────────────────────────────────┐
│  Bookings              [large]     │
├────────────────────────────────────┤
│  [All] [Pending] [Confirmed] [Done]│  ← SegmentedControl
│                                    │
│  FlatList of BookingCards          │
│  (each card links to [id].tsx)     │
│                                    │
└────────────────────────────────────┘
```

- `SegmentedControl` sets the `status` filter passed to `useProviderBookings`
- Pull-to-refresh
- Pending bookings shown with a highlighted border to draw attention

---

## (bookings)/[id].tsx — Booking Detail + Actions

The key provider interaction point: accept or complete a booking.

```
┌────────────────────────────────────┐
│  ← Back     Booking                │
├────────────────────────────────────┤
│  ScrollView                        │
│                                    │
│  Service: AC Repair                │
│  Customer: Muhammad Waqas          │
│  Address: House 5, G-13 Islamabad  │  ← selectable
│  Time: Tomorrow 10:00 AM           │
│  Estimated: Rs. 1,500              │
│  Status: Pending                   │
│                                    │
│  ─────────────────────────────     │
│                                    │
│  [ Confirm Booking ]               │  ← only shown when status = Pending
│  [ Mark as Completed ]             │  ← only shown when status = Confirmed
│                                    │
└────────────────────────────────────┘
```

**Action logic (both buttons):**
1. Trigger haptic: `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)`
2. Call `updateStatus('Confirmed')` or `updateStatus('Completed')`
3. Show `ActivityIndicator` while in-flight
4. On success: refresh booking detail (status updates in-place with animation)
5. Trigger haptic: `Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)`
6. On error: show `Alert.alert` with the error message

**Status display rules:**
- `Pending` → amber indicator, "Confirm Booking" button visible
- `Confirmed` → blue indicator, "Mark as Completed" button visible
- `Completed` → green indicator, no action buttons
- `Cancelled` → gray indicator, no action buttons

---

## (manage)/index.tsx — Offerings + Schedule

Single screen with two collapsible sections. Avoids navigation overhead for a management screen.

```
┌────────────────────────────────────┐
│  Manage                [large]     │
├────────────────────────────────────┤
│  ScrollView                        │
│                                    │
│  ▼ My Services                     │  ← collapsible section
│                                    │
│  ┌──────────────────────────────┐  │
│  │ AC Repair  · Rs. 1,500       │  │  ← OfferingRow + swipe to delete
│  └──────────────────────────────┘  │
│  ┌──────────────────────────────┐  │
│  │ AC Installation · Rs. 3,000  │  │
│  └──────────────────────────────┘  │
│  [ + Add Service ]                 │  ← opens formSheet
│                                    │
│  ▼ Weekly Availability             │  ← collapsible section
│                                    │
│  Mon  [On ] 08:00 → 18:00          │  ← ScheduleRow × 7
│  Tue  [On ] 08:00 → 18:00          │
│  Wed  [Off]                        │
│  ...                               │
│                                    │
│  [ Save Schedule ]                 │
│                                    │
└────────────────────────────────────┘
```

**Offering flow:**
- "+ Add Service" → opens a `formSheet` (`presentation: "formSheet"`) with `offering-form.tsx`
- Sheet contains: category picker (from `useCatalog`), variant name input, base price input, hourly rate input
- Submit → `create(data)` from `useOfferings` → sheet closes → list refreshes
- Swipe to delete on each row → `Alert.alert` confirm → `remove(id)`

**Schedule flow:**
- Each `ScheduleRow` has a `Switch` to toggle `is_active` and time pickers when active
- "Save Schedule" → `update(entries)` from `useSchedule`
- Use `@react-native-community/datetimepicker` for time pickers (has built-in haptics)

---

## (profile)/index.tsx — Provider Profile

```
┌────────────────────────────────────┐
│  Profile               [large]     │
├────────────────────────────────────┤
│                                    │
│  [Avatar placeholder]              │
│  Ali AC Services                   │
│  ★ 4.7  ·  active                  │
│                                    │
│  ─────────────────────────────     │
│                                    │
│  Business Name ________________    │  ← editable fields
│  Contact Phone ________________    │
│  City          ________________    │
│  Service Radius (km) __________    │
│                                    │
│  [ Save Profile ]                  │
│                                    │
│  ─────────────────────────────     │
│                                    │
│  [ Switch to Customer Mode ]       │
│                                    │
│  [ Sign Out ]                      │  ← red text
│                                    │
└────────────────────────────────────┘
```

- "Switch to Customer" → `setMode('customer')` → root layout redirects instantly
- Profile update → `update(data)` from `useMyProviderProfile`
- "Sign Out" → `signOut()` from `useAuth`

---

## Verification

After this phase, the full provider flow works:
1. Sign in as provider (or switch mode from customer profile)
2. Dashboard shows upcoming confirmed bookings
3. Bookings tab shows all bookings by status
4. Tap a pending booking → "Confirm Booking" → status updates to Confirmed
5. Manage tab shows offerings and weekly schedule (may need seeded data from `08_seed`)
6. Profile saves business name and can switch back to customer mode
