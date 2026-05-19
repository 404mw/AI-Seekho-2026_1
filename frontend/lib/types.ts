// All TypeScript interfaces mirror the backend response schemas exactly.

// ── Auth / Profile ────────────────────────────────────────────────────────────

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

// ── Service Requests ──────────────────────────────────────────────────────────

export type AgentStage =
  | 'pending'
  | 'intent'
  | 'discovery'
  | 'decision'
  | 'booking'
  | 'completed'
  | 'failed';

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

// ── Bookings ──────────────────────────────────────────────────────────────────

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

// ── Providers ─────────────────────────────────────────────────────────────────

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
  day_of_week: number; // 0 = Monday, 6 = Sunday
  start_time: string;  // "HH:MM"
  end_time: string;
  is_active: boolean;
}

// ── Catalog ───────────────────────────────────────────────────────────────────

export interface ServiceCategory {
  id: string;
  name: string;
  description: string | null;
  icon_name: string | null;
  is_active: boolean;
}

// ── Reviews ───────────────────────────────────────────────────────────────────

export interface Review {
  id: string;
  rating_score: number;
  comment: string | null;
  created_at: string;
}

// ── API Envelope ──────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  message: string;
  error: null | { code: string; detail: string };
}
