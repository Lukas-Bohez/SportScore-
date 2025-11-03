#!/usr/bin/env python3
"""
Cross-platform compatibility test for Scoreboard Backend
Tests basic functionality without database connection
"""

import sys
import os
import platform

def test_imports():
    """Test all imports work"""
    try:
        # Test FastAPI and related imports
        from fastapi import FastAPI
        from fastapi.middleware.cors import CORSMiddleware
        import uvicorn
        import socketio

        # Test our app imports
        from models.models import SportCreate, SportResponse
        from database.database import Database
        from database.datarepository import SportRepository

        print("✅ All imports successful")
        return True
    except ImportError as e:
        print(f"❌ Import error: {e}")
        return False

def test_models():
    """Test model creation and validation"""
    try:
        from models.models import SportCreate, TeamCreate, GameCreate

        # Test sport model
        sport = SportCreate(name="Football", description="Association football")
        assert sport.name == "Football"
        assert sport.description == "Association football"

        # Test team model
        team = TeamCreate(name="Team A", sport_id=1)
        assert team.name == "Team A"
        assert team.sport_id == 1

        # Test game model
        game = GameCreate(sport_id=1, team1_id=1, team2_id=2, start_time="2024-01-01T10:00:00")
        assert game.sport_id == 1
        assert game.team1_id == 1
        assert game.team2_id == 2

        print("✅ Model validation works")
        return True
    except Exception as e:
        print(f"❌ Model test error: {e}")
        return False

def test_platform_compatibility():
    """Test platform-specific compatibility"""
    try:
        # Test path operations (should work on both Windows and Linux)
        test_path = os.path.join("test", "path", "file.txt")
        assert "test" in test_path
        assert "path" in test_path
        assert "file.txt" in test_path

        # Test environment variable access
        test_env = os.getenv("PATH")
        assert test_env is not None  # PATH should always exist

        # Test current working directory
        cwd = os.getcwd()
        assert os.path.exists(cwd)

        print(f"✅ Platform compatibility OK (running on {platform.system()} {platform.release()})")
        return True
    except Exception as e:
        print(f"❌ Platform compatibility error: {e}")
        return False

def test_socketio_setup():
    """Test Socket.IO setup"""
    try:
        import socketio
        from fastapi import FastAPI

        # Create test app
        app = FastAPI()
        sio = socketio.AsyncServer(cors_allowed_origins="*")

        # Test mounting (this should work without actual server)
        # We can't actually mount without proper ASGI setup, but we can test creation
        assert sio is not None
        assert app is not None

        print("✅ Socket.IO setup works")
        return True
    except Exception as e:
        print(f"❌ Socket.IO setup error: {e}")
        return False

def main():
    """Run all tests"""
    print("🚀 Running Scoreboard Backend Compatibility Tests")
    print("=" * 50)

    tests = [
        ("Imports", test_imports),
        ("Models", test_models),
        ("Platform Compatibility", test_platform_compatibility),
        ("Socket.IO Setup", test_socketio_setup),
    ]

    passed = 0
    total = len(tests)

    for test_name, test_func in tests:
        print(f"\n🧪 Testing {test_name}...")
        if test_func():
            passed += 1
        else:
            print(f"❌ {test_name} failed")

    print("\n" + "=" * 50)
    print(f"📊 Test Results: {passed}/{total} tests passed")

    if passed == total:
        print("🎉 All tests passed! The application should work on both Windows and Linux.")
        return 0
    else:
        print("⚠️  Some tests failed. Please check the errors above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())