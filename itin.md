# Build Prompt: TripAdvisor-style Discovery Layer for GlobeTrotter

## Context (give this to the agent verbatim)

You are extending an existing travel planning app called GlobeTrotter. Stack: React (Vite) frontend in `frontend/src`, Flask backend in `backend/app.py`, Supabase (Postgres + Auth) as the data layer. Existing tables: `trips`, `stops`, `activities`, `city_catalog`, `activity_catalog`. Existing pages: `Login.jsx`, `Dashboard.jsx`, `CreateTrip.jsx`, `ItineraryBuilder.jsx`, `ItineraryView.jsx`, `Budget.jsx`. API calls are centralized in `frontend/src/api.js`. Styling is plain CSS in `frontend/src/index.css` — a yellow-themed design system with CSS vars (`--primary`, `--bg`, `--border`, `--radius`, `--shadow`, etc.) and existing component classes (`.trip-card`, `.stop-card`, `.chip`, `.btn`, `.status-pill`). Reuse this system; don't introduce a new visual language.

Your task: build a **discovery layer** — the part of a TripAdvisor-style product that lets users browse real places, see ratings/reviews, and add them straight into a trip — on top of the existing itinerary system. This is additive. Do not break existing trip/stop/activity CRUD or the auth flow.

---

## Goal

A user should be able to:
1. Search or browse destinations and see real places (attractions, restaurants, activities) with photos, ratings, and short descriptions — not just the static seeded catalog currently in `city_catalog`/`activity_catalog`.
2. Filter places by category (sightseeing, food, adventure, culture, relaxation) and sort by rating or popularity.
3. View a place's detail (photos, description, rating, address, map location).
4. Add any place directly into a trip stop as an activity, in one click, from the discovery view — this should reuse the existing `POST /api/stops/<stop_id>/activities` endpoint, just with the place's real data instead of manually typed data.
5. See places plotted on a map for a given city/stop.

Reviews/ratings themselves should come from a real data source (see Data Source section) — do not fabricate rating numbers or review text.

---

## End-to-end workflow

This is the full user journey the system should support, start to finish:

1. **Discover** — user browses/searches places (Discover.jsx) or saves places while browsing place details (PlaceDetail.jsx). Saving is a lightweight action, distinct from adding to a specific day — it goes into a personal "Saves" list first, not directly into an itinerary slot.
2. **Save** — a saved place is stored against the user (new `saves` table, see Data model below), independent of any trip. Users build up a pool of places they're interested in before committing them to a schedule.
3. **Plan** — user opens a trip's itinerary builder, which is organized **day by day** (one card/section per date of the trip, derived from `trips.start_date`→`end_date`), not just city by city as the current `ItineraryBuilder.jsx` does.
4. **Build each day** — for each day, the user either:
   - pulls in something from their **Saves** list, or
   - adds a **custom** entry directly (a place not in the system) via quick-add category buttons, or
   - searches fresh (same Discover search, inline) without leaving the day view.
5. **Review** — the assembled itinerary is viewable day-by-day (current `ItineraryView.jsx` becomes the read-only counterpart of this builder) and rolls up into the existing Budget view unchanged.
6. **Share** — existing public-view/share flow (Tier 3 item in FEATURE_BACKLOG.md) applies unchanged on top of this.

Net effect: today's model is `trip → stops(cities) → activities`. This adds a `trip → days → items` shape on top, where an item can reference an activity (existing table) OR a save (new table) OR a fully custom entry. Do not remove the existing stops/activities structure — stops still represent which cities the trip covers; days are the scheduling layer inside that.

---

Use a real places API for discovery data. Recommended, in order of preference for a fast build:

1. **OpenTripMap** (free tier, API key required, includes categories, descriptions, images, and Wikipedia-sourced info) — best balance of real data and setup speed.
2. **Geoapify Places API** (free tier, 3000 req/day, good POI + geocoding) — use if OpenTripMap coverage is thin for a given city.
3. **Nominatim (OpenStreetMap)** — no key needed, but geocoding only (no ratings/photos/POI detail) — use only as a fallback for resolving a city name to lat/lng if the above are unavailable.

Do not use Google Places unless the user explicitly confirms they have billing set up — it requires a linked billing account even on the free tier.

Store the API key server-side only (`.env` in `backend`), never expose it to the frontend. All third-party place calls go through the Flask backend, not directly from React.

---

## Backend work (`backend/app.py`)

1. Add a `places` module/section with:
   - `GET /api/places/search?city=<name>&category=<optional>` — geocodes the city (cache the lat/lng), then queries the places API for POIs in that category radius, normalizes the response into a consistent shape:
     ```json
     {
       "id": "...", "name": "...", "category": "...",
       "rating": 4.5, "photo_url": "...", "description": "...",
       "lat": 0.0, "lng": 0.0, "address": "..."
     }
     ```
   - `GET /api/places/<place_id>` — detail view for a single place (more description, more photos if available).
   - Handle API failures gracefully: if the places API errors or returns nothing, fall back to querying the existing `activity_catalog` table filtered by `city_name`, so the discovery view never shows a hard error or empty state due to a third-party outage.
2. Add simple in-memory or Postgres-backed caching for city geocode lookups (a `place_cache` table, or even just a Python dict for the hackathon) — avoid re-geocoding the same city on every request.
3. Reuse the existing `require_user()` pattern only where needed — place search/detail can be public (no auth needed to browse), but "add to trip" still goes through the existing authenticated `add_activity` endpoint.

---

## Frontend work (`frontend/src`)

1. New page `Discover.jsx`:
   - Search bar for a city (reuse the search-input pattern from `ItineraryBuilder.jsx`'s city search).
   - Category filter chips (reuse `.chip` class).
   - Sort dropdown: rating / popularity.
   - Grid of place cards: photo, name, category badge, star rating, short description, "Add to Trip" button.
   - "Add to Trip" opens a small picker (which trip → which stop) if the user has existing trips/stops, otherwise prompts to create a trip first. Calls the existing `api.addActivity(stopId, {...})`.
2. New page `PlaceDetail.jsx`: full photo, description, rating, address, small embedded map (see Map section), same "Add to Trip" action.
3. Add `discoverPlaces(city, category)` and `getPlace(id)` to `frontend/src/api.js`, following the existing `request()` pattern (no auth header required for these two, unlike the rest of the file).
4. Add routes `/discover` and `/discover/:placeId` in `App.jsx`, inside `RequireAuth` (browsing itself doesn't need auth, but keep it behind login for consistency with the rest of the app — note this as a deliberate simplification, not a hard requirement).
5. Add a "Discover" link to the navbar in `App.jsx`.
6. Optionally surface a "Discover places in {city}" shortcut button on each `.stop-card` in `ItineraryBuilder.jsx`, linking to `/discover?city=<stop.city_name>` — this is the highest-value integration point since it puts real place data exactly where users are already adding activities.

---

## Map integration

Use **Leaflet** with **OpenStreetMap tiles** (free, no API key) via the `react-leaflet` package — do not use Google Maps (billing) or Mapbox (needs a key) unless the user asks for it specifically.

- On `PlaceDetail.jsx`: a small static map centered on the place's lat/lng with a single marker.
- On `Discover.jsx`: optional — a map view toggle showing all currently-filtered places as markers, if time allows. Treat as Tier 2, not required for MVP.

---

## TripAdvisor-style itinerary builder UI (structure to replicate)

Reference: user-provided screenshot of TripAdvisor's itinerary tab. Replicate this structure inside a **new or reworked itinerary builder page** (`DayPlanner.jsx`, sitting alongside `ItineraryBuilder.jsx` — don't delete the existing stops/activities builder, this is a new scheduling layer on top of it, per the Workflow section above).

**Top-level tabs** (above the day list): `Saves | Itinerary | For You`
- `Saves` — grid/list of the user's saved places (from Discover), each with an "Add to day" action.
- `Itinerary` — the day-by-day planner described below. This is the default/active tab.
- `For You` — recommended places for this trip (can reuse the Discover search results for the trip's stop cities, or the Trending Destinations logic already built, scoped to relevant cities). Lower priority than the other two tabs — build last within this section.

**Day sections** (one per calendar day of the trip):
- Header row: `{Weekday, Day Month}` in bold (e.g. "Saturday, 8 Aug") + the city/location for that day as an underlined link (editable — lets the user reassign which city a day belongs to, pulling from the trip's existing stops), with a collapse/expand chevron on the right. Collapsed by default for past days, expanded for the current/next day.
- Inside each day: a **vertical timeline** — a thin vertical line down the left side connecting entries, each entry marked with a circular node. An empty day shows a single circular "+" node at the top of the timeline.
- **Empty state card**: a dashed-border box (no fill, subtle gray border, rounded corners matching `--radius`) with the text "Build your day by adding from your saves or adding custom travel details not on Tripadvisor." Centered vertically in the card, left-aligned text.
- **Quick-add icon row** below the empty state card (or below each existing entry, for adding the next one): a row of circular outline icon buttons, each ~48px, evenly spaced, representing entry types:
  - Photo (camera icon) — attach a photo/memory to the day, no scheduling implication
  - Stay (bed icon) — hotel/accommodation entry
  - Food (fork/knife icon) — restaurant/dining entry
  - Place (map pin icon) — general point of interest / attraction
  - Flight (plane icon) — transport entry
  - Note (document icon) — free-text custom note, not tied to a place
  - Search (magnifying glass icon) — opens inline search (same backend as Discover) scoped to that day's city
  - Cancel/close (X icon, no circle border, visually distinct from the rest) — dismisses the add row
- Clicking any category icon opens a small inline form or modal appropriate to that type (e.g. Stay → name, check-in/out, cost; Place → search-and-pick from Discover or type custom; Note → just a text field) and on submit creates a `day_items` row (see Data model) and renders it as a new node on the timeline below the existing ones.
- Once a day has entries, the timeline shows each as a card similar to the current `.stop-card`/activity-list styling — icon for its category, name, and cost if applicable — stacked in order, still with the dashed "add another" affordance at the bottom of that day's timeline rather than only at the top.

Use the existing yellow design system for all of this: circular icon buttons use `--border` outline by default, `--primary` on hover/active; the dashed empty-state box uses `--border` at a slightly heavier weight; day header chevron reuses whatever icon approach is already in the codebase (plain SVG or a small icon set — check if one is already imported before adding a new icon library).

---

## Data model additions

Add to `schema.sql`:

```sql
create table saves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  place_id text, -- external place id from the places API, nullable if manually saved
  name text not null,
  category text, -- sightseeing | food | stay | flight | photo | note
  photo_url text,
  description text,
  cost numeric,
  city_name text,
  created_at timestamptz default now()
);

create table day_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade not null,
  item_date date not null,
  category text not null, -- photo | stay | food | place | flight | note | activity
  name text,
  cost numeric default 0,
  notes text,
  source_save_id uuid references saves(id), -- set if this item came from a save
  source_activity_id uuid references activities(id), -- set if it references an existing activity
  order_index int default 0,
  created_at timestamptz default now()
);

alter table saves enable row level security;
create policy "own saves" on saves for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table day_items enable row level security;
create policy "day items via trip ownership" on day_items
  for all using (exists (select 1 from trips where trips.id = day_items.trip_id and trips.user_id = auth.uid()))
  with check (exists (select 1 from trips where trips.id = day_items.trip_id and trips.user_id = auth.uid()));
```

Backend endpoints to add in `app.py`:
- `GET/POST /api/saves` — list/create the user's saves
- `DELETE /api/saves/<id>`
- `GET /api/trips/<trip_id>/days` — returns one entry per calendar day between `start_date` and `end_date`, each with its `day_items` (join), so the frontend can render the full day-by-day structure in one call
- `POST /api/trips/<trip_id>/days/<date>/items` — create a day item (from a save, an existing activity, or fully custom fields)
- `DELETE /api/day-items/<id>`

---

## Build order (tiers)

**Tier 1 — MVP, build first**
- Backend: `/api/places/search`, fallback to `activity_catalog` on failure
- Frontend: `Discover.jsx` with search + category filter + "Add to Trip" (using the existing stops/activities model — this still works standalone even before the day planner exists)
- Navbar link

**Tier 2 — Saves + Day Planner (the TripAdvisor-structure work)**
- `saves` and `day_items` tables (see Data model)
- `Saves` action on `Discover.jsx` / `PlaceDetail.jsx` cards (separate button from "Add to Trip")
- `/api/trips/<trip_id>/days` + day item CRUD endpoints
- `DayPlanner.jsx` — the three-tab (Saves / Itinerary / For You) day-by-day view described above, replicating the reference screenshot's structure: collapsible day headers, vertical timeline, dashed empty-state card, circular quick-add icon row
- Wire quick-add categories (Photo/Stay/Food/Place/Flight/Note/Search) to create `day_items`, and Search reuses the Tier 1 places search scoped to that day's city

**Tier 3 — once Tier 1 & 2 work end-to-end**
- `PlaceDetail.jsx` + `/api/places/<id>`
- Leaflet map on the detail page
- "Discover places in {city}" shortcut from `ItineraryBuilder.jsx` stop cards
- `For You` tab recommendations on `DayPlanner.jsx`

**Tier 4 — polish, only if time remains**
- Map view toggle on `Discover.jsx` showing all results as pins
- Caching table for geocode results instead of in-memory dict
- Sort by rating/popularity, pagination or infinite scroll if a city returns many results
- Photo entries on a day actually support image upload/preview, not just a URL field

---

## Definition of done

- Discovery page works against a real API for at least one tested city, with a working fallback to seeded data if the API call fails or the key is missing.
- "Add to Trip" from Discover produces an activity identical in shape to one added manually via `ItineraryBuilder.jsx` — no schema divergence.
- No regression in existing trip/stop/activity/budget flows.
- Day planner visually matches the reference structure: tabs, collapsible day headers with editable location, vertical timeline with circular nodes, dashed empty-state card with the quick-add icon row, and new entries render as cards on the timeline immediately after creation.
- API key lives only in `backend/.env`, never in frontend code or committed to the repo.
- New CSS reuses existing design tokens/classes from `index.css` rather than introducing a new style.