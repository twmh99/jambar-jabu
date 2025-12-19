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

# Gunakan lokasi file ini sebagai root proyek sehingga script bisa dijalankan dari mana saja
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR" || exit 1

# ===========================================
# Utility: pastikan dependensi tersedia
# ===========================================
APT_UPDATED=0

apt_install() {
  if ! command -v apt-get >/dev/null 2>&1; then
    return 1
  fi

  if [ "$APT_UPDATED" -eq 0 ]; then
    echo -e "${CYAN}🔄 Memperbarui daftar paket (sudo apt-get update)...${NC}"
    sudo apt-get update || return 1
    APT_UPDATED=1
  fi

  sudo apt-get install -y "$@"
}

ensure_php() {
  if command -v php >/dev/null 2>&1; then
    return
  fi

  echo -e "${YELLOW}⚠️ PHP belum terpasang, mencoba menginstall otomatis...${NC}"
  if apt_install php php-cli php-mbstring php-xml php-curl php-gd unzip; then
    echo -e "${GREEN}✅ PHP berhasil dipasang.${NC}"
  else
    echo -e "${YELLOW}❌ Tidak bisa menginstall PHP otomatis. Silakan install PHP 8.1+ secara manual lalu coba lagi.${NC}"
    exit 1
  fi
}

ensure_composer() {
  if command -v composer >/dev/null 2>&1; then
    return
  fi

  echo -e "${YELLOW}⚠️ Composer belum terpasang, mencoba menginstall otomatis...${NC}"
  if apt_install composer; then
    echo -e "${GREEN}✅ Composer berhasil dipasang.${NC}"
  else
    echo -e "${YELLOW}❌ Tidak bisa menginstall Composer otomatis. Silakan install Composer (https://getcomposer.org/) secara manual lalu coba lagi.${NC}"
    exit 1
  fi
}

ensure_php
ensure_composer

ensure_node() {
  if command -v npm >/dev/null 2>&1 && command -v node >/dev/null 2>&1; then
    return
  fi

  echo -e "${YELLOW}⚠️ Node.js/npm belum terpasang, mencoba menginstall otomatis...${NC}"
  if apt_install nodejs npm; then
    echo -e "${GREEN}✅ Node.js dan npm berhasil dipasang.${NC}"
  else
    echo -e "${YELLOW}❌ Tidak bisa menginstall Node.js/npm otomatis. Silakan install Node.js 18+ secara manual lalu coba lagi.${NC}"
    exit 1
  fi
}

ensure_node

ensure_phpmyadmin_assets() {
  PMA_DIR="$SCRIPT_DIR/tools/phpmyadmin"
  if [ -d "$PMA_DIR" ]; then
    return
  fi

  echo -e "${CYAN}⬇️ Mengunduh phpMyAdmin portable (5.2.1)...${NC}"
  mkdir -p "$SCRIPT_DIR/tools"
  TMP_ARCHIVE="$(mktemp -t pma-XXXXXX.tar.gz)"
  DOWNLOAD_URL="https://files.phpmyadmin.net/phpMyAdmin/5.2.1/phpMyAdmin-5.2.1-all-languages.tar.gz"

  if command -v curl >/dev/null 2>&1; then
    curl -L "$DOWNLOAD_URL" -o "$TMP_ARCHIVE"
  elif command -v wget >/dev/null 2>&1; then
    wget -O "$TMP_ARCHIVE" "$DOWNLOAD_URL"
  else
    echo -e "${YELLOW}❌ Tidak menemukan curl ataupun wget untuk mengunduh phpMyAdmin. Install salah satunya dan jalankan ulang script.${NC}"
    exit 1
  fi

  tar -xzf "$TMP_ARCHIVE" -C "$SCRIPT_DIR/tools"
  rm -f "$TMP_ARCHIVE"
  mv "$SCRIPT_DIR/tools/phpMyAdmin-5.2.1-all-languages" "$PMA_DIR"

  if [ ! -f "$PMA_DIR/config.inc.php" ]; then
    cat >"$PMA_DIR/config.inc.php" <<'PHP'
<?php
$cfg['blowfish_secret'] = 'smpj_local_pma_secret_2025!';
$i = 1;
$cfg['Servers'][$i]['auth_type'] = 'cookie';
$cfg['Servers'][$i]['AllowNoPassword'] = false;
$cfg['Servers'][$i]['host'] = '127.0.0.1';
$cfg['Servers'][$i]['compress'] = false;
$cfg['Servers'][$i]['AllowRoot'] = true;
PHP
  fi
}

start_phpmyadmin_server() {
  ensure_phpmyadmin_assets
  PMA_DIR="$SCRIPT_DIR/tools/phpmyadmin"
  PMA_PORT="${PMA_PORT:-8081}"
  echo -e "${CYAN}▶️ Menjalankan phpMyAdmin portable di http://127.0.0.1:${PMA_PORT}/ ...${NC}"
  php -S "127.0.0.1:${PMA_PORT}" -t "$PMA_DIR" > "$SCRIPT_DIR/phpmyadmin.log" 2>&1 &
  PMA_PID=$!
  sleep 2
}

ensure_phpmyadmin_assets() {
  PMA_DIR="$SCRIPT_DIR/tools/phpmyadmin"
  if [ -d "$PMA_DIR" ]; then
    return
  fi

  echo -e "${CYAN}⬇️ Mengunduh phpMyAdmin portable (5.2.1)...${NC}"
  mkdir -p "$SCRIPT_DIR/tools"
  TMP_ARCHIVE="$(mktemp -t pma-XXXXXX.tar.gz)"
  DOWNLOAD_URL="https://files.phpmyadmin.net/phpMyAdmin/5.2.1/phpMyAdmin-5.2.1-all-languages.tar.gz"

  if command -v curl >/dev/null 2>&1; then
    curl -L "$DOWNLOAD_URL" -o "$TMP_ARCHIVE"
  elif command -v wget >/dev/null 2>&1; then
    wget -O "$TMP_ARCHIVE" "$DOWNLOAD_URL"
  else
    echo -e "${YELLOW}❌ Tidak menemukan curl ataupun wget untuk mengunduh phpMyAdmin. Install salah satunya dan jalankan ulang script.${NC}"
    exit 1
  fi

  tar -xzf "$TMP_ARCHIVE" -C "$SCRIPT_DIR/tools"
  rm -f "$TMP_ARCHIVE"
  mv "$SCRIPT_DIR/tools/phpMyAdmin-5.2.1-all-languages" "$PMA_DIR"

  # Siapkan konfigurasi minimal
  if [ ! -f "$PMA_DIR/config.inc.php" ]; then
    cat >"$PMA_DIR/config.inc.php" <<'PHP'
<?php
$cfg['blowfish_secret'] = 'smpj_local_pma_secret_2025!';
$i = 1;
$cfg['Servers'][$i]['auth_type'] = 'cookie';
$cfg['Servers'][$i]['AllowNoPassword'] = false;
$cfg['Servers'][$i]['host'] = '127.0.0.1';
$cfg['Servers'][$i]['compress'] = false;
$cfg['Servers'][$i]['AllowRoot'] = true;
PHP
  fi
}

ensure_php_extension() {
  local extension="$1"
  shift
  local packages=("$@")
  local installed=0

  if php -m | grep -qi "^${extension}$"; then
    return
  fi

  echo -e "${YELLOW}⚠️ Ekstensi PHP ${extension} belum terpasang, mencoba menginstall paket kandidat: ${packages[*]}...${NC}"
  for pkg in "${packages[@]}"; do
    if apt_install "$pkg"; then
      installed=1
      break
    fi
  done

  if [ "$installed" -eq 1 ]; then
    if php -m | grep -qi "^${extension}$"; then
      echo -e "${GREEN}✅ Ekstensi ${extension} berhasil diaktifkan.${NC}"
      return
    fi
  fi

  echo -e "${YELLOW}❌ Tidak bisa memasang ekstensi ${extension}. Silakan install paket (${packages[*]}) secara manual lalu coba lagi.${NC}"
  exit 1
}

ensure_php_extension "gd" php8.3-gd php8.2-gd php8.1-gd php-gd
ensure_php_extension "pdo_mysql" php8.3-mysql php8.2-mysql php8.1-mysql php-mysql
ensure_mysql_install() {
  if command -v mysql >/dev/null 2>&1 && command -v mysqladmin >/dev/null 2>&1; then
    return
  fi

  echo -e "${YELLOW}⚠️ MySQL/MariaDB belum lengkap, mencoba memasang mysql-server dan mysql-client...${NC}"
  if apt_install mysql-server mysql-client; then
    echo -e "${GREEN}✅ mysql-server & mysql-client terpasang.${NC}"
  else
    echo -e "${YELLOW}❌ Tidak bisa memasang mysql-server secara otomatis. Silakan install MySQL/MariaDB secara manual lalu jalankan ulang script.${NC}"
    exit 1
  fi
}

ensure_mysql_service() {
  ensure_mysql_install

  if command -v systemctl >/dev/null 2>&1; then
    if ! systemctl is-active --quiet mysql 2>/dev/null; then
      echo -e "${CYAN}▶️ Menghidupkan layanan MySQL...${NC}"
      sudo systemctl start mysql >/dev/null 2>&1 || sudo systemctl start mariadb >/dev/null 2>&1 || true
    fi
  else
    echo -e "${CYAN}▶️ Menghidupkan layanan MySQL...${NC}"
    sudo service mysql start >/dev/null 2>&1 || sudo service mariadb start >/dev/null 2>&1 || true
  fi

  if ! mysqladmin ping -h 127.0.0.1 --silent >/dev/null 2>&1; then
    echo -e "${YELLOW}❌ Tidak dapat terhubung ke MySQL di 127.0.0.1:3306. Pastikan MySQL sedang berjalan dan tidak diblok firewall.${NC}"
    exit 1
  fi
}

# ===========================================
# 1️⃣ Jalankan MySQL (XAMPP/Laragon atau local)
# ===========================================
echo -e "${CYAN}▶️ Menjalankan MySQL Database...${NC}"
ensure_mysql_service
sleep 2

# Pastikan database & user tersedia
run_mysql_root() {
  local sql="$1"
  if mysql -u root -e "$sql" >/dev/null 2>&1; then
    return 0
  fi

  if sudo mysql -e "$sql" >/dev/null 2>&1; then
    return 0
  fi

  return 1
}

echo -e "${CYAN}🧱 Memastikan database smpj_db tersedia...${NC}"
if ! run_mysql_root "
CREATE DATABASE IF NOT EXISTS smpj_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'smpj_user'@'localhost' IDENTIFIED BY 'smpj123';
ALTER USER 'smpj_user'@'localhost' IDENTIFIED BY 'smpj123';
GRANT ALL PRIVILEGES ON smpj_db.* TO 'smpj_user'@'localhost';
FLUSH PRIVILEGES;
"; then
  echo -e "${YELLOW}❌ Tidak dapat membuat database/user menggunakan akun root. Pastikan Anda bisa menjalankan 'mysql -u root' atau 'sudo mysql' secara manual.${NC}"
  exit 1
fi

# ===========================================
# 2️⃣ Jalankan backend Laravel
# ===========================================
echo -e "${CYAN}▶️ Menjalankan backend Laravel...${NC}"
cd backend || exit 1

if [ ! -d "vendor" ]; then
  echo "📦 Menginstall dependency Laravel..."
  if ! composer install; then
    echo -e "${YELLOW}❌ composer install gagal. Periksa pesan error di atas sebelum melanjutkan.${NC}"
    exit 1
  fi
fi

if [ ! -f ".env" ]; then
  echo "❗ File .env belum ada, menyalin dari .env.example..."
  cp .env.example .env
fi

echo -e "${CYAN}🧹 Membersihkan cache konfigurasi Laravel...${NC}"
php artisan config:clear >/dev/null 2>&1 || true

if grep -Eq "^APP_KEY=[[:space:]]*$" .env; then
  php artisan key:generate --force
else
  echo "🔑 APP_KEY sudah tersedia, lewati key:generate."
fi

php artisan migrate --force
php artisan db:seed --force

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
# 4️⃣ Jalankan phpMyAdmin portable
# ===========================================
start_phpmyadmin_server


# ===========================================
# 4️⃣ Buka phpMyAdmin otomatis (kalau tersedia)
# ===========================================
echo -e "${CYAN}🌐 Membuka phpMyAdmin...${NC}"
xdg-open "http://127.0.0.1:8081" 2>/dev/null || open "http://127.0.0.1:8081" 2>/dev/null || true

# ===========================================
# 5️⃣ Informasi login DB & sistem
# ===========================================
echo -e "\n${YELLOW}💡 Semua sistem aktif:"
echo -e "   🌐 Frontend:   ${GREEN}http://localhost:3000${NC}"
echo -e "   ⚙️  Backend :   ${GREEN}http://127.0.0.1:8000${NC}"
echo -e "   🗄️  phpMyAdmin: ${GREEN}http://127.0.0.1:8081${NC}"
echo -e "   🧩 Database Login:"
echo -e "      • Host     : 127.0.0.1"
echo -e "      • Database : smpj_db"
echo -e "      • User     : smpj_user"
echo -e "      • Password : smpj123${NC}\n"

# ===========================================
# 6️⃣ Tutup semua proses ketika CTRL+C
# ===========================================
trap 'echo -e "\n🛑 Menghentikan semua proses..."; kill $BACKEND_PID $FRONTEND_PID $PMA_PID 2>/dev/null; exit 0' INT

echo -e "${CYAN}Tekan CTRL+C untuk menghentikan semua proses.${NC}"
wait $BACKEND_PID $FRONTEND_PID $PMA_PID
