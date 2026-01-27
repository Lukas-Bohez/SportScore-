from fastapi import APIRouter, Request, HTTPException
from typing import Dict, Any
from datetime import datetime
from backend.utils.api_helpers import _jsonable, CET
from backend.utils.socketio_manager import get_sio
import json

router = APIRouter()
ENDPOINT = "/api/v1"

sio = get_sio()


@router.post(f"{ENDPOINT}/bigscreen/navigate", tags=["BigScreen"], summary="Notify bigscreen to navigate to a screen")
async def bigscreen_navigate(request: Request):
    try:
        payload = await request.json()
    except Exception:
        try:
            raw = await request.body()
            if isinstance(raw, (bytes, bytearray)):
                raw = raw.decode('utf-8', errors='ignore')
            payload = json.loads(raw or '{}')
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid request body")

    screen = payload.get('screen')
    session_id = payload.get('session_id')
    data = payload.get('data')

    if not screen:
        raise HTTPException(status_code=422, detail="Field 'screen' is required")

    # Emit an event to all clients (bigscreen UI should listen for this)
    if sio:
        await sio.emit('bigscreen:navigate', _jsonable({
            'screen': screen,
            'session_id': session_id,
            'data': data,
            'timestamp': datetime.now(CET).isoformat()
        }))

    return {"success": True, "screen": screen, "session_id": session_id}
