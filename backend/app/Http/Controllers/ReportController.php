<?php

namespace App\Http\Controllers;

use App\Models\Pegawai;
use App\Models\Absensi;
use App\Models\Gaji;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Carbon\Carbon;

class ReportController extends Controller
{
    /** 📊 Ringkasan Dashboard Owner */
    public function ownerSummary()
    {
        try {
            $totalEmployees = Pegawai::count();
            $attendanceThisMonth = Absensi::whereMonth('tanggal', now()->month)
                ->whereYear('tanggal', now()->year)
                ->count();
            $totalPayroll = Gaji::sum('total_gaji');

            // 🔹 Tren 4 minggu terakhir
            $attendanceTrend = Absensi::select(
                DB::raw('WEEK(tanggal) as week'),
                DB::raw('COUNT(*) as count')
            )
                ->whereYear('tanggal', now()->year)
                ->groupBy('week')
                ->orderBy('week', 'asc')
                ->get()
                ->map(fn($row) => [
                    'label' => 'Minggu ' . $row->week,
                    'value' => $row->count,
                ]);

            // 🔹 Komposisi shift (hanya jika kolom shift tersedia)
            $shiftComposition = [];
            if (Schema::hasColumn('absensi', 'shift')) {
                $shiftComposition = Absensi::select('shift', DB::raw('COUNT(*) as count'))
                    ->groupBy('shift')
                    ->pluck('count', 'shift');
            }

            return response()->json([
                'data' => [
                    'total_employees' => $totalEmployees,
                    'attendance_this_month' => $attendanceThisMonth,
                    'total_payroll' => $totalPayroll,
                    'attendance_trend' => $attendanceTrend,
                    'shift_composition' => $shiftComposition,
                ]
            ], 200);
        } catch (\Throwable $e) {
            Log::error("❌ Gagal memuat dashboard owner: " . $e->getMessage());
            return response()->json([
                'message' => 'Gagal memuat data dashboard owner',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /** 📈 Analisis Kinerja */
    public function analisisKinerja()
    {
        try {
            $performances = Pegawai::withCount('absensi')
                ->get()
                ->map(fn($p) => [
                    'nama' => $p->nama,
                    'jabatan' => $p->jabatan,
                    'total_hadir' => $p->absensi_count ?? 0,
                ]);

            return response()->json(['data' => $performances], 200);
        } catch (\Throwable $e) {
            Log::error("❌ Gagal memuat analisis kinerja: " . $e->getMessage());
            return response()->json([
                'message' => 'Gagal memuat analisis kinerja',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /** 💰 Laporan Gaji & Tip */
    public function payrollReport()
    {
        try {
            $rows = Gaji::with('pegawai:id,nama')
                ->orderByDesc('id')
                ->get()
                ->map(fn($g) => [
                    'id'         => $g->id,
                    'pegawai_id' => $g->pegawai_id,
                    'nama'       => $g->pegawai?->nama ?? '-',
                    'periode'    => $g->periode ?? '-',
                    'jam_kerja'  => $g->jam_kerja ?? 0,
                    'gaji'       => $g->total_gaji ?? 0,
                    'tip'        => $g->total_tip ?? 0,
                ]);

            return response()->json(['data' => $rows], 200);
        } catch (\Throwable $e) {
            Log::error("❌ Gagal memuat laporan gaji: " . $e->getMessage());
            return response()->json([
                'message' => 'Gagal memuat laporan gaji & tip',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }
}
