<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class RoleEmployee
{
    public function handle(Request $request, Closure $next)
    {
        if ($request->user()?->role !== 'employee') {
            return response()->json(['message' => 'Akses ditolak (bukan Pegawai)'], 403);
        }
        return $next($request);
    }
}
