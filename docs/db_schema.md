# Database Schema Documentation

This document outlines the database schema for the application, designed to support the agentic workflow (Intent -> Discovery -> Decision -> Booking). It must be updated whenever the database design changes.

## Core Principles
- **Database Engine**: PostgreSQL for both local development and production environments.
- **ORM**: SQLModel.
- **Agent Tracking**: Every step of the agent workflow is tracked via the `AgentTrace` and `ServiceRequest` tables. We use `JSONB` to store flexible structured outputs natively in PostgreSQL.
- **Modularity**: The "One file serves one purpose" rule applies. Each model resides in its own dedicated file under `backend/app/models/`.

## Entities & Structure

### 1. User Management

#### `User` (`models/user.py`)
Represents the end-user initiating service requests.
- `id` (UUID v4, Primary Key)
- `full_name` (String)
- `email` (String, Unique)
- `hashed_password` (String, Optional)
- `phone_number` (String)
- `address_line1` (String)
- `city` (String)
- `state` (String)
- `postal_code` (String)
- `geo_location` (String/JSON, to store lat/lng coordinates)
- `is_active` (Boolean) - Soft delete flag
- `created_at` (Datetime)

### 2. Provider & Services

#### `Provider` (`models/provider.py`)
Represents the service providers (individuals or businesses).
- `id` (UUID v4, Primary Key)
- `business_name` (String)
- `contact_person` (String)
- `email` (String, Unique)
- `hashed_password` (String, Optional)
- `phone_number` (String)
- `address_line1` (String)
- `city` (String)
- `state` (String)
- `postal_code` (String)
- `service_radius_km` (Float)
- `rating` (Float)
- `is_active` (Boolean) - Soft delete flag
- `created_at` (Datetime)

#### `ServiceCategory` (`models/service_category.py`)
High-level categories for services.
- `id` (UUID v4, Primary Key)
- `name` (String, Unique) - e.g., "Electrician", "Plumber", "Mechanic"
- `description` (Text)

#### `ProviderOffering` (`models/provider_offering.py`)
Specific service variants offered by a provider within a category.
- `id` (UUID v4, Primary Key)
- `provider_id` (UUID v4, Foreign Key -> Provider.id)
- `category_id` (UUID v4, Foreign Key -> ServiceCategory.id)
- `variant_name` (String) - e.g., "Industrial Wiring", "HVAC Tech"
- `base_price` (Float)
- `hourly_rate` (Float)

#### `ProviderSchedule` (`models/provider_schedule.py`)
Availability schedule for a provider.
- `id` (UUID v4, Primary Key)
- `provider_id` (UUID v4, Foreign Key -> Provider.id)
- `day_of_week` (Integer, 0-6)
- `start_time` (Time)
- `end_time` (Time)
- `is_active` (Boolean) - Allows toggling availability on or off

#### `ProviderTimeOff` (`models/provider_time_off.py`)
Specific dates/times when a provider is unavailable (vacations, sick days).
- `id` (UUID v4, Primary Key)
- `provider_id` (UUID v4, Foreign Key -> Provider.id)
- `start_datetime` (Datetime)
- `end_datetime` (Datetime)
- `reason` (String)

### 3. Agent Workflow & Tracking

#### `ServiceRequest` (`models/service_request.py`)
Tracks the lifecycle of the user's initial natural language prompt.
- `id` (UUID v4, Primary Key)
- `user_id` (UUID v4, Foreign Key -> User.id)
- `raw_natural_language_prompt` (Text)
- `current_agent_stage` (String) - e.g., Intent, Discovery, Decision, Booking, Completed, Failed
- `status` (String)
- `created_at` (Datetime)
- `updated_at` (Datetime)

#### `AgentTrace` (`models/agent_trace.py`)
Audits and logs every single step, decision, and output made by the agents.
- `id` (UUID v4, Primary Key)
- `service_request_id` (UUID v4, Foreign Key -> ServiceRequest.id)
- `agent_name` (String) - e.g., "discovery_agent", "decision_agent"
- `status` (String) - e.g., "Success", "Failed"
- `structured_output` (JSONB) - Stores the strict Pydantic output returned by the LLM (allows flexible schemas across different service types).
- `reasoning_log` (Text)
- `execution_time_ms` (Integer)
- `created_at` (Datetime)

### 4. The Final Transaction

#### `Booking` (`models/booking.py`)
The finalized transaction linking a user, a provider offering, and an exact time.
- `id` (UUID v4, Primary Key)
- `user_id` (UUID v4, Foreign Key -> User.id)
- `provider_id` (UUID v4, Foreign Key -> Provider.id)
- `service_request_id` (UUID v4, Foreign Key -> ServiceRequest.id)
- `provider_offering_id` (UUID v4, Foreign Key -> ProviderOffering.id)
- `scheduled_start_time` (Datetime)
- `scheduled_end_time` (Datetime)
- `estimated_cost` (Float)
- `final_cost` (Float, Optional)
- `payment_status` (String) - e.g., Pending, Paid, Refunded
- `payment_intent_id` (String, Optional)
- `status` (String) - e.g., Pending, Confirmed, Completed, Cancelled
- `created_at` (Datetime)
- `updated_at` (Datetime)

#### `Review` (`models/review.py`)
Feedback left by a user for a provider after a booking is completed.
- `id` (UUID v4, Primary Key)
- `booking_id` (UUID v4, Foreign Key -> Booking.id)
- `user_id` (UUID v4, Foreign Key -> User.id)
- `provider_id` (UUID v4, Foreign Key -> Provider.id)
- `rating_score` (Integer, 1-5)
- `comment` (Text)
- `created_at` (Datetime)
