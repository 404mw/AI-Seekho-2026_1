# API Endpoints Documentation

This document is the **single source of truth** for all API endpoints. It must be updated whenever new endpoints are added, modified, or removed.

## Base URL
All endpoints are prefixed with `/api/v1`.

## Authentication
This project uses **Supabase Auth**. The client authenticates directly with Supabase (via the Supabase SDK) and receives a signed **JWT**. That JWT must be passed in the `Authorization` header for all protected routes:

```
Authorization: Bearer <supabase_jwt>
```

The backend verifies the JWT signature against Supabase's JWKS endpoint using the `verify_supabase_token()` dependency defined in `app/api/dependencies.py`. **There are no custom auth routes** (`/login`, `/register`, `/refresh`) in this backend — Supabase owns all credential management.

### Identity Model
- **Users** and **Providers** are separate Supabase sign-up flows.
- A single person can hold both a `User` and a `Provider` identity using the same Supabase account UUID.
- The Supabase `auth.users.id` UUID is used directly as the Primary Key in both our `User` and `Provider` tables (no mapping column needed).
- After a successful Supabase sign-up, the client **must** call the respective `/sync` endpoint to create the application-level record.

---

## Endpoint Groups

---

### 1. Users — `routes/users.py`
Manages the end-user's application profile. All routes are protected.

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/users/me/sync` | Creates a `User` record in our DB using the Supabase JWT identity. Called once after sign-up. |
| `GET` | `/users/me` | Returns the authenticated user's full profile. |
| `PUT` | `/users/me` | Updates user profile fields (name, phone, address, geo_location, etc.). |
| `DELETE` | `/users/me` | Soft-deletes the user account by setting `is_active = False`. |

#### Request / Response Notes
- `POST /users/me/sync`: Body may include `full_name`, `phone_number`, `address_line1`, `city`, `state`, `postal_code`, `geo_location`. Returns the created `User` object. Is idempotent — calling it again updates the existing record.
- `DELETE /users/me`: Does **not** delete the record. Sets `is_active = False`. The Supabase account deletion must be handled separately on the client.

---

### 2. Providers — `routes/providers.py`
Manages provider profiles, their service offerings, weekly schedule, and time-off blocks.

#### Profile

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/providers/me/sync` | ✅ | Creates a `Provider` record using the Supabase JWT identity. Called once after provider sign-up. Idempotent. |
| `GET` | `/providers/me` | ✅ | Returns the authenticated provider's full profile. |
| `PUT` | `/providers/me` | ✅ | Updates provider profile (business name, contact, address, service radius, etc.). |
| `GET` | `/providers` | Public | Lists and searches providers. Supports query params: `?category_id=`, `?city=`, `?min_rating=`, `?page=`, `?limit=`. |
| `GET` | `/providers/{id}` | Public | Returns a specific provider's public profile. |

#### Offerings (Services Offered)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/providers/me/offerings` | ✅ | Lists all offerings for the authenticated provider. |
| `POST` | `/providers/me/offerings` | ✅ | Creates a new `ProviderOffering`. Body: `category_id`, `variant_name`, `base_price`, `hourly_rate`. |
| `PUT` | `/providers/me/offerings/{id}` | ✅ | Updates a specific offering. |
| `DELETE` | `/providers/me/offerings/{id}` | ✅ | Removes a specific offering. |

#### Schedule

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/providers/me/schedule` | ✅ | Returns the provider's full weekly availability schedule. |
| `PUT` | `/providers/me/schedule` | ✅ | Upserts the full weekly schedule. Body: array of `{day_of_week, start_time, end_time, is_active}`. |

#### Time-Off

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/providers/me/time-off` | ✅ | Adds a time-off block. Body: `start_datetime`, `end_datetime`, `reason`. |
| `DELETE` | `/providers/me/time-off/{id}` | ✅ | Removes a specific time-off block. |

---

### 3. Service Requests — `routes/requests.py`
The **core** of the application. Handles the creation and tracking of the async AI agent pipeline.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/requests` | ✅ | Submits a natural language prompt. Enqueues the agent pipeline (Intent → Discovery → Decision → Booking). Returns `{service_request_id, status: "pending"}` **immediately** without blocking. |
| `GET` | `/requests` | ✅ | Lists the authenticated user's past service requests (paginated). |
| `GET` | `/requests/{id}` | ✅ | Returns full detail of a service request, including `current_agent_stage` and last known output. |
| `GET` | `/requests/{id}/status` | ✅ | **Lightweight polling endpoint.** Returns `{id, current_agent_stage, status}` only. Designed for frequent client polling. |
| `GET` | `/requests/{id}/trace` | ✅ | Returns the full `AgentTrace` audit log for a request. Shows each agent's name, status, structured output, reasoning log, and execution time. |

#### Pipeline Lifecycle (`current_agent_stage`)
```
pending → intent → discovery → decision → booking → completed
                                                   ↘ failed
```

#### Request / Response Notes
- `POST /requests` body: `{ "prompt": "I need an electrician in Bangalore tomorrow morning" }`
- The pipeline runs in the background. The client should poll `GET /requests/{id}/status` until `status` is `completed` or `failed`.
- On `failed`, `GET /requests/{id}` will indicate which `current_agent_stage` failed and why (via `AgentTrace`).

---

### 4. Bookings — `routes/bookings.py`
Manages the final confirmed transactions created by the Booking agent.

#### User-facing

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/bookings` | ✅ | Lists the authenticated user's bookings (paginated). Supports `?status=` filter. |
| `GET` | `/bookings/{id}` | ✅ | Returns full booking detail. |
| `PUT` | `/bookings/{id}/cancel` | ✅ | User requests cancellation. Sets `status = Cancelled`. |

#### Provider-facing

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/providers/me/bookings` | ✅ | Lists bookings assigned to the authenticated provider (paginated). |
| `PUT` | `/providers/me/bookings/{id}/status` | ✅ | Provider updates booking status. Allowed transitions: `Pending → Confirmed`, `Confirmed → Completed`. Body: `{ "status": "Confirmed" }`. |

#### Payment Notes
- `payment_status` and `payment_intent_id` fields are present in the schema but **no payment gateway is integrated at this stage**. These are stubs for future Stripe integration.
- `payment_status` defaults to `"Pending"` and is not updated by any current endpoint.

---

### 5. Reviews — `routes/reviews.py`
Allows users to submit feedback after a completed booking.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/bookings/{booking_id}/review` | ✅ | Submits a review for a booking. Body: `{ "rating_score": 5, "comment": "..." }`. Booking must have `status = Completed`. One review per booking enforced. |
| `GET` | `/providers/{id}/reviews` | Public | Returns paginated list of reviews for a specific provider. |

---

### 6. Catalog — `routes/catalog.py`
Read-only catalog of available service categories. Data is admin-seeded.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/catalog/categories` | Public | Lists all active service categories. |
| `GET` | `/catalog/categories/{id}` | Public | Returns details for a specific service category. |

---

## Standard Response Envelope
All API responses follow a consistent structure:

```json
{
  "data": { ... },
  "message": "Success",
  "error": null
}
```

Error responses:
```json
{
  "data": null,
  "message": "Error description",
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "detail": "ServiceRequest with id '...' not found."
  }
}
```

## Standard HTTP Status Codes
| Code | Usage |
|------|-------|
| `200 OK` | Successful GET, PUT |
| `201 Created` | Successful POST (resource created) |
| `202 Accepted` | `POST /requests` — pipeline enqueued, not yet complete |
| `400 Bad Request` | Validation error |
| `401 Unauthorized` | Missing or invalid Supabase JWT |
| `403 Forbidden` | Authenticated but not authorized (e.g., accessing another user's resource) |
| `404 Not Found` | Resource not found |
| `409 Conflict` | Duplicate resource (e.g., calling `/sync` when record already fully exists) |
| `500 Internal Server Error` | Unexpected server error |
