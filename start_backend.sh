#!/bin/bash
echo "========================================"
echo "  Starting FastAPI Backend Server"
echo "========================================"
cd "$(dirname "$0")/backend"

echo "[1/3] Checking environment..."
if [ ! -d "../venv" ]; then
    echo "[INFO] Creating virtual environment..."
    python3 -m venv ../venv
fi

echo "[2/3] Validating dependencies..."
../venv/bin/pip install -r requirements.txt --quiet

echo "[3/3] Launching FastAPI..."
echo ""
echo "🚀 API: http://127.0.0.1:8000"
echo ""

../venv/bin/uvicorn main:app --reload --port 8000
