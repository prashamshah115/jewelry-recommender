#!/bin/bash
# Startup script for the jewelry retrieval API backend

set -e

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Fix OpenMP library conflict (FAISS + PyTorch)
export KMP_DUPLICATE_LIB_OK=TRUE
export OMP_NUM_THREADS=1  # Force single-threaded OpenMP (prevents FAISS crashes on macOS)

# Activate virtual environment
if [ -d "venv" ]; then
    source venv/bin/activate
    echo "✅ Activated virtual environment"
else
    echo "❌ Virtual environment not found. Please run: python3 -m venv venv"
    exit 1
fi

# Check if embeddings exist
if [ ! -f "embeddings/cartier_embeddings.npy" ] && [ ! -f "embeddings/diamond_embeddings.npy" ]; then
    echo "⚠️  Warning: No embeddings found. Please run embedding generation scripts first."
    echo "   Cartier: python scripts/precompute_cartier_embeddings.py"
    echo "   Diamonds: python scripts/precompute_diamond_embeddings.py"
fi

# Check if dependencies are installed
echo "📦 Checking dependencies..."
if ! python -c "import fastapi" 2>/dev/null; then
    echo "⚠️  Dependencies not installed. Installing..."
    pip install -q -r requirements.txt
    echo "✅ Dependencies installed"
fi

# Start the API server
echo "🚀 Starting jewelry retrieval API server..."
echo "   API will be available at: http://localhost:8000"
echo "   API docs at: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

python api/main.py

