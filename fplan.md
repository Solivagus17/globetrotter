# GlobeTrotter — Feature Backlog

Context: React (Vite) frontend in `frontend/src`, Flask backend in `backend/app.py`, Supabase (Postgres + Auth) as the data layer. Schema lives in `schema.sql`. Existing pages: `Login.jsx`, `Dashboard.jsx`, `CreateTrip.jsx`, `ItineraryBuilder.jsx`, `ItineraryView.jsx`, `Budget.jsx`. API calls are centralized in `frontend/src/api.js`. Styling is plain CSS in `frontend/src/index.css` (no framework) — yellow theme, CSS vars defined at the top (`--primary`, `--bg`, `--border`, etc.), reuse existing classes/patterns rather than introducing new conventions.

Work through tiers in order. Each item should be a self-contained change — implement, verify it doesn't break existing pages, then move to the next. Don't touch files outside what's listed unless a dependency requires it.

---

## Tier 1 — Quick wins

### 1. Trip cover photo
- `schema.sql` already has `trips.cover_photo_url` — no migration needed.
- Add a `cover_photo_url` text input to `CreateTrip.jsx` (optional field, just a URL for now — no file upload).
- On `Dashboard.jsx`, render the photo as a banner/header image on `.trip-card` when present; fall back to current layout when absent.

### 2. Public trip toggle + read-only public view
- Backend: `/api/public/trips/<id>` already exists in `app.py`, filtering on `is_public = true`. No backend change needed unless you also want an endpoint to toggle it — reuse the existing `PUT /api/trips/<trip_id>` with `{"is_public": true/false}`.
- Frontend: add a toggle (checkbox or switch) on `ItineraryBuilder.jsx` or a trip settings area, calling `api.updateTrip(id, { is_public: value })`.
- New page `PublicTrip.jsx`: fetches `GET /api/public/trips/<id>` (no auth header needed — this route doesn't require login), renders read-only using the same timeline layout as `ItineraryView.jsx`. Add route `/public/trips/:tripId` in `App.jsx`, outside `RequireAuth`.
- Add a "Copy public link" button that copies `${window.location.origin}/public/trips/${tripId}` to clipboard.

### 3. Loading skeletons
- Replace plain "Loading..." text in `Dashboard.jsx`, `ItineraryBuilder.jsx`, `ItineraryView.jsx`, `Budget.jsx` with a simple skeleton block (a few gray/pulsing `div`s matching the shape of the content below).
- Add a `.skeleton` CSS class with a shimmer/pulse animation to `index.css`.

### 4. Success toasts
- Add a lightweight toast system: a `Toast.jsx` component + `useToast` hook (or simple state in `App.jsx` passed via context) that shows a small dismissible message in a corner of the screen for ~2s.
- Trigger on: add stop, add activity, delete actions, trip save — in `ItineraryBuilder.jsx`, `CreateTrip.jsx`, `Dashboard.jsx`.

### 5. Days-until-trip countdown
- In `Dashboard.jsx`, for trips with `status === 'upcoming'`, compute days until `start_date` and show it in the status pill or as a small line under the trip name (e.g. "in 12 days").

---

## Tier 2 — Medium effort

### 6. Reorder stops/activities (up/down arrows, not drag-and-drop)
- `stops.order_index` and `activities.order_index` already exist in the schema.
- In `ItineraryBuilder.jsx`, add up/down arrow buttons next to each stop and each activity within a stop. On click, swap `order_index` with the adjacent item via `api.updateStop` / `api.updateActivity`, then reload.
- Ensure `ItineraryBuilder.jsx` and `ItineraryView.jsx` both render stops/activities sorted by `order_index` (backend already orders stops by `order_index` in `GET /api/trips/<trip_id>`; activities are not currently explicitly sorted — add `.order('order_index')` to the activities query in `app.py`'s `get_trip`).

### 7. Stop date validation against trip dates
- In `ItineraryBuilder.jsx`, when setting a stop's start/end date, validate it falls within the parent trip's `start_date`/`end_date`. Show inline error, don't block save silently — just warn.

### 8. Budget target + overbudget warning
- Add a `budget_target` numeric column to `trips` in `schema.sql` (and instruct running the migration in Supabase SQL editor).
- Add the field to `CreateTrip.jsx` (optional).
- In `Budget.jsx`, compare `budget.total` to `trip.budget_target` (fetch trip via `api.getTrip`); show a red warning banner if over, green/neutral if under.

### 9. Duplicate/"Copy Trip"
- Backend: new endpoint `POST /api/trips/<trip_id>/duplicate` in `app.py` — copies the trip row (new id, same user), then all stops, then all activities per stop, preserving `order_index`.
- Frontend: add a "Copy Trip" button on `Dashboard.jsx` trip cards, calling this endpoint and refreshing the list.

### 10. Empty search states
- In `ItineraryBuilder.jsx`, when a city search or activity search returns zero results, show a small "No matches for '<query>'" message instead of an empty dropdown/list.

---

## Tier 3 — Bigger (only if Tier 1 & 2 are done and stable)

### 11. "Copy this trip" from public view into your own account
- On `PublicTrip.jsx`, if the viewer is logged in, show a "Copy to my trips" button that calls the duplicate logic (item 9) against the public trip id, creating a copy owned by the current user. Requires a backend variant of duplicate that doesn't require ownership, just `is_public = true`.

### 12. Calendar/list view toggle on Itinerary View
- Add a toggle in `ItineraryView.jsx` between the current timeline layout and a calendar-grid layout (group activities by `activity_date`). Calendar view can be a simple CSS grid, not a full calendar library, to keep it light.

### 13. Live trending destinations API (optional upgrade)
- Currently `/api/catalog/trending` sorts the seeded `city_catalog` table by `popularity`. To make it live: integrate Amadeus's Flight Most Traveled Destinations API (OAuth2 client-credentials flow) in `app.py`, with the seeded-table version as a fallback if the live call errors — never let this block the page.

### 14. Admin/analytics dashboard
- Skip unless everything else is done. Marked optional in the original brief.

---

## Tier 4 — Polish (do last)

- [ ] Favicon + `<title>` in `index.html`
- [ ] Mobile responsiveness pass on `ItineraryBuilder.jsx` and `ItineraryView.jsx` (test at ~375px width)
- [ ] Replace raw `error.message` displays with friendlier copy (e.g. "Something went wrong — try again") while still logging the real error to console
- [ ] Confirm all delete actions use a consistent confirm pattern (currently `window.confirm` — fine for hackathon scope, don't over-engineer)

---

## Definition of done (per item)
- Feature works end-to-end against the local Flask + Supabase setup described in `README.md`
- No existing page/flow regresses (spot-check Dashboard → Builder → View → Budget after each change)
- New CSS reuses existing variables/classes where possible instead of introducing a new visual style