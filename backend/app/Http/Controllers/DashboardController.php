<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Pegawai;
use App\Models\Absensi;
use App\Models\Jadwal;
use App\Models\Gaji;
use Carbon\Carbon;
use DB;

class DashboardController extends Controller
{
    public function summary()
    {
        $bulanIni = Carbon::now()->format('m');
        $tahunIni = Carbon::now()->format('Y');

        $totalPegawai = Pegawai::count();

        $absensiBulanIni = Absensi::whereMonth('tanggal', $bulanIni)
            ->whereYear('tanggal', $tahunIni)
            ->count();

        $totalGaji = Gaji::whereMonth('created_at', $bulanIni)
            ->whereYear('created_at', $tahunIni)
            ->sum('total_gaji');

        // Tren kehadiran mingguan (7 hari terakhir)
        $tren = Absensi::select(
                DB::raw('WEEK(tanggal) as minggu'),
                DB::raw('COUNT(*) as jumlah')
            )
            ->whereYear('tanggal', $tahunIni)
            ->groupBy('minggu')
            ->orderBy('minggu', 'desc')
            ->limit(4)
            ->get();

        // Komposisi shift
        $komposisiShift = Jadwal::select('shift', DB::raw('COUNT(*) as jumlah'))
            ->groupBy('shift')
            ->get();

        return response()->json([
            'total_pegawai' => $totalPegawai,
            'absensi_bulan_ini' => $absensiBulanIni,
            'total_gaji' => $totalGaji,
            'tren_kehadiran' => $tren,
            'komposisi_shift' => $komposisiShift,
        ]);
    }
}
