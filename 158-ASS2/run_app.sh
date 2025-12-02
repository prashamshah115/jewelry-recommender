#!/bin/bash
# Complete app startup script - starts both backend and frontend

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "=========================================="
echo "🚀 Starting Jewelry Retrieval App"
echo "=========================================="
echo ""

# Check embeddings
echo "📊 Checking embeddings..."
if [ ! -f "embeddings/cartier_embeddings.npy" ] && [ ! -f "embeddings/diamond_embeddings.npy" ]; then
    echo "⚠️  Warning: No embeddings found!"
    echo "   Run: python scripts/precompute_cartier_embeddings.py"
    exit 1
fi
echo "✅ Embeddings found"
echo ""

# Check if ports are available
if lsof -ti:8000 > /dev/null 2>&1; then
    echo "⚠️  Port 8000 is in use. Killing existing process..."
    lsof -ti:8000 | xargs kill -9 2>/dev/null || true
    sleep 2
fi

if lsof -ti:3000 > /dev/null 2>&1; then
    echo "⚠️  Port 3000 is in use. Will use port 3001 instead..."
    export PORT=3001
fi

# Fix OpenMP library conflict (FAISS + PyTorch)
export KMP_DUPLICATE_LIB_OK=TRUE
export OMP_NUM_THREADS=1  # Force single-threaded OpenMP (prevents FAISS crashes on macOS)

# Check dependencies
echo "📦 Checking dependencies..."
cd "$SCRIPT_DIR"
source venv/bin/activate
if ! python -c "import fastapi" 2>/dev/null; then
    echo "⚠️  Installing dependencies (this may take a minute)..."
    pip install -q -r requirements.txt
    echo "✅ Dependencies installed"
fi

# Start backend in background
echo "🔧 Starting backend..."
echo "   (Model loading takes 10-30 seconds, please wait...)"
python api/main.py > /tmp/jewelry_backend.log 2>&1 &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"
echo "   Logs: /tmp/jewelry_backend.log"
echo ""

# Wait for backend to be ready (model loading takes time)
echo "⏳ Waiting for backend to start (this may take 30-60 seconds)..."
for i in {1..60}; do
    if curl -s http://localhost:8000/api/health > /dev/null 2>&1; then
        echo "✅ Backend is ready!"
        break
    fi
    if [ $i -eq 60 ]; then
        echo "❌ Backend failed to start after 60 seconds."
        echo "   Check logs: tail -50 /tmp/jewelry_backend.log"
        kill $BACKEND_PID 2>/dev/null || true
        exit 1
    fi
    if [ $((i % 10)) -eq 0 ]; then
        echo "   Still loading... ($i/60 seconds)"
    fi
    sleep 1
done
echo ""

# Start frontend
echo "🎨 Starting frontend..."
cd "$SCRIPT_DIR/Luxury Jewellery Recommender Page-2"

# Ensure .env exists
if [ ! -f ".env" ]; then
    echo "VITE_API_URL=http://localhost:8000" > .env
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi

echo ""
echo "=========================================="
echo "✅ App is starting!"
echo "=========================================="
echo ""
echo "📍 Backend:  http://localhost:8000"
echo "📍 Frontend: http://localhost:${PORT:-3000}"
echo "📍 API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Start frontend (this will block)
npm run dev

# Cleanup on exit
trap "kill $BACKEND_PID 2>/dev/null || true" EXIT

