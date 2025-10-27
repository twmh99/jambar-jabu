<?php

namespace App\Http\Controllers;

use App\Models\Jadwal;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
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

            // alias compatibility
            if (isset($data['employee_id']) && !isset($data['pegawai_id'])) {
                $data['pegawai_id'] = $data['employee_id'];
                unset($data['employee_id']);
            }

            $validated = validator($data, [
                'pegawai_id'  => 'required|exists:pegawai,id',
                'tanggal'     => 'required|date',
                'shift'       => 'required|string|max:50',
                'jam_mulai'   => 'required|date_format:H:i',
                'jam_selesai' => 'required|date_format:H:i',
            ])->validate();

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

            $validated = validator($data, [
                'pegawai_id'  => 'sometimes|required|exists:pegawai,id',
                'tanggal'     => 'sometimes|required|date',
                'shift'       => 'nullable|string|max:50',
                'jam_mulai'   => 'nullable|date_format:H:i',
                'jam_selesai' => 'nullable|date_format:H:i',
            ])->validate();

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
    public function jadwalPegawai($id)
    {
        try {
            $rows = Jadwal::leftJoin('pegawai', 'jadwal.pegawai_id', '=', 'pegawai.id')
                ->where('jadwal.pegawai_id', $id)
                ->select(
                    'jadwal.id',
                    'pegawai.nama as nama',
                    'jadwal.tanggal',
                    'jadwal.shift',
                    'jadwal.jam_mulai',
                    'jadwal.jam_selesai'
                )
                ->orderBy('jadwal.tanggal', 'asc')
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
}
