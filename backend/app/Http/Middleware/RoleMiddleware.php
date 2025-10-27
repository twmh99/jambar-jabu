<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    public function handle(Request $request, Closure $next, $role)
    {
        $user = $request->user();
        if (!$user || $user->role !== $role) {
            return response()->json(['message' => 'Akses ditolak untuk role ini'], Response::HTTP_FORBIDDEN);
        }
        return $next($request);
    }
}
