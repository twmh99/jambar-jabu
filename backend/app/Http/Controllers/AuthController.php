<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use App\Models\User;

class AuthController extends Controller
{
    /** 🔐 Login (email atau name) */
    public function login(Request $request)
    {
        $request->validate([
            'password' => 'required|string',
        ]);

        $login = $request->input('login', $request->input('email'));
        if (!$login) {
            throw ValidationException::withMessages([
                'login' => ['Kolom email/nama wajib diisi.'],
            ]);
        }

        $user = User::with('pegawai')
            ->where('email', $login)
            ->orWhere('name', $login)
            ->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'login' => ['Email/nama atau password salah.'],
            ]);
        }

        // Reset token lama lalu buat token baru
        $user->tokens()->delete();
        $token = $user->createToken('smpj_token')->plainTextToken;

        return response()->json([
            'access_token' => $token,
            'token_type'   => 'Bearer',
            'role'         => strtolower($user->role ?? 'pegawai'),
            'must_change_password' => (bool) ($user->is_first_login ?? false),
            'user' => [
                'id'         => $user->id,
                'name'       => $user->name,
                'email'      => $user->email,
                'role'       => $user->role,
                'pegawai_id' => $user->pegawai_id,
                'pegawai'    => $user->pegawai,
            ],
        ], 200);
    }

    /** 🚪 Logout */
    public function logout(Request $request)
    {
        // Aman kalau user/token null
        $token = $request->user()?->currentAccessToken();
        if ($token) {
            $token->delete();
        }

        return response()->json(['message' => 'Logout berhasil.'], 200);
    }

    /** 👤 Profil user login */
    public function me(Request $request)
    {
        return response()->json($request->user()->load('pegawai'));
    }

    /** 🔑 Ganti Password */
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
