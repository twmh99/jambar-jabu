<?php

namespace App\Services\Reports;

use App\Models\Absensi;
use App\Models\Pegawai;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class AttendanceReportService
{
    public function build(array $filters, $user = null): array
    {
        $from = isset($filters['from'])
            ? Carbon::parse($filters['from'])->startOfDay()
            : now()->startOfMonth();
        $to = isset($filters['to'])
            ? Carbon::parse($filters['to'])->endOfDay()
            : now()->endOfMonth();

        if ($to->lessThan($from)) {
            [$from, $to] = [$to->copy()->startOfDay(), $from->copy()->endOfDay()];
        }

        $periodeLabel = $from->isSameDay($to)
            ? $from->translatedFormat('d F Y')
            : $from->translatedFormat('d M Y') . ' – ' . $to->translatedFormat('d M Y');

        $pegawaiId = $filters['pegawai_id'] ?? null;

        $query = Absensi::with(['pegawai:id,nama,jabatan,status,telepon'])
            ->whereBetween('tanggal', [$from->toDateString(), $to->toDateString()])
            ->orderBy('tanggal')
            ->orderBy('pegawai_id');

        if ($pegawaiId && $pegawaiId !== 'all') {
            $query->where('pegawai_id', $pegawaiId);
        }

        $rows = $query->get();

        $detailRows = $rows->map(function (Absensi $row) {
            $duration = $this->calculateDuration($row->jam_masuk, $row->jam_keluar);
            $overtime = max(0, $duration - 8);

            return [
                'tanggal'      => Carbon::parse($row->tanggal)->format('d M Y'),
                'tanggal_raw'  => $row->tanggal,
                'pegawai_id'   => $row->pegawai_id,
                'pegawai_nama' => $row->pegawai->nama ?? '-',
                'jabatan'      => $row->pegawai->jabatan ?? '-',
                'shift'        => $row->shift ?? '-',
                'jam_masuk'    => $row->jam_masuk,
                'jam_keluar'   => $row->jam_keluar,
                'durasi'       => $duration,
                'status'       => $row->status,
                'keterangan'   => $this->buildKeterangan($row->status, $duration),
                'lembur'       => $overtime,
            ];
        });

        $summary = $this->buildSummary($detailRows);
        $graphs = $this->buildGraphs($detailRows);
        $shiftRecap = $this->buildShiftRecap($detailRows);
        $insights = $this->buildInsights($summary, $shiftRecap, $graphs['attendance']);

        $docNumber = sprintf('ABS-%s-%s', now()->format('YmdHis'), strtoupper(Str::random(4)));

        return [
            'meta' => [
                'doc_number'   => $docNumber,
                'generated_at' => now()->format('d M Y H:i'),
                'generated_by' => $user ? ($user->role ?? 'User') . ' - ' . ($user->name ?? 'Tidak diketahui') : 'Sistem',
                'period_label' => $periodeLabel,
                'period_from'  => $from->toDateString(),
                'period_to'    => $to->toDateString(),
            ],
            'header' => [
                'title' => 'Laporan Absensi',
                'subtitle' => $periodeLabel,
            ],
            'summary' => $summary,
            'rows'    => $detailRows,
            'charts'  => $graphs,
            'shift_recap' => $shiftRecap,
            'insights'    => $insights,
        ];
    }

    private function calculateDuration(?string $in, ?string $out): float
    {
        if (!$in || !$out) {
            return 0;
        }

        try {
            $start = Carbon::parse($in);
            $end   = Carbon::parse($out);
            if ($end->lessThan($start)) {
                $end->addDay();
            }
            return round($end->diffInMinutes($start) / 60, 2);
        } catch (\Throwable $e) {
            return 0;
        }
    }

    private function buildKeterangan(string $status, float $duration): ?string
    {
        if ($status === 'Terlambat') {
            return 'Perlu evaluasi kedisiplinan';
        }
        if ($status === 'Alpha' || $status === 'Izin') {
            return 'Tidak hadir';
        }
        if ($duration >= 9) {
            return 'Durasi melebihi 9 jam (indikasi lembur)';
        }
        return null;
    }

    private function buildSummary(Collection $rows): array
    {
        $active = Pegawai::where('status', 'Aktif')->count();
        $totalHadir = $rows->where('status', 'Hadir')->count();
        $totalAlpha = $rows->whereIn('status', ['Alpha', 'Izin'])->count();
        $totalLate  = $rows->where('status', 'Terlambat')->count();
        $totalOver  = $rows->sum('lembur');

        return [
            'total_pegawai' => $active,
            'total_hadir'   => $totalHadir,
            'total_absen'   => $totalAlpha,
            'total_telat'   => $totalLate,
            'total_lembur'  => round($totalOver, 2),
        ];
    }

    private function buildGraphs(Collection $rows): array
    {
        $attendancePerDay = $rows->groupBy('tanggal')->map(function ($items, $tanggal) {
            return [
                'label' => $tanggal,
                'hadir' => $items->where('status', 'Hadir')->count(),
                'alpha' => $items->where('status', 'Alpha')->count(),
                'telat' => $items->where('status', 'Terlambat')->count(),
            ];
        })->values();

        $heatmap = $rows->map(function ($row) {
            if (!$row['jam_masuk']) {
                return null;
            }
            $hour = (int) Carbon::parse($row['jam_masuk'])->format('H');
            $bucket = sprintf('%02d:00', $hour);
            $weekday = Carbon::parse($row['tanggal_raw'])->dayName;

            return [
                'weekday' => $weekday,
                'bucket'  => $bucket,
            ];
        })->filter()->groupBy(fn ($item) => $item['weekday'])->map(function ($items) {
            return collect($items)->groupBy('bucket')->map->count();
        });

        return [
            'attendance' => $attendancePerDay,
            'heatmap'    => $heatmap,
        ];
    }

    private function buildShiftRecap(Collection $rows): array
    {
        return $rows->groupBy('shift')->map(function ($items, $shift) {
            return [
                'shift'  => $shift ?? 'Tidak ditetapkan',
                'hadir'  => $items->where('status', 'Hadir')->count(),
                'telat'  => $items->where('status', 'Terlambat')->count(),
                'absen'  => $items->whereIn('status', ['Alpha', 'Izin'])->count(),
                'lembur' => round($items->sum('lembur'), 2),
            ];
        })->values()->sortBy('shift')->values()->all();
    }

    private function buildInsights(array $summary, array $shiftRecap, Collection $attendancePerDay): array
    {
        $insights = [];

        if (($summary['total_telat'] ?? 0) > ($summary['total_hadir'] ?: 1) * 0.2) {
            $insights[] = 'Tingkat keterlambatan tinggi, perlu program kedisiplinan.';
        } else {
            $insights[] = 'Kedisiplinan pegawai relatif baik pada periode ini.';
        }

        if (!empty($shiftRecap)) {
            $bestShift = collect($shiftRecap)->sortByDesc('hadir')->first();
            if ($bestShift) {
                $insights[] = sprintf('Shift %s memiliki kehadiran tertinggi.', $bestShift['shift']);
            }
        }

        if ($attendancePerDay->count() >= 7) {
            $chunks = $attendancePerDay->chunk(ceil($attendancePerDay->count() / 2));
            if ($chunks->count() >= 2) {
                $firstHalf = ($chunks[0]->sum('hadir')) ?: 1;
                $secondHalf = ($chunks[1]->sum('hadir')) ?: 1;
                $delta = round((($secondHalf - $firstHalf) / $firstHalf) * 100, 1);
                $insights[] = $delta >= 0
                    ? "Kehadiran meningkat {$delta}% dibanding paruh pertama periode."
                    : "Kehadiran menurun " . abs($delta) . "% dibanding paruh pertama periode.";
            }
        }

        if (($summary['total_lembur'] ?? 0) > 20) {
            $insights[] = 'Jam lembur tinggi, evaluasi beban kerja pegawai.';
        }

        return $insights;
    }
}
