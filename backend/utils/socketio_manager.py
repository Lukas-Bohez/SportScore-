"""Central Socket.IO server accessor and client state helpers."""
from typing import Optional, Dict, Set
import socketio

_sio: Optional[socketio.AsyncServer] = None
_connected_clients: Dict[str, Optional[str]] = {}  # sid -> type
_admin_clients: Set[str] = set()


def set_sio(server: socketio.AsyncServer):
    global _sio
    _sio = server


def get_sio() -> Optional[socketio.AsyncServer]:
    return _sio


def add_client(sid: str, client_type: Optional[str] = None):
    _connected_clients[sid] = client_type
    if client_type == 'admin':
        _admin_clients.add(sid)


def remove_client(sid: str):
    _connected_clients.pop(sid, None)
    _admin_clients.discard(sid)


def set_client_type(sid: str, client_type: Optional[str]):
    _connected_clients[sid] = client_type
    if client_type == 'admin':
        _admin_clients.add(sid)
    else:
        _admin_clients.discard(sid)


def is_admin(sid: str) -> bool:
    return sid in _admin_clients


def get_connected_count() -> int:
    return len(_connected_clients)


def get_admin_count() -> int:
    return len(_admin_clients)


def list_connected_clients() -> Dict[str, Optional[str]]:
    return dict(_connected_clients)
