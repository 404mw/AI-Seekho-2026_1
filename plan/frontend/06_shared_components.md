# Phase 06 — Shared Components

## Goal
Build the reusable UI components and form components referenced by the route files in Phases 04 and 05. These live in `components/` and are never imported by files in `app/` other than through the route files already created.

Prerequisite: Phases 04 and 05 (consumers exist so we know exactly what props each component needs).

---

## Files to Create

| File | Used By |
|---|---|
| `components/ui/progress-tracker.tsx` | `(requests)/[id].tsx` |
| `components/ui/stage-indicator.tsx` | `progress-tracker.tsx` |
| `components/ui/booking-card.tsx` | requests list, bookings list, dashboard |
| `components/ui/request-card.tsx` | `(requests)/index.tsx` |
| `components/ui/provider-card.tsx` | `(bookings)/[id].tsx` (customer) |
| `components/forms/request-form.tsx` | `(home)/index.tsx` |
| `components/forms/offering-form.tsx` | `(manage)/index.tsx` (provider) |
| `components/forms/schedule-form.tsx` | `(manage)/index.tsx` (provider) |

---

## components/ui/stage-indicator.tsx

Single stage row in the pipeline visualization.

**Props:**
```typescript
interface StageIndicatorProps {
  label: string;              // "Intent", "Discovery", "Decision", "Booking"
  status: 'waiting' | 'active' | 'done' | 'failed';
  durationMs?: number;        // shown when done: "(812ms)"
}
```

**Visual states:**
```
waiting:  ○  Discovery      — Waiting        (gray, dim)
active:   ●  Decision       ⟳ Running...    (blue, pulsing dot animation)
done:     ●  Intent         ✓ Done (812ms)  (green, checkmark)
failed:   ●  Discovery      ✗ Failed        (red, X mark)
```

**Implementation:**
- Pulsing animation on `active` state: `useSharedValue` + `withRepeat(withTiming(...))` from Reanimated
- `entering={FadeIn}` on the status badge when it transitions to `done`
- Connector line between stages: a `View` with height=24 and a 1px left border (color matches status of the stage above)

---

## components/ui/progress-tracker.tsx

Composes 4 `StageIndicator` components into the full pipeline visualization.

**Props:**
```typescript
interface ProgressTrackerProps {
  currentStage: AgentStage;   // from useRequestDetail
  isFailed: boolean;
  traces: AgentTrace[];        // for duration display
}
```

**Stage mapping:**
```typescript
const STAGES: Array<{ key: AgentStage; label: string }> = [
  { key: 'intent',     label: 'Intent' },
  { key: 'discovery',  label: 'Discovery' },
  { key: 'decision',   label: 'Decision' },
  { key: 'booking',    label: 'Booking' },
];
```

Status derivation per stage:
- Stage comes before `currentStage` in the pipeline order → `'done'`
- Stage equals `currentStage` and `isFailed` → `'failed'`
- Stage equals `currentStage` and not failed → `'active'`
- Stage comes after `currentStage` → `'waiting'`

Duration: find the matching `AgentTrace` by `agent_name` and read `execution_time_ms`.

**Container styling:**
```typescript
{
  backgroundColor: PlatformColor('secondarySystemBackground'),
  borderRadius: 16,
  borderCurve: 'continuous',
  padding: 16,
  gap: 0,   // gap handled by connector lines inside StageIndicator
}
```

---

## components/ui/booking-card.tsx

Used in both customer and provider contexts. Adapts display based on `variant`.

**Props:**
```typescript
interface BookingCardProps {
  booking: Booking;
  variant: 'customer' | 'provider';  // customer shows provider name; provider shows customer name
  onPress?: () => void;
}
```

**Layout:**
```
┌──────────────────────────────────────┐
│  Service Type           Status badge │
│  Name (provider or customer)         │
│  Scheduled: Tomorrow 10:00 AM        │
│  Rs. 1,500                           │
└──────────────────────────────────────┘
```

- Status badge: colored dot + text (`Pending` amber, `Confirmed` blue, `Completed` green, `Cancelled` gray)
- Entire card is `Pressable` (triggers `onPress`)
- `boxShadow: "0 1px 3px rgba(0,0,0,0.08)"` for subtle elevation
- `borderRadius: 14`, `borderCurve: 'continuous'`
- Background: `PlatformColor('secondarySystemBackground')`

---

## components/ui/request-card.tsx

**Props:**
```typescript
interface RequestCardProps {
  request: ServiceRequest;
  onPress?: () => void;
}
```

**Layout:**
```
┌──────────────────────────────────────┐
│  "AC repair at G-13 tomorrow AM"     │  ← truncated to 2 lines
│  ● Completed  ·  2 hours ago         │  ← status + relative time
└──────────────────────────────────────┘
```

- Status indicator: spinner (`ActivityIndicator`) for `processing`, dot for others
- Relative time: format `created_at` as "2h ago", "Just now", "Yesterday", etc.
- Same card styling as `BookingCard`

---

## components/ui/provider-card.tsx

Shown in customer booking detail to display who the booking is with.

**Props:**
```typescript
interface ProviderCardProps {
  provider: ProviderPublic;
  distanceKm?: number;
}
```

**Layout:**
```
┌──────────────────────────────────────┐
│  [Icon: person.fill]  Ali AC Services│
│                       ★ 4.7  · 2.1km │
└──────────────────────────────────────┘
```

- SF Symbol icon via `expo-image` with `source="sf:person.fill"`
- Rating formatted to 1 decimal place
- Distance formatted as "2.1 km" or hidden if `distanceKm` is not provided

---

## components/forms/request-form.tsx

The natural language input component extracted from `(home)/index.tsx`.

**Props:**
```typescript
interface RequestFormProps {
  onSubmit: (prompt: string) => void;
  isSubmitting: boolean;
}
```

**Contents:**
- `TextInput`: multiline, `numberOfLines={4}`, `maxLength={500}`, placeholder text
- Suggestion chips: `ScrollView horizontal` with 3 `Pressable` chips that fill the input
- Submit button: `Pressable` with "Find Service Provider" label, disabled + spinner when `isSubmitting`
- Character counter: shown when input has text (e.g., "47 / 500" in `tabular-nums` font)

---

## components/forms/offering-form.tsx

Used inside the formSheet modal in `(manage)/index.tsx`.

**Props:**
```typescript
interface OfferingFormProps {
  categories: ServiceCategory[];
  initial?: Partial<ProviderOffering>;
  onSubmit: (data: Omit<ProviderOffering, 'id'>) => Promise<void>;
  onCancel: () => void;
}
```

**Fields:**
- `category_id`: `Picker` (from `@react-native-community/picker` — or use a custom list since Picker is deprecated, use a simple `FlatList` in a modal)
  - **Note:** Use a custom selection UI (list of pressable category rows) since the RN core `Picker` is removed. Categories come from `useCatalog`.
- `variant_name`: `TextInput` (optional, e.g., "Split AC", "Window AC")
- `base_price`: `TextInput` with `keyboardType="decimal-pad"` (Rs. per visit)
- `hourly_rate`: `TextInput` with `keyboardType="decimal-pad"` (Rs. per hour, optional)

Submit button validates that `category_id` is selected and at least one price is provided.

---

## components/forms/schedule-form.tsx

Weekly availability editor. Used inside `(manage)/index.tsx`.

**Props:**
```typescript
interface ScheduleFormProps {
  initial: ScheduleEntry[];
  onSave: (entries: ScheduleEntry[]) => Promise<void>;
}
```

**Per-day row:**
```
Mon  [Switch]  08:00 AM  →  06:00 PM
                  ↑ DateTimePicker when Switch is on
```

- 7 rows, one per day (Mon–Sun)
- `Switch` from React Native (has built-in haptics)
- When `Switch` is off: time pickers are hidden, `is_active = false`
- When `Switch` is on: show two `DateTimePicker` components (`mode="time"`) from `@react-native-community/datetimepicker`
- Local state manages all 7 entries; only calls `onSave` when "Save Schedule" pressed

---

## Verification

After Phase 06 all components exist. Visual QA checklist:

- [ ] ProgressTracker: run through all 4 stages manually by mocking the hook return value
- [ ] StageIndicator: all 4 states render correctly (waiting/active/done/failed)
- [ ] BookingCard: both `customer` and `provider` variants
- [ ] RequestCard: `processing` state shows spinner, `completed` shows green dot
- [ ] OfferingForm: submits with valid data, rejects empty category
- [ ] ScheduleForm: toggle days on/off, save fires with correct entries
- [ ] Dark mode: all colors adapt (PlatformColor semantic tokens)
