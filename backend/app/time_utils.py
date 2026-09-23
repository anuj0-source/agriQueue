from datetime import datetime, date, time
from typing import Optional, Tuple
import re

def parse_time_str(time_str: Optional[str]) -> Optional[time]:
    """
    Parses a time string in 24-hour ('14:00', '09:30') or 12-hour ('02:00 PM', '10:00 AM') format.
    Returns a datetime.time object or None if unparseable.
    """
    if not time_str or not isinstance(time_str, str):
        return None
    cleaned = time_str.strip()
    
    # 1. Try 12-hour format with AM/PM (e.g. "10:00 AM", "01:30 PM", "1:00PM")
    match_12 = re.match(r"^(\d{1,2}):(\d{2})\s*(AM|PM)$", cleaned, re.IGNORECASE)
    if match_12:
        hours = int(match_12.group(1))
        mins = int(match_12.group(2))
        period = match_12.group(3).upper()
        if period == "PM" and hours != 12:
            hours += 12
        elif period == "AM" and hours == 12:
            hours = 0
        return time(hours, mins)

    # 2. Try 24-hour format (e.g. "08:00", "14:30", "9:00")
    match_24 = re.match(r"^(\d{1,2}):(\d{2})$", cleaned)
    if match_24:
        hours = int(match_24.group(1))
        mins = int(match_24.group(2))
        if 0 <= hours < 24 and 0 <= mins < 60:
            return time(hours, mins)

    return None

def parse_slot_range(slot_range_str: Optional[str]) -> Tuple[Optional[time], Optional[time]]:
    """
    Parses a slot time range like "08:00 - 10:00" or "10:00 AM - 11:00 AM".
    Returns (start_time, end_time).
    """
    if not slot_range_str or "-" not in slot_range_str:
        return None, None
    parts = slot_range_str.split("-")
    start = parse_time_str(parts[0].strip())
    end = parse_time_str(parts[1].strip())
    return start, end

def is_slot_expired(
    target_date: date,
    end_time_val: Optional[str],
    now: Optional[datetime] = None
) -> bool:
    """
    Determines whether a slot is expired based on booking date and slot end time.
    """
    if now is None:
        now = datetime.now()
    today = now.date()

    if target_date < today:
        return True
    if target_date > today:
        return False

    # For today, check if current time is past slot end time
    if not end_time_val:
        return False

    end_t = parse_time_str(end_time_val)
    if not end_t:
        return False

    return end_t <= now.time()

def format_time_12h(t) -> str:
    """Formats a datetime.time object or time string ('08:00', '14:00') to '08:00 AM' / '02:00 PM'."""
    if not t:
        return ""
    if isinstance(t, str):
        parsed = parse_time_str(t)
        if parsed:
            t = parsed
        else:
            return t
    if isinstance(t, time):
        dt = datetime.combine(date.today(), t)
        return dt.strftime("%I:%M %p")
    return str(t)
