#!/bin/bash
# Startup script for the jewelry retrieval frontend

set -e

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR/Luxury Jewellery Recommender Page-2"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check for .env file
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        echo "📝 Creating .env from .env.example..."
        cp .env.example .env
    else
        echo "⚠️  No .env file found. Creating default..."
        echo "VITE_API_URL=http://localhost:8000" > .env
    fi
fi

# Start the frontend dev server
echo "🚀 Starting frontend development server..."
echo "   Frontend will be available at: http://localhost:3000"
echo "   Make sure the backend API is running on port 8000"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

npm run dev

