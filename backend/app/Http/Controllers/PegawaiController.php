<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use App\Models\Pegawai;
use App\Models\User;
use Carbon\Carbon;

class PegawaiController extends Controller
{
    /**
     * Tampilkan semua pegawai beserta data user-nya
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

            $validator = $this->pegawaiValidator($request->all());
            if ($validator->fails()) {
                return response()->json([
                    'message' => 'Validasi gagal.',
                    'errors'  => $validator->errors(),
                ], 422);
            }

            $validated = $validator->validated();
            $cleanNama    = trim($validated['nama']);
            $cleanEmail   = strtolower(trim($validated['email']));
            $cleanTelepon = preg_replace('/\s+/', ' ', trim($validated['telepon']));
            $jabatan      = trim($validated['jabatan']);
            $status       = $validated['status'] ?? 'Aktif';
            $role         = $validated['role'] ?? ($jabatan === 'Supervisor' ? 'supervisor' : 'employee');

            $pegawai = Pegawai::create([
                'nama'        => $cleanNama,
                'jabatan'     => $jabatan,
                'telepon'     => $cleanTelepon,
                'status'      => $status,
                'hourly_rate' => $validated['hourly_rate'] ?? 20000,
                'email'       => $cleanEmail,
            ]);

            $defaultPassword = 'Password123';

            $user = User::create([
                'name'           => $pegawai->nama,
                'email'          => $cleanEmail,
                'password'       => Hash::make($defaultPassword),
                'role'           => $role,
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
        $pegawai = Pegawai::with('user')->find($id);
        if (!$pegawai) {
            return response()->json(['message' => 'Pegawai tidak ditemukan.'], 404);
        }

        $validator = $this->pegawaiValidator($request->all(), $pegawai->id, $pegawai->user?->id);
        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validasi gagal.',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $validated    = $validator->validated();
        $cleanNama    = trim($validated['nama']);
        $cleanEmail   = strtolower(trim($validated['email']));
        $cleanTelepon = preg_replace('/\s+/', ' ', trim($validated['telepon']));
        $jabatan      = trim($validated['jabatan']);
        $status       = $validated['status'];
        $role         = $validated['role'] ?? ($jabatan === 'Supervisor' ? 'supervisor' : 'employee');

        DB::beginTransaction();
        try {
            $pegawai->update([
                'nama'        => $cleanNama,
                'jabatan'     => $jabatan,
                'telepon'     => $cleanTelepon,
                'status'      => $status,
                'hourly_rate' => $validated['hourly_rate'],
                'email'       => $cleanEmail,
            ]);

            if ($pegawai->user) {
                $pegawai->user->update([
                    'name'  => $cleanNama,
                    'email' => $cleanEmail,
                    'role'  => $role,
                ]);
            }
            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error("❌ Gagal update pegawai: " . $e->getMessage());
            return response()->json([
                'message' => 'Gagal menyimpan data pegawai.',
                'error'   => $e->getMessage(),
            ], 500);
        }

        return response()->json([
            'message' => 'Data pegawai berhasil diperbarui.',
            'data'    => $pegawai->fresh('user'),
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


    private function pegawaiValidator(array $data, ?int $pegawaiId = null, ?int $userId = null)
    {
        $allowedJabatan = ['Kasir', 'Koki', 'Pelayan', 'Tukang Kebun', 'Supervisor'];

        $messages = [
            '*.required'     => 'Semua field wajib diisi.',
            'nama.unique'    => 'Nama sudah digunakan. Silakan gunakan nama lain.',
            'email.unique'   => 'Email ini sudah terdaftar. Gunakan email lain.',
            'email.email'    => 'Format email tidak valid.',
            'telepon.unique' => 'Nomor telepon sudah terdaftar.',
            'telepon.regex'  => 'Nomor telepon tidak valid.',
        ];

        return Validator::make($data, [
            'nama'        => ['required', 'string', 'max:255', Rule::unique('pegawai', 'nama')->ignore($pegawaiId)],
            'jabatan'     => ['required', 'string', 'max:255', Rule::in($allowedJabatan)],
            'telepon'     => ['required', 'string', 'max:20', 'regex:/^[0-9+\-()\s]{8,}$/', Rule::unique('pegawai', 'telepon')->ignore($pegawaiId)],
            'status'      => ['required', Rule::in(['Aktif', 'Nonaktif'])],
            'hourly_rate' => ['required', 'numeric', 'min:0'],
            'email'       => ['required', 'email', Rule::unique('users', 'email')->ignore($userId)],
            'role'        => ['nullable', Rule::in(['employee', 'supervisor', 'owner'])],
        ], $messages);
    }
}