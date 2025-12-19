-- =============================================================
-- SMPJ SAMPLE DATA DUMP
-- Gunakan file ini setelah tabel dibuat oleh Laravel migrations.
-- Perintah:
--   mysql -u smpj_user -psmpj123 smpj_db < backend/database/smpj_dump.sql
-- =============================================================

USE smpj_db;

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE tips;
TRUNCATE TABLE gaji;
TRUNCATE TABLE absensi;
TRUNCATE TABLE jadwal;
TRUNCATE TABLE users;
TRUNCATE TABLE pegawai;
TRUNCATE TABLE settings;
SET FOREIGN_KEY_CHECKS = 1;

-- ===================== PEGAWAI =====================
INSERT INTO pegawai (id, nama, jabatan, telepon, email, status, hourly_rate, created_at, updated_at) VALUES
(1, 'Willy Hutagalung', 'Supervisor', '081286600011', 'willyhutagalung99@gmail.com', 'Aktif', 32000, NOW(), NOW()),
(2, 'Rafaelin Amir', 'Kasir', '081255500077', 'rafaelinamir@gmail.com', 'Aktif', 25000, NOW(), NOW()),
(3, 'Alya Kusuma', 'Koki', '081278900021', 'koki.owner@gmail.com', 'Aktif', 27000, NOW(), NOW());

-- ===================== USERS =====================
SET @PASSWORD := '$2y$10$syoqWWhZ2l1F2Xf6Pg7FMe8WAzKD8I2WLrCYCRINKtV6H/KjnMTEe';
INSERT INTO users (id, name, email, password, role, pegawai_id, is_first_login, created_at, updated_at)
VALUES
(1, 'Owner', 'owner@gmail.com', @PASSWORD, 'owner', NULL, 0, NOW(), NOW()),
(2, 'Willy Hutagalung', 'willyhutagalung99@gmail.com', @PASSWORD, 'supervisor', 1, 0, NOW(), NOW()),
(3, 'Rafaelin Amir', 'rafaelinamir@gmail.com', @PASSWORD, 'employee', 2, 0, NOW(), NOW()),
(4, 'Alya Kusuma', 'koki.owner@gmail.com', @PASSWORD, 'employee', 3, 0, NOW(), NOW());

-- ===================== JADWAL =====================
INSERT INTO jadwal (pegawai_id, supervisor_id, tanggal, shift, jam_mulai, jam_selesai, created_at, updated_at) VALUES
(2, 2, CURDATE(), 'Pagi', '08:00:00', '14:00:00', NOW(), NOW()),
(3, 2, CURDATE(), 'Siang', '14:00:00', '20:00:00', NOW(), NOW());

-- ===================== ABSENSI =====================
INSERT INTO absensi (pegawai_id, supervisor_id, tanggal, jam_masuk, jam_keluar, status, tip, shift, created_at, updated_at)
VALUES
(2, 2, CURDATE(), '08:05:00', '14:10:00', 'Hadir', 15000, 'Pagi', NOW(), NOW()),
(3, 2, CURDATE(), '14:10:00', '20:05:00', 'Terlambat', 17500, 'Siang', NOW(), NOW());

-- ===================== GAJI =====================
INSERT INTO gaji (pegawai_id, periode, periode_awal, periode_akhir, total_jam, gaji_pokok, bonus_tip, total_gaji, total_tip, created_at, updated_at)
VALUES
(2, DATE_FORMAT(CURDATE(), '%Y-%m'), DATE_SUB(CURDATE(), INTERVAL 7 DAY), CURDATE(), 40, 350000, 60000, 410000, 60000, NOW(), NOW()),
(3, DATE_FORMAT(CURDATE(), '%Y-%m'), DATE_SUB(CURDATE(), INTERVAL 7 DAY), CURDATE(), 42, 360000, 50000, 410000, 50000, NOW(), NOW());

-- ===================== TIPS =====================
INSERT INTO tips (pegawai_id, owner_id, jumlah_tip, tanggal, keterangan, created_at, updated_at)
VALUES
(2, 1, 15000, CURDATE(), 'Tip hari ini', NOW(), NOW()),
(3, 1, 17500, CURDATE(), 'Tip shift siang', NOW(), NOW());

-- ===================== SETTINGS =====================
INSERT INTO settings (id, `key`, `value`, description, created_at, updated_at) VALUES
(1, 'attendance_buffer_before_start', '30', NULL, NOW(), NOW()),
(2, 'attendance_buffer_after_end', '30', NULL, NOW(), NOW()),
(3, 'attendance_geofence_latitude', '-7.7808900830279', NULL, NOW(), NOW()),
(4, 'attendance_geofence_longitude', '110.41574121117', NULL, NOW(), NOW()),
(5, 'attendance_geofence_radius_m', '50', NULL, NOW(), NOW());
