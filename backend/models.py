"""
Database Layer — SQLite with SQLAlchemy ORM
============================================
Handles all vehicle entry/exit records for the Smart Parking System.
"""

from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timezone

db = SQLAlchemy()


class ParkingRecord(db.Model):
    """
    Represents a single vehicle's parking session.
    Entry is created on first detection, exit updated on second.
    """
    __tablename__ = "parking_records"

    id            = db.Column(db.Integer, primary_key=True)
    plate_number  = db.Column(db.String(20), nullable=False, index=True)
    entry_time    = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    exit_time     = db.Column(db.DateTime, nullable=True)
    duration_mins = db.Column(db.Float, nullable=True)           # minutes
    entry_image   = db.Column(db.String(255), nullable=True)
    exit_image    = db.Column(db.String(255), nullable=True)
    confidence    = db.Column(db.Float, nullable=True, default=0.0)
    detect_method = db.Column(db.String(50), nullable=True)
    status        = db.Column(db.String(20), nullable=False, default="active")  # active | completed

    created_at    = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self) -> dict:
        """Serialize record to JSON-safe dict."""
        return {
            "id":            self.id,
            "plate_number":  self.plate_number,
            "entry_time":    self.entry_time.isoformat() if self.entry_time else None,
            "exit_time":     self.exit_time.isoformat()  if self.exit_time  else None,
            "duration_mins": round(self.duration_mins, 1) if self.duration_mins else None,
            "duration_str":  self._format_duration(),
            "entry_image":   self.entry_image,
            "exit_image":    self.exit_image,
            "confidence":    self.confidence,
            "detect_method": self.detect_method,
            "status":        self.status,
        }

    def _format_duration(self) -> str:
        """Human-readable duration string."""
        if not self.duration_mins:
            return "Active"
        mins = int(self.duration_mins)
        if mins < 60:
            return f"{mins}m"
        hours = mins // 60
        rem = mins % 60
        return f"{hours}h {rem}m"

    def __repr__(self):
        return f"<ParkingRecord {self.plate_number} [{self.status}]>"


def init_db(app):
    """Initialize database with app context."""
    db.init_app(app)
    with app.app_context():
        db.create_all()


def record_entry(plate_number: str, image_path: str, confidence: float, method: str) -> ParkingRecord:
    """
    Create a new ENTRY record for a vehicle.
    Called when a plate is detected for the first time (or vehicle has exited before).
    """
    record = ParkingRecord(
        plate_number  = plate_number,
        entry_time    = datetime.utcnow(),
        entry_image   = image_path,
        confidence    = confidence,
        detect_method = method,
        status        = "active",
    )
    db.session.add(record)
    db.session.commit()
    return record


def record_exit(plate_number: str, image_path: str) -> ParkingRecord:
    """
    Update the most recent ACTIVE record with exit time and duration.
    Returns the updated record.
    """
    # Find the most recent active record for this plate
    record = (
        ParkingRecord.query
        .filter_by(plate_number=plate_number, status="active")
        .order_by(ParkingRecord.entry_time.desc())
        .first()
    )

    if record:
        record.exit_time     = datetime.utcnow()
        record.exit_image    = image_path
        record.duration_mins = (record.exit_time - record.entry_time).total_seconds() / 60
        record.status        = "completed"
        db.session.commit()
        return record

    return None


def get_active_record(plate_number: str) -> ParkingRecord:
    """Check if a vehicle is currently parked (has an active entry)."""
    return (
        ParkingRecord.query
        .filter_by(plate_number=plate_number, status="active")
        .order_by(ParkingRecord.entry_time.desc())
        .first()
    )


def get_all_records(limit: int = 100) -> list:
    """Fetch all records, most recent first."""
    records = (
        ParkingRecord.query
        .order_by(ParkingRecord.entry_time.desc())
        .limit(limit)
        .all()
    )
    return [r.to_dict() for r in records]


def get_stats() -> dict:
    """Aggregate statistics for dashboard KPI cards."""
    total    = ParkingRecord.query.count()
    active   = ParkingRecord.query.filter_by(status="active").count()
    completed = ParkingRecord.query.filter_by(status="completed").count()

    # Today's entries
    today    = datetime.utcnow().date()
    today_count = ParkingRecord.query.filter(
        db.func.date(ParkingRecord.entry_time) == today
    ).count()

    # Average duration (completed only)
    avg_duration = db.session.query(
        db.func.avg(ParkingRecord.duration_mins)
    ).filter(ParkingRecord.status == "completed").scalar()

    return {
        "total_vehicles":   total,
        "active_vehicles":  active,
        "completed_sessions": completed,
        "entries_today":    today_count,
        "avg_duration_mins": round(float(avg_duration), 1) if avg_duration else 0.0,
        "avg_duration_str": _format_mins(avg_duration),
    }


def _format_mins(mins) -> str:
    if not mins:
        return "—"
    mins = int(mins)
    if mins < 60:
        return f"{mins}m"
    return f"{mins // 60}h {mins % 60}m"
