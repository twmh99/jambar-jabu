-- SMPJ Dummy Data Supervisor (Tren Kehadiran, Dashboard, Absensi, Rekap)
-- Jalankan di database smpj_db

USE smpj_db;

-- Ambil supervisor_id otomatis (ganti email jika perlu)
SET @supervisor_id := (
  SELECT id FROM users
  WHERE email = 'willyhutagalung99@gmail.com'
  LIMIT 1
);

-- Kalau supervisor_id tidak ditemukan, hentikan
SELECT IF(@supervisor_id IS NULL, 'ERROR: supervisor_id tidak ditemukan', 'OK') AS status;

-- Hapus data 7 hari terakhir agar tidak dobel
SET FOREIGN_KEY_CHECKS = 0;
DELETE FROM absensi WHERE tanggal >= DATE_SUB(CURDATE(), INTERVAL 6 DAY);
DELETE FROM jadwal WHERE tanggal >= DATE_SUB(CURDATE(), INTERVAL 6 DAY);
SET FOREIGN_KEY_CHECKS = 1;

-- Jadwal hari ini (untuk Shift Aktif & Jadwal Tervalidasi)
INSERT INTO jadwal (pegawai_id, supervisor_id, tanggal, shift, jam_mulai, jam_selesai, created_at, updated_at) VALUES
(2,  @supervisor_id, CURDATE(), 'Pagi',  '08:00:00', '13:00:00', NOW(), NOW()),
(3,  @supervisor_id, CURDATE(), 'Siang', '14:00:00', '19:00:00', NOW(), NOW()),
(4,  @supervisor_id, CURDATE(), 'Malam', '21:00:00', '06:00:00', NOW(), NOW()),
(5,  @supervisor_id, CURDATE(), 'Pagi',  '08:00:00', '13:00:00', NOW(), NOW()),
(6,  @supervisor_id, CURDATE(), 'Siang', '14:00:00', '19:00:00', NOW(), NOW()),
(7,  @supervisor_id, CURDATE(), 'Malam', '21:00:00', '06:00:00', NOW(), NOW()),
(8,  @supervisor_id, CURDATE(), 'Pagi',  '08:00:00', '13:00:00', NOW(), NOW()),
(9,  @supervisor_id, CURDATE(), 'Siang', '14:00:00', '19:00:00', NOW(), NOW()),
(10, @supervisor_id, CURDATE(), 'Pagi',  '08:00:00', '13:00:00', NOW(), NOW()),
(11, @supervisor_id, CURDATE(), 'Siang', '14:00:00', '19:00:00', NOW(), NOW());

-- Absensi hari ini (untuk Pegawai Hadir/Terlambat + Pending Verifikasi)
INSERT INTO absensi (pegawai_id, supervisor_id, tanggal, jam_masuk, jam_keluar, status, tip, shift, created_at, updated_at) VALUES
(2,  @supervisor_id, CURDATE(), '08:00:00', '13:00:00', 'Terlambat', 15000, 'Pagi',  NOW(), NOW()),
(3,  @supervisor_id, CURDATE(), '14:00:00', '19:10:00', 'Hadir',     12000, 'Siang', NOW(), NOW()),
(4,  @supervisor_id, CURDATE(), '21:00:00', '06:30:00',  'Hadir',     8000,  'Malam', NOW(), NOW()), -- pending
(5,  @supervisor_id, CURDATE(), '08:05:00', '13:00:00', 'Hadir',      9000,  'Pagi',  NOW(), NOW()),
(6,  @supervisor_id, CURDATE(), '14:10:00', '19:30:00', 'Terlambat', 11000, 'Siang', NOW(), NOW()),
(7,  @supervisor_id, CURDATE(), '21:00:00', '06:30:00', 'Hadir',      7000,  'Malam', NOW(), NOW()), -- overtime
(8,  @supervisor_id, CURDATE(), '08:00:00', '13:00:00', 'Hadir',      6000,  'Pagi',  NOW(), NOW()),
(9,  @supervisor_id, CURDATE(), '14:00:00', '19:00:00', 'Hadir',      6500,  'Siang', NOW(), NOW()),
(10, @supervisor_id, CURDATE(), '08:20:00', '13:00:00', 'Hadir',      4000,  'Pagi',  NOW(), NOW()), -- pending
(11, @supervisor_id, CURDATE(), '14:00:00', '19:15:00', 'Hadir',      5000,  'Siang', NOW(), NOW());

-- Riwayat 7 hari untuk Tren Kehadiran Mingguan (fokus Rafaelin + beberapa pegawai lain)
INSERT INTO absensi (pegawai_id, supervisor_id, tanggal, jam_masuk, jam_keluar, status, tip, shift, created_at, updated_at) VALUES
(2, @supervisor_id, DATE_SUB(CURDATE(), INTERVAL 1 DAY), '08:00:00', '13:00:00', 'Terlambat', 15000, 'Pagi',  NOW(), NOW()),
(2, @supervisor_id, DATE_SUB(CURDATE(), INTERVAL 2 DAY), '08:00:00', '13:00:00', 'Terlambat', 15000, 'Pagi',  NOW(), NOW()),
(2, @supervisor_id, DATE_SUB(CURDATE(), INTERVAL 3 DAY), '08:00:00', '13:00:00', 'Hadir',     15000, 'Pagi',  NOW(), NOW()),
(2, @supervisor_id, DATE_SUB(CURDATE(), INTERVAL 4 DAY), '08:00:00', '13:30:00', 'Hadir',     15000, 'Pagi',  NOW(), NOW()),
(2, @supervisor_id, DATE_SUB(CURDATE(), INTERVAL 5 DAY), '08:00:00', '13:00:00', 'Hadir',     15000, 'Pagi',  NOW(), NOW()),
(2, @supervisor_id, DATE_SUB(CURDATE(), INTERVAL 6 DAY), '08:00:00', '13:00:00', 'Hadir',     15000, 'Pagi',  NOW(), NOW()),
(3, @supervisor_id, DATE_SUB(CURDATE(), INTERVAL 1 DAY), '14:00:00', '19:30:00', 'Hadir',     12000, 'Siang', NOW(), NOW()),
(4, @supervisor_id, DATE_SUB(CURDATE(), INTERVAL 1 DAY), '21:00:00', '06:30:00', 'Hadir',      8000, 'Malam', NOW(), NOW()),
(5, @supervisor_id, DATE_SUB(CURDATE(), INTERVAL 2 DAY), '08:00:00', '17:30:00', 'Hadir',      9000, 'Pagi',  NOW(), NOW()); -- overtime
