from datetime import datetime, date
from typing import Dict, Any, List

def datetime_serializer(v: datetime) -> str:
    """Format datetime as ISO string with 'Z' suffix for UTC."""
    return v.strftime('%Y-%m-%dT%H:%M:%SZ')

def date_serializer(v: date) -> str:
    """Format date as YYYY-MM-DD."""
    return v.strftime('%Y-%m-%d')

COMMON_JSON_ENCODERS: Dict[Any, Any] = {
    datetime: datetime_serializer,
    date: date_serializer
}

def prepare_for_mongo(obj: Any) -> Any:
    """
    Recursively convert special types (Enums, Dates) for MongoDB compatibility.
    """
    if isinstance(obj, dict):
        return {k: prepare_for_mongo(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [prepare_for_mongo(i) for i in obj]
    elif isinstance(obj, date) and not isinstance(obj, datetime):
        return datetime.combine(obj, datetime.min.time())
    elif hasattr(obj, "value"):  # Enum member
        return obj.value
    return obj
