<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use App\Models\Pegawai;
use App\Models\User;
use Carbon\Carbon;

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
     * Password default: Password123
     */
    public function store(Request $request)
    {
        try {
            Log::info('📥 Data request masuk ke PegawaiController@store', $request->all());

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
                'email'       => $validated['email'],
            ]);

            // ✅ Password default tetap "Password123"
            $defaultPassword = 'Password123';

            // ✅ Buat akun user
            $user = User::create([
                'name'           => $pegawai->nama,
                'email'          => $validated['email'],
                'password'       => Hash::make($defaultPassword),
                'role'           => $validated['role'] ?? 'employee',
                'pegawai_id'     => $pegawai->id,
                'is_first_login' => true,
            ]);

            Log::info('✅ Akun pegawai baru dibuat', [
                'pegawai'  => $pegawai->nama,
                'email'    => $user->email,
                'password' => $defaultPassword,
                'role'     => $user->role,
            ]);

            /**
             * 📧 Kirim email notifikasi
             * 1️⃣ Ke pegawai baru (akun login)
             * 2️⃣ Ke semua supervisor
             */
            try {
                if (config('mail.mailers.smtp.transport') ?? false) {
                    // — Email ke pegawai —
                    Mail::raw(
                        "Halo {$pegawai->nama},\n\n".
                        "Akun Anda telah dibuat di Sistem SMPJ.\n\n".
                        "Email: {$user->email}\nPassword: {$defaultPassword}\n\n".
                        "Segera login dan ubah password Anda pada login pertama.\n\n".
                        "Salam,\nSMPJ System",
                        function ($message) use ($user) {
                            $message->to($user->email)
                                ->subject('Akun SMPJ Anda Telah Dibuat');
                        }
                    );
                    Log::info("📧 Email notifikasi akun baru dikirim ke {$user->email}");

                    // — Email ke supervisor —
                    $supervisors = User::where('role', 'supervisor')->get();
                    foreach ($supervisors as $supervisor) {
                        if ($supervisor->email) {
                            Mail::raw(
                                "Halo {$supervisor->name},\n\n".
                                "Sistem SMPJ baru saja menambahkan pegawai baru:\n\n".
                                "Nama Pegawai : {$pegawai->nama}\n".
                                "Email        : {$pegawai->email}\n".
                                "Password     : {$defaultPassword}\n".
                                "Tanggal      : " . Carbon::now()->format('d M Y H:i') . "\n\n".
                                "Mohon informasikan password default ini kepada pegawai terkait agar segera menggantinya.\n\nSalam,\nSMPJ System",
                                function ($message) use ($supervisor) {
                                    $message->to($supervisor->email)
                                        ->subject('[SMPJ] Pegawai Baru Ditambahkan');
                                }
                            );
                            Log::info("📨 Email notifikasi dikirim ke supervisor: {$supervisor->email}");
                        }
                    }
                } else {
                    Log::warning('⚠️ Mail transport tidak dikonfigurasi, email tidak dikirim.');
                }
            } catch (\Throwable $mailError) {
                Log::warning('⚠️ Gagal mengirim email notifikasi: ' . $mailError->getMessage());
            }

            // ✅ Balasan ke frontend
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
        }
        catch (\Illuminate\Validation\ValidationException $ve) {
            return response()->json([
                'message' => 'Validasi gagal.',
                'errors'  => $ve->errors(),
            ], 422);
        }
        catch (\Throwable $e) {
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

    /** 📄 Tampilkan detail satu pegawai */
    public function show($id)
    {
        $pegawai = Pegawai::with('user:id,name,email,role,pegawai_id')->find($id);
        if (!$pegawai) {
            return response()->json(['message' => 'Pegawai tidak ditemukan.'], 404);
        }

        return response()->json(['data' => $pegawai]);
    }

    /** 🔑 Ganti password pegawai dari profil sendiri */
    public function changePassword(Request $request)
    {
        $user = $request->user();

        $request->validate([
            'current_password' => 'required|string',
            'new_password'     => 'required|string|min:6|confirmed',
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
