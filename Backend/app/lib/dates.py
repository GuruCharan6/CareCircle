from datetime import date, datetime
from typing import Any

import dateutil.parser

from app.core.logging import get_logger

logger = get_logger(__name__)

def parse_date_robust(val: Any) -> date | None:
    """
    Attempt to parse a date from various formats (ISO, human-readable, etc).
    Returns a datetime.date object or None if parsing fails.
    """
    if not val:
        return None

    if isinstance(val, (date, datetime)):
        return val if isinstance(val, date) else val.date()

    s = str(val).strip()
    if not s:
        return None

    # 1. Try ISO format first (fastest)
    try:
        return date.fromisoformat(s)
    except ValueError:
        pass

    # 2. Try dateutil parser for human-readable formats
    # dayfirst=True: Indian prescriptions use DD/MM/YYYY, not MM/DD/YYYY
    try:
        dt = dateutil.parser.parse(s, dayfirst=True)
        return dt.date()
    except (ValueError, OverflowError):
        logger.warning("date_parse.failed", value=s)
        return None
