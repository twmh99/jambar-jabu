<?php

namespace App\Http\Controllers;

use App\Models\Pegawai;
use App\Models\Absensi;
use App\Models\Gaji;
use App\Models\Jadwal;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;
use Maatwebsite\Excel\Facades\Excel;
use App\Imports\TransaksiImport;

class ReportController extends Controller
{
    /** Import File Transaksi */
    public function importTransaksi(Request $request)
    {
        $request->validate([
            'file' => 'required|mimes:xlsx,csv,xls'
        ]);

        try {
            $importer = new TransaksiImport();
            Excel::import($importer, $request->file('file'));

            return response()->json([
                'message'  => 'Data transaksi berhasil diimport!',
                'min_date' => $importer->getMinDate(),
                'max_date' => $importer->getMaxDate(),
            ], 200);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Gagal import transaksi',
                'error'   => $e->getMessage()
            ], 500);
        }
    }

    /** Ringkasan Dashboard Owner */
    public function ownerSummary()
    {
        try {
            $bulan = now()->month;
            $tahun = now()->year;

            $totalEmployees = Pegawai::count();

            $attendanceThisMonth = Absensi::whereMonth('tanggal', $bulan)
                ->whereYear('tanggal', $tahun)
                ->where('status', 'Hadir')
                ->count();

            $totalPayroll = Gaji::sum(DB::raw('(COALESCE(total_gaji,0) + COALESCE(total_tip,0))'));

            if ($totalPayroll <= 0) {
                $payrollResponse = $this->payrollReport(new Request(['pegawai_id' => 'all']));
                if ($payrollResponse instanceof \Illuminate\Http\JsonResponse) {
                    $payload = $payrollResponse->getData(true);
                    $totalPayroll = $payload['summary']['totals']['total'] ?? 0;
                }
            }

            $attendanceTrend = Absensi::select(
                DB::raw('WEEK(tanggal,1) as minggu'),
                DB::raw('COUNT(*) as total')
            )
                ->whereYear('tanggal', $tahun)
                ->groupBy('minggu')
                ->orderBy('minggu')
                ->get()
                ->map(function ($a) use ($tahun) {
                    $start = Carbon::now()
                        ->setISODate($tahun, (int) $a->minggu)
                        ->startOfWeek(Carbon::MONDAY);
                    $end = (clone $start)->endOfWeek(Carbon::SUNDAY);

                    return [
                        'label' => sprintf(
                            'Minggu %02d • %s - %s',
                            $a->minggu,
                            $start->format('d M'),
                            $end->format('d M')
                        ),
                        'value' => $a->total
                    ];
                });

            $shiftComposition = Absensi::select(
                'shift',
                DB::raw('COUNT(*) as total')
            )
                ->whereNotNull('shift')
                ->groupBy('shift')
                ->pluck('total', 'shift')
                ->toArray();

            if (empty($shiftComposition)) {
                $shiftComposition = Jadwal::select(
                    'shift',
                    DB::raw('COUNT(*) as total')
                )
                    ->groupBy('shift')
                    ->pluck('total', 'shift')
                    ->toArray();
            }

            return response()->json([
                'data' => [
                    'total_pegawai'     => $totalEmployees,
                    'absensi_bulan_ini' => $attendanceThisMonth,
                    'total_gaji'        => $totalPayroll,
                    'tren_kehadiran'    => $attendanceTrend->values(),
                    'komposisi_shift'   => $shiftComposition,
                ]
            ], 200);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Gagal memuat dashboard',
                'error'   => $e->getMessage()
            ], 500);
        }
    }

    /** Analisis Kinerja */
    public function analisisKinerja(Request $request)
    {
        try {
            $metric = $request->query('metric', 'overall');
            $limit  = (int) $request->query('limit', 0);
            $allowedMetrics = ['overall', 'hadir', 'disiplin', 'gaji', 'jam'];
            if (!in_array($metric, $allowedMetrics, true)) {
                $metric = 'overall';
            }

            $metaInfo = [
                'overall' => ['title' => 'Pegawai Terbaik (Akumulasi)', 'unit' => 'poin'],
                'hadir'    => ['title' => 'Top Kehadiran', 'unit' => 'hari'],
                'disiplin' => ['title' => 'Top Kepatuhan Jadwal', 'unit' => '%'],
                'gaji'     => ['title' => 'Top Pendapatan', 'unit' => 'rupiah'],
                'jam'      => ['title' => 'Top Jam Kerja', 'unit' => 'jam'],
            ];

            switch ($metric) {
                case 'overall':
                    $absensiCount = Absensi::select('pegawai_id', DB::raw('COUNT(*) as total_hadir'))
                        ->where('status', 'Hadir')
                        ->groupBy('pegawai_id');

                    $jadwalCount = Jadwal::select('pegawai_id', DB::raw('COUNT(*) as total_jadwal'))
                        ->groupBy('pegawai_id');

                    $gajiSum = Gaji::select(
                        'pegawai_id',
                        DB::raw('SUM(COALESCE(total_gaji,0) + COALESCE(total_tip,0)) as total_pendapatan')
                    )->groupBy('pegawai_id');

                    $jamSum = Absensi::select(
                        'pegawai_id',
                        DB::raw('SUM(TIMESTAMPDIFF(MINUTE, jam_masuk, jam_keluar)) as total_menit')
                    )
                        ->whereNotNull('jam_masuk')
                        ->whereNotNull('jam_keluar')
                        ->groupBy('pegawai_id');

                    $rows = Pegawai::leftJoinSub($absensiCount, 'absensi', 'pegawai.id', '=', 'absensi.pegawai_id')
                        ->leftJoinSub($jadwalCount, 'jadwal', 'pegawai.id', '=', 'jadwal.pegawai_id')
                        ->leftJoinSub($gajiSum, 'gaji', 'pegawai.id', '=', 'gaji.pegawai_id')
                        ->leftJoinSub($jamSum, 'jam', 'pegawai.id', '=', 'jam.pegawai_id')
                        ->select(
                            'pegawai.nama',
                            'pegawai.jabatan',
                            DB::raw('COALESCE(absensi.total_hadir, 0) as total_hadir'),
                            DB::raw('COALESCE(jadwal.total_jadwal, 0) as total_jadwal'),
                            DB::raw('CASE WHEN COALESCE(jadwal.total_jadwal, 0) = 0 THEN 0 ELSE ROUND(COALESCE(absensi.total_hadir,0) / jadwal.total_jadwal * 100, 2) END as disiplin_score'),
                            DB::raw('COALESCE(gaji.total_pendapatan, 0) as total_pendapatan'),
                            DB::raw('COALESCE(jam.total_menit, 0) as total_menit')
                        )
                        ->get();

                    $maxHadir       = max($rows->pluck('total_hadir')->toArray() ?: [0]);
                    $maxDisiplin    = max($rows->pluck('disiplin_score')->toArray() ?: [0]);
                    $maxPendapatan  = max($rows->pluck('total_pendapatan')->toArray() ?: [0]);
                    $maxMenit       = max($rows->pluck('total_menit')->toArray() ?: [0]);

                    $performances = $rows->map(function ($row) use ($maxHadir, $maxDisiplin, $maxPendapatan, $maxMenit) {
                        $normHadir      = $maxHadir > 0 ? ($row->total_hadir / $maxHadir) : 0;
                        $normDisiplin   = $maxDisiplin > 0 ? ($row->disiplin_score / $maxDisiplin) : 0;
                        $normPendapatan = $maxPendapatan > 0 ? ($row->total_pendapatan / $maxPendapatan) : 0;
                        $normJam        = $maxMenit > 0 ? ($row->total_menit / $maxMenit) : 0;

                        $score = round((($normHadir + $normDisiplin + $normPendapatan + $normJam) / 4) * 100, 2);

                        return [
                            'nama'            => $row->nama,
                            'jabatan'         => $row->jabatan,
                            'total_hadir'     => (int) $row->total_hadir,
                            'total_jadwal'    => (int) $row->total_jadwal,
                            'disiplin_score'  => (float) $row->disiplin_score,
                            'total_pendapatan'=> (float) $row->total_pendapatan,
                            'total_menit'     => (int) $row->total_menit,
                            'value'           => $score,
                        ];
                    })
                    ->sortByDesc('value')
                    ->values();

                    if ($limit > 0) {
                        $performances = $performances->take($limit);
                    }

                    return response()->json([
                        'data' => $performances,
                        'meta' => [
                            'metric' => 'overall',
                            'title'  => $metaInfo['overall']['title'],
                            'unit'   => $metaInfo['overall']['unit'],
                        ],
                    ]);
                    break;
                case 'disiplin':
                    $absensiSub = Absensi::select('pegawai_id', DB::raw('COUNT(*) as total_hadir'))
                        ->where('status', 'Hadir')
                        ->groupBy('pegawai_id');

                    $jadwalSub = Jadwal::select('pegawai_id', DB::raw('COUNT(*) as total_jadwal'))
                        ->groupBy('pegawai_id');

                    $query = Pegawai::leftJoinSub($absensiSub, 'absensi', 'pegawai.id', '=', 'absensi.pegawai_id')
                        ->leftJoinSub($jadwalSub, 'jadwal', 'pegawai.id', '=', 'jadwal.pegawai_id')
                        ->select(
                            'pegawai.nama',
                            'pegawai.jabatan',
                            DB::raw('COALESCE(absensi.total_hadir, 0) as total_hadir'),
                            DB::raw('COALESCE(jadwal.total_jadwal, 0) as total_jadwal'),
                            DB::raw('CASE WHEN COALESCE(jadwal.total_jadwal, 0) = 0 THEN 0 ELSE ROUND(COALESCE(absensi.total_hadir,0) / jadwal.total_jadwal * 100, 2) END as nilai')
                        )
                        ->orderByDesc('nilai');
                    break;

                case 'gaji':
                    $gajiSub = Gaji::select(
                        'pegawai_id',
                        DB::raw('SUM(COALESCE(total_gaji,0) + COALESCE(total_tip,0)) as total_pendapatan')
                    )
                        ->groupBy('pegawai_id');

                    $query = Pegawai::leftJoinSub($gajiSub, 'gaji', 'pegawai.id', '=', 'gaji.pegawai_id')
                        ->select(
                            'pegawai.nama',
                            'pegawai.jabatan',
                            DB::raw('COALESCE(gaji.total_pendapatan, 0) as total_pendapatan')
                        )
                        ->orderByDesc('total_pendapatan');
                    break;

                case 'jam':
                    $jamSub = Absensi::select(
                        'pegawai_id',
                        DB::raw('SUM(TIMESTAMPDIFF(MINUTE, jam_masuk, jam_keluar)) as total_menit')
                    )
                        ->whereNotNull('jam_masuk')
                        ->whereNotNull('jam_keluar')
                        ->groupBy('pegawai_id');

                    $query = Pegawai::leftJoinSub($jamSub, 'jam', 'pegawai.id', '=', 'jam.pegawai_id')
                        ->select(
                            'pegawai.nama',
                            'pegawai.jabatan',
                            DB::raw('COALESCE(jam.total_menit, 0) as total_menit')
                        )
                        ->orderByDesc('total_menit');
                    break;

                case 'hadir':
                default:
                    $absensiCount = Absensi::select('pegawai_id', DB::raw('COUNT(*) as total_hadir'))
                        ->where('status', 'Hadir')
                        ->groupBy('pegawai_id');

                    $query = Pegawai::leftJoinSub($absensiCount, 'absensi', 'pegawai.id', '=', 'absensi.pegawai_id')
                        ->select(
                            'pegawai.nama',
                            'pegawai.jabatan',
                            DB::raw('COALESCE(absensi.total_hadir, 0) as total_hadir')
                        )
                        ->orderByDesc('total_hadir');
                    break;
            }

            if ($limit > 0) {
                $query->limit($limit);
            }

            $performances = $query->get()->map(function ($row) use ($metric) {
                $base = [
                    'nama'    => $row->nama,
                    'jabatan' => $row->jabatan,
                ];

                switch ($metric) {
                    case 'disiplin':
                        $base['total_hadir']  = (int) ($row->total_hadir ?? 0);
                        $base['total_jadwal'] = (int) ($row->total_jadwal ?? 0);
                        $base['value']        = (float) ($row->nilai ?? 0);
                        break;
                    case 'gaji':
                        $base['value'] = (float) ($row->total_pendapatan ?? 0);
                        break;
                    case 'jam':
                        $minutes        = (int) ($row->total_menit ?? 0);
                        $base['value']  = round($minutes / 60, 2);
                        $base['minutes'] = $minutes;
                        break;
                    case 'hadir':
                    default:
                        $base['total_hadir'] = (int) ($row->total_hadir ?? 0);
                        $base['value']       = (int) ($row->total_hadir ?? 0);
                        break;
                }

                return $base;
            });

            return response()->json([
                'data' => $performances,
                'meta' => [
                    'metric' => $metric,
                    'title'  => $metaInfo[$metric]['title'] ?? 'Analisis',
                    'unit'   => $metaInfo[$metric]['unit'] ?? '',
                ],
            ], 200);
        } catch (\Throwable $e) {
            Log::error("❌ Gagal memuat analisis kinerja: " . $e->getMessage());
            return response()->json([
                'message' => 'Gagal memuat analisis kinerja',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /** Laporan Gaji & Tip – gabungkan data internal + upload */
    public function payrollReport(Request $request)
    {
        try {
            $from      = $request->get('dari');
            $to        = $request->get('sampai');
            $pegawaiId = $request->get('pegawai_id');

            $pegawaiFilter = $pegawaiId && $pegawaiId !== 'all';

            // Absensi internal
            $absensiRows = Absensi::with('pegawai')
                ->when($from && $to, fn($q) => $q->whereBetween('tanggal', [$from, $to]))
                ->when($pegawaiFilter, fn($q) => $q->where('pegawai_id', $pegawaiId))
                ->orderBy('tanggal')
                ->get();

            // Transaksi hasil upload (CSV/XLSX)
            $transactionRows = Transaction::select(
                    'transactions.pegawai_id',
                    'transactions.tanggal',
                    DB::raw('SUM(transactions.total) as total_sales'),
                    DB::raw('SUM(transactions.qty) as total_qty'),
                    DB::raw('MIN(transactions.jam_mulai) as jam_mulai_trx'),
                    DB::raw('MAX(transactions.jam_selesai) as jam_selesai_trx'),
                    DB::raw('SUM(COALESCE(transactions.jam, 0)) as jam_transaksi')
                )
                ->whereNotNull('transactions.pegawai_id')
                ->when($from && $to, fn($q) => $q->whereBetween('transactions.tanggal', [$from, $to]))
                ->when($pegawaiFilter, fn($q) => $q->where('transactions.pegawai_id', $pegawaiId))
                ->groupBy('transactions.pegawai_id', 'transactions.tanggal')
                ->get();

            $jadwalRows = Jadwal::when($from && $to, fn($q) => $q->whereBetween('tanggal', [$from, $to]))
                ->when($pegawaiFilter, fn($q) => $q->where('pegawai_id', $pegawaiId))
                ->get()
                ->groupBy(fn($row) => $row->pegawai_id . '|' . $row->tanggal);

            if ($absensiRows->isEmpty() && $transactionRows->isEmpty()) {
                return response()->json([
                    'data' => [],
                    'summary' => [
                        'totals'  => ['jam' => 0, 'gaji' => 0, 'tip' => 0, 'total' => 0, 'rows' => 0],
                        'daily'   => [],
                        'weekly'  => [],
                        'monthly' => [],
                    ],
                    'warnings' => [],
                ], 200);
            }

            $pegawaiIds = $absensiRows->pluck('pegawai_id')
                ->merge($transactionRows->pluck('pegawai_id'))
                ->filter()
                ->unique();

            $pegawaiMap = Pegawai::whereIn('id', $pegawaiIds)
                ->get()
                ->keyBy('id');

            $absensiGrouped = $absensiRows->groupBy(fn($row) => $row->pegawai_id . '|' . $row->tanggal);
            $transactionGrouped = $transactionRows->keyBy(fn($row) => $row->pegawai_id . '|' . $row->tanggal);

            $tipGroupByDate = $transactionRows->groupBy('tanggal')->map(function ($items) {
                return [
                    'total_sales' => $items->sum('total_sales'),
                    'pegawai_ids' => $items->pluck('pegawai_id')->unique(),
                ];
            });

            $keys = $absensiGrouped->keys()
                ->merge($transactionGrouped->keys())
                ->unique()
                ->sort(function ($a, $b) {
                    [$pegA, $dateA] = explode('|', $a);
                    [$pegB, $dateB] = explode('|', $b);
                    return $dateA === $dateB ? $pegA <=> $pegB : strcmp($dateA, $dateB);
                })
                ->values();

            $result   = [];
            $warnings = [];

            foreach ($keys as $key) {
                [$pegawaiKey, $tanggal] = explode('|', $key);
                if (!$pegawaiKey || !$tanggal) {
                    $warnings[] = "Data payroll tanpa pegawai atau tanggal ditemukan pada kunci {$key}.";
                    continue;
                }

                $pegawaiIdInt = (int) $pegawaiKey;
                $pegawai      = $pegawaiMap->get($pegawaiIdInt);
                $pegawaiName  = $pegawai->nama ?? ("Pegawai #" . $pegawaiIdInt);

                $absensiItems = $absensiGrouped->get($key, collect());
                $trx          = $transactionGrouped->get($key);
                $jadwal       = $jadwalRows->has($key) ? $jadwalRows->get($key)->first() : null;

                $jamInfo      = $this->resolveJamKerja($absensiItems, $trx);
                $jamKerja     = $jamInfo['jam'];
                $jamMasukReal = $jamInfo['masuk'];
                $jamKeluarReal= $jamInfo['keluar'];

                $rate = $pegawai->hourly_rate ?? 20000;
                $gajiDasar = $jamKerja * $rate;

                // bonus/penalti berdasar jadwal
                $lemburBonus = 0;
                $penalti     = 0;
                $bonusShift  = 0;

                if ($jadwal) {
                    if ($jamMasukReal) {
                        $jadwalMulai = Carbon::parse($jadwal->jam_mulai);
                        $masukReal   = Carbon::parse($jamMasukReal);

                        if ($masukReal->greaterThan($jadwalMulai->copy()->addMinutes(15))) {
                            $penalti = -5000;
                        }
                    }

                    if ($jamKeluarReal) {
                        $jadwalSelesai = Carbon::parse($jadwal->jam_selesai);
                        $keluarReal    = Carbon::parse($jamKeluarReal);

                        if ($keluarReal->greaterThan($jadwalSelesai)) {
                            $lemburJam   = $keluarReal->diffInMinutes($jadwalSelesai) / 60;
                            $lemburBonus = $lemburJam * ($rate * 1.5);
                        }
                    }

                    if ($jadwal->shift === 'Malam') {
                        $bonusShift = 15000;
                    }
                }

                // Tip individual: kombinasi data absensi dan transaksi
                $tipAbsensi = $absensiItems->sum(fn($a) => (float) $a->tip);
                $tipTransaksi = 0;

                if ($trx) {
                    $totalSales = $trx->total_sales;
                    $tipTransaksi = $totalSales * 0.10;

                    $target = 1000000;
                    if ($totalSales > $target) {
                        $tipTransaksi += ($totalSales - $target) * 0.05;
                    }
                }

                $tipGroupShare = 0;
                if ($trx && $tipGroupByDate->has($tanggal)) {
                    $info = $tipGroupByDate->get($tanggal);
                    if ($info['pegawai_ids']->contains($pegawaiIdInt)) {
                        $tipGroupTotal     = $info['total_sales'] * 0.05;
                        $jumlahPegawaiHari = max(1, $info['pegawai_ids']->count());
                        $tipGroupShare     = $tipGroupTotal / $jumlahPegawaiHari;
                    }
                }

                $tipIndividual = round($tipAbsensi + $tipTransaksi);

                $totalGaji  = max(0, $gajiDasar + $lemburBonus + $bonusShift + $penalti);
                $totalBayar = max(0, $totalGaji + $tipIndividual + $tipGroupShare);

                // Validasi otomatis
                if ($jamKerja > 18) {
                    $warnings[] = "Jam kerja tidak wajar (>18 jam) pada {$tanggal} untuk {$pegawaiName}.";
                }
                if ($trx && $jamKerja === 0.0) {
                    $warnings[] = "Transaksi ditemukan tetapi jam kerja kosong pada {$tanggal} untuk {$pegawaiName}.";
                }
                if ($jamKerja > 0 && $gajiDasar <= 0) {
                    $warnings[] = "Gaji dasar nol padahal ada jam kerja pada {$tanggal} untuk {$pegawaiName}.";
                }
                if (!$pegawai) {
                    $warnings[] = "Pegawai dengan ID {$pegawaiIdInt} tidak ditemukan pada tanggal {$tanggal}.";
                }

                $result[] = [
                    'tanggal'     => $tanggal,
                    'pegawai'     => $pegawaiName,
                    'pegawai_id'  => $pegawaiIdInt,
                    'jam_kerja'   => round($jamKerja, 2),
                    'rate'        => $rate,
                    'gaji_dasar'  => round($gajiDasar),
                    'lembur'      => round($lemburBonus),
                    'bonus_shift' => round($bonusShift),
                    'penalti'     => round($penalti),
                    'tip'         => round($tipIndividual),
                    'tip_group'   => round($tipGroupShare),
                    'total'       => round($totalBayar),
                ];
            }

            $rowsCollection = collect($result)->sortBy(function ($row) {
                return $row['tanggal'] . '|' . str_pad((string) $row['pegawai_id'], 5, '0', STR_PAD_LEFT);
            })->values();
            $summary        = $this->buildPayrollSummary($rowsCollection);

            return response()->json([
                'data'     => $rowsCollection,
                'summary'  => $summary,
                'warnings' => array_values(array_unique($warnings)),
            ], 200);

        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Gagal memuat payroll',
                'error'   => $e->getMessage(),
                'line'    => $e->getLine(),
            ], 500);
        }
    }

    /** Raw Attendance Report */
    public function attendanceRaw(Request $request)
    {
        try {
            $q = Absensi::query();

            if ($request->filled('pegawai_id')) {
                $q->where('pegawai_id', $request->pegawai_id);
            }

            $rows = $q->orderBy('tanggal', 'desc')
                ->get()
                ->map(fn($a) => [
                    'tanggal'    => $a->tanggal,
                    'pegawai_id' => $a->pegawai_id,
                    'check_in'   => $a->jam_masuk,
                    'check_out'  => $a->jam_keluar,
                    'status'     => $a->status,
                    'tips'       => (float) $a->tip,
                ]);

            return response()->json(['data' => $rows], 200);

        } catch (\Throwable $e) {
            Log::error("❌ Gagal memuat laporan absensi: " . $e->getMessage());
            return response()->json([
                'message' => 'Gagal memuat laporan absensi',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Hitung jam kerja dari absensi & transaksi.
     */
    private function resolveJamKerja(Collection $absensiItems, $trx): array
    {
        $jamMasuk  = $absensiItems->min('jam_masuk');
        $jamKeluar = $absensiItems->max('jam_keluar');

        if (!$jamMasuk && $trx && $trx->jam_mulai_trx) {
            $jamMasuk = $trx->jam_mulai_trx;
        }

        if (!$jamKeluar && $trx && $trx->jam_selesai_trx) {
            $jamKeluar = $trx->jam_selesai_trx;
        }

        $jamKerja = 0;
        if ($jamMasuk && $jamKeluar) {
            $in  = Carbon::parse($jamMasuk);
            $out = Carbon::parse($jamKeluar);
            if ($out->lessThan($in)) {
                $out->addDay();
            }
            $jamKerja = $out->diffInMinutes($in) / 60;
        } elseif ($trx && $trx->jam_transaksi) {
            $jamKerja = (float) $trx->jam_transaksi;
        }

        return [
            'jam'   => round(max(0, $jamKerja), 2),
            'masuk' => $jamMasuk,
            'keluar'=> $jamKeluar,
        ];
    }

    /**
     * Ringkasan harian/mingguan/bulanan untuk laporan payroll.
     */
    private function buildPayrollSummary(Collection $rows): array
    {
        $rows = $rows->values();

        $sumJam    = round($rows->sum(fn($r) => (float) $r['jam_kerja']), 2);
        $sumGaji   = round($rows->sum(function ($r) {
            $raw = ($r['gaji_dasar'] ?? 0)
                + ($r['lembur'] ?? 0)
                + ($r['bonus_shift'] ?? 0)
                + ($r['penalti'] ?? 0);
            return max(0, $raw);
        }));
        $sumTip    = round($rows->sum(fn($r) => ($r['tip'] ?? 0) + ($r['tip_group'] ?? 0)));
        $sumTotal  = round($rows->sum(fn($r) => $r['total'] ?? 0));

        $daily = $rows->groupBy('tanggal')
            ->sortKeys()
            ->map(function ($items, $tanggal) {
                return [
                    'tanggal'     => $tanggal,
                    'total_jam'   => round($items->sum(fn($r) => (float) $r['jam_kerja']), 2),
                    'total_gaji'  => round($items->sum(function ($r) {
                        $raw = ($r['gaji_dasar'] ?? 0)
                            + ($r['lembur'] ?? 0)
                            + ($r['bonus_shift'] ?? 0)
                            + ($r['penalti'] ?? 0);
                        return max(0, $raw);
                    })),
                    'total_tip'   => round($items->sum(fn($r) => ($r['tip'] ?? 0) + ($r['tip_group'] ?? 0))),
                    'total_bayar' => round($items->sum(fn($r) => $r['total'] ?? 0)),
                ];
            })
            ->values();

        $weekly = $rows->groupBy(function ($item) {
            return Carbon::parse($item['tanggal'])->format('o-\WW');
        })->map(function ($items, $label) {
            $date  = Carbon::parse($items->first()['tanggal']);
            $start = $date->copy()->startOfWeek(Carbon::MONDAY);
            $end   = $date->copy()->endOfWeek(Carbon::SUNDAY);

            return [
                '_sort'       => $start->format('Y-m-d'),
                'label'       => 'Minggu ' . $date->isoWeek() . ' ' . $date->format('Y'),
                'range'       => $start->format('d M') . ' - ' . $end->format('d M'),
                'total_jam'   => round($items->sum(fn($r) => (float) $r['jam_kerja']), 2),
                'total_gaji'  => round($items->sum(function ($r) {
                    $raw = ($r['gaji_dasar'] ?? 0)
                        + ($r['lembur'] ?? 0)
                        + ($r['bonus_shift'] ?? 0)
                        + ($r['penalti'] ?? 0);
                    return max(0, $raw);
                })),
                'total_tip'   => round($items->sum(fn($r) => ($r['tip'] ?? 0) + ($r['tip_group'] ?? 0))),
                'total_bayar' => round($items->sum(fn($r) => $r['total'] ?? 0)),
            ];
        })->values()
        ->sortBy('_sort')
        ->map(function ($row) {
            unset($row['_sort']);
            return $row;
        })
        ->values();

        $monthly = $rows->groupBy(function ($item) {
            return Carbon::parse($item['tanggal'])->format('Y-m');
        })->map(function ($items, $label) {
            $date = Carbon::parse($items->first()['tanggal']);
            return [
                '_sort'       => $label,
                'label'       => $date->format('F Y'),
                'total_jam'   => round($items->sum(fn($r) => (float) $r['jam_kerja']), 2),
                'total_gaji'  => round($items->sum(function ($r) {
                    $raw = ($r['gaji_dasar'] ?? 0)
                        + ($r['lembur'] ?? 0)
                        + ($r['bonus_shift'] ?? 0)
                        + ($r['penalti'] ?? 0);
                    return max(0, $raw);
                })),
                'total_tip'   => round($items->sum(fn($r) => ($r['tip'] ?? 0) + ($r['tip_group'] ?? 0))),
                'total_bayar' => round($items->sum(fn($r) => $r['total'] ?? 0)),
            ];
        })->values()
        ->sortBy('_sort')
        ->map(function ($row) {
            unset($row['_sort']);
            return $row;
        })
        ->values();

        return [
            'totals' => [
                'jam'   => $sumJam,
                'gaji'  => $sumGaji,
                'tip'   => $sumTip,
                'total' => $sumTotal,
                'rows'  => $rows->count(),
            ],
            'daily'   => $daily,
            'weekly'  => $weekly,
            'monthly' => $monthly,
        ];
    }
}
