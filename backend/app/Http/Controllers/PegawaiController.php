<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use App\Models\Pegawai;
use App\Models\User;

class PegawaiController extends Controller
{
    /**
     * 📋 Tampilkan semua pegawai beserta data user-nya
     */
    public function index()
    {
        try {
            $rows = Pegawai::with('user:id,name,email,role,pegawai_id')
                ->orderBy('id', 'desc')
                ->get();

            return response()->json([
                'message' => 'Data pegawai berhasil dimuat.',
                'data'    => $rows,
            ], 200);
        } catch (\Throwable $e) {
            Log::error("Gagal memuat data pegawai: {$e->getMessage()}", ['trace' => $e->getTraceAsString()]);
            return response()->json([
                'message' => 'Gagal memuat data pegawai.',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * ➕ Tambah pegawai & otomatis buat akun user
     * Password default: kata pertama nama + "123"
     */
    public function store(Request $request)
    {
        try {
            $validated = $request->validate([
                'nama'        => 'required|string|max:255',
                'jabatan'     => 'nullable|string|max:255',
                'telepon'     => 'nullable|string|max:20',
                'status'      => 'nullable|in:Aktif,Nonaktif',
                'hourly_rate' => 'nullable|numeric|min:0',
                'email'       => 'required|email|unique:users,email',
                'role'        => 'nullable|in:employee,supervisor,owner',
            ]);

            // ✅ Simpan data pegawai
            $pegawai = Pegawai::create([
                'nama'        => $validated['nama'],
                'jabatan'     => $validated['jabatan'] ?? null,
                'telepon'     => $validated['telepon'] ?? null,
                'status'      => $validated['status'] ?? 'Aktif',
                'hourly_rate' => $validated['hourly_rate'] ?? 20000,
            ]);

            // ✅ Buat password default otomatis
            $firstWord = ucfirst(strtolower(explode(' ', trim($pegawai->nama))[0]));
            $defaultPassword = $firstWord . '123';

            // ✅ Buat akun user terhubung ke pegawai
            $user = User::create([
                'name'           => $pegawai->nama,
                'email'          => $validated['email'],
                'password'       => Hash::make($defaultPassword),
                'role'           => $validated['role'] ?? 'employee',
                'pegawai_id'     => $pegawai->id,
                'is_first_login' => true,
            ]);

            Log::info('✅ Akun baru dibuat', [
                'email'    => $user->email,
                'password' => $defaultPassword,
                'role'     => $user->role,
            ]);

            // ✅ Kirim email jika Mail tersedia (jangan error jika gagal)
            try {
                if (config('mail.mailers.smtp.transport') ?? false) {
                    Mail::raw(
                        "Halo {$pegawai->nama},\n\nAkun Anda telah dibuat di Sistem SMPJ.\n\n" .
                        "Email: {$user->email}\nPassword: {$defaultPassword}\n\n" .
                        "Segera login dan ubah password Anda pada login pertama.\n\nSalam,\nSMPJ System",
                        fn($message) => $message
                            ->to($user->email)
                            ->subject('Akun SMPJ Anda Telah Dibuat')
                    );
                }
            } catch (\Throwable $mailError) {
                Log::warning("Gagal mengirim email ke {$user->email}: " . $mailError->getMessage());
            }

            return response()->json([
                'message' => 'Pegawai & akun login berhasil dibuat.',
                'data' => [
                    'pegawai' => $pegawai,
                    'user'    => [
                        'email'            => $user->email,
                        'default_password' => $defaultPassword,
                        'role'             => $user->role,
                    ],
                ],
            ], 201);

        } catch (\Illuminate\Validation\ValidationException $ve) {
            // ❌ Validasi gagal
            return response()->json([
                'message' => 'Validasi gagal.',
                'errors'  => $ve->errors(),
            ], 422);
        } catch (\Throwable $e) {
            // ❌ Kesalahan tak terduga
            Log::error("Gagal menyimpan pegawai: {$e->getMessage()}", ['trace' => $e->getTraceAsString()]);
            return response()->json([
                'message' => 'Gagal menyimpan data pegawai.',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /** ✏️ Update data pegawai */
    public function update(Request $request, $id)
    {
        $pegawai = Pegawai::find($id);
        if (!$pegawai) {
            return response()->json(['message' => 'Pegawai tidak ditemukan.'], 404);
        }

        $data = $request->validate([
            'nama'        => 'sometimes|required|string|max:255',
            'jabatan'     => 'nullable|string|max:255',
            'telepon'     => 'nullable|string|max:20',
            'status'      => 'nullable|in:Aktif,Nonaktif',
            'hourly_rate' => 'nullable|numeric|min:0',
        ]);

        $pegawai->update($data);

        return response()->json([
            'message' => 'Data pegawai berhasil diperbarui.',
            'data'    => $pegawai,
        ]);
    }

    /** 🗑️ Hapus pegawai & akun terkait */
    public function destroy($id)
    {
        $pegawai = Pegawai::find($id);
        if (!$pegawai) {
            return response()->json(['message' => 'Pegawai tidak ditemukan.'], 404);
        }

        User::where('pegawai_id', $pegawai->id)->delete();
        $pegawai->delete();

        return response()->json(['message' => 'Pegawai & akun login berhasil dihapus.'], 200);
    }

    /** 👤 Profil pegawai */
    public function profilPegawai($id)
    {
        $pegawai = Pegawai::with('user:id,name,email,role,pegawai_id')->find($id);
        if (!$pegawai) {
            return response()->json(['message' => 'Pegawai tidak ditemukan.'], 404);
        }

        return response()->json([
            'data' => [
                'id'          => $pegawai->id,
                'nama'        => $pegawai->nama,
                'jabatan'     => $pegawai->jabatan,
                'telepon'     => $pegawai->telepon,
                'status'      => $pegawai->status,
                'hourly_rate' => $pegawai->hourly_rate,
                'email'       => $pegawai->user?->email,
                'role'        => $pegawai->user?->role,
            ],
        ]);
    }

    /** 🔄 Update profil pegawai sendiri */
    public function updateProfil(Request $request, $id)
    {
        $pegawai = Pegawai::find($id);
        if (!$pegawai) {
            return response()->json(['message' => 'Pegawai tidak ditemukan.'], 404);
        }

        $data = $request->validate([
            'nama'     => 'nullable|string|max:255',
            'telepon'  => 'nullable|string|max:20',
            'password' => 'nullable|string|min:6',
        ]);

        if (!empty($data['password'])) {
            $user = User::where('pegawai_id', $pegawai->id)->first();
            if ($user) {
                $user->password = Hash::make($data['password']);
                $user->is_first_login = false;
                $user->save();
            }
            unset($data['password']);
        }

        $pegawai->update($data);

        return response()->json([
            'message' => 'Profil pegawai berhasil diperbarui.',
            'data'    => $pegawai,
        ]);
    }

    /** 📄 Tampilkan detail satu pegawai */
    public function show($id)
    {
        $pegawai = Pegawai::with('user:id,name,email,role,pegawai_id')->find($id);
        if (!$pegawai) {
            return response()->json(['message' => 'Pegawai tidak ditemukan.'], 404);
        }

        return response()->json(['data' => $pegawai]);
    }


public function getGaji($id)
{
    try {
        // Pastikan tabel gaji tersedia
        if (!DB::getSchemaBuilder()->hasTable('gaji')) {
            return response()->json([]);
        }

        // Ambil data sesuai struktur tabel kamu
        $data = DB::table('gaji')
            ->where('pegawai_id', $id)
            ->select(
                'periode_awal',
                'periode_akhir',
                'total_jam',
                'gaji_pokok',
                'bonus_tip',
                'total_gaji',
                'created_at'
            )
            ->orderByDesc('periode_akhir')
            ->get();

        // Kalau kosong, return array kosong biar frontend aman
        if ($data->isEmpty()) {
            return response()->json([]);
        }

        return response()->json($data, 200);
    } catch (\Throwable $e) {
        \Log::error("Error getGaji pegawai {$id}: " . $e->getMessage());
        return response()->json(['message' => 'Gagal memuat data gaji.'], 500);
    }
}


    /** 🔑 Ganti password pegawai (dari profil pegawai sendiri) */
    public function changePassword(Request $request)
    {
        $user = $request->user();

        $request->validate([
            'current_password' => 'required|string',
            'new_password' => 'required|string|min:6|confirmed',
        ]);

        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json(['message' => 'Password lama salah.'], 422);
        }

        $user->password = Hash::make($request->new_password);
        $user->is_first_login = false;
        $user->save();

        return response()->json(['message' => 'Password berhasil diubah.'], 200);
    }
}