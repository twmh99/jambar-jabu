<?php

namespace App\Http\Controllers;

use App\Models\Jadwal;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;

class JadwalController extends Controller
{
    /** ===================== 📋 LIST SEMUA ===================== */
    public function index(Request $request)
    {
        try {
            $pegawaiId = $request->query('pegawai_id');
            $q = Jadwal::leftJoin('pegawai', 'jadwal.pegawai_id', '=', 'pegawai.id')
                ->select(
                    'jadwal.id',
                    'jadwal.pegawai_id',
                    'pegawai.nama as nama',
                    'jadwal.tanggal',
                    'jadwal.shift',
                    'jadwal.jam_mulai',
                    'jadwal.jam_selesai'
                )
                ->orderBy('jadwal.tanggal', 'desc');

            if ($pegawaiId) {
                $q->where('jadwal.pegawai_id', $pegawaiId);
            }

            return response()->json([
                'message' => 'Data jadwal berhasil dimuat.',
                'data' => $q->get(),
            ], 200);
        } catch (\Throwable $e) {
            Log::error("❌ Gagal memuat jadwal: " . $e->getMessage());
            return response()->json([
                'message' => 'Gagal memuat jadwal.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /** ===================== ➕ TAMBAH JADWAL BARU ===================== */
    public function store(Request $request)
    {
        try {
            $data = $request->all();

            if (isset($data['employee_id']) && !isset($data['pegawai_id'])) {
                $data['pegawai_id'] = $data['employee_id'];
                unset($data['employee_id']);
            }

            $validator = Validator::make($data, $this->scheduleRules(), $this->scheduleMessages());
            if ($validator->fails()) {
                return response()->json([
                    'message' => 'Validasi gagal.',
                    'errors'  => $validator->errors(),
                ], 422);
            }

            $validated = $validator->validated();

            if ($this->hasScheduleConflict(
                $validated['pegawai_id'],
                $validated['tanggal'],
                $validated['jam_mulai'],
                $validated['jam_selesai']
            )) {
                return response()->json([
                    'message' => 'Validasi gagal.',
                    'errors'  => [
                        'tanggal' => ['Pegawai sudah memiliki jadwal di waktu tersebut.'],
                    ],
                ], 422);
            }

            $jadwal = Jadwal::create($validated);

            return response()->json([
                'message' => 'Jadwal berhasil dibuat.',
                'data' => $jadwal
            ], 201);
        } catch (\Throwable $e) {
            Log::error("❌ Gagal menambah jadwal: " . $e->getMessage());
            return response()->json([
                'message' => 'Gagal menambah jadwal.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /** ===================== 📅 JADWAL HARI INI ===================== */
    public function today()
    {
        try {
            $today = Carbon::today()->toDateString();

            $rows = Jadwal::leftJoin('pegawai', 'jadwal.pegawai_id', '=', 'pegawai.id')
                ->where(DB::raw('DATE(jadwal.tanggal)'), '=', $today)
                ->select(
                    'jadwal.id',
                    'pegawai.nama as nama',
                    'jadwal.shift',
                    'jadwal.tanggal',
                    'jadwal.jam_mulai',
                    'jadwal.jam_selesai'
                )
                ->orderBy('jadwal.jam_mulai', 'asc')
                ->get();

            return response()->json([
                'message' => 'Data jadwal hari ini berhasil dimuat.',
                'data' => $rows,
            ], 200);
        } catch (\Throwable $e) {
            Log::error("❌ Gagal memuat jadwal hari ini: " . $e->getMessage());
            return response()->json([
                'message' => 'Gagal memuat jadwal hari ini.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /** ===================== 📆 JADWAL MINGGU INI ===================== */
    public function week()
    {
        try {
            $start = Carbon::now()->startOfWeek()->toDateString();
            $end   = Carbon::now()->endOfWeek()->toDateString();

            $rows = Jadwal::leftJoin('pegawai', 'jadwal.pegawai_id', '=', 'pegawai.id')
                ->whereBetween(DB::raw('DATE(jadwal.tanggal)'), [$start, $end])
                ->select(
                    'jadwal.id',
                    'jadwal.pegawai_id',
                    'pegawai.nama as nama',
                    'jadwal.shift',
                    'jadwal.tanggal',
                    'jadwal.jam_mulai',
                    'jadwal.jam_selesai'
                )
                ->orderBy('jadwal.tanggal', 'asc')
                ->orderBy('jadwal.jam_mulai', 'asc')
                ->get();

            return response()->json([
                'message' => 'Data jadwal minggu ini berhasil dimuat.',
                'data' => $rows,
            ], 200);
        } catch (\Throwable $e) {
            Log::error("❌ Gagal memuat jadwal minggu ini: " . $e->getMessage());
            return response()->json([
                'message' => 'Gagal memuat jadwal minggu ini.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /** ===================== 📄 DETAIL JADWAL ===================== */
    public function show($id)
    {
        try {
            $jadwal = Jadwal::leftJoin('pegawai', 'jadwal.pegawai_id', '=', 'pegawai.id')
                ->where('jadwal.id', $id)
                ->select(
                    'jadwal.id',
                    'pegawai.nama as nama',
                    'pegawai.jabatan',
                    'pegawai.telepon',
                    'pegawai.status',
                    'jadwal.tanggal',
                    'jadwal.shift',
                    'jadwal.jam_mulai',
                    'jadwal.jam_selesai',
                    'jadwal.created_at',
                    'jadwal.updated_at'
                )
                ->first();

            if (!$jadwal) {
                return response()->json(['message' => 'Jadwal tidak ditemukan'], 404);
            }

            return response()->json([
                'message' => 'Detail jadwal berhasil dimuat.',
                'data' => $jadwal,
            ], 200);
        } catch (\Throwable $e) {
            Log::error("❌ Gagal memuat detail jadwal: " . $e->getMessage());
            return response()->json([
                'message' => 'Terjadi kesalahan saat memuat detail jadwal.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /** ===================== ✏️ UPDATE ===================== */
    public function update(Request $request, $id)
    {
        try {
            $jadwal = Jadwal::findOrFail($id);
            $data = $request->all();

            if (isset($data['employee_id']) && !isset($data['pegawai_id'])) {
                $data['pegawai_id'] = $data['employee_id'];
                unset($data['employee_id']);
            }

            $validator = Validator::make($data, $this->scheduleRules(true), $this->scheduleMessages());
            if ($validator->fails()) {
                return response()->json([
                    'message' => 'Validasi gagal.',
                    'errors'  => $validator->errors(),
                ], 422);
            }

            $validated = $validator->validated();

            $pegawaiId  = $validated['pegawai_id'] ?? $jadwal->pegawai_id;
            $tanggal    = $validated['tanggal'] ?? $jadwal->tanggal;
            $jamMulai   = $validated['jam_mulai'] ?? $jadwal->jam_mulai;
            $jamSelesai = $validated['jam_selesai'] ?? $jadwal->jam_selesai;

            if ($this->hasScheduleConflict($pegawaiId, $tanggal, $jamMulai, $jamSelesai, $jadwal->id)) {
                return response()->json([
                    'message' => 'Validasi gagal.',
                    'errors'  => [
                        'tanggal' => ['Pegawai sudah memiliki jadwal di waktu tersebut.'],
                    ],
                ], 422);
            }

            $jadwal->update($validated);

            return response()->json([
                'message' => 'Jadwal berhasil diperbarui.',
                'data' => $jadwal
            ]);
        } catch (\Throwable $e) {
            Log::error("❌ Gagal update jadwal: " . $e->getMessage());
            return response()->json([
                'message' => 'Gagal memperbarui jadwal.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /** ===================== 🗑️ DELETE ===================== */
    public function destroy($id)
    {
        try {
            Jadwal::findOrFail($id)->delete();
            return response()->json(['message' => 'Jadwal berhasil dihapus.'], 200);
        } catch (\Throwable $e) {
            Log::error("❌ Gagal menghapus jadwal: " . $e->getMessage());
            return response()->json([
                'message' => 'Gagal menghapus jadwal.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /** ===================== 👤 JADWAL PEGAWAI SPESIFIK ===================== */
    public function jadwalPegawai(Request $request, $id)
    {
        try {
            $jenis = $request->query('jenis', 'all');
            $tanggal = $request->query('tanggal');
            $shift = $request->query('shift');

            $query = Jadwal::leftJoin('pegawai', 'jadwal.pegawai_id', '=', 'pegawai.id')
                ->where('jadwal.pegawai_id', $id)
                ->select(
                    'jadwal.id',
                    'pegawai.nama as nama',
                    'jadwal.tanggal',
                    'jadwal.shift',
                    'jadwal.jam_mulai',
                    'jadwal.jam_selesai'
                );

            if ($shift) {
                $query->where('jadwal.shift', $shift);
            }

            if ($tanggal) {
                if ($jenis === 'day') {
                    $query->whereDate('jadwal.tanggal', Carbon::parse($tanggal)->toDateString());
                } elseif ($jenis === 'month') {
                    $dateObj = Carbon::parse($tanggal);
                    $query->whereBetween(DB::raw('DATE(jadwal.tanggal)'), [
                        $dateObj->copy()->startOfMonth()->toDateString(),
                        $dateObj->copy()->endOfMonth()->toDateString(),
                    ]);
                }
            }

            $rows = $query
                ->orderBy('jadwal.tanggal', 'asc')
                ->orderBy('jadwal.jam_mulai', 'asc')
                ->get();

            return response()->json([
                'message' => 'Data jadwal pegawai berhasil dimuat.',
                'data' => $rows
            ]);
        } catch (\Throwable $e) {
            Log::error("❌ Gagal memuat jadwal pegawai: " . $e->getMessage());
            return response()->json([
                'message' => 'Gagal memuat jadwal pegawai.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
    private function scheduleRules(bool $isUpdate = false): array
    {
        return [
            'pegawai_id'  => [$isUpdate ? 'sometimes' : 'required', 'exists:pegawai,id'],
            'tanggal'     => [$isUpdate ? 'sometimes' : 'required', 'date'],
            'shift'       => [$isUpdate ? 'sometimes' : 'required', 'string', 'max:50'],
            'jam_mulai'   => [$isUpdate ? 'sometimes' : 'required', 'date_format:H:i'],
            'jam_selesai' => [$isUpdate ? 'sometimes' : 'required', 'date_format:H:i'],
        ];
    }

    private function scheduleMessages(): array
    {
        return [
            '*.required'        => 'Semua informasi jadwal wajib diisi.',
            'pegawai_id.exists' => 'Pegawai tidak valid.',
            'tanggal.date'      => 'Tanggal tidak valid.',
            'jam_mulai.date_format'   => 'Format jam tidak valid.',
            'jam_selesai.date_format' => 'Format jam tidak valid.',
        ];
    }

    private function hasScheduleConflict($pegawaiId, $tanggal, $jamMulai, $jamSelesai, $ignoreId = null): bool
    {
        return Jadwal::where('pegawai_id', $pegawaiId)
            ->when($ignoreId, fn($q) => $q->where('id', '!=', $ignoreId))
            ->whereDate('tanggal', $tanggal)
            ->where(function ($query) use ($jamMulai, $jamSelesai) {
                $query->whereBetween('jam_mulai', [$jamMulai, $jamSelesai])
                    ->orWhereBetween('jam_selesai', [$jamMulai, $jamSelesai])
                    ->orWhere(function ($sub) use ($jamMulai, $jamSelesai) {
                        $sub->where('jam_mulai', '<=', $jamMulai)
                            ->where('jam_selesai', '>=', $jamSelesai);
                    });
            })
            ->exists();
    }
}
