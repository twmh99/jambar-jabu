<?php

namespace App\Http\Controllers;

use App\Models\Absensi;
use App\Models\Jadwal;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AbsensiController extends Controller
{
    /* ===================== CRUD DASAR ===================== */
    public function index(Request $request)
    {
        $pegawaiId = $request->query('pegawai_id');

        $q = Absensi::orderBy('tanggal', 'desc');
        if ($pegawaiId) {
            $q->where('pegawai_id', $pegawaiId);
        }

        return response()->json($q->get());
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'pegawai_id' => 'required|exists:pegawai,id',
            'tanggal'    => 'required|date',
            'check_in'   => 'nullable|date_format:H:i:s',
            'check_out'  => 'nullable|date_format:H:i:s',
            'status'     => 'nullable|in:Hadir,Terlambat,Izin,Alpha,pending',
            'tip'        => 'nullable|numeric|min:0',
        ]);

        $row = Absensi::create($data);
        return response()->json($row, 201);
    }

    public function show($id)
    {
        return response()->json(Absensi::findOrFail($id));
    }

    public function update(Request $request, $id)
    {
        $row = Absensi::findOrFail($id);

        $data = $request->validate([
            'pegawai_id' => 'sometimes|required|exists:pegawai,id',
            'tanggal'    => 'sometimes|required|date',
            'check_in'   => 'nullable|date_format:H:i:s',
            'check_out'  => 'nullable|date_format:H:i:s',
            'status'     => 'nullable|in:Hadir,Terlambat,Izin,Alpha,pending',
            'tip'        => 'nullable|numeric|min:0',
        ]);

        $row->update($data);
        return response()->json($row);
    }

    public function destroy($id)
    {
        Absensi::findOrFail($id)->delete();
        return response()->json(['message' => 'deleted']);
    }

    /* ===================== AKSI KHUSUS ===================== */

    /** 🔎 Absensi per pegawai (untuk EmployeeDashboard) */
    public function byPegawai($id)
    {
        $rows = Absensi::where('pegawai_id', $id)
            ->orderBy('tanggal', 'desc')
            ->get();

        return response()->json($rows);
    }

    /** ⏰ Check-in */
    public function checkin(Request $request)
    {
        $data = $request->validate([
            'pegawai_id' => 'required|exists:pegawai,id',
        ]);

        $today = Carbon::today()->toDateString();

        $row = Absensi::firstOrCreate(
            ['pegawai_id' => $data['pegawai_id'], 'tanggal' => $today],
            []
        );

        if (!$row->check_in) {
            $now = Carbon::now()->format('H:i:s');
            $row->check_in = $now;
            // status default: Hadir atau Terlambat berdasarkan jam 09:00
            $row->status = ($now > '09:00:00') ? 'Terlambat' : 'Hadir';
            $row->save();
        }

        return response()->json($row);
    }

    /** ⏱ Check-out */
    public function checkout(Request $request)
    {
        $data = $request->validate([
            'pegawai_id' => 'required|exists:pegawai,id',
            'tip'        => 'nullable|numeric|min:0',
        ]);

        $today = Carbon::today()->toDateString();

        $row = Absensi::firstOrCreate(
            ['pegawai_id' => $data['pegawai_id'], 'tanggal' => $today],
            []
        );

        $row->check_out = Carbon::now()->format('H:i:s');
        if (isset($data['tip'])) {
            $row->tip = (float) $data['tip'];
        }
        $row->save();

        return response()->json($row);
    }

    /** 🗓️ Daftar absensi hari ini (untuk Supervisor: ringkasan & tabel) */
    public function today()
    {
        $today = Carbon::today()->toDateString();

        $rows = Absensi::whereDate('tanggal', $today)
            ->orderBy('check_in')
            ->get()
            ->map(function ($r) use ($today) {
                // ambil shift dari jadwal hari ini (kalau ada)
                $shift = Jadwal::where('pegawai_id', $r->pegawai_id)
                    ->whereDate('tanggal', $today)
                    ->value('shift');

                return [
                    'nama'      => optional($r->pegawai)->nama ?? '—',
                    'shift'     => $shift ?? '—',
                    'jam_masuk' => $r->check_in ?? '—',
                    'status'    => $r->status ?? '—',
                ];
            });

        return response()->json($rows->values());
    }

    /** ⏳ Daftar absensi pending verifikasi (check_out kosong) */
    public function pending()
    {
        $rows = Absensi::whereNull('check_out')
            ->orderBy('tanggal', 'desc')
            ->orderBy('check_in', 'desc')
            ->get()
            ->map(function ($r) {
                $shift = Jadwal::where('pegawai_id', $r->pegawai_id)
                    ->whereDate('tanggal', $r->tanggal)
                    ->value('shift');

                return [
                    'id'     => $r->id,
                    'nama'   => optional($r->pegawai)->nama ?? '—',
                    'shift'  => $shift ?? '—',
                    'waktu'  => $r->check_in ?? '—',
                    'status' => $r->status ?? '—',
                ];
            });

        return response()->json($rows->values());
    }

    /** ✅ Verifikasi (force check_out sekarang jika masih null) */
    public function verify($id)
    {
        $row = Absensi::findOrFail($id);

        if (empty($row->check_out)) {
            $row->check_out = Carbon::now()->format('H:i:s');
            $row->save();
        }

        return response()->json(['message' => 'verified', 'row' => $row]);
    }

    /** 📌 Ringkasan hari ini untuk supervisor cards */
    public function summaryToday()
    {
        $today = Carbon::today()->toDateString();

        $totalShift = Jadwal::whereDate('tanggal', $today)->count();
        $hadir      = Absensi::whereDate('tanggal', $today)->where('status', 'Hadir')->count();
        $terlambat  = Absensi::whereDate('tanggal', $today)->where('status', 'Terlambat')->count();

        return response()->json([
            'activeShifts' => $totalShift,
            'present'      => $hadir,
            'late'         => $terlambat,
        ]);
    }

    /** 📈 Laporan mingguan (aman untuk kolom TIME) */
    public function reportWeekly()
    {
        // Produktivitas = avg( menit kerja / 480 * 100 )
        // menit kerja dihitung aman: TIME_TO_SEC(TIMEDIFF(check_out, check_in))/60
        $items = Absensi::select([
            DB::raw('YEARWEEK(tanggal, 1) as minggu'),
            // skor kehadiran: Hadir=100, Terlambat=70, lainnya=0
            DB::raw('ROUND(AVG(CASE WHEN status="Hadir" THEN 100 WHEN status="Terlambat" THEN 70 ELSE 0 END), 0) as kehadiran'),
            DB::raw('ROUND(AVG(NULLIF(GREATEST(TIME_TO_SEC(TIMEDIFF(check_out, check_in))/60,0),0)) / 480 * 100, 0) as produktivitas')
        ])
            ->groupBy('minggu')
            ->orderBy('minggu')
            ->get()
            ->map(fn ($r) => [
                'minggu'        => (string) $r->minggu,
                'kehadiran'     => (int) ($r->kehadiran ?? 0),
                'produktivitas' => (int) ($r->produktivitas ?? 0),
            ]);

        return response()->json($items->values());
    }

    /** 📊 Laporan bulanan (aman untuk kolom TIME) */
    public function reportMonthly()
    {
        $items = Absensi::select([
            DB::raw('YEAR(tanggal) as tahun'),
            DB::raw('MONTH(tanggal) as bulan'),
            DB::raw('ROUND(AVG(CASE WHEN status="Hadir" THEN 100 WHEN status="Terlambat" THEN 70 ELSE 0 END), 0) as kehadiran'),
            DB::raw('ROUND(AVG(NULLIF(GREATEST(TIME_TO_SEC(TIMEDIFF(check_out, check_in))/60,0),0)) / 480 * 100, 0) as produktivitas')
        ])
            ->groupBy('tahun', 'bulan')
            ->orderBy('tahun', 'desc')
            ->orderBy('bulan', 'desc')
            ->get()
            ->map(fn ($r) => [
                'periode'       => sprintf('%04d-%02d', $r->tahun, $r->bulan),
                'kehadiran'     => (int) ($r->kehadiran ?? 0),
                'produktivitas' => (int) ($r->produktivitas ?? 0),
            ]);

        return response()->json($items->values());
    }
}
