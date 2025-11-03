#!/usr/bin/env python3
"""
Scoreboard Backend - Cross-platform run script
Works on both Windows and Linux
"""

import os
import sys
import subprocess
import platform

def main():
    """Run the scoreboard backend"""
    print("🚀 Starting Scoreboard Backend...")

    # Determine the virtual environment activation command
    system = platform.system().lower()

    if system == "windows":
        activate_cmd = "venv\\Scripts\\activate"
        python_cmd = "python"
    else:  # Linux, macOS
        activate_cmd = "source venv/bin/activate"
        python_cmd = "python"

    # Check if virtual environment exists
    venv_path = "venv/Scripts/activate" if system == "windows" else "venv/bin/activate"
    if not os.path.exists(venv_path):
        print("❌ Virtual environment not found. Please run setup first:")
        if system == "windows":
            print("   python -m venv venv")
            print("   venv\\Scripts\\activate")
            print("   pip install -r requirements.txt")
        else:
            print("   python3 -m venv venv")
            print("   source venv/bin/activate")
            print("   pip install -r requirements.txt")
        return 1

    # Check if requirements are installed
    try:
        import fastapi
        import uvicorn
        import socketio
    except ImportError:
        print("❌ Dependencies not installed. Please install requirements:")
        print("   pip install -r requirements.txt")
        return 1

    # Run the application
    print("✅ Starting server on http://0.0.0.0:8000")
    print("📚 API documentation: http://localhost:8000/docs")
    print("🔌 Socket.IO endpoint: ws://localhost:8000/socket.io")
    print("Press Ctrl+C to stop")

    try:
        # Import and run the app
        from app import app
        uvicorn.run(
            "app:app",
            host="0.0.0.0",
            port=8000,
            reload=True,
            log_level="info"
        )
    except KeyboardInterrupt:
        print("\n👋 Server stopped")
        return 0
    except Exception as e:
        print(f"❌ Error starting server: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())