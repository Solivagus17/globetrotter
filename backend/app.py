import os
from datetime import datetime, timedelta
from uuid import uuid4
import urllib.request
import urllib.parse
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")  # service role key, backend only
OPENTRIPMAP_KEY = os.environ.get("OPENTRIPMAP_KEY", "")

COVER_BUCKET = "trip-covers"
ALLOWED_IMAGE_TYPES = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif"}
MAX_COVER_SIZE = 5 * 1024 * 1024  # 5 MB

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

app = Flask(__name__)
CORS(app)

# In-memory city geocode and places photo cache
CITY_GEO_CACHE = {}
PHOTO_CACHE = {}
FALLBACK_SAVES = {}
FALLBACK_DAY_ITEMS = {}

CATEGORY_CURATED_PHOTOS = {
    "food": [
        "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=800&q=80"
    ],
    "sightseeing": [
        "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1543783207-ec64e4d95325?auto=format&fit=crop&w=800&q=80"
    ],
    "adventure": [
        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=800&q=80"
    ],
    "culture": [
        "https://images.unsplash.com/photo-1565008447742-97f6f38c985c?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&w=800&q=80",
        "https://images.unsplash.com/photo-1541447271487-09612b3f49f7?auto=format&fit=crop&w=800&q=80"
    ]
}

def ensure_cover_bucket():
    """Create the public storage bucket for trip covers if it doesn't exist yet."""
    try:
        supabase.storage.create_bucket(COVER_BUCKET, options={"public": True})
    except Exception:
        pass


ensure_cover_bucket()


def get_user_id():
    """Extract user id from the Supabase JWT sent by the frontend."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    token = auth_header.split(" ", 1)[1]
    try:
        user = supabase.auth.get_user(token)
        return user.user.id
    except Exception:
        return None


def require_user():
    uid = get_user_id()
    if not uid:
        return None, (jsonify({"error": "unauthorized"}), 401)
    return uid, None


def fetch_real_place_photo(place_name, city_name, category="sightseeing"):
    """Fetch real photograph from Wikipedia / Wikimedia Commons API."""
    cache_key = f"{place_name.lower().strip()}_{city_name.lower().strip()}"
    if cache_key in PHOTO_CACHE:
        return PHOTO_CACHE[cache_key]

    try:
        query = f"{place_name} {city_name}"
        wiki_url = f"https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch={urllib.parse.quote(query)}&gsrlimit=1&prop=pageimages&pithumbsize=800&format=json"
        req = urllib.request.Request(wiki_url, headers={"User-Agent": "GlobeTrotterApp/1.0 (contact@globetrotter.app)"})
        with urllib.request.urlopen(req, timeout=3) as response:
            data = json.loads(response.read().decode())
            pages = data.get("query", {}).get("pages", {})
            for pid, pdata in pages.items():
                thumb = pdata.get("thumbnail", {}).get("source")
                if thumb:
                    PHOTO_CACHE[cache_key] = thumb
                    return thumb
    except Exception as e:
        pass

    cat_photos = CATEGORY_CURATED_PHOTOS.get(category, CATEGORY_CURATED_PHOTOS.get("sightseeing", []))
    selected_photo = cat_photos[abs(hash(place_name)) % len(cat_photos)] if cat_photos else "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=800&q=80"
    PHOTO_CACHE[cache_key] = selected_photo
    return selected_photo


# ---------- TRIPS ----------

@app.route("/api/trips", methods=["GET"])
def list_trips():
    uid, err = require_user()
    if err:
        return err
    res = supabase.table("trips").select("*").eq("user_id", uid).order("created_at", desc=True).execute()
    return jsonify(res.data or [])


@app.route("/api/trips", methods=["POST"])
def create_trip():
    uid, err = require_user()
    if err:
        return err
    body = request.json or {}
    payload = {
        "user_id": uid,
        "name": body.get("name"),
        "start_date": body.get("start_date"),
        "end_date": body.get("end_date"),
        "description": body.get("description"),
        "cover_photo_url": body.get("cover_photo_url"),
    }
    res = supabase.table("trips").insert(payload).execute()
    return jsonify(res.data[0]), 201


@app.route("/api/trips/<trip_id>", methods=["GET"])
def get_trip(trip_id):
    uid, err = require_user()
    if err:
        return err
    trip = supabase.table("trips").select("*").eq("id", trip_id).eq("user_id", uid).single().execute()
    stops = supabase.table("stops").select("*, activities(*)").eq("trip_id", trip_id).order("order_index").execute()
    data = trip.data or {}
    data["stops"] = stops.data or []
    return jsonify(data)


@app.route("/api/trips/<trip_id>", methods=["PUT"])
def update_trip(trip_id):
    uid, err = require_user()
    if err:
        return err
    body = request.json or {}
    res = supabase.table("trips").update(body).eq("id", trip_id).eq("user_id", uid).execute()
    return jsonify(res.data)


@app.route("/api/trips/<trip_id>/cover", methods=["POST"])
def upload_cover(trip_id):
    uid, err = require_user()
    if err:
        return err

    existing = supabase.table("trips").select("id, cover_photo_url").eq("id", trip_id).eq("user_id", uid).execute()
    if not existing.data:
        return jsonify({"error": "trip not found"}), 404

    file = request.files.get("file")
    if not file or not file.filename:
        return jsonify({"error": "no file provided"}), 400
    ext = ALLOWED_IMAGE_TYPES.get(file.mimetype)
    if not ext:
        return jsonify({"error": "unsupported file type — use JPG, PNG, WebP or GIF"}), 400
    data = file.read()
    if len(data) == 0:
        return jsonify({"error": "file is empty"}), 400
    if len(data) > MAX_COVER_SIZE:
        return jsonify({"error": "image too large (max 5 MB)"}), 400

    object_path = f"{uid}/{trip_id}-{uuid4().hex}.{ext}"
    supabase.storage.from_(COVER_BUCKET).upload(
        object_path, data, {"content-type": file.mimetype, "upsert": "true"}
    )
    url = supabase.storage.from_(COVER_BUCKET).get_public_url(object_path)

    old_url = (existing.data[0] or {}).get("cover_photo_url")
    if old_url and f"/{COVER_BUCKET}/" in old_url:
        try:
            supabase.storage.from_(COVER_BUCKET).remove([old_url.split(f"/{COVER_BUCKET}/", 1)[1]])
        except Exception:
            pass

    supabase.table("trips").update({"cover_photo_url": url}).eq("id", trip_id).eq("user_id", uid).execute()
    return jsonify({"cover_photo_url": url})


@app.route("/api/trips/<trip_id>", methods=["DELETE"])
def delete_trip(trip_id):
    uid, err = require_user()
    if err:
        return err
    supabase.table("trips").delete().eq("id", trip_id).eq("user_id", uid).execute()
    return "", 204


# ---------- STOPS ----------

@app.route("/api/trips/<trip_id>/stops", methods=["POST"])
def add_stop(trip_id):
    uid, err = require_user()
    if err:
        return err
    body = request.json or {}
    payload = {
        "trip_id": trip_id,
        "city_name": body.get("city_name"),
        "country": body.get("country"),
        "start_date": body.get("start_date"),
        "end_date": body.get("end_date"),
        "order_index": body.get("order_index", 0),
    }
    res = supabase.table("stops").insert(payload).execute()
    return jsonify(res.data[0]), 201


@app.route("/api/stops/<stop_id>", methods=["PUT"])
def update_stop(stop_id):
    uid, err = require_user()
    if err:
        return err
    res = supabase.table("stops").update(request.json).eq("id", stop_id).execute()
    return jsonify(res.data)


@app.route("/api/stops/<stop_id>", methods=["DELETE"])
def delete_stop(stop_id):
    uid, err = require_user()
    if err:
        return err
    supabase.table("stops").delete().eq("id", stop_id).execute()
    return "", 204


# ---------- ACTIVITIES ----------

@app.route("/api/stops/<stop_id>/activities", methods=["POST"])
def add_activity(stop_id):
    uid, err = require_user()
    if err:
        return err
    body = request.json or {}
    payload = {
        "stop_id": stop_id,
        "name": body.get("name"),
        "category": body.get("category"),
        "cost": body.get("cost", 0),
        "duration_hours": body.get("duration_hours", 1),
        "notes": body.get("notes"),
        "activity_date": body.get("activity_date"),
        "order_index": body.get("order_index", 0),
    }
    res = supabase.table("activities").insert(payload).execute()
    return jsonify(res.data[0]), 201


@app.route("/api/activities/<activity_id>", methods=["PUT"])
def update_activity(activity_id):
    uid, err = require_user()
    if err:
        return err
    res = supabase.table("activities").update(request.json).eq("id", activity_id).execute()
    return jsonify(res.data)


@app.route("/api/activities/<activity_id>", methods=["DELETE"])
def delete_activity(activity_id):
    uid, err = require_user()
    if err:
        return err
    supabase.table("activities").delete().eq("id", activity_id).execute()
    return "", 204


# ---------- BUDGET ----------

@app.route("/api/trips/<trip_id>/budget", methods=["GET"])
def trip_budget(trip_id):
    uid, err = require_user()
    if err:
        return err
    stops = supabase.table("stops").select("*, activities(*)").eq("trip_id", trip_id).execute()
    
    day_items_data = []
    try:
        day_items = supabase.table("day_items").select("*").eq("trip_id", trip_id).execute()
        day_items_data = day_items.data or []
    except Exception:
        day_items_data = FALLBACK_DAY_ITEMS.get(trip_id, [])

    breakdown = {}
    total = 0

    for stop in (stops.data or []):
        stop_total = sum(float(a.get("cost") or 0) for a in stop.get("activities", []))
        breakdown[stop["city_name"]] = stop_total
        total += stop_total

    for item in day_items_data:
        if not item.get("source_activity_id"):
            loc = item.get("location_name") or "Scheduled Items"
            item_cost = float(item.get("cost") or 0)
            breakdown[loc] = breakdown.get(loc, 0) + item_cost
            total += item_cost

    return jsonify({"total": total, "by_city": breakdown})


# ---------- DISCOVERY LAYER & REAL PLACES SEARCH ----------

def geocode_city_osm(city_name):
    """Resolve city name to lat/lng using cache or Nominatim."""
    key = city_name.strip().lower()
    if key in CITY_GEO_CACHE:
        return CITY_GEO_CACHE[key]

    try:
        url = f"https://nominatim.openstreetmap.org/search?format=json&q={urllib.parse.quote(city_name)}&limit=1&accept-language=en"
        req = urllib.request.Request(url, headers={"User-Agent": "GlobeTrotterApp/1.0"})
        with urllib.request.urlopen(req, timeout=4) as response:
            data = json.loads(response.read().decode())
            if data and len(data) > 0:
                coords = {"lat": float(data[0]["lat"]), "lng": float(data[0]["lon"]), "address": data[0]["display_name"]}
                CITY_GEO_CACHE[key] = coords
                return coords
    except Exception as e:
        print(f"Geocoding error for {city_name}: {e}")

    return None


@app.route("/api/places/search", methods=["GET"])
def search_places():
    """
    TripAdvisor-style discovery endpoint.
    Searches real places for a city and category with ratings, photos, descriptions.
    """
    city = request.args.get("city", "").strip()
    category = request.args.get("category", "").strip().lower()
    query = request.args.get("q", "").strip()

    if not city:
        city = "Paris"

    results = []

    try:
        search_query = f"{query} {city}" if query else f"{category} in {city}" if category else city
        osm_url = f"https://nominatim.openstreetmap.org/search?format=json&q={urllib.parse.quote(search_query)}&addressdetails=1&limit=12&accept-language=en"
        req = urllib.request.Request(osm_url, headers={"User-Agent": "GlobeTrotterApp/1.0"})
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode())
            for idx, item in enumerate(data):
                address = item.get("address", {})
                name = item.get("name") or item.get("display_name", "").split(",")[0]
                place_type = item.get("type", "")
                cat = "food" if any(k in place_type for k in ["restaurant", "cafe", "food", "bar"]) else \
                      "sightseeing" if any(k in place_type for k in ["monument", "museum", "attraction", "tourism", "viewpoint"]) else \
                      "adventure" if "park" in place_type or "nature" in place_type else "culture"

                if category and category != "all" and cat != category:
                    continue

                rating = round(4.2 + (abs(hash(name)) % 8) / 10.0, 1)
                cost = 850 if cat == "food" else 1500 if cat == "sightseeing" else 2200 if cat == "adventure" else 600
                photo_url = fetch_real_place_photo(name, city, cat)

                results.append({
                    "id": str(item.get("osm_id") or f"place-{idx}"),
                    "name": name,
                    "category": cat,
                    "rating": rating,
                    "reviews_count": 95 + (abs(hash(name)) % 450),
                    "photo_url": photo_url,
                    "description": item.get("display_name", "")[:130],
                    "address": address.get("road") or address.get("suburb") or city,
                    "lat": float(item.get("lat", 0)),
                    "lng": float(item.get("lon", 0)),
                    "cost": cost,
                    "city_name": city
                })
    except Exception as e:
        print(f"Places live search failed: {e}")

    # Fallback to activity_catalog
    if not results:
        try:
            db_query = supabase.table("activity_catalog").select("*")
            if city:
                db_query = db_query.ilike("city_name", f"%{city}%")
            if category and category != "all":
                db_query = db_query.eq("category", category)
            cat_res = db_query.execute()
            for a in (cat_res.data or []):
                p_name = a.get("name")
                p_cat = a.get("category") or "sightseeing"
                p_photo = fetch_real_place_photo(p_name, city, p_cat)
                results.append({
                    "id": str(a.get("id")),
                    "name": p_name,
                    "category": p_cat,
                    "rating": 4.8,
                    "reviews_count": 140,
                    "photo_url": p_photo,
                    "description": a.get("description") or f"Popular spot in {city}",
                    "address": city,
                    "lat": 0.0,
                    "lng": 0.0,
                    "cost": float(a.get("typical_cost") or 1000),
                    "city_name": city
                })
        except Exception as e2:
            print(f"Catalog fallback failed: {e2}")

    return jsonify(results)


@app.route("/api/places/<place_id>", methods=["GET"])
def get_place_detail(place_id):
    """Fetch place details for single place view."""
    city = request.args.get("city", "Paris")
    name = request.args.get("name", "Historic Destination")
    cat = "sightseeing"
    photo_url = fetch_real_place_photo(name, city, cat)

    detail = {
        "id": place_id,
        "name": name,
        "city_name": city,
        "rating": 4.8,
        "reviews_count": 320,
        "category": cat,
        "photo_url": photo_url,
        "description": f"One of the most iconic highlights in {city}. Visitors love the rich history, vibrant ambiance, and unforgettable views.",
        "address": f"Central District, {city}",
        "lat": 48.8566 if "paris" in city.lower() else 41.9028 if "rome" in city.lower() else 35.6762,
        "lng": 2.3522 if "paris" in city.lower() else 12.4964 if "rome" in city.lower() else 139.6503,
        "cost": 1500,
        "duration_hours": 2.5,
    }
    return jsonify(detail)


# ---------- USER SAVES (Personal Saved Places Pool) ----------

@app.route("/api/saves", methods=["GET"])
def list_saves():
    uid, err = require_user()
    if err:
        return err

    try:
        res = supabase.table("saves").select("*").eq("user_id", uid).order("created_at", desc=True).execute()
        return jsonify(res.data or [])
    except Exception as e:
        print(f"Supabase saves table query failed (using in-memory): {e}")
        return jsonify(FALLBACK_SAVES.get(uid, []))


@app.route("/api/saves", methods=["POST"])
def create_save():
    uid, err = require_user()
    if err:
        return err

    body = request.json or {}
    save_id = str(uuid4())
    payload = {
        "id": save_id,
        "user_id": uid,
        "place_id": body.get("place_id"),
        "name": body.get("name"),
        "category": body.get("category"),
        "photo_url": body.get("photo_url"),
        "description": body.get("description"),
        "cost": body.get("cost", 0),
        "city_name": body.get("city_name"),
        "rating": body.get("rating"),
        "address": body.get("address"),
        "lat": body.get("lat"),
        "lng": body.get("lng"),
    }

    try:
        res = supabase.table("saves").insert(payload).execute()
        return jsonify(res.data[0]), 201
    except Exception as e:
        print(f"Supabase saves insert fallback: {e}")
        if uid not in FALLBACK_SAVES:
            FALLBACK_SAVES[uid] = []
        FALLBACK_SAVES[uid].insert(0, payload)
        return jsonify(payload), 201


@app.route("/api/saves/<save_id>", methods=["DELETE"])
def delete_save(save_id):
    uid, err = require_user()
    if err:
        return err

    try:
        supabase.table("saves").delete().eq("id", save_id).eq("user_id", uid).execute()
    except Exception as e:
        if uid in FALLBACK_SAVES:
            FALLBACK_SAVES[uid] = [s for s in FALLBACK_SAVES[uid] if s.get("id") != save_id]

    return "", 204


# ---------- TRIPADVISOR-STYLE DAY-BY-DAY PLANNER ----------

@app.route("/api/trips/<trip_id>/days", methods=["GET"])
def get_trip_days(trip_id):
    """Computes all dates from start_date to end_date with day_items."""
    uid, err = require_user()
    if err:
        return err

    trip_res = supabase.table("trips").select("*").eq("id", trip_id).eq("user_id", uid).single().execute()
    trip = trip_res.data
    if not trip:
        return jsonify({"error": "trip not found"}), 404

    stops_res = supabase.table("stops").select("*, activities(*)").eq("trip_id", trip_id).order("order_index").execute()
    stops = stops_res.data or []

    day_items = []
    try:
        items_res = supabase.table("day_items").select("*").eq("trip_id", trip_id).order("order_index").execute()
        day_items = items_res.data or []
    except Exception as e:
        day_items = FALLBACK_DAY_ITEMS.get(trip_id, [])

    start_str = trip.get("start_date")
    end_str = trip.get("end_date")

    days = []
    if start_str and end_str:
        try:
            cur = datetime.strptime(start_str, "%Y-%m-%d")
            end = datetime.strptime(end_str, "%Y-%m-%d")
            day_num = 1
            while cur <= end:
                d_str = cur.strftime("%Y-%m-%d")
                matching_stop = next((s for s in stops if s.get("start_date") and s.get("end_date") and s["start_date"] <= d_str <= s["end_date"]), None)
                city_name = matching_stop["city_name"] if matching_stop else (trip.get("description") or "Paris")
                matching_items = [it for it in day_items if it.get("item_date") == d_str]

                days.append({
                    "day_number": day_num,
                    "date": d_str,
                    "formatted_date": cur.strftime("%a, %b %d"),
                    "city_name": city_name,
                    "items": matching_items
                })
                cur += timedelta(days=1)
                day_num += 1
        except Exception as e:
            print(f"Error computing days: {e}")

    if not days:
        d_str = start_str or datetime.now().strftime("%Y-%m-%d")
        cur = datetime.now()
        days.append({
            "day_number": 1,
            "date": d_str,
            "formatted_date": cur.strftime("%a, %b %d"),
            "city_name": trip.get("description") or "Paris",
            "items": day_items
        })

    return jsonify({
        "trip": trip,
        "stops": stops,
        "days": days
    })


@app.route("/api/trips/<trip_id>/days/<item_date>/items", methods=["POST"])
def add_day_item(trip_id, item_date):
    """Adds a scheduled item to a specific day."""
    uid, err = require_user()
    if err:
        return err

    body = request.json or {}
    item_id = str(uuid4())
    payload = {
        "id": item_id,
        "trip_id": trip_id,
        "user_id": uid,
        "item_date": item_date,
        "category": body.get("category", "place"),
        "name": body.get("name", "Scheduled Entry"),
        "cost": float(body.get("cost", 0) or 0),
        "notes": body.get("notes", ""),
        "photo_url": body.get("photo_url", ""),
        "location_name": body.get("location_name", ""),
        "source_save_id": body.get("source_save_id"),
        "source_activity_id": body.get("source_activity_id"),
        "order_index": body.get("order_index", 0),
    }

    try:
        res = supabase.table("day_items").insert(payload).execute()
        return jsonify(res.data[0]), 201
    except Exception as e:
        print(f"Supabase day_items insert fallback: {e}")
        if trip_id not in FALLBACK_DAY_ITEMS:
            FALLBACK_DAY_ITEMS[trip_id] = []
        FALLBACK_DAY_ITEMS[trip_id].append(payload)
        return jsonify(payload), 201


@app.route("/api/day-items/<item_id>", methods=["DELETE"])
def delete_day_item(item_id):
    uid, err = require_user()
    if err:
        return err

    try:
        supabase.table("day_items").delete().eq("id", item_id).eq("user_id", uid).execute()
    except Exception as e:
        for tid in FALLBACK_DAY_ITEMS:
            FALLBACK_DAY_ITEMS[tid] = [it for it in FALLBACK_DAY_ITEMS[tid] if it.get("id") != item_id]

    return "", 204


if __name__ == "__main__":
    app.run(debug=True, port=5000)
