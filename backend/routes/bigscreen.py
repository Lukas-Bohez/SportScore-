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


@router.post(f"{ENDPOINT}/bigscreen/qr", tags=["BigScreen"], summary="Set QR visibility on bigscreens")
async def bigscreen_set_qr(request: Request):
    """Endpoint to set the QR visibility on all bigscreens. Payload: { visible: bool }"""
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid request body")

    visible = payload.get('visible') if isinstance(payload, dict) else None
    if visible is None:
        raise HTTPException(status_code=422, detail="Field 'visible' (boolean) is required")

    if sio:
        # Update central QR state so newly connected bigscreens learn the current setting
        try:
            import backend.app as backend_app
            backend_app.current_qr_state = bool(visible)
        except Exception:
            pass
        await sio.emit('set-qr', bool(visible))
        return {"success": True, "visible": bool(visible)}
    else:
        raise HTTPException(status_code=500, detail="Socket.IO server unavailable")
