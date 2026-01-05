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
    print("Starting Scoreboard Backend...")

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

    # Locate requirements.txt (search current and parent directories)
    def find_requirements(start_dir):
        candidates = [start_dir, os.path.dirname(start_dir), os.path.join(os.path.dirname(start_dir), '..')]
        for d in candidates:
            path = os.path.join(os.path.abspath(d), 'requirements.txt')
            if os.path.exists(path):
                return path
        return None

    requirements_path = find_requirements(script_dir)

    # Check if virtual environment exists
    if not os.path.exists(venv_python):
        print("Virtual environment not found. Creating one...")
        try:
            subprocess.check_call([sys.executable, "-m", "venv", "venv"])
            print("Virtual environment created")
        except subprocess.CalledProcessError as e:
            print(f"Failed to create virtual environment: {e}")
            return 1
        # Install requirements (use located requirements.txt if available)
        if requirements_path:
            print(f"Installing requirements from {requirements_path}...")
            try:
                subprocess.check_call([venv_pip, "install", "-r", requirements_path])
                print("Requirements installed")
            except subprocess.CalledProcessError as e:
                print(f"Failed to install requirements: {e}")
                return 1
        else:
            print("No requirements.txt found; skipping automatic install.")

    # Check if requirements are installed
    try:
        result = subprocess.run([venv_python, "-c", "import fastapi, uvicorn, socketio, pytz"], capture_output=True, text=True)
        if result.returncode != 0:
            if requirements_path:
                print("Installing missing requirements...")
                subprocess.check_call([venv_pip, "install", "-r", requirements_path])
                print("Requirements installed")
            else:
                print("Requirements seem to be missing but no requirements.txt was found.")
    except subprocess.CalledProcessError as e:
        print(f"Failed to check/install requirements: {e}")
        return 1

    # Run the application using the virtual environment's Python
    print("Starting server on http://0.0.0.0:8000")
    print("API documentation: http://localhost:8000/docs")
    print("Socket.IO endpoint: ws://localhost:8000/socket.io")
    print("Press Ctrl+C to stop")

    try:
        # Run the app using the virtual environment's Python
        # `app.py` is located in the parent `backend` directory relative to this script
        app_path = os.path.abspath(os.path.join(script_dir, '..', 'app.py'))
        if not os.path.exists(app_path):
            print(f"ERROR: app.py not found at {app_path}")
            return 1
        subprocess.run([venv_python, app_path])
    except KeyboardInterrupt:
        print("\nServer stopped")
        return 0
    except subprocess.CalledProcessError as e:
        print(f"Error starting server: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())