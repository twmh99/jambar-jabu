<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class RoleSupervisor
{
    public function handle(Request $request, Closure $next)
{
    $user = $request->user();
    // Izinkan owner dan supervisor untuk endpoint pegawai
    if (in_array($user?->role, ['owner', 'supervisor'])) {
        return $next($request);
    }
    return response()->json(['message' => 'Akses ditolak (bukan Supervisor atau Owner)'], 403);
}
}