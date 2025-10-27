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
        $from = $request->query('from');
        $to   = $request->query('to');

        $q = Absensi::with('pegawai');
        if ($pegawaiId) $q->where('pegawai_id', $pegawaiId);
        if ($from) $q->where('tanggal', '>=', $from);
        if ($to) $q->where('tanggal', '<=', $to);

        $rows = $q->get()->map(function ($a) {
            $rate = $a->pegawai?->hourly_rate ?? 20000;
            $secIn = $a->check_in ? strtotime($a->check_in) : null;
            $secOut = $a->check_out ? strtotime($a->check_out) : null;
            $hours = ($secIn && $secOut && $secOut > $secIn) ? ($secOut - $secIn) / 3600 : 0;
            $base = round($hours * $rate);
            return [
                'tanggal' => $a->tanggal,
                'pegawai' => $a->pegawai?->nama ?? $a->pegawai_id,
                'jam' => number_format($hours, 2),
                'rate' => $rate,
                'tip' => (int)$a->tip,
                'total' => $base + (int)$a->tip,
            ];
        });

        return response()->json($rows->values());
    }

    // === Untuk frontend Pay.jsx ===
   public function gajiPegawai($id)
{
    $pegawai = Pegawai::find($id);
    if (!$pegawai) {
        return response()->json(['message' => 'Pegawai tidak ditemukan'], 404);
    }

    $absensi = Absensi::where('pegawai_id', $id)
        ->whereNotNull('check_in')
        ->whereNotNull('check_out')
        ->get();

    if ($absensi->isEmpty()) {
        // agar frontend tetap dapat array kosong
        return response()->json([]);
    }

    $rate = $pegawai->hourly_rate ?? 20000;
    $rows = [];

    foreach ($absensi as $a) {
        $in = \Carbon\Carbon::parse($a->check_in);
        $out = \Carbon\Carbon::parse($a->check_out);
        $jam = $out->diffInMinutes($in) / 60;
        $tips = $a->tip ?? 0;
        $total = round($jam * $rate + $tips);
        $rows[] = [
            'tanggal' => $a->tanggal,
            'jam' => number_format($jam, 2),
            'rate' => $rate,
            'tips' => $tips,
            'total' => $total,
        ];
    }

    return response()->json($rows);
}
}