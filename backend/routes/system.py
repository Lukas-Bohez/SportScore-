from fastapi import APIRouter, HTTPException, Header
from typing import Optional
from datetime import datetime
import os

from backend.utils.api_helpers import CET
from backend.utils.socketio_manager import get_sio, get_connected_count, get_admin_count

router = APIRouter()
ENDPOINT = "/api/v1"

ADMIN_SECRET = os.environ.get('ADMIN_SECRET', 'changeme')


@router.get(f"{ENDPOINT}/health", tags=["Health"], summary="Backend health check")
async def health():
    return {"status": "ok", "time": datetime.now(CET).isoformat()}


@router.post(f"{ENDPOINT}/system/shutdown", tags=["System"], summary="Shutdown Raspberry Pi")
async def system_shutdown(x_admin_secret: Optional[str] = Header(None)):
    if x_admin_secret != ADMIN_SECRET:
        raise HTTPException(status_code=403, detail="Forbidden")

    try:
        # Prefer systemctl if available
        if os.path.exists('/bin/systemctl') or os.path.exists('/usr/bin/systemctl'):
            os.system('systemctl poweroff')
        else:
            os.system('shutdown now')
    except Exception:
        pass

    return {"message": "Shutdown initiated"}


# Test-socket moved here from app.py — emits a test event and returns client counts
@router.get("/test-socket", tags=["System"], summary="Send test socket event")
async def test_socket():
    sio = get_sio()
    if sio:
        await sio.emit('test_event', {
            'message': 'This is a test event',
            'timestamp': datetime.now(CET).isoformat(),
            'connected_clients': get_connected_count(),
            'admin_clients': get_admin_count()
        })
    return {"message": "Test event sent", "connected_clients": get_connected_count(), "admin_clients": get_admin_count()}
