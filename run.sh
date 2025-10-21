#!/bin/bash

# === SMPJ Startup Script ===
# Jalankan backend FastAPI dan frontend Vite bersamaan

echo "🚀 Menjalankan SMPJ (Backend + Frontend)..."
echo "------------------------------------------"

# Aktifkan virtual environment
cd ~/smpj/backend
source venv/bin/activate

# Jalankan backend di background
echo "▶️ Menjalankan backend (FastAPI)..."
uvicorn server:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# Tunggu sebentar agar backend siap
sleep 3

# Jalankan frontend
echo "🌐 Menjalankan frontend (Vite React)..."
cd ~/smpj/frontend
npm run dev

# Kalau frontend selesai (misal kamu tekan CTRL+C), hentikan backend juga
echo "🛑 Menghentikan backend..."
kill $BACKEND_PID

echo "✅ Semua proses dihentikan dengan aman."
