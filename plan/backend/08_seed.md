# Phase 08 — Seed Mock Data

## Goal
Create the idempotent seed script that populates the database with 8 service categories and 24 providers (3 per category) across Islamabad sectors. This powers the demo scenario.

## Rule 5 — Use the Skill First
The `/seed-mock-data` skill generates this entire script. Run it before writing anything manually:
```
/seed-mock-data
```
The skill reads `docs/db_schema.md` and `backend/app/models/` to produce correct field names, then outputs `scripts/seed_mock_data.py` and `scripts/__init__.py`. Use the code below only if the skill output needs adjustment.

## Prerequisites
- Phase 02 (models) complete
- Phase 03 (config) complete
- DB is running and tables exist (run the app once to trigger `create_all`)

---

## `backend/scripts/__init__.py`

Empty file — makes `scripts/` a Python package so `python -m scripts.seed_mock_data` works.

---

## `backend/scripts/seed_mock_data.py`

```python
"""
Idempotent seed script. Safe to run multiple times.

IMPORTANT: Provider IDs are locally generated uuid.uuid4() values — they do NOT
correspond to Supabase auth.users.id. This is intentional for mock/demo data only.
Never use this approach for real production providers.

Run with: uv run python -m scripts.seed_mock_data
"""
from __future__ import annotations

import uuid
from datetime import time

from sqlmodel import Session, create_engine, select

from app.config import settings
from app.models.provider import Provider
from app.models.provider_offering import ProviderOffering
from app.models.provider_schedule import ProviderSchedule
from app.models.service_category import ServiceCategory

engine = create_engine(settings.database_url)


# ── Category data ────────────────────────────────────────────────────────────

CATEGORIES = [
    ("AC Technician",  "Air conditioning installation, repair, and maintenance"),
    ("Electrician",    "Wiring, fuse panels, appliance repair"),
    ("Plumber",        "Pipe fitting, drainage, water heater"),
    ("House Cleaner",  "Deep cleaning, regular domestic cleaning"),
    ("Tutor",          "Home tutoring across subjects and grade levels"),
    ("Painter",        "Interior and exterior painting"),
    ("Carpenter",      "Furniture repair, custom woodwork"),
    ("Mechanic",       "Car and motorcycle repair and servicing"),
]


# ── Provider data ─────────────────────────────────────────────────────────────
# Columns: business_name, contact_person, email, phone, address, city,
#          state, postal_code, geo_location, service_radius_km, rating,
#          category_name, variant_name, base_price, hourly_rate

PROVIDERS = [
    # ── AC Technician (G-13, G-11, F-10) ─────────────────────────────────────
    ("Ali AC Services",       "Ali Hassan",     "ali.ac@example.com",       "+92-300-0000001", "House 45, Street 7, G-13/1",   "Islamabad", "ICT", "44000", "33.6844,72.9747", 5.0, 4.7, "AC Technician",  "Split AC Repair",    1500, 800),
    ("Khan Cooling Works",    "Imran Khan",     "khan.cooling@example.com",  "+92-300-0000002", "Plot 12, G-11/3",               "Islamabad", "ICT", "44000", "33.6938,72.9904", 7.0, 4.2, "AC Technician",  "HVAC Installation",  2500, 1000),
    ("City Tech HVAC",        "Usman Ali",      "citytech.hvac@example.com", "+92-300-0000003", "Shop 3, F-10 Markaz",           "Islamabad", "ICT", "44000", "33.7092,73.0232", 8.0, 3.8, "AC Technician",  "Central AC Service", 3500, 1200),

    # ── Electrician (I-8, H-9, E-11) ─────────────────────────────────────────
    ("Rehman Electricals",    "Abdul Rehman",   "rehman.elec@example.com",   "+92-300-0000004", "House 22, I-8/2",               "Islamabad", "ICT", "44000", "33.6715,73.0566", 5.0, 4.5, "Electrician",    "Industrial Wiring",  2000, 900),
    ("Bright Sparks",         "Naveed Ahmad",   "bright.sparks@example.com", "+92-300-0000005", "Street 4, H-9/1",               "Islamabad", "ICT", "44000", "33.6627,73.0472", 6.0, 4.1, "Electrician",    "Home Wiring",        1200, 600),
    ("Power Fix Solutions",   "Farhan Malik",   "powerfix@example.com",      "+92-300-0000006", "E-11/4, near Park",             "Islamabad", "ICT", "44000", "33.7215,72.9847", 9.0, 3.6, "Electrician",    "Appliance Repair",   800,  500),

    # ── Plumber (G-13, I-8, F-10) ────────────────────────────────────────────
    ("Raja Plumbing",         "Raja Saleem",    "raja.plumbing@example.com", "+92-300-0000007", "House 8, Street 2, G-13/2",    "Islamabad", "ICT", "44000", "33.6844,72.9747", 4.0, 4.6, "Plumber",        "Pipe Fitting",       1000, 700),
    ("Islamabad Pipe Works",  "Zubair Shah",    "isb.pipes@example.com",     "+92-300-0000008", "Plot 55, I-8/1",                "Islamabad", "ICT", "44000", "33.6715,73.0566", 7.0, 4.0, "Plumber",        "Drainage Repair",    1500, 800),
    ("Flow Masters",          "Tahir Hussain",  "flowmasters@example.com",   "+92-300-0000009", "F-10/2, Street 9",              "Islamabad", "ICT", "44000", "33.7092,73.0232", 6.0, 3.7, "Plumber",        "Water Heater Fix",   2000, 900),

    # ── House Cleaner (G-11, H-9, E-11) ──────────────────────────────────────
    ("Sparkle Home Services", "Sadia Bibi",     "sparkle.home@example.com",  "+92-300-0000010", "House 14, G-11/1",              "Islamabad", "ICT", "44000", "33.6938,72.9904", 5.0, 4.8, "House Cleaner",  "Deep Cleaning",      2500, 1000),
    ("Clean Crew ISB",        "Rukhsana Naz",   "cleancrew@example.com",     "+92-300-0000011", "Street 6, H-9/4",               "Islamabad", "ICT", "44000", "33.6627,73.0472", 8.0, 4.3, "House Cleaner",  "Regular Cleaning",   1500, 700),
    ("ProClean Solutions",    "Amina Khatoon",  "proclean@example.com",      "+92-300-0000012", "E-11/2, Block B",               "Islamabad", "ICT", "44000", "33.7215,72.9847", 10.0, 3.9, "House Cleaner", "Post-Event Cleanup", 3000, 1200),

    # ── Tutor (F-10, G-13, G-11) ─────────────────────────────────────────────
    ("Elite Tutors ISB",      "Dr. Asma Tariq", "elite.tutors@example.com",  "+92-300-0000013", "House 7, F-10/4",               "Islamabad", "ICT", "44000", "33.7092,73.0232", 5.0, 4.9, "Tutor",          "O-Level Sciences",   2000, 1500),
    ("Bright Minds Academy",  "Prof. Kamran",   "brightminds@example.com",   "+92-300-0000014", "G-13/3, Street 11",             "Islamabad", "ICT", "44000", "33.6844,72.9747", 4.0, 4.4, "Tutor",          "Maths & Physics",    1500, 1200),
    ("Home Scholar",          "Hina Rashid",    "homescholar@example.com",   "+92-300-0000015", "House 3, G-11/2",               "Islamabad", "ICT", "44000", "33.6938,72.9904", 6.0, 4.0, "Tutor",          "Primary School",     1000, 800),

    # ── Painter (I-8, E-11, H-9) ─────────────────────────────────────────────
    ("Color Zone ISB",        "Nasir Iqbal",    "colorzone@example.com",     "+92-300-0000016", "I-8/3, Near Masjid",            "Islamabad", "ICT", "44000", "33.6715,73.0566", 6.0, 4.3, "Painter",        "Interior Painting",  3000, 1000),
    ("Royal Painters",        "Junaid Baig",    "royalpainters@example.com", "+92-300-0000017", "E-11/1, Main Road",             "Islamabad", "ICT", "44000", "33.7215,72.9847", 8.0, 4.0, "Painter",        "Exterior Painting",  4000, 1200),
    ("Fresh Coat Services",   "Waqar Ahmed",    "freshcoat@example.com",     "+92-300-0000018", "Street 3, H-9/2",               "Islamabad", "ICT", "44000", "33.6627,73.0472", 5.0, 3.8, "Painter",        "Wall Texture",       5000, 1500),

    # ── Carpenter (G-13, F-10, I-8) ──────────────────────────────────────────
    ("Master Woodworks",      "Ghulam Mustafa", "master.wood@example.com",   "+92-300-0000019", "House 33, G-13/4",              "Islamabad", "ICT", "44000", "33.6844,72.9747", 5.0, 4.5, "Carpenter",      "Furniture Repair",   1500, 900),
    ("Fine Furniture Fix",    "Pervaiz Akhtar", "finefurniture@example.com", "+92-300-0000020", "F-10/3, Street 5",              "Islamabad", "ICT", "44000", "33.7092,73.0232", 7.0, 4.1, "Carpenter",      "Custom Woodwork",    3000, 1200),
    ("Craftsman ISB",         "Manzoor Ahmad",  "craftsman@example.com",     "+92-300-0000021", "Plot 9, I-8/4",                 "Islamabad", "ICT", "44000", "33.6715,73.0566", 9.0, 3.7, "Carpenter",      "Cabinet Making",     2500, 1100),

    # ── Mechanic (H-9, G-11, E-11) ───────────────────────────────────────────
    ("AutoFix Islamabad",     "Shahid Mehmood", "autofix@example.com",       "+92-300-0000022", "H-9 Industrial Area",           "Islamabad", "ICT", "44000", "33.6627,73.0472", 8.0, 4.6, "Mechanic",       "Car Servicing",      2000, 1000),
    ("SpeedWrench",           "Bilal Chaudhry", "speedwrench@example.com",   "+92-300-0000023", "G-11/4, Mechanic Row",          "Islamabad", "ICT", "44000", "33.6938,72.9904", 6.0, 4.2, "Mechanic",       "Bike Repair",        800,  600),
    ("Capital Motors",        "Saeed Anwar",    "capitalmotors@example.com", "+92-300-0000024", "E-11/3, Transport Hub",         "Islamabad", "ICT", "44000", "33.7215,72.9847", 10.0, 3.9, "Mechanic",      "Engine Overhaul",    5000, 1500),
]


# ── Seed functions ────────────────────────────────────────────────────────────

def seed_categories(session: Session) -> dict[str, ServiceCategory]:
    result: dict[str, ServiceCategory] = {}
    for name, description in CATEGORIES:
        existing = session.exec(select(ServiceCategory).where(ServiceCategory.name == name)).first()
        if existing:
            result[name] = existing
        else:
            cat = ServiceCategory(name=name, description=description)
            session.add(cat)
            session.flush()
            result[name] = cat
    return result


def seed_providers(session: Session, categories: dict[str, ServiceCategory]) -> int:
    count = 0
    for row in PROVIDERS:
        (business_name, contact_person, email, phone, address, city,
         state, postal_code, geo_location, radius_km, rating,
         cat_name, variant_name, base_price, hourly_rate) = row

        existing = session.exec(select(Provider).where(Provider.email == email)).first()
        if existing:
            continue

        provider = Provider(
            id=uuid.uuid4(),
            business_name=business_name,
            contact_person=contact_person,
            email=email,
            phone_number=phone,
            address_line1=address,
            city=city,
            state=state,
            postal_code=postal_code,
            geo_location=geo_location,
            service_radius_km=radius_km,
            rating=rating,
            is_active=True,
        )
        session.add(provider)
        session.flush()

        offering = ProviderOffering(
            provider_id=provider.id,
            category_id=categories[cat_name].id,
            variant_name=variant_name,
            base_price=base_price,
            hourly_rate=hourly_rate,
        )
        session.add(offering)

        for day in range(7):
            schedule = ProviderSchedule(
                provider_id=provider.id,
                day_of_week=day,
                start_time=time(9, 0),
                end_time=time(18, 0),
                is_active=(day != 6),
            )
            session.add(schedule)

        count += 1
    return count


def main() -> None:
    print("Seeding mock data...")

    # Register all models with SQLModel metadata before create_all
    import app.models.user  # noqa: F401
    import app.models.provider  # noqa: F401
    import app.models.service_category  # noqa: F401
    import app.models.provider_offering  # noqa: F401
    import app.models.provider_schedule  # noqa: F401
    import app.models.provider_time_off  # noqa: F401
    import app.models.service_request  # noqa: F401
    import app.models.agent_trace  # noqa: F401
    import app.models.booking  # noqa: F401
    import app.models.review  # noqa: F401
    from sqlmodel import SQLModel
    SQLModel.metadata.create_all(engine)

    with Session(engine) as session:
        categories = seed_categories(session)
        print(f"  Categories : {len(categories)} seeded/confirmed")
        provider_count = seed_providers(session, categories)
        session.commit()
        print(f"  Providers  : {provider_count} new providers inserted")

    print(f"""
Dataset summary:
  Categories : 8
  Providers  : {provider_count} new (24 total when all seeded)
  Offerings  : {provider_count} (1 per provider)
  Schedules  : {provider_count * 7} (7 days × providers)

Demo scenario (AC Technician, G-13 area):
  Ali AC Services    (G-13, 2.1 km*, rating 4.7) ← expected winner
  Khan Cooling Works (G-11, 4.3 km*, rating 4.2)
  City Tech HVAC     (F-10, 6.1 km*, rating 3.8)
  * approximate straight-line distances from G-13

To run:
  uv run python -m scripts.seed_mock_data
""")


if __name__ == "__main__":
    main()
```

---

## Verification

```bash
cd backend
uv run python -m scripts.seed_mock_data

# Expected output:
# Seeding mock data...
#   Categories : 8 seeded/confirmed
#   Providers  : 24 new providers inserted
# Dataset summary: ...

# Run again → idempotency check (should show 0 new providers):
uv run python -m scripts.seed_mock_data
# Providers : 0 new providers inserted
```

## Done When
- Script runs without errors
- First run: 8 categories + 24 providers created
- Second run: 0 new rows, no errors
- `GET /api/v1/catalog/categories` returns 8 categories
- `GET /api/v1/providers?city=Islamabad` returns providers
