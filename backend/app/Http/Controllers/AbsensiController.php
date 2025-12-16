<?php

namespace App\Http\Controllers;

use App\Models\Absensi;
use App\Models\Jadwal;
use App\Models\Setting;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class AbsensiController extends Controller
{
    /* ===================== CRUD ===================== */
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
            'jam_masuk'  => 'nullable|date_format:H:i:s',
            'jam_keluar' => 'nullable|date_format:H:i:s',
            'status'     => 'nullable|in:Hadir,Terlambat,Izin,Alpha,pending',
            'tip'        => 'nullable|numeric|min:0',
            'shift'      => 'nullable|string|max:50',
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
            'jam_masuk'  => 'nullable|date_format:H:i:s',
            'jam_keluar' => 'nullable|date_format:H:i:s',
            'status'     => 'nullable|in:Hadir,Terlambat,Izin,Alpha,pending',
            'tip'        => 'nullable|numeric|min:0',
            'shift'      => 'nullable|string|max:50',
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

    /** Check-in */
    public function checkin(Request $request)
    {
        $settings = $this->attendanceSettings();

        $data = $request->validate([
            'pegawai_id'  => 'required|exists:pegawai,id',
            'latitude'    => 'nullable|numeric|between:-90,90',
            'longitude'   => 'nullable|numeric|between:-180,180',
            'bukti_foto'  => 'nullable|image|max:2048',
        ]);

        $today = Carbon::today()->toDateString();
        $now = Carbon::now();

        $jadwal = Jadwal::where('pegawai_id', $data['pegawai_id'])
            ->whereDate('tanggal', $today)
            ->first();

        if ($settings['requires_geofence']) {
            if (!isset($data['latitude'], $data['longitude'])) {
                return response()->json(['message' => 'Koordinat wajib dikirim untuk check-in.'], 422);
            }
            $distance = $this->distanceInMeters($data['latitude'], $data['longitude'], $settings['latitude'], $settings['longitude']);
            if ($distance > $settings['radius_m']) {
                return response()->json([
                    'message' => sprintf('Check-in ditolak. Anda berada %d m dari lokasi kantor.', round($distance)),
                ], 422);
            }
        }

        [$start, $end] = $this->ensureWithinWindow($jadwal, $settings, $now, 'checkin');

        $row = Absensi::firstOrCreate(
            ['pegawai_id' => $data['pegawai_id'], 'tanggal' => $today],
            []
        );

        if (!$row->jam_masuk) {
            $row->jam_masuk = $now->format('H:i:s');
            if ($start && $now->greaterThan($start)) {
                $row->status = 'Terlambat';
            } else {
                $row->status = 'Hadir';
            }
            if ($jadwal && !$row->shift) {
                $row->shift = $jadwal->shift;
            }
            $row->save();
        }

        if ($request->hasFile('bukti_foto')) {
            $path = $request->file('bukti_foto')->store('absensi/bukti', 'public');
            $row->foto_url = Storage::disk('public')->url($path);
            $row->save();
        }

        return response()->json($row);
    }

    /** Check-out */
    public function checkout(Request $request)
    {
        $settings = $this->attendanceSettings();

        $data = $request->validate([
            'pegawai_id' => 'required|exists:pegawai,id',
            'tip'        => 'nullable|numeric|min:0',
            'latitude'   => 'nullable|numeric|between:-90,90',
            'longitude'  => 'nullable|numeric|between:-180,180',
        ]);

        $today = Carbon::today()->toDateString();
        $now = Carbon::now();

        $jadwal = Jadwal::where('pegawai_id', $data['pegawai_id'])
            ->whereDate('tanggal', $today)
            ->first();

        if ($settings['requires_geofence']) {
            if (!isset($data['latitude'], $data['longitude'])) {
                return response()->json(['message' => 'Koordinat wajib dikirim untuk check-out.'], 422);
            }
            $distance = $this->distanceInMeters($data['latitude'], $data['longitude'], $settings['latitude'], $settings['longitude']);
            if ($distance > $settings['radius_m']) {
                return response()->json([
                    'message' => sprintf('Check-out ditolak. Anda berada %d m dari lokasi kantor.', round($distance)),
                ], 422);
            }
        }

        [$start, $end] = $this->ensureWithinWindow($jadwal, $settings, $now, 'checkout');

        $row = Absensi::firstOrCreate(
            ['pegawai_id' => $data['pegawai_id'], 'tanggal' => $today],
            []
        );

        $row->jam_keluar = $now->format('H:i:s');
        if (isset($data['tip'])) {
            $row->tip = (float) $data['tip'];
        }
        $row->save();

        return response()->json($row);
    }

    /** Daftar absensi hari ini (untuk Supervisor: ringkasan & tabel) */
    public function today()
    {
        $today = Carbon::today()->toDateString();

        $rows = Absensi::whereDate('tanggal', $today)
            ->orderBy('jam_masuk')
            ->get()
            ->map(function ($r) use ($today) {
                $shift = Jadwal::where('pegawai_id', $r->pegawai_id)
                    ->whereDate('tanggal', $today)
                    ->value('shift');

                $statusLabel = $r->status ?? '—';
                if (!$r->jam_masuk) {
                    $statusLabel = 'Belum Check-in';
                } elseif (!$r->jam_keluar) {
                    $statusLabel = 'Menunggu Verifikasi';
                }

                return [
                    'nama'      => optional($r->pegawai)->nama ?? '—',
                    'shift'     => $shift ?? $r->shift ?? '—',
                    'jam_masuk' => $r->jam_masuk ?? '—',
                    'status'    => $statusLabel,
                ];
            });

        return response()->json($rows->values());
    }

    /** Daftar absensi pending verifikasi (jam_keluar kosong) */
    public function pending()
    {
        $rows = Absensi::whereNull('jam_keluar')
            ->orderBy('tanggal', 'desc')
            ->orderBy('jam_masuk', 'desc')
            ->get()
            ->map(function ($r) {
                $shift = Jadwal::where('pegawai_id', $r->pegawai_id)
                    ->whereDate('tanggal', $r->tanggal)
                    ->value('shift');

                $statusLabel = $r->status ?? '—';
                if ($r->jam_masuk && !$r->jam_keluar) {
                    $statusLabel = 'Menunggu Verifikasi';
                }

                return [
                    'id'     => $r->id,
                    'nama'   => optional($r->pegawai)->nama ?? '—',
                    'shift'  => $shift ?? $r->shift ?? '—',
                    'waktu'  => $r->jam_masuk ?? '—',
                    'status' => $statusLabel,
                ];
            });

        return response()->json($rows->values());
    }

    /** Verifikasi oleh Supervisor (menambahkan supervisor_id) */
    public function verify($id)
    {
        $row = Absensi::findOrFail($id);

        if (empty($row->jam_keluar)) {
            $row->jam_keluar = Carbon::now()->format('H:i:s');
        }

        // 🟦 Catat siapa supervisor yang memverifikasi
        $row->supervisor_id = auth()->id();
        $row->save();

        return response()->json([
            'message' => 'verified',
            'row' => $row
        ]);
    }

    /** Ringkasan hari ini untuk supervisor cards */
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

    /** Laporan mingguan */
    public function reportWeekly()
    {
        $items = Absensi::select([
            DB::raw('YEARWEEK(tanggal, 1) as minggu'),
            DB::raw('ROUND(AVG(CASE WHEN status="Hadir" THEN 100 WHEN status="Terlambat" THEN 70 ELSE 0 END), 0) as kehadiran'),
            DB::raw('ROUND(AVG(NULLIF(GREATEST(TIME_TO_SEC(TIMEDIFF(jam_keluar, jam_masuk))/60,0),0)) / 480 * 100, 0) as produktivitas')
        ])
            ->groupBy('minggu')
            ->orderBy('minggu')
            ->get()
            ->map(fn($r) => [
                'minggu'        => (string) $r->minggu,
                'kehadiran'     => (int) ($r->kehadiran ?? 0),
                'produktivitas' => (int) ($r->produktivitas ?? 0),
            ]);

        return response()->json($items->values());
    }

    /** Laporan bulanan */
    public function reportMonthly()
    {
        $items = Absensi::select([
            DB::raw('YEAR(tanggal) as tahun'),
            DB::raw('MONTH(tanggal) as bulan'),
            DB::raw('ROUND(AVG(CASE WHEN status="Hadir" THEN 100 WHEN status="Terlambat" THEN 70 ELSE 0 END), 0) as kehadiran'),
            DB::raw('ROUND(AVG(NULLIF(GREATEST(TIME_TO_SEC(TIMEDIFF(jam_keluar, jam_masuk))/60,0),0)) / 480 * 100, 0) as produktivitas')
        ])
            ->groupBy('tahun', 'bulan')
            ->orderBy('tahun', 'desc')
            ->orderBy('bulan', 'desc')
            ->get()
            ->map(fn($r) => [
                'periode'       => sprintf('%04d-%02d', $r->tahun, $r->bulan),
                'kehadiran'     => (int) ($r->kehadiran ?? 0),
                'produktivitas' => (int) ($r->produktivitas ?? 0),
            ]);

        return response()->json($items->values());
    }

    /* ===================== Utilitas Pengaturan ===================== */

    /**
     * Ambil konfigurasi absensi (buffer check-in/out & geofence).
     */
    private function attendanceSettings(): array
    {
        $bufferBefore = (int) Setting::getValue('attendance_buffer_before_start', 30);
        $bufferAfter  = (int) Setting::getValue('attendance_buffer_after_end', 30);
        $latitude     = Setting::getCoordinate('attendance_geofence_latitude', -7.779071, -6.208864);
        $longitude    = Setting::getCoordinate('attendance_geofence_longitude', 110.416098, 106.84513);
        $radius       = (int) Setting::getNumericWithMigration('attendance_geofence_radius_m', 50, [200, 100]);

        return [
            'buffer_before_start' => $bufferBefore,
            'buffer_after_end'    => $bufferAfter,
            'latitude'            => $latitude,
            'longitude'           => $longitude,
            'radius_m'            => $radius,
            'requires_geofence'   => $radius > 0,
        ];
    }

    /**
     * Hitung jarak dua koordinat dalam meter (rumus haversine).
     */
    private function distanceInMeters(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $earthRadius = 6371000; // meter
        $toRad = static fn ($deg) => $deg * M_PI / 180;

        $dLat = $toRad($lat2 - $lat1);
        $dLon = $toRad($lon2 - $lon1);

        $a = sin($dLat / 2) ** 2 +
            cos($toRad($lat1)) * cos($toRad($lat2)) *
            sin($dLon / 2) ** 2;

        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return $earthRadius * $c;
    }

    /**
     * Validasi window waktu check-in/out berdasarkan jadwal & buffer owner.
     *
     * @return array{0: ?Carbon, 1: ?Carbon}
     */
    private function ensureWithinWindow(?Jadwal $jadwal, array $settings, Carbon $now, string $mode): array
    {
        if (!$jadwal) {
            $this->throwWindowError('Belum ada jadwal kerja untuk hari ini.');
        }

        $start = $this->resolveShiftStart($jadwal);
        $end   = $this->resolveShiftEnd($jadwal, $start);

        $bufferBefore = max(0, (int) ($settings['buffer_before_start'] ?? 0));
        $bufferAfter  = max(0, (int) ($settings['buffer_after_end'] ?? 0));

        $checkInOpen  = $start->copy()->subMinutes($bufferBefore);
        $windowClose  = $end->copy()->addMinutes($bufferAfter);

        if ($mode === 'checkin') {
            if ($now->lt($checkInOpen)) {
                $minutes = $now->diffInMinutes($checkInOpen);
                $this->throwWindowError(
                    $minutes <= 1
                        ? 'Check-in dibuka sebentar lagi.'
                        : "Check-in baru dibuka dalam {$minutes} menit."
                );
            }

            if ($now->gt($windowClose)) {
                $this->throwWindowError('Check-in sudah ditutup untuk shift ini.');
            }
        } elseif ($mode === 'checkout') {
            if ($now->lt($end)) {
                $this->throwWindowError(
                    'Check-out tersedia setelah jam selesai (' . $end->format('H:i') . ').'
                );
            }

            if ($now->gt($windowClose)) {
                $this->throwWindowError(
                    'Batas waktu check-out telah berakhir (' . $windowClose->format('H:i') . ').'
                );
            }
        }

        return [$start, $end];
    }

    /**
     * Konversi jadwal ke Carbon start time.
     */
    private function resolveShiftStart(Jadwal $jadwal): Carbon
    {
        $time = $jadwal->jam_mulai ?: '00:00:00';
        return Carbon::parse("{$jadwal->tanggal} {$time}");
    }

    /**
     * Konversi jadwal ke Carbon end time + handle overnight.
     */
    private function resolveShiftEnd(Jadwal $jadwal, Carbon $start): Carbon
    {
        $time = $jadwal->jam_selesai ?: $jadwal->jam_mulai;
        $end  = $time
            ? Carbon::parse("{$jadwal->tanggal} {$time}")
            : $start->copy()->addHours(8);

        if ($end->lessThanOrEqualTo($start)) {
            $end->addDay();
        }

        return $end;
    }

    private function throwWindowError(string $message): void
    {
        throw new HttpResponseException(response()->json(['message' => $message], 422));
    }
}
