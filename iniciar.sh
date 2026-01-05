#!/bin/bash

echo "=========================================="
echo "      INICIANDO SISTEMA EXTRATOR - MADM BRASIL"
echo "=========================================="

# Check if we are on macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "[1/2] Iniciando Backend (FastAPI)..."
    osascript -e 'tell application "Terminal" to do script "cd \"'$(pwd)'/backend\" && if [ ! -d \"venv\" ]; then python3 -m venv venv; fi && source venv/bin/activate && pip install -r requirements.txt && uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"'

    echo "[2/2] Iniciando Frontend (React/Vite)..."
    osascript -e 'tell application "Terminal" to do script "cd \"'$(pwd)'/frontend\" && npm run dev"'

    echo "Servidores iniciados em novas janelas do Terminal!"
else
    echo "Este script foi otimizado para macOS (Darwin). Seu sistema parece ser: $OSTYPE"
    echo "Tentando rodar em background no mesmo terminal..."
    
    (cd backend && source venv/bin/activate && pip install -r requirements.txt && uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload) &
    BACKEND_PID=$!
    
    (cd frontend && npm run dev) &
    FRONTEND_PID=$!
    
    echo "Backend PID: $BACKEND_PID"
    echo "Frontend PID: $FRONTEND_PID"
    echo "Pressione Ctrl+C para encerrar."
    wait
fi
