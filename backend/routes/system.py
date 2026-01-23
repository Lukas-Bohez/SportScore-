from fastapi import APIRouter, HTTPException, Header, Response
from typing import Optional
from datetime import datetime
import os
import subprocess
import logging

from backend.utils.api_helpers import CET
from backend.utils.socketio_manager import get_sio, get_connected_count, get_admin_count

# Logger for this module
logger = logging.getLogger(__name__)

router = APIRouter()
ENDPOINT = "/api/v1"

# ADMIN_SECRET controls shutdown authorization:
# - If ADMIN_SECRET is non-empty, requests must provide the same value in the X-Admin-Secret header.
# - If ADMIN_SECRET is set to an empty string (''), shutdown is allowed without a password (INSECURE).
# DEFAULT: empty string => NO-PASSWORD MODE (INSECURE)
ADMIN_SECRET = os.environ.get('ADMIN_SECRET', '')


@router.get(f"{ENDPOINT}/health", tags=["Health"], summary="Backend health check")
async def health():
    return {"status": "ok", "time": datetime.now(CET).isoformat()}


@router.post(f"{ENDPOINT}/system/shutdown", tags=["System"], summary="Shutdown Raspberry Pi")
async def system_shutdown(x_admin_secret: Optional[str] = Header(None)):
    # If ADMIN_SECRET is non-empty, require matching header. If it's empty, allow shutdown without auth.
    if ADMIN_SECRET and x_admin_secret != ADMIN_SECRET:
        raise HTTPException(status_code=403, detail="Forbidden")

    # Try privilege-escalated shutdown using sudo + systemctl --no-block poweroff
    try:
        if os.path.exists('/usr/bin/systemctl') or os.path.exists('/bin/systemctl'):
            cmd = ['sudo', 'systemctl', '--no-block', 'poweroff']
            proc = subprocess.run(cmd, capture_output=True, text=True)
            if proc.returncode != 0:
                # Try fallback without sudo
                proc2 = subprocess.run(['systemctl', '--no-block', 'poweroff'], capture_output=True, text=True)
                if proc2.returncode != 0:
                    # Last fallback: try legacy shutdown/poweroff
                    proc3 = subprocess.run(['sudo', 'shutdown', 'now'], capture_output=True, text=True)
                    if proc3.returncode != 0:
                        logger.error(f"Shutdown commands failed: sudo/systemctl rc={proc.returncode} stderr={proc.stderr!r}; systemctl rc={proc2.returncode} stderr={proc2.stderr!r}; shutdown rc={proc3.returncode} stderr={proc3.stderr!r}")
                        raise HTTPException(status_code=500, detail=f"Shutdown command failed: {proc.stderr or proc2.stderr or proc3.stderr}")
        else:
            proc = subprocess.run(['sudo', 'shutdown', 'now'], capture_output=True, text=True)
            if proc.returncode != 0:
                logger.error(f"Shutdown command failed: {proc.returncode} {proc.stderr}")
                raise HTTPException(status_code=500, detail=f"Shutdown command failed: {proc.stderr}")
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Unexpected error when trying to shutdown")
        raise HTTPException(status_code=500, detail=str(e))

    # Return 202 Accepted so clients can treat shutdown as initiated
    return Response(content='{"message": "Shutdown initiated"}', status_code=202, media_type='application/json')


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
