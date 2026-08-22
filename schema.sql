-- GlobeTrotter schema — run this in Supabase SQL editor
-- Supabase Auth already provides auth.users, we reference it via user_id uuid

create table trips (
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

create table stops (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade not null,
  city_name text not null,
  country text,
  start_date date,
  end_date date,
  order_index int default 0
);

create table activities (
  id uuid primary key default gen_random_uuid(),
  stop_id uuid references stops(id) on delete cascade not null,
  name text not null,
  category text, -- sightseeing | food | adventure | culture | relaxation
  cost numeric default 0,
  duration_hours numeric default 1,
  notes text,
  activity_date date,
  order_index int default 0
);

-- Reference data for "search" screens (fake search = filter this table)
create table city_catalog (
  id uuid primary key default gen_random_uuid(),
  city_name text not null,
  country text not null,
  cost_index int, -- 1 (cheap) - 5 (expensive)
  popularity int  -- 1-5
);

create table activity_catalog (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  city_name text, -- loosely associate with a city_catalog city_name
  typical_cost numeric,
  duration_hours numeric,
  description text
);

-- Row Level Security so users only see their own trips
alter table trips enable row level security;
alter table stops enable row level security;
alter table activities enable row level security;

create policy "own trips" on trips
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "public trips readable" on trips
  for select using (is_public = true);

create policy "stops via trip ownership" on stops
  for all using (exists (select 1 from trips where trips.id = stops.trip_id and trips.user_id = auth.uid()))
  with check (exists (select 1 from trips where trips.id = stops.trip_id and trips.user_id = auth.uid()));

create policy "activities via stop ownership" on activities
  for all using (exists (
    select 1 from stops join trips on trips.id = stops.trip_id
    where stops.id = activities.stop_id and trips.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from stops join trips on trips.id = stops.trip_id
    where stops.id = activities.stop_id and trips.user_id = auth.uid()
  ));

-- catalog tables are public read, no RLS needed (or enable read-only policy)
alter table city_catalog enable row level security;
create policy "anyone can read cities" on city_catalog for select using (true);
alter table activity_catalog enable row level security;
create policy "anyone can read activities" on activity_catalog for select using (true);

-- Public storage bucket for trip cover photos
-- (the backend also auto-creates this on startup; safe to run again)
insert into storage.buckets (id, name, public)
values ('trip-covers', 'trip-covers', true)
on conflict (id) do nothing;

-- Seed data so Itinerary/Activity "search" isn't empty on demo day
insert into city_catalog (city_name, country, cost_index, popularity) values
('Paris', 'France', 4, 5),
('Bangkok', 'Thailand', 2, 5),
('New York', 'USA', 5, 5),
('Bali', 'Indonesia', 2, 4),
('Rome', 'Italy', 3, 5),
('Tokyo', 'Japan', 4, 5),
('Lisbon', 'Portugal', 2, 4),
('Barcelona', 'Spain', 3, 5),
('Cape Town', 'South Africa', 2, 3),
('Sydney', 'Australia', 4, 4);

insert into activity_catalog (name, category, city_name, typical_cost, duration_hours, description) values
('Eiffel Tower Visit', 'sightseeing', 'Paris', 30, 2, 'Iconic tower with city views'),
('Louvre Museum Tour', 'culture', 'Paris', 20, 3, 'World-famous art museum'),
('Street Food Tour', 'food', 'Bangkok', 15, 2, 'Sample local dishes'),
('Grand Palace Visit', 'culture', 'Bangkok', 10, 2, 'Historic royal complex'),
('Broadway Show', 'culture', 'New York', 120, 3, 'Evening theatre show'),
('Central Park Walk', 'relaxation', 'New York', 0, 2, 'Free scenic walk'),
('Surf Lesson', 'adventure', 'Bali', 35, 2, 'Beginner surf lesson'),
('Rice Terrace Trek', 'adventure', 'Bali', 20, 3, 'Guided nature trek'),
('Colosseum Tour', 'sightseeing', 'Rome', 25, 2, 'Guided ancient ruins tour'),
('Pasta Making Class', 'food', 'Rome', 45, 3, 'Hands-on cooking class');
