import os
from uuid import uuid4
from flask import Flask, request, jsonify
from flask_cors import CORS
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")  # service role key, backend only

COVER_BUCKET = "trip-covers"
ALLOWED_IMAGE_TYPES = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif"}
MAX_COVER_SIZE = 5 * 1024 * 1024  # 5 MB

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

app = Flask(__name__)
CORS(app)


def ensure_cover_bucket():
    """Create the public storage bucket for trip covers if it doesn't exist yet."""
    try:
        supabase.storage.create_bucket(COVER_BUCKET, options={"public": True})
    except Exception:
        pass  # already exists


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


# ---------- TRIPS ----------

@app.route("/api/trips", methods=["GET"])
def list_trips():
    uid, err = require_user()
    if err:
        return err
    res = supabase.table("trips").select("*").eq("user_id", uid).order("created_at", desc=True).execute()
    return jsonify(res.data)


@app.route("/api/trips", methods=["POST"])
def create_trip():
    uid, err = require_user()
    if err:
        return err
    body = request.json
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
    data = trip.data
    data["stops"] = stops.data
    return jsonify(data)


@app.route("/api/trips/<trip_id>", methods=["PUT"])
def update_trip(trip_id):
    uid, err = require_user()
    if err:
        return err
    body = request.json
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

    # best-effort cleanup of the previous cover so storage doesn't fill up with orphans
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
    body = request.json
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
    body = request.json
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
    breakdown = {}
    total = 0
    for stop in stops.data:
        stop_total = sum(a["cost"] or 0 for a in stop.get("activities", []))
        breakdown[stop["city_name"]] = stop_total
        total += stop_total
    return jsonify({"total": total, "by_city": breakdown})


# ---------- CATALOG (city / activity "search") ----------

@app.route("/api/catalog/cities", methods=["GET"])
def search_cities():
    q = request.args.get("q", "")
    query = supabase.table("city_catalog").select("*")
    if q:
        query = query.ilike("city_name", f"%{q}%")
    res = query.execute()
    return jsonify(res.data)


@app.route("/api/catalog/activities", methods=["GET"])
def search_activities():
    city = request.args.get("city", "")
    query = supabase.table("activity_catalog").select("*")
    if city:
        query = query.eq("city_name", city)
    res = query.execute()
    return jsonify(res.data)


# ---------- PUBLIC SHARED VIEW (no auth) ----------

@app.route("/api/public/trips/<trip_id>", methods=["GET"])
def public_trip(trip_id):
    trip = supabase.table("trips").select("*").eq("id", trip_id).eq("is_public", True).single().execute()
    if not trip.data:
        return jsonify({"error": "not found or not public"}), 404
    stops = supabase.table("stops").select("*, activities(*)").eq("trip_id", trip_id).order("order_index").execute()
    data = trip.data
    data["stops"] = stops.data
    return jsonify(data)


if __name__ == "__main__":
    app.run(debug=True, port=5000)
