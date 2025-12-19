<?php

namespace App\Http\Controllers;

use App\Models\Absensi;
use App\Models\Pegawai;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class GajiController extends Controller
{
    private function parseTimeToSeconds(?string $time): ?int
    {
        if (!$time) return null;
        $parts = explode(':', $time);
        if (count($parts) < 2) return null;
        $h = (int) ($parts[0] ?? 0);
        $m = (int) ($parts[1] ?? 0);
        $s = (int) ($parts[2] ?? 0);
        return ($h * 3600) + ($m * 60) + $s;
    }

    private function calcHours(?string $inTime, ?string $outTime): float
    {
        $inSec = $this->parseTimeToSeconds($inTime);
        $outSec = $this->parseTimeToSeconds($outTime);
        if ($inSec === null || $outSec === null) return 0.0;
        if ($outSec < $inSec) {
            $outSec += 24 * 3600;
        }
        $hours = max(0, ($outSec - $inSec) / 3600);
        return round($hours, 2);
    }

    public function index(Request $request)
    {
        $pegawaiId = $request->query('pegawai_id');
        $from      = $request->query('from');
        $to        = $request->query('to');

        $q = Absensi::with('pegawai');

        if ($pegawaiId) $q->where('pegawai_id', $pegawaiId);
        if ($from)      $q->where('tanggal', '>=', $from);
        if ($to)        $q->where('tanggal', '<=', $to);

        $rows = $q->get()->map(function ($a) {
            $rate = $a->pegawai?->hourly_rate ?? 20000;

            $hours = $this->calcHours($a->jam_masuk ?? $a->check_in ?? null, $a->jam_keluar ?? $a->check_out ?? null);

            $gaji  = round($hours * $rate);
            $tip   = (float) $a->tip;            // ⬅️ AMBIL TIP DARI ABSENSI
            $total = $gaji + $tip;

            return [
                'tanggal'   => $a->tanggal,
                'pegawai'   => $a->pegawai?->nama ?? $a->pegawai_id,
                'jam_kerja' => $hours,
                'rate'      => $rate,
                'tip'       => $tip,              // ⬅️ TIP MUNCUL DISINI
                'total'     => $total,
            ];
        });

        return response()->json($rows->values());
    }

        // === Untuk frontend Pay.jsx ===
public function gajiPegawai($pegawaiId)
{
    $absensi = Absensi::where('pegawai_id', $pegawaiId)->get();

    $result = $absensi->map(function ($a) {
        $rate = $a->pegawai?->hourly_rate ?? 20000;

        $hours = $this->calcHours($a->jam_masuk ?? $a->check_in ?? null, $a->jam_keluar ?? $a->check_out ?? null);

        return [
            'tanggal' => $a->tanggal,
            'jam'     => $hours,
            'rate'    => $rate,
            'tip'     => (float) $a->tip,  // ⬅️ TIP TERAMBIL
            'total'   => round($hours * $rate) + (float) $a->tip
        ];
    });

    return response()->json($result->values());
}
}
