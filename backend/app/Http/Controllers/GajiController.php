<?php

namespace App\Http\Controllers;

use App\Models\Absensi;
use App\Models\Pegawai;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class GajiController extends Controller
{
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

            // hitung jam kerja
            if ($a->jam_masuk && $a->jam_keluar) {
                $in  = \Carbon\Carbon::parse($a->jam_masuk);
                $out = \Carbon\Carbon::parse($a->jam_keluar);
                $hours = $out->diffInMinutes($in) / 60;
            } else {
                $hours = 0;
            }

            $gaji  = round($hours * $rate);
            $tip   = (float) $a->tip;            // ⬅️ AMBIL TIP DARI ABSENSI
            $total = $gaji + $tip;

            return [
                'tanggal'   => $a->tanggal,
                'pegawai'   => $a->pegawai?->nama ?? $a->pegawai_id,
                'jam_kerja' => number_format($hours, 2),
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

        if ($a->jam_masuk && $a->jam_keluar) {
            $in  = \Carbon\Carbon::parse($a->jam_masuk);
            $out = \Carbon\Carbon::parse($a->jam_keluar);
            $hours = $out->diffInMinutes($in) / 60;
        } else {
            $hours = 0;
        }

        return [
            'tanggal' => $a->tanggal,
            'jam'     => number_format($hours, 2),
            'rate'    => $rate,
            'tip'     => (float) $a->tip,  // ⬅️ TIP TERAMBIL
            'total'   => round($hours * $rate) + (float) $a->tip
        ];
    });

    return response()->json($result->values());
}
}