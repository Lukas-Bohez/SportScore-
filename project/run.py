#!/usr/bin/env python3
"""
Scoreboard Backend - Cross-platform run script
Automatically activates virtual environment and runs the application
"""

import os
import sys
import subprocess
import platform

def main():
    """Run the scoreboard backend with auto-activated virtual environment"""
    print("🚀 Starting Scoreboard Backend...")

    # Change to the script directory to ensure relative paths work correctly
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)

    # Determine the virtual environment paths
    system = platform.system().lower()

    if system == "windows":
        venv_python = os.path.join(script_dir, "venv", "Scripts", "python.exe")
        venv_pip = os.path.join(script_dir, "venv", "Scripts", "pip.exe")
    else:  # Linux, macOS
        venv_python = os.path.join(script_dir, "venv", "bin", "python")
        venv_pip = os.path.join(script_dir, "venv", "bin", "pip")

    # Check if virtual environment exists
    if not os.path.exists(venv_python):
        print("❌ Virtual environment not found. Creating one...")
        try:
            subprocess.check_call([sys.executable, "-m", "venv", "venv"])
            print("✅ Virtual environment created")
        except subprocess.CalledProcessError as e:
            print(f"❌ Failed to create virtual environment: {e}")
            return 1

        # Install requirements
        print("📦 Installing requirements...")
        try:
            subprocess.check_call([venv_pip, "install", "-r", "requirements.txt"])
            print("✅ Requirements installed")
        except subprocess.CalledProcessError as e:
            print(f"❌ Failed to install requirements: {e}")
            return 1

    # Check if requirements are installed
    try:
        result = subprocess.run([venv_python, "-c", "import fastapi, uvicorn, socketio"], capture_output=True, text=True)
        if result.returncode != 0:
            print("📦 Installing missing requirements...")
            subprocess.check_call([venv_pip, "install", "-r", "requirements.txt"])
            print("✅ Requirements installed")
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to check/install requirements: {e}")
        return 1

    # Run the application using the virtual environment's Python
    print("✅ Starting server on http://0.0.0.0:8000")
    print("📚 API documentation: http://localhost:8000/docs")
    print("🔌 Socket.IO endpoint: ws://localhost:8000/socket.io")
    print("Press Ctrl+C to stop")

    try:
        # Run the app using the virtual environment's Python
        subprocess.run([venv_python, "app.py"])
    except KeyboardInterrupt:
        print("\n👋 Server stopped")
        return 0
    except subprocess.CalledProcessError as e:
        print(f"❌ Error starting server: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())