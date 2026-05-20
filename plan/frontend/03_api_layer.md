# Phase 03 — API Layer

## Goal
Build the typed API client, define all TypeScript interfaces mirroring the backend schemas, create the polling hook, and create all domain hooks. No UI — just the data layer every screen will consume.

Prerequisite: Phase 02 complete (Supabase client + session available).

---

## Files to Create

| File | Purpose |
|---|---|
| `lib/types.ts` | TypeScript interfaces for all backend response objects |
| `lib/api.ts` | Typed fetch wrapper (JWT attach, envelope unwrap, error throw) |
| `hooks/use-poll.ts` | Generic polling hook |
| `hooks/use-requests.ts` | ServiceRequest CRUD + polling |
| `hooks/use-bookings.ts` | Booking list + status update |
| `hooks/use-providers.ts` | Provider profile, offerings, schedule, time-off |
| `hooks/use-catalog.ts` | Service categories (cached) |

---

## lib/types.ts

Define interfaces that exactly mirror the backend response schemas. These are used everywhere — hooks, components, screens.

```typescript
// Auth / Sync
export interface UserProfile {
  id: string;
  full_name: string | null;
  phone_number: string | null;
  city: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ProviderProfile {
  id: string;
  business_name: string | null;
  contact_phone: string | null;
  city: string | null;
  service_radius_km: number | null;
  is_active: boolean;
  average_rating: number | null;
  created_at: string;
}

// Service Requests
export type AgentStage = 'pending' | 'intent' | 'discovery' | 'decision' | 'booking' | 'completed' | 'failed';

export interface ServiceRequest {
  id: string;
  prompt: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  current_agent_stage: AgentStage;
  created_at: string;
}

export interface RequestStatus {
  id: string;
  current_agent_stage: AgentStage;
  status: string;
}

export interface AgentTrace {
  agent_name: string;
  status: 'Success' | 'Failed' | 'Scheduled';
  structured_output: Record<string, unknown>;
  reasoning_log: string;
  execution_time_ms: number;
  created_at: string;
}

// Bookings
export type BookingStatus = 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';

export interface Booking {
  id: string;
  service_request_id: string;
  provider_id: string;
  scheduled_start: string;
  scheduled_end: string | null;
  status: BookingStatus;
  payment_status: string;
  total_price: number | null;
  created_at: string;
}

// Providers (public)
export interface ProviderPublic {
  id: string;
  business_name: string;
  city: string;
  average_rating: number | null;
  service_radius_km: number | null;
}

export interface ProviderOffering {
  id: string;
  category_id: string;
  variant_name: string | null;
  base_price: number | null;
  hourly_rate: number | null;
}

export interface ScheduleEntry {
  day_of_week: number;  // 0=Monday, 6=Sunday
  start_time: string;   // "HH:MM"
  end_time: string;
  is_active: boolean;
}

// Catalog
export interface ServiceCategory {
  id: string;
  name: string;
  description: string | null;
  icon_name: string | null;
  is_active: boolean;
}

// Reviews
export interface Review {
  id: string;
  rating_score: number;
  comment: string | null;
  created_at: string;
}

// API envelope
export interface ApiResponse<T> {
  data: T;
  message: string;
  error: null;
}

export interface ApiError {
  code: string;
  detail: string;
}
```

---

## lib/api.ts

Thin typed wrapper. Every method reads the current session JWT and attaches it.

```typescript
import { supabase } from '@/lib/supabase';
import { API_BASE_URL } from '@/constants/config';

class ApiClient {
  private async getHeaders(): Promise<HeadersInit> {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  async get<T>(path: string): Promise<T> { ... }
  async post<T>(path: string, body?: unknown): Promise<T> { ... }
  async put<T>(path: string, body?: unknown): Promise<T> { ... }
  async delete<T>(path: string): Promise<T> { ... }
}

export const api = new ApiClient();
```

Each method:
1. Calls `getHeaders()`
2. Calls `fetch(API_BASE_URL + path, { method, headers, body: JSON.stringify(body) })`
3. Parses response as `ApiResponse<T>`
4. If `!response.ok` → throws `new Error(parsed.error?.detail ?? parsed.message)`
5. Returns `parsed.data`

---

## hooks/use-poll.ts

Generic polling hook. Returns the latest value and a `stop` function.

```typescript
interface PollOptions<T> {
  fetcher: () => Promise<T>;          // what to call
  interval?: number;                  // ms between calls (default: POLL_INTERVAL_MS)
  timeout?: number;                   // ms before auto-stop (default: POLL_TIMEOUT_MS)
  stopWhen?: (value: T) => boolean;   // stop condition
  enabled?: boolean;                  // only poll when true
}

function usePoll<T>(options: PollOptions<T>): {
  data: T | null;
  isPolling: boolean;
  error: Error | null;
}
```

Implementation:
- Uses `useRef` for the interval handle (not state — avoids re-render on timer tick)
- Calls `fetcher()` immediately on mount (no leading delay)
- Clears interval on: `stopWhen` returns true, timeout exceeded, `enabled` turns false, unmount
- `isPolling` is true while the interval is active

---

## hooks/use-requests.ts

```typescript
// Submit a new request → returns immediately with id
function useSubmitRequest(): {
  submit: (prompt: string) => Promise<{ id: string }>;
  isSubmitting: boolean;
  error: Error | null;
}

// List past requests (paginated)
function useRequestList(): {
  requests: ServiceRequest[];
  isLoading: boolean;
  refresh: () => void;
}

// Detail + polling status until terminal
function useRequestDetail(id: string): {
  request: ServiceRequest | null;
  stage: AgentStage;
  isComplete: boolean;
  isFailed: boolean;
  traces: AgentTrace[];
  isLoading: boolean;
}
```

`useRequestDetail` internally uses `usePoll` on `GET /requests/{id}/status`, stops when `status` is `'completed'` or `'failed'`, then fetches the full detail + traces once.

---

## hooks/use-bookings.ts

```typescript
// User-facing
function useUserBookings(status?: BookingStatus): {
  bookings: Booking[];
  isLoading: boolean;
  refresh: () => void;
}

function useBookingDetail(id: string): {
  booking: Booking | null;
  isLoading: boolean;
  cancel: () => Promise<void>;
}

// Provider-facing
function useProviderBookings(status?: BookingStatus): {
  bookings: Booking[];
  isLoading: boolean;
  refresh: () => void;
}

function useProviderBookingDetail(id: string): {
  booking: Booking | null;
  isLoading: boolean;
  updateStatus: (status: 'Confirmed' | 'Completed') => Promise<void>;
}
```

---

## hooks/use-providers.ts

```typescript
// Own profile management
function useMyProviderProfile(): {
  profile: ProviderProfile | null;
  isLoading: boolean;
  update: (data: Partial<ProviderProfile>) => Promise<void>;
}

// Offerings
function useOfferings(): {
  offerings: ProviderOffering[];
  isLoading: boolean;
  create: (data: Omit<ProviderOffering, 'id'>) => Promise<void>;
  update: (id: string, data: Partial<ProviderOffering>) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

// Schedule
function useSchedule(): {
  schedule: ScheduleEntry[];
  isLoading: boolean;
  update: (entries: ScheduleEntry[]) => Promise<void>;
}
```

---

## hooks/use-catalog.ts

```typescript
function useCatalog(): {
  categories: ServiceCategory[];
  isLoading: boolean;
}
```

Caches result in module-level variable (simple memoization — categories rarely change). No polling needed.

---

## Verification

No UI to test at this phase. Verify by calling hooks from a temporary debug screen or use the Expo dev console:

```typescript
// Temporary test in any screen:
const { submit } = useSubmitRequest();
submit("I need a plumber in Islamabad tomorrow morning");
// → should return { id: "..." } and be visible in the backend logs
```
