from datetime import datetime
import pytz

CET = pytz.timezone('Europe/Brussels')


def _jsonable(obj):
    """Return JSON-serializable structures (e.g., convert datetimes)."""
    if isinstance(obj, dict):
        out = {}
        for k, v in obj.items():
            if isinstance(v, datetime):
                out[k] = v.isoformat()
            else:
                out[k] = v
        return out
    return obj


def _normalize_activity(a):
    try:
        if a is None:
            return None
        obj = dict(a)
        obj['time_winner'] = obj.get('time_winner') or 'lower'
        obj['aggregate_player_times'] = bool(int(obj.get('aggregate_player_times') or 0))
        return obj
    except Exception:
        return a
