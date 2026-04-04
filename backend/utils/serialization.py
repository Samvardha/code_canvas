from datetime import datetime, date
from typing import Dict, Any, List

# [ SERIALIZATION CORE ] ────────────────────────────────────────────────────────

def datetime_serializer(v: datetime) -> str:
    """Format datetime as ISO string with 'Z' suffix for UTC."""
    return v.strftime('%Y-%m-%dT%H:%M:%SZ')


def date_serializer(v: date) -> str:
    """Format date as YYYY-MM-DD."""
    return v.strftime('%Y-%m-%d')


# [ TYPE ENCODERS ] ────────────────────────────────────────────────────────────

COMMON_JSON_ENCODERS: Dict[Any, Any] = {
    datetime: datetime_serializer,
    date: date_serializer
}


# [ DATABASE PREPARATION ] ─────────────────────────────────────────────────────

def prepare_for_mongo(obj: Any) -> Any:
    """
    Sanitize and translate complex types into MongoDB-compatible primitives.
    
    Logic Flow:
    1. Recursion: Traverses nested lists and dictionaries.
    2. Date Alignment: Normalizes dates to full datetimes for consistent indexing.
    3. Enum Decoding: Extracts raw values from Enum members.
    """
    if isinstance(obj, dict):
        return {k: prepare_for_mongo(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [prepare_for_mongo(i) for i in obj]
    elif isinstance(obj, date) and not isinstance(obj, datetime):
        # 2. Date Alignment
        return datetime.combine(obj, datetime.min.time())
    elif hasattr(obj, "value"):  
        # 3. Enum Decoding
        return obj.value
    return obj
