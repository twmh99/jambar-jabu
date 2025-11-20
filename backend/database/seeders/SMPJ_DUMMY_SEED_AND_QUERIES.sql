-- ============================================
-- 🧩 SMPJ DUMMY DATA UNTUK TEST DASHBOARD
-- ============================================

USE smpj;

-- Bersihkan dulu (opsional)
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE absensi;
TRUNCATE TABLE jadwal;
TRUNCATE TABLE gaji;
TRUNCATE TABLE pegawai;
SET FOREIGN_KEY_CHECKS = 1;

-- 👤 Pegawai
INSERT INTO pegawai (id, nama, jabatan, telepon, email, status, hourly_rate, created_at, updated_at)
VALUES
(1, 'Willy Hutagalung', 'Kasir', '081234567890', 'willy@example.com', 'Aktif', 20000, NOW(), NOW()),
(2, 'Nanda Sitorus', 'Koki', '082233445566', 'nanda@example.com', 'Aktif', 22000, NOW(), NOW()),
(3, 'Rika Simanjuntak', 'Pelayan', '085155667788', 'rika@example.com', 'Aktif', 21000, NOW(), NOW());

-- 📅 Jadwal (minggu ini)
INSERT INTO jadwal (pegawai_id, tanggal, shift, jam_mulai, jam_selesai, created_at, updated_at)
VALUES
(1, CURDATE(), 'Pagi', '08:00:00', '16:00:00', NOW(), NOW()),
(2, CURDATE(), 'Siang', '10:00:00', '18:00:00', NOW(), NOW()),
(3, CURDATE(), 'Malam', '14:00:00', '22:00:00', NOW(), NOW());

-- 📋 Absensi (7 hari terakhir)
INSERT INTO absensi (pegawai_id, tanggal, jam_masuk, jam_keluar, status, tip, created_at, updated_at)
VALUES
(1, DATE_SUB(CURDATE(), INTERVAL 1 DAY), '08:00:00', '16:00:00', 'Hadir', 15000, NOW(), NOW()),
(1, DATE_SUB(CURDATE(), INTERVAL 2 DAY), '08:10:00', '16:15:00', 'Terlambat', 10000, NOW(), NOW()),
(2, DATE_SUB(CURDATE(), INTERVAL 1 DAY), '10:02:00', '18:05:00', 'Hadir', 20000, NOW(), NOW()),
(3, DATE_SUB(CURDATE(), INTERVAL 3 DAY), '14:00:00', '22:10:00', 'Hadir', 18000, NOW(), NOW());

-- 💰 Gaji (bulan ini)
INSERT INTO gaji (pegawai_id, periode_awal, periode_akhir, total_jam, gaji_pokok, bonus_tip, total_gaji, created_at, updated_at)
VALUES
(1, DATE_FORMAT(CURDATE(), '%Y-%m-01'), LAST_DAY(CURDATE()), 160, 3200000, 250000, 3450000, NOW(), NOW()),
(2, DATE_FORMAT(CURDATE(), '%Y-%m-01'), LAST_DAY(CURDATE()), 170, 3740000, 275000, 4015000, NOW(), NOW()),
(3, DATE_FORMAT(CURDATE(), '%Y-%m-01'), LAST_DAY(CURDATE()), 150, 3150000, 200000, 3350000, NOW(), NOW());

-- ============================================
-- 🧮 QUERY KOMPLEKS SMPJ
-- ============================================

-- Q1: Rekap kehadiran mingguan
SELECT p.nama, YEARWEEK(a.tanggal, 1) AS minggu,
  ROUND(AVG(CASE WHEN a.status='Hadir' THEN 100 WHEN a.status='Terlambat' THEN 70 ELSE 0 END), 0) AS skor,
  ROUND(AVG(GREATEST(TIME_TO_SEC(TIMEDIFF(a.jam_keluar,a.jam_masuk))/60,0))/480*100,0) AS produktivitas
FROM absensi a
JOIN pegawai p ON p.id=a.pegawai_id
GROUP BY p.nama, minggu
ORDER BY minggu DESC;

-- Q2: Estimasi gaji + tip
SELECT p.nama, SUM(GREATEST(TIME_TO_SEC(TIMEDIFF(a.jam_keluar,a.jam_masuk))/3600,0)) AS jam,
       p.hourly_rate, SUM(a.tip) AS tip,
       SUM(GREATEST(TIME_TO_SEC(TIMEDIFF(a.jam_keluar,a.jam_masuk))/3600,0))*p.hourly_rate+SUM(a.tip) AS total
FROM pegawai p
JOIN absensi a ON p.id=a.pegawai_id
GROUP BY p.nama, p.hourly_rate;

-- Q3: Top 5 pegawai terlambat
SELECT p.nama, COUNT(*) AS total_terlambat
FROM absensi a
JOIN pegawai p ON p.id=a.pegawai_id
WHERE a.status='Terlambat'
GROUP BY p.nama
ORDER BY total_terlambat DESC
LIMIT 5;

-- Q4: Jadwal tanpa absensi hari ini
SELECT p.nama, j.shift, j.jam_mulai, j.jam_selesai
FROM jadwal j
JOIN pegawai p ON p.id=j.pegawai_id
LEFT JOIN absensi a ON a.pegawai_id=j.pegawai_id AND a.tanggal=j.tanggal
WHERE a.id IS NULL AND j.tanggal=CURDATE();

-- Q5: Tambah index & kolom bantu
ALTER TABLE absensi ADD INDEX idx_absensi_pegawai_tanggal (pegawai_id, tanggal);
ALTER TABLE absensi
  ADD COLUMN durasi_menit INT GENERATED ALWAYS AS (GREATEST(TIME_TO_SEC(TIMEDIFF(jam_keluar,jam_masuk))/60,0)) STORED;

-- ============================================
-- 📊 VIEW UNTUK LAPORAN
-- ============================================

CREATE OR REPLACE VIEW v_kehadiran_mingguan AS
SELECT p.nama, YEARWEEK(a.tanggal,1) AS minggu,
  SUM(a.status='Hadir') AS hadir, SUM(a.status='Terlambat') AS terlambat
FROM absensi a JOIN pegawai p ON p.id=a.pegawai_id
GROUP BY p.nama, minggu;

CREATE OR REPLACE VIEW v_payroll_bulanan_estimasi AS
SELECT p.nama, DATE_FORMAT(a.tanggal,'%Y-%m') AS periode,
  SUM(GREATEST(TIME_TO_SEC(TIMEDIFF(a.jam_keluar,a.jam_masuk))/3600,0)) AS jam_kerja,
  p.hourly_rate, SUM(a.tip) AS total_tip,
  SUM(GREATEST(TIME_TO_SEC(TIMEDIFF(a.jam_keluar,a.jam_masuk))/3600,0))*p.hourly_rate+SUM(a.tip) AS estimasi_gaji
FROM absensi a JOIN pegawai p ON p.id=a.pegawai_id
GROUP BY p.nama, periode, p.hourly_rate;

CREATE OR REPLACE VIEW v_shift_aktif_hari_ini AS
SELECT j.tanggal, j.shift, p.nama, a.jam_masuk, a.jam_keluar, a.status
FROM jadwal j
JOIN pegawai p ON p.id=j.pegawai_id
LEFT JOIN absensi a ON a.pegawai_id=j.pegawai_id AND a.tanggal=j.tanggal
WHERE j.tanggal=CURDATE();

-- Q1. Rekap mingguan: skor kehadiran & produktivitas (JOIN + CASE + fungsi waktu)
SELECT
  p.id AS pegawai_id,
  p.nama,
  YEARWEEK(a.tanggal, 1) AS minggu,
  ROUND(AVG(CASE
      WHEN a.status = 'Hadir' THEN 100
      WHEN a.status = 'Terlambat' THEN 70
      ELSE 0
  END), 0) AS skor_kehadiran,
  ROUND(AVG(
     NULLIF(GREATEST(TIME_TO_SEC(TIMEDIFF(a.jam_keluar, a.jam_masuk))/60, 0), 0)
  ) / 480 * 100, 0) AS produktivitas
FROM absensi a
JOIN pegawai p ON p.id = a.pegawai_id
GROUP BY p.id, p.nama, YEARWEEK(a.tanggal, 1)
ORDER BY minggu DESC, p.nama;

-- Q2. Payroll periode (SUBQUERY menghitung jam kerja + gabung tip)
SELECT
  p.id AS pegawai_id,
  p.nama,
  ROUND(SUM(t.jam_kerja), 2) AS total_jam,
  p.hourly_rate,
  COALESCE(SUM(t.total_tip), 0) AS total_tip,
  ROUND(SUM(t.jam_kerja) * p.hourly_rate + COALESCE(SUM(t.total_tip),0), 0) AS estimasi_total_gaji
FROM pegawai p
JOIN (
  SELECT
    a.pegawai_id,
    SUM(GREATEST(TIME_TO_SEC(TIMEDIFF(a.jam_keluar, a.jam_masuk))/3600, 0)) AS jam_kerja,
    SUM(a.tip) AS total_tip
  FROM absensi a
  WHERE a.tanggal BETWEEN '2025-11-01' AND '2025-11-30'
    AND a.jam_masuk IS NOT NULL AND a.jam_keluar IS NOT NULL
  GROUP BY a.pegawai_id
) t ON t.pegawai_id = p.id
GROUP BY p.id, p.nama, p.hourly_rate
ORDER BY estimasi_total_gaji DESC;

-- Q3. Top 5 pegawai paling sering terlambat (SUBQUERY + HAVING)
SELECT
  p.id,
  p.nama,
  COUNT(*) AS terlambat_count
FROM absensi a
JOIN pegawai p ON p.id = a.pegawai_id
WHERE a.status = 'Terlambat'
  AND a.tanggal >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
GROUP BY p.id, p.nama
HAVING COUNT(*) > 0
ORDER BY terlambat_count DESC, p.nama
LIMIT 5;

-- Q4. Jadwal hari ini tanpa absensi (LEFT JOIN + IS NULL)
SELECT
  j.tanggal,
  j.shift,
  p.id AS pegawai_id,
  p.nama,
  j.jam_mulai,
  j.jam_selesai
FROM jadwal j
JOIN pegawai p ON p.id = j.pegawai_id
LEFT JOIN absensi a
  ON a.pegawai_id = j.pegawai_id
  AND a.tanggal = j.tanggal
WHERE DATE(j.tanggal) = CURDATE()
  AND a.id IS NULL
ORDER BY j.jam_mulai;

-- Q5. DDL: optimasi & konsistensi (INDEX + generated column)
ALTER TABLE absensi
  ADD INDEX idx_absensi_pegawai_tanggal (pegawai_id, tanggal);

ALTER TABLE absensi
  ADD COLUMN durasi_menit INT
  GENERATED ALWAYS AS (
    GREATEST(TIME_TO_SEC(TIMEDIFF(jam_keluar, jam_masuk))/60, 0)
  ) STORED;

