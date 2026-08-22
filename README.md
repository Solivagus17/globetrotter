# GlobeTrotter — Quick Start (get running in ~15 min)

## 1. Supabase (5 min)
1. Create a project at supabase.com
2. Go to SQL Editor → paste and run `schema.sql`
3. Go to Settings → API → copy:
   - Project URL
   - `anon` public key (frontend)
   - `service_role` key (backend — keep secret)
4. Go to Authentication → Providers → make sure Email is enabled (it is by default). For the hackathon, disable "Confirm email" under Authentication → Settings so signup logs users in immediately.

## 2. Backend (5 min)
```bash
cd backend
python -m venv venv && source venv/bin/activate   # or venv\Scripts\activate on Windows
pip install -r requirements.txt
cp .env.example .env   # fill in SUPABASE_URL and SUPABASE_SERVICE_KEY
python app.py          # runs on http://localhost:5000
```

## 3. Frontend (5 min)
```bash
cd frontend
npm install
cp .env.example .env   # fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev            # runs on http://localhost:5173
```

## What's built (MVP)
- Login/Signup (Supabase Auth)
- Dashboard — list/edit/delete trips
- Create Trip
- Itinerary Builder — search seeded cities, add as stops, add activities per stop (seeded catalog or custom)
- Itinerary View — timeline layout
- Budget — total + per-city cost breakdown

## What's intentionally cut (add only if time remains)
- Public shareable trip view — backend route `/api/public/trips/<id>` already exists, just needs a frontend page + a "make public" toggle on the trip
- Drag-to-reorder stops/activities — currently ordered by `order_index`, set at creation time
- Admin dashboard — marked optional in the brief, skip entirely
- Real city/activity search API — currently a seeded Postgres table (`city_catalog`, `activity_catalog`); add rows in Supabase table editor to expand it fast, no code changes needed

## Demo script (2 min)
1. Sign up → land on empty dashboard
2. Plan New Trip → fill name/dates → redirected to builder
3. Search "Paris" → add as stop → expand "Add activity" → add 2 seeded activities + 1 custom
4. Add a second stop (e.g. "Rome") with an activity
5. Click "View Itinerary" → show timeline
6. Click "Budget" → show total + per-city bars
