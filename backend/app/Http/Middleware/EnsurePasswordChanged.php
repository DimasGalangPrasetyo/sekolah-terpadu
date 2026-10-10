<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Akun dengan password sementara hanya boleh ganti password, melihat profil, dan keluar. */
class EnsurePasswordChanged
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && $user->must_change_password) {
            return response()->json([
                'message' => 'Anda harus mengganti password sementara terlebih dahulu.',
                'code' => 'password_change_required',
            ], 403);
        }

        return $next($request);
    }
}
