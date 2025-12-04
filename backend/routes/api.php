<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\PegawaiController;
use App\Http\Controllers\JadwalController;
use App\Http\Controllers\AbsensiController;
use App\Http\Controllers\GajiController;
use App\Http\Controllers\ReportController;
// HAPUS: use App\Http\Controllers\DashboardController;

/* ===== AUTH (public) ===== */
Route::post('/login', [AuthController::class, 'login']);
Route::get('/health', fn () => response()->json(['ok' => true, 'ts' => now()->toDateTimeString()]));

/* ===== Protected via Sanctum ===== */
Route::middleware('auth:sanctum')->group(function () {

    /* Auth utils */
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/change-password', [AuthController::class, 'changePassword']);

    /* 🔹 Dashboard Owner – pakai ReportController langsung */
    Route::get('/dashboard/summary', [ReportController::class, 'ownerSummary']);

    /* Laporan Owner */
    Route::prefix('laporan')->group(function () {
        Route::get('/owner-summary', [ReportController::class, 'ownerSummary']);
        Route::get('/analisis', [ReportController::class, 'analisisKinerja']);
        Route::post('/import-transaksi', [ReportController::class, 'importTransaksi']); // FIX
        Route::get('/import-transaksi/history', [ReportController::class, 'importHistory']);
        Route::delete('/import-transaksi/history', [ReportController::class, 'clearImportHistory']);
        Route::get('/payroll', [ReportController::class, 'payrollReport']);
        Route::get('/absensi', [ReportController::class, 'attendanceRaw']);
    });

    /* Jadwal */
    Route::get('/jadwal/today', [JadwalController::class, 'today']);
    Route::get('/jadwal/week', [JadwalController::class, 'week']);
    Route::get('/jadwal/{id}', [JadwalController::class, 'show']);
    Route::apiResource('jadwal', JadwalController::class);

    /* Absensi (supervisor & umum) */
    Route::prefix('absensi')->group(function () {
        Route::get('/today',   [AbsensiController::class, 'today']);
        Route::get('/pending', [AbsensiController::class, 'pending']);
        Route::post('/verify/{id}', [AbsensiController::class, 'verify']);
        Route::get('/report/weekly',  [AbsensiController::class, 'reportWeekly']);
        Route::get('/report/monthly', [AbsensiController::class, 'reportMonthly']);
        Route::get('/summary/today',  [AbsensiController::class, 'summaryToday']);
    });

    /* CRUD utama */
    Route::apiResources([
        'pegawai' => PegawaiController::class,
        'absensi' => AbsensiController::class,
        'gaji'    => GajiController::class,
    ]);

    /* Alias kompatibel */
    Route::get('/employees', [PegawaiController::class, 'index']);

    /* Supervisor (ops) */
    Route::prefix('supervisor')->group(function () {
        Route::apiResource('jadwal', JadwalController::class)->only(['store', 'update', 'destroy']);
        Route::get('absensi/pending', [AbsensiController::class, 'pending']);
        Route::post('absensi/verify/{id}', [AbsensiController::class, 'verify']);
    });

    /* Pegawai (untuk dashboard employee) */
    Route::prefix('pegawai')->group(function () {
        Route::get('jadwal/{id}',   [JadwalController::class, 'jadwalPegawai']);
        Route::get('absensi/{id}',  [AbsensiController::class, 'byPegawai']);
        Route::post('checkin',      [AbsensiController::class, 'checkin']);
        Route::post('checkout',     [AbsensiController::class, 'checkout']);

        // 🔹 PERBAIKI: pakai GajiController, bukan PegawaiController
        Route::get('gaji/{id}', [GajiController::class, 'gajiPegawai']);

        Route::post('change-password', [PegawaiController::class, 'changePassword']);

        Route::get('profil/{id}',   [PegawaiController::class, 'profilPegawai']);
        Route::post('profil/update/{id}', [PegawaiController::class, 'updateProfil'])->name('pegawai.updateProfil');
    });
});
