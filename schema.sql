-- GlobeTrotter schema — run this in Supabase SQL editor
-- Supabase Auth already provides auth.users, we reference it via user_id uuid

create table if not exists trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  name text not null,
  start_date date,
  end_date date,
  description text,
  cover_photo_url text,
  is_public boolean default false,
  created_at timestamptz default now()
);

create table if not exists stops (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade not null,
  city_name text not null,
  country text,
  start_date date,
  end_date date,
  order_index int default 0
);

create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  stop_id uuid references stops(id) on delete cascade not null,
  name text not null,
  category text, -- sightseeing | food | adventure | culture | relaxation | custom
  cost numeric default 0,
  duration_hours numeric default 1,
  notes text,
  activity_date date,
  order_index int default 0
);

-- Reference data for "search" screens (fake search = filter this table)
create table if not exists city_catalog (
  id uuid primary key default gen_random_uuid(),
  city_name text not null,
  country text not null,
  cost_index int, -- 1 (cheap) - 5 (expensive)
  popularity int  -- 1-5
);

create table if not exists activity_catalog (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  city_name text, -- loosely associate with a city_catalog city_name
  typical_cost numeric,
  duration_hours numeric,
  description text
);

-- ================================================================
-- TRIPADVISOR-STYLE DISCOVERY & DAY PLANNER EXTENSIONS
-- ================================================================

-- Saves table (Personal saves pool independent of any specific trip)
create table if not exists saves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  place_id text, -- external place id from places API / Nominatim
  name text not null,
  category text, -- sightseeing | food | stay | flight | photo | note | adventure | culture
  photo_url text,
  description text,
  cost numeric default 0,
  city_name text,
  rating numeric default 4.5,
  address text,
  lat numeric,
  lng numeric,
  created_at timestamptz default now()
);

-- Day items table (Day-by-day scheduling layer per trip calendar date)
create table if not exists day_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade not null,
  item_date date not null,
  category text not null, -- photo | stay | food | place | flight | note | activity
  name text not null,
  cost numeric default 0,
  notes text,
  photo_url text,
  location_name text,
  source_save_id uuid references saves(id) on delete set null,
  source_activity_id uuid references activities(id) on delete set null,
  order_index int default 0,
  created_at timestamptz default now()
);

-- Row Level Security
alter table trips enable row level security;
alter table stops enable row level security;
alter table activities enable row level security;
alter table saves enable row level security;
alter table day_items enable row level security;

-- Policies for trips, stops, activities
drop policy if exists "own trips" on trips;
create policy "own trips" on trips
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "public trips readable" on trips;
create policy "public trips readable" on trips
  for select using (is_public = true);

drop policy if exists "stops via trip ownership" on stops;
create policy "stops via trip ownership" on stops
  for all using (exists (select 1 from trips where trips.id = stops.trip_id and trips.user_id = auth.uid()))
  with check (exists (select 1 from trips where trips.id = stops.trip_id and trips.user_id = auth.uid()));

drop policy if exists "activities via stop ownership" on activities;
create policy "activities via stop ownership" on activities
  for all using (exists (
    select 1 from stops join trips on trips.id = stops.trip_id
    where stops.id = activities.stop_id and trips.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from stops join trips on trips.id = stops.trip_id
    where stops.id = activities.stop_id and trips.user_id = auth.uid()
  ));

-- Policies for saves & day_items
drop policy if exists "own saves" on saves;
create policy "own saves" on saves
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "day items via trip ownership" on day_items;
create policy "day items via trip ownership" on day_items
  for all using (exists (select 1 from trips where trips.id = day_items.trip_id and trips.user_id = auth.uid()))
  with check (exists (select 1 from trips where trips.id = day_items.trip_id and trips.user_id = auth.uid()));

-- Catalog tables are public read
alter table city_catalog enable row level security;
drop policy if exists "anyone can read cities" on city_catalog;
create policy "anyone can read cities" on city_catalog for select using (true);

alter table activity_catalog enable row level security;
drop policy if exists "anyone can read activities" on activity_catalog;
create policy "anyone can read activities" on activity_catalog for select using (true);
