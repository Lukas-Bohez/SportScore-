"""Route package for modular FastAPI routers.

Import routers from submodules and expose them for easy inclusion in `app.py`.
"""
from .sessions import router as sessions_router

__all__ = ["sessions_router"]
