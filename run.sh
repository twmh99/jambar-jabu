#!/bin/bash
# ===========================================
# 🚀 SMPJ Startup Script
# Menjalankan: Database + Laravel + React Vite + phpMyAdmin
# ===========================================

YELLOW='\033[1;33m'
GREEN='\033[1;32m'
CYAN='\033[1;36m'
NC='\033[0m' # no color

echo -e "${YELLOW}🚀 Memulai Sistem Manajemen Pegawai & Jadwal (SMPJ)...${NC}"
cd ~/smpj || exit 1

# ===========================================
# 1️⃣ Jalankan MySQL (XAMPP/Laragon atau local)
# ===========================================
echo -e "${CYAN}▶️ Menjalankan MySQL Database...${NC}"
sudo service mysql start 2>/dev/null || true
sleep 2

# Pastikan database & user tersedia
echo -e "${CYAN}🧱 Memastikan database smpj_db tersedia...${NC}"
mysql -u root -e "
CREATE DATABASE IF NOT EXISTS smpj_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'smpj_user'@'localhost' IDENTIFIED BY 'smpj123';
GRANT ALL PRIVILEGES ON smpj_db.* TO 'smpj_user'@'localhost';
FLUSH PRIVILEGES;
" 2>/dev/null

# ===========================================
# 2️⃣ Jalankan backend Laravel
# ===========================================
echo -e "${CYAN}▶️ Menjalankan backend Laravel...${NC}"
cd backend || exit 1

if [ ! -d "vendor" ]; then
  echo "📦 Menginstall dependency Laravel..."
  composer install
fi

if [ ! -f ".env" ]; then
  echo "❗ File .env belum ada, menyalin dari .env.example..."
  cp .env.example .env
fi

php artisan key:generate --force
php artisan migrate --force

php artisan serve --host=127.0.0.1 --port=8000 > ../backend.log 2>&1 &
BACKEND_PID=$!
sleep 2

echo -e "${GREEN}✅ Backend aktif di: http://127.0.0.1:8000${NC}"

# ===========================================
# Jalankan frontend React (Vite)
# ===========================================
echo -e "${CYAN}▶️ Menjalankan frontend React (Vite)...${NC}"
cd ../frontend || exit 1

if [ ! -d "node_modules" ]; then
  echo "📦 Menginstall dependency frontend..."
  npm install
fi

npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
sleep 2

echo -e "${GREEN}✅ Frontend aktif di: http://localhost:3000${NC}"

# ===========================================
# 4️⃣ Buka phpMyAdmin otomatis (kalau tersedia)
# ===========================================
echo -e "${CYAN}🌐 Membuka phpMyAdmin...${NC}"
xdg-open "http://localhost/phpmyadmin" 2>/dev/null || open "http://localhost/phpmyadmin" 2>/dev/null || true

# ===========================================
# 5️⃣ Informasi login DB & sistem
# ===========================================
echo -e "\n${YELLOW}💡 Semua sistem aktif:"
echo -e "   🌐 Frontend:   ${GREEN}http://localhost:3000${NC}"
echo -e "   ⚙️  Backend :   ${GREEN}http://127.0.0.1:8000${NC}"
echo -e "   🗄️  phpMyAdmin: ${GREEN}http://localhost/phpmyadmin${NC}"
echo -e "   🧩 Database Login:"
echo -e "      • Host     : 127.0.0.1"
echo -e "      • Database : smpj_db"
echo -e "      • User     : smpj_user"
echo -e "      • Password : smpj123${NC}\n"

# ===========================================
# 6️⃣ Tutup semua proses ketika CTRL+C
# ===========================================
trap 'echo -e "\n🛑 Menghentikan semua proses..."; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0' INT

echo -e "${CYAN}Tekan CTRL+C untuk menghentikan semua proses.${NC}"
wait
