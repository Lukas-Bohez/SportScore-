#!/bin/bash
# SportScore Launch Script for Linux
# This script ensures the backend service is running and Apache is serving the frontend

echo "🚀 Starting SportScore Application Setup..."

# Check if backend service is running
if systemctl is-active --quiet sportscore-backend; then
    echo "✅ Backend service is running"
else
    echo "❌ Backend service is not running. Starting..."
    sudo systemctl start sportscore-backend
    sleep 5
    if systemctl is-active --quiet sportscore-backend; then
        echo "✅ Backend started successfully"
    else
        echo "❌ Failed to start backend"
        exit 1
    fi
fi

# Check if Apache is running
if systemctl is-active --quiet apache2; then
    echo "✅ Apache is running"
else
    echo "❌ Apache is not running. Starting..."
    sudo systemctl start apache2
    sleep 2
    if systemctl is-active --quiet apache2; then
        echo "✅ Apache started successfully"
    else
        echo "❌ Failed to start Apache"
        exit 1
    fi
fi

echo "✅ SportScore is now running!"
echo "🌐 Frontend: http://localhost"
echo "🚀 Backend: http://localhost:8000"
echo "📚 API Docs: http://localhost:8000/docs"
echo ""
echo "💡 Services are set to start on boot."
echo "   To stop: sudo systemctl stop sportscore-backend apache2"
echo "   To check status: sudo systemctl status sportscore-backend apache2"