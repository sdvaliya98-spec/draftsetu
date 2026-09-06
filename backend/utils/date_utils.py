import re
from datetime import datetime, timezone, time, date
from typing import Optional, Tuple
from zoneinfo import ZoneInfo

IST = ZoneInfo("Asia/Kolkata")

def to_ist(dt: Optional[datetime]) -> Optional[datetime]:
    """
    Safely converts a datetime object (timezone-aware or UTC-naive from DB) to Asia/Kolkata timezone.
    Returns None if dt is None.
    Does not modify database objects or database values.
    """
    if dt is None:
        return None
    if not isinstance(dt, datetime):
        return dt
    if dt.tzinfo is None:
        # DB datetimes stored as UTC naive
        dt_aware = dt.replace(tzinfo=timezone.utc)
    else:
        dt_aware = dt
    return dt_aware.astimezone(IST)

def format_ist_datetime(dt: Optional[datetime], fmt: str = "%Y-%m-%d %H:%M:%S") -> str:
    """Formats datetime in Asia/Kolkata timezone."""
    ist_dt = to_ist(dt)
    if not ist_dt:
        return "—"
    return ist_dt.strftime(fmt)

def get_ist_now() -> datetime:
    """Returns the current datetime in Asia/Kolkata timezone."""
    return datetime.now(IST)

def get_ist_today_boundaries_in_utc() -> Tuple[datetime, datetime]:
    """
    Returns (start_utc, end_utc) for today's calendar day in Asia/Kolkata timezone,
    as UTC-naive datetimes ready for querying UTC database columns.
    """
    now_ist = datetime.now(IST)
    today_ist_start = datetime.combine(now_ist.date(), time.min, tzinfo=IST)
    today_ist_end = datetime.combine(now_ist.date(), time.max, tzinfo=IST)
    
    start_utc = today_ist_start.astimezone(timezone.utc).replace(tzinfo=None)
    end_utc = today_ist_end.astimezone(timezone.utc).replace(tzinfo=None)
    return start_utc, end_utc

def formatDateDDMMYYYY(val: str) -> str:
    """Converts ISO date/datetime format to Indian format (DD/MM/YYYY)."""
    if not val:
        return ""
    val_str = str(val).strip()
    # Matches YYYY-MM-DD
    if re.match(r"^\d{4}-\d{2}-\d{2}$", val_str):
        parts = val_str.split("-")
        return f"{parts[2]}/{parts[1]}/{parts[0]}"
    # Matches YYYY-MM-DD followed by space/T and time
    if re.match(r"^\d{4}-\d{2}-\d{2}[ T].*$", val_str):
        date_part = val_str[:10]
        parts = date_part.split("-")
        return f"{parts[2]}/{parts[1]}/{parts[0]}"
    return val_str

def formatDateForDisplay(val: str) -> str:
    """Converts ISO format (YYYY-MM-DD) to Indian format (DD/MM/YYYY)."""
    return formatDateDDMMYYYY(val)

def formatDateForStorage(val: str) -> str:
    """Converts Indian format (DD/MM/YYYY) to ISO format (YYYY-MM-DD)."""
    if not val:
        return ""
    val_str = str(val).strip()
    # Matches DD/MM/YYYY
    if re.match(r"^\d{2}/\d{2}/\d{4}$", val_str):
        parts = val_str.split("/")
        return f"{parts[2]}-{parts[1]}-{parts[0]}"
    return val_str

def formatDateForDocument(val: str) -> str:
    """Formats date for document injection."""
    return formatDateDDMMYYYY(val)


