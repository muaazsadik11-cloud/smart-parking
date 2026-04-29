"""
Smart Parking System — Flask REST API
======================================
Dissertation Project: ANPR-based Smart Parking
Backend serves: upload, processing, records, stats, dataset management.
"""

import os
import uuid
import logging
from datetime import datetime
from pathlib import Path
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename

from models import db, init_db, record_entry, record_exit, get_active_record, get_all_records, get_stats
from anpr_pipeline import process_image
from difflib import SequenceMatcher

def similar(a, b):
    return SequenceMatcher(None, a, b).ratio() > 0.85

# ─────────────────────────────────────────────
# APP CONFIGURATION
# ─────────────────────────────────────────────

logging.basicConfig(level=logging.INFO, format='[%(levelname)s] %(asctime)s %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Paths
BASE_DIR     = Path(__file__).parent
UPLOAD_DIR   = BASE_DIR / "uploads"
DATASET_DIR  = BASE_DIR / "dataset"
ALLOWED_EXTS = {"jpg", "jpeg", "png", "bmp", "webp"}

UPLOAD_DIR.mkdir(exist_ok=True)
DATASET_DIR.mkdir(exist_ok=True)

# SQLite config — use DATABASE_URL env var for production
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get(
    "DATABASE_URL", f"sqlite:///{BASE_DIR}/parking.db"
)
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024  # 16 MB max upload

init_db(app)


# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────

def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTS


def save_upload(file) -> tuple:
    """Save uploaded file with unique name. Returns (save_path, unique_filename)."""
    ext = file.filename.rsplit(".", 1)[-1].lower()
    unique_name = f"{uuid.uuid4().hex}.{ext}"
    save_path = UPLOAD_DIR / unique_name
    file.save(str(save_path))
    return str(save_path), unique_name


def determine_event(plate_text: str, image_path: str) -> dict:
    """
    Entry/Exit logic:
      - If vehicle has no active record → ENTRY
      - If vehicle has active record → EXIT
    Returns event dict.
    """
    from models import ParkingRecord
    active_records = db.session.query(ParkingRecord).filter_by(exit_time=None).all()
    active = None
    for rec in active_records:
        if similar(rec.plate_number, plate_text):
            active = rec
            break

    if active is None:
        # New entry
        rec = record_entry(plate_text, image_path, 0.0, "api")
        return {
            "event_type": "ENTRY",
            "record_id":  rec.id,
            "entry_time": rec.entry_time.isoformat(),
            "exit_time":  None,
            "duration":   None,
        }
    else:
        # Exit
        rec = record_exit(active.plate_number, image_path)
        if rec:
            return {
                "event_type":   "EXIT",
                "record_id":    rec.id,
                "entry_time":   rec.entry_time.isoformat(),
                "exit_time":    rec.exit_time.isoformat(),
                "duration":     rec._format_duration(),
                "duration_mins": rec.duration_mins,
            }
        else:
            # Edge case: active record was deleted; create new entry
            rec = record_entry(plate_text, image_path, 0.0, "api")
            return {
                "event_type": "ENTRY",
                "record_id":  rec.id,
                "entry_time": rec.entry_time.isoformat(),
                "exit_time":  None,
                "duration":   None,
            }


# ─────────────────────────────────────────────
# API ROUTES
# ─────────────────────────────────────────────

@app.route("/api/health", methods=["GET"])
def health():
    """Health check endpoint for deployment monitoring."""
    return jsonify({
        "status":    "ok",
        "timestamp": datetime.utcnow().isoformat(),
        "version":   "1.0.0",
        "service":   "ANPR Smart Parking System",
    })


@app.route("/api/upload", methods=["POST"])
def upload():
    """
    POST /api/upload
    Process an uploaded vehicle image through the ANPR pipeline.
    Returns detected plate, event type (ENTRY/EXIT), and parking record.
    """
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]
    if not file.filename:
        return jsonify({"error": "Empty filename"}), 400

    if not allowed_file(file.filename):
        return jsonify({"error": f"Unsupported file type. Allowed: {ALLOWED_EXTS}"}), 400

    try:
        save_path, unique_name = save_upload(file)
        original_filename = secure_filename(file.filename)

        # Run ANPR pipeline
        anpr_result = process_image(save_path, original_filename)

        plate_text = anpr_result["plate_text"]
        confidence = anpr_result["confidence"]
        method     = anpr_result["method"]

        # Update confidence on DB record
        event = determine_event(plate_text, save_path)

        # Patch confidence into record
        from models import ParkingRecord
        rec = ParkingRecord.query.get(event["record_id"])
        if rec:
            rec.confidence    = confidence
            rec.detect_method = method
            db.session.commit()

        response = {
            "success":     True,
            "plate_text":  plate_text,
            "confidence":  confidence,
            "method":      method,
            "event":       event,
            "image_url":   f"/api/image/{unique_name}",
            "annotated_url": f"/api/image/annotated/{Path(unique_name).stem}_annotated.jpg",
            "processing_time_ms": anpr_result.get("processing_time_ms", 0),
        }

        logger.info(f"✅ Upload processed: {plate_text} → {event['event_type']}")
        return jsonify(response), 200

    except Exception as e:
        logger.error(f"❌ Upload error: {e}", exc_info=True)
        return jsonify({"error": "Processing failed", "detail": str(e)}), 500


@app.route("/api/records", methods=["GET"])
def records():
    """
    GET /api/records
    Fetch all parking records (most recent first).
    Optional query param: ?limit=N
    """
    limit = request.args.get("limit", 100, type=int)
    data  = get_all_records(limit)
    return jsonify({"records": data, "count": len(data)})


@app.route("/api/stats", methods=["GET"])
def stats():
    """
    GET /api/stats
    Dashboard KPI aggregation.
    """
    data = get_stats()
    return jsonify(data)


@app.route("/api/dataset", methods=["GET"])
def dataset():
    """
    GET /api/dataset
    List all images in the dataset directory for the gallery page.
    """
    images = []
    for f in sorted(DATASET_DIR.iterdir()):
        if f.suffix.lower().lstrip(".") in ALLOWED_EXTS:
            images.append({
                "filename": f.name,
                "url":      f"/api/dataset/image/{f.name}",
                "size_kb":  round(f.stat().st_size / 1024, 1),
            })
    return jsonify({"images": images, "count": len(images)})


@app.route("/api/dataset/process/<filename>", methods=["POST"])
def process_dataset_image(filename: str):
    """
    POST /api/dataset/process/<filename>
    Run ANPR on a specific dataset image and log the result.
    """
    safe_name = secure_filename(filename)
    image_path = DATASET_DIR / safe_name

    if not image_path.exists():
        return jsonify({"error": f"File not found: {safe_name}"}), 404

    try:
        anpr_result = process_image(str(image_path), safe_name)
        plate_text  = anpr_result["plate_text"]
        confidence  = anpr_result["confidence"]
        method      = anpr_result["method"]

        event = determine_event(plate_text, str(image_path))

        # Patch confidence
        from models import ParkingRecord
        rec = ParkingRecord.query.get(event["record_id"])
        if rec:
            rec.confidence    = confidence
            rec.detect_method = method
            db.session.commit()

        return jsonify({
            "success":    True,
            "filename":   safe_name,
            "plate_text": plate_text,
            "confidence": confidence,
            "method":     method,
            "event":      event,
            "processing_time_ms": anpr_result.get("processing_time_ms", 0),
        })
    except Exception as e:
        logger.error(f"❌ Dataset processing error: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────
# STATIC FILE SERVING
# ─────────────────────────────────────────────

@app.route("/api/image/<filename>")
def serve_upload(filename: str):
    return send_from_directory(str(UPLOAD_DIR), filename)


@app.route("/api/image/annotated/<filename>")
def serve_annotated(filename: str):
    annotated_dir = UPLOAD_DIR / "annotated"
    return send_from_directory(str(annotated_dir), filename)


@app.route("/api/dataset/image/<filename>")
def serve_dataset_image(filename: str):
    return send_from_directory(str(DATASET_DIR), filename)


# ─────────────────────────────────────────────
# ENTRY POINT
# ─────────────────────────────────────────────

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_ENV", "production") == "development"
    logger.info(f"🚀 Starting Smart Parking API on port {port}")
    app.run(host="0.0.0.0", port=port, debug=debug)
