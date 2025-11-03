#!/usr/bin/env python3
"""
Simple HTTP server to serve the scoreboard frontend.
Run this script to start the server, then open http://localhost:3000 in your browser.
"""

import http.server
import socketserver
import os
from pathlib import Path

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=os.path.join(os.path.dirname(__file__), 'frontend'), **kwargs)

    def end_headers(self):
        # CORS headers are handled by the backend server
        super().end_headers()

def run_server(port=3000):
    """Run the HTTP server on the specified port."""
    try:
        with socketserver.TCPServer(("", port), CustomHTTPRequestHandler) as httpd:
            print(f"Server started at http://localhost:{port}")
            print("Press Ctrl+C to stop the server")
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
    except OSError as e:
        if e.errno == 48:  # Address already in use
            print(f"Port {port} is already in use. Try a different port:")
            print(f"python serve_frontend.py {port + 1}")
        else:
            print(f"Error starting server: {e}")

if __name__ == "__main__":
    import sys

    port = 3000
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            print("Invalid port number. Using default port 3000.")

    run_server(port)