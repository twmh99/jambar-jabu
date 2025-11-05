<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;
use App\Models\User;
use App\Models\Pegawai;
use Carbon\Carbon;

class AuthController extends Controller
{
    /** 🔐 LOGIN (email/nama, semua role + fallback pegawai baru + notifikasi supervisor) */
    public function login(Request $request)
    {
        $request->validate([
            'login'    => 'required|string',
            'password' => 'required|string',
        ]);

        $login = $request->input('login');

        $user = User::with('pegawai')
            ->where(function ($q) use ($login) {
                $q->where('email', $login)
                  ->orWhere('name', $login);
            })
            ->first();

        /** 🧩 Fallback: buat user baru jika hanya ada di tabel pegawai */
        if (!$user) {
            $pegawai = Pegawai::whereRaw('LOWER(email) = ?', [strtolower($login)])
                ->orWhereRaw('LOWER(nama) = ?', [strtolower($login)])
                ->first();


            if ($pegawai) {
                $defaultPassword = 'Password123';

                $user = User::create([
                    'name'        => $pegawai->nama,
                    'email'       => $pegawai->email ?? strtolower(str_replace(' ', '_', $pegawai->nama)) . '@auto.smpj',
                    'password' => Hash::make('Password123'),
                    'role'        => 'employee',
                    'pegawai_id'  => $pegawai->id,
                    'is_first_login' => true,
                ]);
                $user->load('pegawai');

                /** ✉️ Kirim notifikasi ke semua supervisor */
                $supervisors = User::where('role', 'supervisor')->get();
                foreach ($supervisors as $supervisor) {
                    // Jika supervisor punya email, kirim email
                    if ($supervisor->email) {
                        try {
                            Mail::raw(
                                "Halo {$supervisor->name},\n\n"
                                . "Sistem SMPJ baru saja membuat akun otomatis untuk pegawai baru.\n\n"
                                . "Nama Pegawai : {$pegawai->nama}\n"
                                . "Email        : {$pegawai->email}\n"
                                . "Password     : {$defaultPassword}\n"
                                . "Tanggal      : " . Carbon::now()->format('d M Y H:i') . "\n\n"
                                . "Mohon informasikan password default ini kepada pegawai terkait agar segera menggantinya setelah login pertama.",
                                function ($message) use ($supervisor) {
                                    $message->to($supervisor->email)
                                            ->subject('[SMPJ] Akun Pegawai Baru Dibuat Otomatis');
                                }
                            );
                        } catch (\Throwable $e) {
                            // Jika Mail gagal, log saja
                            Log::warning('Gagal mengirim email notifikasi supervisor: ' . $e->getMessage());
                        }
                    }
                }

                /** 💾 Log juga di file untuk keamanan */
                Log::info("Akun otomatis dibuat untuk pegawai: {$pegawai->nama} ({$pegawai->email}) pada " . Carbon::now());
            }
        }

        /** ❌ Jika tetap tidak ditemukan */
        if (!$user) {
            throw ValidationException::withMessages([
                'login' => ['Akun tidak ditemukan di sistem.'],
            ]);
        }

        /** 🔒 Verifikasi password */
        if (!Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'login' => ['Password salah.'],
            ]);
        }

        /** 🔁 Token baru */
        $user->tokens()->delete();
        $token = $user->createToken('smpj_token')->plainTextToken;

        /** ✅ Flag login pertama */
        if ($user->is_first_login) {
            $user->is_first_login = false;
            $user->save();
        }

        /** ✅ Response sukses */
        return response()->json([
            'access_token'          => $token,
            'token_type'            => 'Bearer',
            'role'                  => strtolower($user->role ?? 'employee'),
            'must_change_password'  => (bool) ($user->is_first_login ?? false),
            'user' => [
                'id'          => $user->id,
                'name'        => $user->name,
                'email'       => $user->email,
                'role'        => $user->role,
                'pegawai_id'  => $user->pegawai_id,
                'pegawai'     => $user->pegawai,
            ],
        ], 200);
    }

    /** 🚪 LOGOUT */
    public function logout(Request $request)
    {
        $token = $request->user()?->currentAccessToken();
        if ($token) {
            $token->delete();
        }
        return response()->json(['message' => 'Logout berhasil.'], 200);
    }

    /** 👤 PROFIL USER LOGIN */
    public function me(Request $request)
    {
        return response()->json($request->user()->load('pegawai'));
    }

    /** 🔑 GANTI PASSWORD */
    public function changePassword(Request $request)
    {
        $request->validate([
            'current_password' => 'required|string',
            'new_password'     => 'required|string|min:6|confirmed',
        ]);

        $user = $request->user();

        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json(['message' => 'Password lama salah.'], 422);
        }

        $user->password = Hash::make($request->new_password);
        $user->is_first_login = false;
        $user->save();

        return response()->json(['message' => 'Password berhasil diubah.'], 200);
    }
}
