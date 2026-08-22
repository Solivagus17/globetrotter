import os
import math
from datetime import datetime, timedelta
from uuid import uuid4
import urllib.request
import urllib.parse
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
from supabase import create_client, Client
from supabase.client import ClientOptions
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")  # service role key, backend only
OPENTRIPMAP_KEY = os.environ.get("OPENTRIPMAP_KEY", "")

COVER_BUCKET = "trip-covers"
ALLOWED_IMAGE_TYPES = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif"}
MAX_COVER_SIZE = 5 * 1024 * 1024  # 5 MB

options = ClientOptions(auto_refresh_token=False, persist_session=False)
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY, options=options)

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
    dest_city = (body.get("destination_city") or body.get("location") or "").strip()
    payload = {
        "user_id": uid,
        "name": body.get("name"),
        "start_date": body.get("start_date"),
        "end_date": body.get("end_date"),
        "description": body.get("description") or dest_city,
        "cover_photo_url": body.get("cover_photo_url"),
    }
    if dest_city:
        payload["destination_city"] = dest_city

    try:
        res = supabase.table("trips").insert(payload).execute()
        trip = res.data[0]
    except Exception as e:
        # Fallback if destination_city column is not yet in Supabase table
        if "destination_city" in payload:
            del payload["destination_city"]
            res = supabase.table("trips").insert(payload).execute()
            trip = res.data[0]
        else:
            return jsonify({"error": str(e)}), 400

    # Auto-seed primary initial stop
    if dest_city and trip and trip.get("id"):
        try:
            supabase.table("stops").insert({
                "trip_id": trip["id"],
                "city_name": dest_city,
                "start_date": body.get("start_date"),
                "end_date": body.get("end_date"),
                "order_index": 0,
            }).execute()
        except Exception as eStop:
            print(f"Initial stop auto-seed notice: {eStop}")

    return jsonify(trip), 201


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


# Comprehensive Global City POI & Attraction Database with accurate details
ACCURATE_GLOBAL_PLACES = {
    "ahmedabad": [
        {"name": "Sabarmati Ashram (Gandhi Ashram)", "category": "culture", "rating": 4.9, "reviews_count": 4200, "cost": 0, "description": "Mahatma Gandhi's historic headquarters on the tranquil banks of River Sabarmati with a poignant museum.", "address": "Gandhi Smarak Sangrahalaya, Ashram Rd, Ahmedabad"},
        {"name": "Adalaj Stepwell (Rudabai Stepwell)", "category": "sightseeing", "rating": 4.8, "reviews_count": 3100, "cost": 100, "description": "Intricate 5-story 15th-century subterranean architectural marvel featuring Solanki style carvings.", "address": "Adalaj, Gandhinagar Highway, Ahmedabad"},
        {"name": "Sidi Saiyyed Mosque (Tree of Life Jali)", "category": "culture", "rating": 4.8, "reviews_count": 2800, "cost": 0, "description": "16th-century mosque famed worldwide for its masterfully carved delicate marble filigree window screens.", "address": "Bhadra, Ahmedabad, Gujarat 380001"},
        {"name": "Manek Chowk Night Food Market", "category": "food", "rating": 4.9, "reviews_count": 3900, "cost": 450, "description": "Bustling historic jewel market by day, transforming into a street food paradise serving Gwalior dosa, maska bun & kulfi.", "address": "Manek Chowk, Old City, Ahmedabad"},
        {"name": "Kankaria Lake & Entertainment Hub", "category": "relaxation", "rating": 4.7, "reviews_count": 3600, "cost": 50, "description": "Sprawling 15th-century circular lake with light shows, toy train, zoo, and waterfront promenades.", "address": "Kankaria, Maninagar, Ahmedabad"},
        {"name": "Hutheesing Jain Temple", "category": "culture", "rating": 4.8, "reviews_count": 1900, "cost": 0, "description": "Ornate white marble 19th-century Jain sanctuary dedicated to Lord Dharmanatha with 52 shrines.", "address": "Shahibaug Rd, Bardolpura, Ahmedabad"},
        {"name": "Sarkhej Roza Architectural Complex", "category": "sightseeing", "rating": 4.7, "reviews_count": 2200, "cost": 0, "description": "Elegantly proportioned lakeside tomb and mosque complex dubbed the Acropolis of Ahmedabad.", "address": "Post Jeevraj Park, Sarkhej, Ahmedabad"},
        {"name": "Authentic Gujarati Thali & Farsan Walk", "category": "food", "rating": 4.9, "reviews_count": 2400, "cost": 650, "description": "All-you-can-eat Gujarati feast with Dhokla, Khandvi, Undhiyu, Shrikhand, and fresh rotlis.", "address": "Law Garden & Ashram Road, Ahmedabad"},
        {"name": "Sabarmati Riverfront Promenade", "category": "adventure", "rating": 4.7, "reviews_count": 2800, "cost": 0, "description": "Modern landscaped waterfront with cycling tracks, speed boat rides, and evening sunset views.", "address": "Sabarmati Riverfront Walk, Ahmedabad"},
    ],
    "mumbai": [
        {"name": "Gateway of India & Mumbai Harbor", "category": "sightseeing", "rating": 4.9, "reviews_count": 5600, "cost": 0, "description": "26m monumental basalt arch facing the Arabian Sea, standing beside the iconic Taj Mahal Palace.", "address": "Apollo Bandar, Colaba, Mumbai"},
        {"name": "Marine Drive (Queen's Necklace)", "category": "relaxation", "rating": 4.9, "reviews_count": 5200, "cost": 0, "description": "3.6-kilometer seaside promenade offering spectacular sunset vistas and evening sea breezes.", "address": "Netaji Subhash Chandra Bose Rd, Mumbai"},
        {"name": "Elephanta Caves UNESCO Island", "category": "culture", "rating": 4.7, "reviews_count": 3400, "cost": 600, "description": "Rock-cut cave temples dedicated to Lord Shiva dating from the 5th to 7th centuries.", "address": "Gharapuri Island, Mumbai Harbor"},
        {"name": "Chhatrapati Shivaji Maharaj Terminus", "category": "culture", "rating": 4.8, "reviews_count": 4100, "cost": 0, "description": "UNESCO World Heritage Victorian Gothic railway headquarters blending Indian architectural flourishes.", "address": "Fort, Mumbai, Maharashtra 400001"},
        {"name": "Colaba Causeway & Cafe Mondegar", "category": "food", "rating": 4.8, "reviews_count": 3300, "cost": 850, "description": "Bustling street shopping strip and vintage cafes serving cold beer, keema pav, and Continental snacks.", "address": "Shahid Bhagat Singh Rd, Colaba, Mumbai"},
        {"name": "Juhu Beach Chowpatty Street Food", "category": "food", "rating": 4.7, "reviews_count": 3800, "cost": 350, "description": "Savor authentic Mumbai Pav Bhaji, Sev Puri, Bhel Puri, and Kulfi Falooda along the beach.", "address": "Juhu Tara Rd, Juhu, Mumbai"},
        {"name": "Haji Ali Dargah Coastal Mosque", "category": "culture", "rating": 4.7, "reviews_count": 3700, "cost": 0, "description": "Famous 15th-century mosque located on an offshore inlet accessible via a pathway during low tide.", "address": "Dargah Rd, Haji Ali, Mumbai"},
    ],
    "delhi": [
        {"name": "Qutub Minar & Mehrauli Complex", "category": "sightseeing", "rating": 4.9, "reviews_count": 4900, "cost": 500, "description": "73-meter fluted red sandstone minaret built in 1192 surrounded by ancient architectural ruins.", "address": "Seth Sarai, Mehrauli, New Delhi"},
        {"name": "Red Fort (Lal Qila)", "category": "culture", "rating": 4.8, "reviews_count": 4600, "cost": 500, "description": "Grand 17th-century Mughal fortress of red sandstone, the historic seat of Mughal emperors.", "address": "Netaji Subhash Marg, Chandni Chowk, Old Delhi"},
        {"name": "India Gate & Kartavya Path", "category": "sightseeing", "rating": 4.8, "reviews_count": 5200, "cost": 0, "description": "42-meter triumphal arch war memorial flanked by illuminated fountains and manicured lawns.", "address": "Rajpath, India Gate, New Delhi"},
        {"name": "Humayun's Tomb Mughal Gardens", "category": "culture", "rating": 4.9, "reviews_count": 3800, "cost": 500, "description": "Splendid red sandstone garden tomb that served as the architectural inspiration for the Taj Mahal.", "address": "Mathura Rd, Nizamuddin East, New Delhi"},
        {"name": "Chandni Chowk & Paranthe Wali Gali", "category": "food", "rating": 4.8, "reviews_count": 4100, "cost": 400, "description": "Historic alley of Old Delhi famous for crisp stuffed parathas, jalebi, chole bhature, and chaat.", "address": "Chandni Chowk, Old Delhi 110006"},
        {"name": "Lotus Temple (Bahá'í House of Worship)", "category": "relaxation", "rating": 4.8, "reviews_count": 4300, "cost": 0, "description": "Architectural marvel composed of 27 free-standing white marble petals surrounded by nine tranquil ponds.", "address": "Lotus Temple Rd, Bahapur, New Delhi"},
        {"name": "Swaminarayan Akshardham Temple", "category": "culture", "rating": 4.9, "reviews_count": 4800, "cost": 250, "description": "Sprawling traditional sandstone temple complex showcasing millennia of Indian spirituality and art.", "address": "Noida Mor, Pandav Nagar, New Delhi"},
    ],
    "bengaluru": [
        {"name": "Lalbagh Botanical Garden & Glass House", "category": "relaxation", "rating": 4.8, "reviews_count": 3900, "cost": 100, "description": "240-acre botanical haven founded in 1760 featuring ancient trees and a Victorian glass house.", "address": "Mavalli, Bengaluru, Karnataka 560004"},
        {"name": "Bangalore Palace & Royal Grounds", "category": "culture", "rating": 4.7, "reviews_count": 3200, "cost": 450, "description": "Tudor-style royal estate boasting fortified towers, wood carvings, and grand ballrooms.", "address": "Vasanth Nagar, Bengaluru, Karnataka 560052"},
        {"name": "Cubbon Park & State Central Library", "category": "relaxation", "rating": 4.8, "reviews_count": 3400, "cost": 0, "description": "300-acre green lung in central Bangalore filled with bamboo groves and heritage red buildings.", "address": "Kasturba Rd, Sampangi Rama Nagar, Bengaluru"},
        {"name": "V.V. Puram Food Street Street Food Walk", "category": "food", "rating": 4.9, "reviews_count": 2800, "cost": 350, "description": "Famous culinary street serving crispy benne dosa, curd vadas, floating pani puri, and holige.", "address": "Old Blackpally, V.V. Puram, Bengaluru"},
        {"name": "Bannerghatta National Park Safari", "category": "adventure", "rating": 4.6, "reviews_count": 2900, "cost": 750, "description": "Wilderness safari featuring tigers, lions, elephants, and a dedicated butterfly conservatory.", "address": "Bannerghatta Rd, Bengaluru 560083"},
    ],
    "dubai": [
        {"name": "Burj Khalifa Observation Deck", "category": "sightseeing", "rating": 4.9, "reviews_count": 5400, "cost": 4200, "description": "World's tallest building soaring 828m with observation lounges offering jaw-dropping desert and gulf vistas.", "address": "1 Sheikh Mohammed bin Rashid Blvd, Downtown Dubai"},
        {"name": "Dubai Mall & Fountain Lake Show", "category": "sightseeing", "rating": 4.8, "reviews_count": 4800, "cost": 0, "description": "Premier shopping entertainment hub featuring choreographed fountain performances and giant indoor aquarium.", "address": "Downtown Dubai, Dubai, UAE"},
        {"name": "Desert Safari with Dune Bashing & BBQ", "category": "adventure", "rating": 4.9, "reviews_count": 3800, "cost": 3600, "description": "Thrill-filled 4x4 dune rides, sandboarding, camel treks, and stargazing dinner in Bedouin desert camp.", "address": "Dubai Desert Conservation Reserve"},
        {"name": "Dubai Marina Yacht Cruise & Dinner", "category": "relaxation", "rating": 4.8, "reviews_count": 2600, "cost": 2800, "description": "Luxury dinner cruise gliding past dazzling illuminated skyscrapers and Ain Dubai Ferris Wheel.", "address": "Dubai Marina Promenade, Dubai"},
        {"name": "Al Fahidi Historic District & Gold Souk", "category": "culture", "rating": 4.7, "reviews_count": 2400, "cost": 400, "description": "Wind-tower architecture, abra boat rides across Dubai Creek, and sparkling spice and gold bazaars.", "address": "Al Fahidi, Bur Dubai, Dubai"},
    ],
    "singapore": [
        {"name": "Gardens by the Bay & Supertree Grove", "category": "sightseeing", "rating": 4.9, "reviews_count": 5100, "cost": 1800, "description": "Futuristic 101-hectare park with towering vertical gardens and climate-controlled Cloud Forest dome.", "address": "18 Marina Gardens Dr, Singapore 018953"},
        {"name": "Marina Bay Sands SkyPark Observation Deck", "category": "sightseeing", "rating": 4.8, "reviews_count": 4200, "cost": 2200, "description": "57 stories above Marina Bay offering 360-degree panoramas of the Singapore city skyline and sea.", "address": "10 Bayfront Ave, Singapore 018956"},
        {"name": "Hawker Center Street Food Experience", "category": "food", "rating": 4.9, "reviews_count": 3600, "cost": 650, "description": "Sample UNESCO-recognized street food: Hainanese chicken rice, chili crab, laksa, and satay skewers.", "address": "Maxwell & Lau Pa Sat Food Centers, Singapore"},
        {"name": "Sentosa Island & Universal Studios", "category": "adventure", "rating": 4.7, "reviews_count": 3900, "cost": 4800, "description": "Island resort with rollercoasters, white sand beaches, cable car rides, and maritime attractions.", "address": "Sentosa Island, Singapore"},
        {"name": "Chinatown & Buddha Tooth Relic Temple", "category": "culture", "rating": 4.8, "reviews_count": 2900, "cost": 0, "description": "Rich cultural district featuring ornate Buddhist and Hindu temples, tea houses, and heritage markets.", "address": "288 South Bridge Rd, Singapore 058840"},
    ],
    "bali": [
        {"name": "Uluwatu Cliff Temple & Sunset Kecak Dance", "category": "culture", "rating": 4.9, "reviews_count": 4200, "cost": 900, "description": "Balinese sea temple perched on a 70m sheer cliff overlooking crashing Indian Ocean waves with fire dance.", "address": "Pecatu, South Kuta, Badung, Bali"},
        {"name": "Tegallalang Rice Terraces & Jungle Swing", "category": "adventure", "rating": 4.8, "reviews_count": 3800, "cost": 850, "description": "Emerald cascading stepped valleys in Ubud with jungle swings and traditional subak irrigation.", "address": "Jl. Raya Tegallalang, Gianyar, Bali"},
        {"name": "Jimbaran Bay Candlelight Seafood Dinner", "category": "food", "rating": 4.8, "reviews_count": 2800, "cost": 1600, "description": "Freshly caught grilled red snapper, jumbo prawns, and squid served right on the beach sands at sunset.", "address": "Jimbaran Beach, South Kuta, Bali"},
        {"name": "Sacred Monkey Forest Sanctuary", "category": "sightseeing", "rating": 4.7, "reviews_count": 3400, "cost": 500, "description": "Mystical moss-covered Hindu temple complex home to over 1,000 playful Balinese long-tailed macaques.", "address": "Jl. Monkey Forest, Ubud, Gianyar, Bali"},
        {"name": "Nusa Penida Kelingking 'T-Rex' Viewpoint", "category": "adventure", "rating": 4.9, "reviews_count": 3100, "cost": 2400, "description": "World-famous cliff formation resembling a Tyrannosaurus Rex overlooking secluded turquoise waters.", "address": "Bunga Mekar, Nusa Penida, Klungkung, Bali"},
    ],
    "bangkok": [
        {"name": "The Grand Palace & Temple of Emerald Buddha", "category": "culture", "rating": 4.9, "reviews_count": 4800, "cost": 1400, "description": "Spectacular royal complex of gilded spires, intricate mosaics, and the sacred Phra Kaew Buddha.", "address": "Na Phra Lan Rd, Phra Borom Maha Ratchawang, Bangkok"},
        {"name": "Wat Arun (Temple of Dawn)", "category": "sightseeing", "rating": 4.8, "reviews_count": 3900, "cost": 250, "description": "Stunning riverside Buddhist temple adorned with colorful porcelain mosaics rising along Chao Phraya.", "address": "158 Thanon Wang Doem, Bangkok Yai, Bangkok"},
        {"name": "Chinatown (Yaowarat) Street Food Crawl", "category": "food", "rating": 4.9, "reviews_count": 3400, "cost": 550, "description": "World's most famous street food hub serving sizzling pad thai, crab fried rice, mango sticky rice, and dim sum.", "address": "Yaowarat Rd, Samphanthawong, Bangkok"},
        {"name": "Chao Phraya River Dinner Cruise", "category": "adventure", "rating": 4.8, "reviews_count": 2600, "cost": 2400, "description": "Illuminated luxury cruise passing lighted temples with live Thai music and buffet dining.", "address": "ICONSIAM Pier, Khlong San, Bangkok"},
        {"name": "Chatuchak Weekend Market Experience", "category": "sightseeing", "rating": 4.7, "reviews_count": 3800, "cost": 0, "description": "One of the world's largest open-air weekend bazaars with 15,000+ stalls of crafts, fashion, and food.", "address": "Kamphaeng Phet 2 Rd, Chatuchak, Bangkok"},
    ],
    "paris": [
        {"name": "Eiffel Tower & Champ de Mars", "category": "sightseeing", "rating": 4.9, "reviews_count": 4820, "cost": 2800, "description": "Iconic 330m iron lattice tower offering breathtaking panoramic views over Paris.", "address": "Champ de Mars, 5 Av. Anatole France, 7th arr."},
        {"name": "Louvre Museum", "category": "sightseeing", "rating": 4.8, "reviews_count": 3950, "cost": 2200, "description": "World's largest art museum, home to the Mona Lisa, Venus de Milo, and Winged Victory.", "address": "Rue de Rivoli, 1st arr., Paris"},
        {"name": "Sainte-Chapelle & Palais de la Cité", "category": "culture", "rating": 4.9, "reviews_count": 1640, "cost": 1400, "description": "13th-century Gothic royal chapel famed for its towering, vibrant stained-glass windows.", "address": "10 Bd du Palais, 1st arr., Paris"},
        {"name": "Musée d'Orsay", "category": "sightseeing", "rating": 4.8, "reviews_count": 2890, "cost": 1600, "description": "Former Beaux-Arts railway station housing masterpieces by Monet, Van Gogh, and Renoir.", "address": "1 Rue de la Légion d'Honneur, 7th arr."},
        {"name": "Sacré-Cœur Basilica & Montmartre", "category": "culture", "rating": 4.7, "reviews_count": 3200, "cost": 0, "description": "Dazzling white basilica perched atop Montmartre hill overlooking historic bohemian alleys.", "address": "35 Rue du Chevalier de la Barre, 18th arr."},
        {"name": "Seine River Sunset Sightseeing Cruise", "category": "adventure", "rating": 4.8, "reviews_count": 1420, "cost": 1800, "description": "Scenic boat cruise gliding past illuminated Parisian monuments, bridges, and Notre-Dame.", "address": "Port de la Bourdonnais, 7th arr."},
        {"name": "Le Marais Gourmet Street Food Walk", "category": "food", "rating": 4.8, "reviews_count": 980, "cost": 1500, "description": "Taste artisanal croissants, L'As du Fallafel, gourmet cheeses, and French pastries.", "address": "Rue des Rosiers, 4th arr., Paris"},
        {"name": "Traditional French Bistro & Wine Tasting", "category": "food", "rating": 4.7, "reviews_count": 860, "cost": 3200, "description": "Authentic dining featuring Beef Bourguignon, duck confit, and sommelier-paired wines.", "address": "Saint-Germain-des-Prés, 6th arr."},
        {"name": "Jardin du Luxembourg & Medici Fountain", "category": "relaxation", "rating": 4.8, "reviews_count": 1820, "cost": 0, "description": "Lush 17th-century palace gardens featuring grand tree-lined promenades and vintage sailboats.", "address": "6th arr., Paris"},
        {"name": "Arc de Triomphe & Champs-Élysées", "category": "sightseeing", "rating": 4.7, "reviews_count": 2750, "cost": 1500, "description": "Monumental triumphal arch honoring French soldiers with a scenic rooftop terrace.", "address": "Pl. Charles de Gaulle, 8th arr."},
    ],
    "rome": [
        {"name": "Colosseum & Ancient Flavian Amphitheatre", "category": "sightseeing", "rating": 4.9, "reviews_count": 5200, "cost": 2600, "description": "Magnificent 2,000-year-old amphitheater that hosted gladiatorial contests in Ancient Rome.", "address": "Piazza del Colosseo, 1, Rome"},
        {"name": "Vatican Museums & Sistine Chapel", "category": "sightseeing", "rating": 4.9, "reviews_count": 4600, "cost": 2800, "description": "Papal art galleries culminating in Michelangelo's breathtaking painted ceiling masterpiece.", "address": "Viale Vaticano, Vatican City"},
        {"name": "Pantheon & Piazza della Rotonda", "category": "culture", "rating": 4.8, "reviews_count": 3100, "cost": 500, "description": "Remarkably preserved ancient Roman temple crowned with the world's largest unreinforced concrete dome.", "address": "Piazza della Rotonda, Rome"},
        {"name": "Trevi Fountain Coin Toss", "category": "sightseeing", "rating": 4.8, "reviews_count": 4800, "cost": 0, "description": "World-famous Baroque fountain where visitors toss coins to ensure their return to Rome.", "address": "Piazza di Trevi, Rome"},
        {"name": "Trastevere Food Tour & Carbonara Tasting", "category": "food", "rating": 4.9, "reviews_count": 1450, "cost": 2800, "description": "Explore cobblestone alleys sampling authentic Roman carbonara, supplì, and artisanal gelato.", "address": "Trastevere, Rome"},
        {"name": "Roman Forum & Palatine Hill", "category": "culture", "rating": 4.7, "reviews_count": 2600, "cost": 2200, "description": "Sprawling archaeological heart of ancient Rome with temples, basilicas, and imperial palaces.", "address": "Via della Salara Vecchia, Rome"},
        {"name": "Artisanal Gelato & Espresso Tasting", "category": "food", "rating": 4.8, "reviews_count": 890, "cost": 650, "description": "Sample pistachio, stracciatella, and handcrafted espresso at historic Roman cafes.", "address": "Centro Storico, Rome"},
        {"name": "Villa Borghese Gardens & Rowboats", "category": "relaxation", "rating": 4.7, "reviews_count": 1350, "cost": 850, "description": "Peaceful landscape gardens featuring tranquil lakes, shaded pathways, and panoramic city vistas.", "address": "Piazzale Napoleone I, Rome"},
    ],
    "tokyo": [
        {"name": "Senso-ji Temple & Asakusa District", "category": "culture", "rating": 4.8, "reviews_count": 4100, "cost": 0, "description": "Tokyo's oldest and most revered Buddhist temple entered through the iconic Kaminarimon Gate.", "address": "2-3-1 Asakusa, Taito City, Tokyo"},
        {"name": "Shibuya Crossing & Hachiko Statue", "category": "sightseeing", "rating": 4.7, "reviews_count": 3600, "cost": 0, "description": "World's busiest pedestrian intersection illuminated by towering neon billboards and energetic pulse.", "address": "Shibuya City, Tokyo"},
        {"name": "Tsukiji Outer Market Fresh Sushi Tour", "category": "food", "rating": 4.9, "reviews_count": 2150, "cost": 2400, "description": "Taste world-class sashimi, freshly grilled wagyu skewers, tamagoyaki, and matcha treats.", "address": "4-16-2 Tsukiji, Chuo City, Tokyo"},
        {"name": "Meiji Jingu Shinto Shrine & Yoyogi Forest", "category": "relaxation", "rating": 4.8, "reviews_count": 2900, "cost": 0, "description": "Serene shrine surrounded by 170 acres of evergreen forest in the vibrant heart of the city.", "address": "1-1 Yoyogikamizonocho, Shibuya City"},
        {"name": "Tokyo Skytree Observation Deck", "category": "sightseeing", "rating": 4.7, "reviews_count": 3100, "cost": 2200, "description": "634m broadcasting tower offering sweeping vistas extending to Mount Fuji on clear days.", "address": "1-1-2 Oshiage, Sumida City, Tokyo"},
        {"name": "Ramen Street & Izakaya Crawl in Shinjuku", "category": "food", "rating": 4.8, "reviews_count": 1680, "cost": 1800, "description": "Sample rich tonkotsu broth, gyoza, and yakitori inside atmospheric Memory Lane alleys.", "address": "Omoide Yokocho, Shinjuku, Tokyo"},
        {"name": "Akihabara Electronics & Anime Town", "category": "adventure", "rating": 4.6, "reviews_count": 2400, "cost": 800, "description": "Electric town packed with multi-story gadget markets, themed cafes, and pop culture hubs.", "address": "Sotokanda, Chiyoda City, Tokyo"},
    ],
    "london": [
        {"name": "Big Ben & Palace of Westminster", "category": "sightseeing", "rating": 4.8, "reviews_count": 4200, "cost": 0, "description": "Iconic neo-Gothic clock tower and British Parliament alongside the River Thames.", "address": "Westminster, London SW1A 0AA"},
        {"name": "Tower of London & Crown Jewels", "category": "culture", "rating": 4.8, "reviews_count": 3800, "cost": 3400, "description": "Historic medieval fortress housing the royal Crown Jewels and guarded by Yeoman Warders.", "address": "Tower Hill, London EC3N 4AB"},
        {"name": "British Museum World Antiquities", "category": "sightseeing", "rating": 4.9, "reviews_count": 4900, "cost": 0, "description": "Global museum housing the Rosetta Stone, Parthenon sculptures, and ancient Egyptian mummies.", "address": "Great Russell St, London WC1B 3DG"},
        {"name": "Borough Market Artisanal Street Food", "category": "food", "rating": 4.8, "reviews_count": 2800, "cost": 1400, "description": "Centuries-old gourmet food market offering hot salt beef bagels, truffle pasta, and British ciders.", "address": "8 Southwark St, London SE1 1TL"},
        {"name": "London Eye Panoramic Flight", "category": "sightseeing", "rating": 4.6, "reviews_count": 3600, "cost": 3600, "description": "135m giant cantilevered observation wheel on the South Bank with 360-degree city panoramas.", "address": "Riverside Building, County Hall, London"},
        {"name": "Hyde Park & Kensington Gardens Stroll", "category": "relaxation", "rating": 4.7, "reviews_count": 2100, "cost": 0, "description": "Royal park featuring the Serpentine lake, Italian water gardens, and Princess Diana memorial.", "address": "Kensington, London W2 2UH"},
    ],
    "new york": [
        {"name": "Central Park & Bethesda Terrace", "category": "relaxation", "rating": 4.9, "reviews_count": 5800, "cost": 0, "description": "Iconic 843-acre urban oasis with bridges, tree-lined walking malls, and lake rowboats.", "address": "Central Park, Manhattan, NY"},
        {"name": "Statue of Liberty & Ellis Island", "category": "sightseeing", "rating": 4.8, "reviews_count": 4500, "cost": 2600, "description": "Colossal neoclassical sculpture on Liberty Island symbolizing freedom and welcoming immigrants.", "address": "Liberty Island, New York, NY 10004"},
        {"name": "Metropolitan Museum of Art (The Met)", "category": "culture", "rating": 4.9, "reviews_count": 4900, "cost": 2800, "description": "One of the world's greatest art museums spanning 5,000 years of global human creativity.", "address": "1000 5th Ave, New York, NY 10028"},
        {"name": "Times Square & Broadway Theater District", "category": "adventure", "rating": 4.6, "reviews_count": 4200, "cost": 0, "description": "Bustling illuminated commercial hub celebrated for Broadway musicals, performers, and energy.", "address": "Broadway & 7th Ave, Manhattan, NY"},
        {"name": "Chelsea Market & High Line Elevated Park", "category": "food", "rating": 4.8, "reviews_count": 3100, "cost": 1600, "description": "Stroll the landscaped rail-trail and savor Maine lobster rolls, artisan tacos, and baked goods.", "address": "75 9th Ave, New York, NY 10011"},
    ],
    "goa": [
        {"name": "Calangute & Baga Beach Water Sports", "category": "adventure", "rating": 4.6, "reviews_count": 2900, "cost": 1500, "description": "Golden sand beaches offering parasailing, jet skiing, beach shacks, and vibrant coastal vibes.", "address": "North Goa, Goa"},
        {"name": "Basilica of Bom Jesus", "category": "culture", "rating": 4.8, "reviews_count": 3400, "cost": 0, "description": "UNESCO World Heritage Baroque church holding the sacred relics of St. Francis Xavier.", "address": "Old Goa Road, Bainguinim, Goa"},
        {"name": "Dudhsagar Waterfalls Jungle Trek", "category": "adventure", "rating": 4.7, "reviews_count": 1900, "cost": 2200, "description": "Spectacular 4-tiered cascading waterfall nestled in the Bhagwan Mahaveer Sanctuary.", "address": "Sonaulim, Goa 403410"},
        {"name": "Goan Seafood Thali & Beach Shack Dinner", "category": "food", "rating": 4.9, "reviews_count": 2100, "cost": 850, "description": "Savor authentic Goan fish curry, prawn balchão, garlic butter crab, and bebinca dessert.", "address": "Anjuna & Candolim Shacks, Goa"},
        {"name": "Fort Aguada & Lighthouse Viewpoint", "category": "sightseeing", "rating": 4.7, "reviews_count": 2700, "cost": 200, "description": "17th-century Portuguese fortress overlooking the vast Arabian Sea and Mandovi River.", "address": "Sinquerim, Candolim, Goa"},
    ],
    "jaipur": [
        {"name": "Amber Palace & Fort Viewpoint", "category": "sightseeing", "rating": 4.9, "reviews_count": 4100, "cost": 600, "description": "Majestic hilltop fort featuring red sandstone, marble pavilions, and the sparkling Sheesh Mahal.", "address": "Devisinghpura, Amer, Jaipur"},
        {"name": "Hawa Mahal (Palace of Winds)", "category": "culture", "rating": 4.8, "reviews_count": 3600, "cost": 250, "description": "Iconic pink sandstone facade with 953 intricate jharokhas designed for royal ladies.", "address": "Hawa Mahal Rd, Badi Choupad, Jaipur"},
        {"name": "City Palace & Chandra Mahal Museum", "category": "culture", "rating": 4.7, "reviews_count": 2800, "cost": 700, "description": "Royal residence blending Rajput, Mughal, and European architecture with royal artifact galleries.", "address": "Tulsi Marg, Gangori Bazaar, Jaipur"},
        {"name": "Traditional Rajasthani Thali & Dal Baati", "category": "food", "rating": 4.8, "reviews_count": 1850, "cost": 850, "description": "Authentic feast with Dal Baati Churma, Gatte ki Sabzi, Ker Sangri, and sweet Ghevar.", "address": "MI Road & Chokhi Dhani, Jaipur"},
        {"name": "Jantar Mantar Astronomical Observatory", "category": "sightseeing", "rating": 4.7, "reviews_count": 2400, "cost": 250, "description": "UNESCO World Heritage collection of nineteen architectural astronomical instruments.", "address": "Gangori Bazaar, J.D.A. Market, Jaipur"},
    ]
}


CITY_BASE_COORDS = {
    "ahmedabad": {"lat": 23.0225, "lng": 72.5714},
    "mumbai": {"lat": 18.9220, "lng": 72.8347},
    "delhi": {"lat": 28.6139, "lng": 77.2090},
    "bengaluru": {"lat": 12.9716, "lng": 77.5946},
    "goa": {"lat": 15.2993, "lng": 74.1240},
    "jaipur": {"lat": 26.9124, "lng": 75.7873},
    "dubai": {"lat": 25.2048, "lng": 55.2708},
    "singapore": {"lat": 1.3521, "lng": 103.8198},
    "bali": {"lat": -8.4095, "lng": 115.1889},
    "bangkok": {"lat": 13.7563, "lng": 100.5018},
    "paris": {"lat": 48.8566, "lng": 2.3522},
    "rome": {"lat": 41.9028, "lng": 12.4964},
    "tokyo": {"lat": 35.6762, "lng": 139.6503},
    "london": {"lat": 51.5074, "lng": -0.1278},
    "new york": {"lat": 40.7128, "lng": -74.0060},
}


@app.route("/api/places/search", methods=["GET"])
def search_places():
    """Discover places tailored to destination city and category."""
    city = request.args.get("city", "").strip()
    category = request.args.get("category", "all")
    query = request.args.get("q", "").strip()

    if not city:
        city = "Ahmedabad"

    city_key = city.lower().strip()
    base_coords = geocode_city_osm(city) or CITY_BASE_COORDS.get(city_key) or {"lat": 20.5937, "lng": 78.9629}
    base_lat = float(base_coords.get("lat", 20.5937))
    base_lng = float(base_coords.get("lng", 78.9629))

    results = []

    # 1. Check curated high-accuracy places for this city
    curated_list = ACCURATE_GLOBAL_PLACES.get(city_key)
    if curated_list:
        for idx, item in enumerate(curated_list):
            item_cat = item.get("category", "sightseeing")
            if category and category != "all" and item_cat != category:
                continue

            if query and query.lower() not in item["name"].lower() and query.lower() not in item["description"].lower():
                continue

            photo = fetch_real_place_photo(item["name"], city, item_cat)
            angle = (idx * 0.85) + ((abs(hash(item["name"])) % 60) * 0.03)
            dist = 0.007 + (idx % 5) * 0.004
            p_lat = item.get("lat") or round(base_lat + (dist * math.cos(angle)), 5)
            p_lng = item.get("lng") or round(base_lng + (dist * math.sin(angle)), 5)

            results.append({
                "id": f"{city_key}-{idx}",
                "name": item["name"],
                "category": item_cat,
                "rating": item["rating"],
                "reviews_count": item["reviews_count"],
                "photo_url": photo,
                "description": item["description"],
                "address": item["address"],
                "lat": float(p_lat),
                "lng": float(p_lng),
                "cost": item["cost"],
                "city_name": city
            })

    # 2. If no curated list or custom query, perform live Wikipedia & OpenStreetMap search
    if not results:
        try:
            search_query = f"{city} {query if query else category if category and category != 'all' else 'tourism attractions'}"
            wiki_url = f"https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch={urllib.parse.quote(search_query)}&gsrlimit=10&prop=pageimages|extracts|coordinates&exintro=1&explaintext=1&exchars=140&pithumbsize=800&format=json"
            req = urllib.request.Request(wiki_url, headers={"User-Agent": "GlobeTrotterApp/1.0 (contact@globetrotter.app)"})
            with urllib.request.urlopen(req, timeout=4) as response:
                data = json.loads(response.read().decode())
                pages = data.get("query", {}).get("pages", {})
                for idx, (pid, pdata) in enumerate(pages.items()):
                    title = pdata.get("title", "")
                    extract = pdata.get("extract", "") or f"Popular destination highlight in {city}."
                    thumb = pdata.get("thumbnail", {}).get("source")
                    coords = pdata.get("coordinates", [{}])[0]

                    # Filter out purely administrative or generic wiki articles
                    bad_patterns = [
                        "flag of", "list of", "demographics", "climate of", "transport in", "geography of",
                        "tourism in", "economy of", "history of", "culture of", "architecture of", "outline of",
                        "education in", "wildlife of", "politics of", "media in", "administrative", "elections in"
                    ]
                    if any(bad in title.lower() for bad in bad_patterns):
                        continue

                    # Assign category
                    t_lower = (title + " " + extract).lower()
                    assigned_cat = "food" if any(k in t_lower for k in ["restaurant", "food", "cuisine", "wine", "cafe", "bistro"]) else \
                                   "adventure" if any(k in t_lower for k in ["park", "mountain", "beach", "trail", "tour", "river"]) else \
                                   "culture" if any(k in t_lower for k in ["temple", "church", "cathedral", "palace", "museum", "castle"]) else "sightseeing"

                    if category and category != "all" and assigned_cat != category:
                        continue

                    if not thumb:
                        thumb = fetch_real_place_photo(title, city, assigned_cat)

                    cost = 950 if assigned_cat == "food" else 1800 if assigned_cat == "sightseeing" else 2400 if assigned_cat == "adventure" else 650
                    rating = round(4.4 + (abs(hash(title)) % 6) / 10.0, 1)

                    w_lat = float(coords.get("lat") or 0)
                    w_lng = float(coords.get("lon") or 0)
                    if w_lat == 0 or w_lng == 0:
                        angle = (idx * 0.85) + ((abs(hash(title)) % 60) * 0.03)
                        dist = 0.007 + (idx % 5) * 0.004
                        w_lat = round(base_lat + (dist * math.cos(angle)), 5)
                        w_lng = round(base_lng + (dist * math.sin(angle)), 5)

                    results.append({
                        "id": f"wiki-{pid}",
                        "name": title,
                        "category": assigned_cat,
                        "rating": rating,
                        "reviews_count": 120 + (abs(hash(title)) % 500),
                        "photo_url": thumb,
                        "description": extract[:140],
                        "address": f"Historic District, {city}",
                        "lat": float(w_lat),
                        "lng": float(w_lng),
                        "cost": cost,
                        "city_name": city
                    })
        except Exception as e:
            print(f"Wikipedia place search error: {e}")

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

    trip_destination = (trip.get("description") or "").strip()
    if not trip_destination and trip.get("name"):
        trip_destination = trip.get("name").replace("Trip to", "").replace("Tour of", "").replace("Vacation in", "").strip()

    days = []
    if start_str and end_str:
        try:
            cur = datetime.strptime(start_str, "%Y-%m-%d")
            end = datetime.strptime(end_str, "%Y-%m-%d")
            day_num = 1
            while cur <= end:
                d_str = cur.strftime("%Y-%m-%d")
                matching_stop = next((s for s in stops if s.get("start_date") and s.get("end_date") and s["start_date"] <= d_str <= s["end_date"]), None)
                city_name = matching_stop["city_name"] if matching_stop else trip_destination
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
            "city_name": trip_destination,
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


@app.route("/api/day-items/<item_id>", methods=["PUT"])
def update_day_item(item_id):
    """Updates a scheduled day item."""
    uid, err = require_user()
    if err:
        return err

    body = request.json or {}
    try:
        res = supabase.table("day_items").update(body).eq("id", item_id).execute()
        if res.data:
            return jsonify(res.data[0])
    except Exception as e:
        print(f"Supabase day_items update fallback: {e}")

    # Fallback in-memory update
    for tid in FALLBACK_DAY_ITEMS:
        for idx, it in enumerate(FALLBACK_DAY_ITEMS[tid]):
            if it.get("id") == item_id:
                FALLBACK_DAY_ITEMS[tid][idx].update(body)
                return jsonify(FALLBACK_DAY_ITEMS[tid][idx])

    return jsonify(body)


@app.route("/api/day-items/<item_id>", methods=["DELETE"])
def delete_day_item(item_id):
    """Deletes a scheduled day item."""
    uid, err = require_user()
    if err:
        return err

    try:
        supabase.table("day_items").delete().eq("id", item_id).execute()
    except Exception as e:
        print(f"Supabase day_items delete fallback: {e}")

    # Also remove from in-memory fallback
    for tid in list(FALLBACK_DAY_ITEMS.keys()):
        FALLBACK_DAY_ITEMS[tid] = [it for it in FALLBACK_DAY_ITEMS[tid] if str(it.get("id")) != str(item_id)]

    return "", 204


if __name__ == "__main__":
    app.run(debug=True, port=5000)
