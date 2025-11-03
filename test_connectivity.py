#!/usr/bin/env python3
"""
Test script to verify frontend-backend connectivity.
Run this after starting both servers to test basic connectivity.
"""

import socket
import time

def test_port_connectivity(host, port, service_name):
    """Test if a port is open and accepting connections."""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(5)
        result = sock.connect_ex((host, port))
        sock.close()

        if result == 0:
            print(f"✓ {service_name}: Connected (port {port})")
            return True
        else:
            print(f"✗ {service_name}: Not accessible (port {port})")
            return False
    except Exception as e:
        print(f"✗ {service_name}: Error testing port {port} - {e}")
        return False

def test_api_basic():
    """Test basic API connectivity using raw socket."""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(5)
        sock.connect(('localhost', 8000))

        # Send a simple HTTP GET request
        request = b"GET / HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n"
        sock.send(request)

        response = sock.recv(1024).decode('utf-8')
        sock.close()

        if "200 OK" in response or "FastAPI" in response:
            print("✓ Backend API: Responding")
            return True
        else:
            print("✗ Backend API: Unexpected response")
            return False
    except Exception as e:
        print(f"✗ Backend API: Connection failed - {e}")
        return False

def main():
    """Run all connectivity tests."""
    print("Scoreboard System Connectivity Test")
    print("=" * 50)

    # Test backend server (port 8000)
    backend_ok = test_port_connectivity('localhost', 8000, 'Backend Server')

    # Test frontend server (port 3000)
    frontend_ok = test_port_connectivity('localhost', 3000, 'Frontend Server')

    # Test API response
    if backend_ok:
        api_ok = test_api_basic()
    else:
        api_ok = False
        print("✗ Backend API: Cannot test (server not running)")

    print("\n" + "=" * 50)
    print("Test Results:")

    if backend_ok:
        print("✓ Backend Server: Running (port 8000)")
    else:
        print("✗ Backend Server: Not running")
        print("  Start with: cd backend && python run.py")

    if frontend_ok:
        print("✓ Frontend Server: Running (port 3000)")
    else:
        print("✗ Frontend Server: Not running")
        print("  Start with: python serve_frontend.py")

    if api_ok:
        print("✓ API Connectivity: Working")
    else:
        print("✗ API Connectivity: Issues detected")

    print("\nAccess your application at:")
    print("- Big Screen: http://localhost:3000/index.html")
    print("- Admin Panel: http://localhost:3000/admin.html")
    print("- API Docs: http://localhost:8000/docs")

    if backend_ok and frontend_ok and api_ok:
        print("\n🎉 All systems operational!")
    else:
        print("\n⚠️  Some systems need attention. Check the messages above.")

if __name__ == "__main__":
    main()