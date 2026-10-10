<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ChangePasswordRequest;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Resources\AuthUserResource;
use App\Services\AuditLogger;
use App\Services\AuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class AuthController extends Controller
{
    public function login(LoginRequest $request, AuthService $auth): AuthUserResource
    {
        $user = $auth->attempt($request->validated('username'), $request->validated('password'), $request);

        return new AuthUserResource($user->load('roles', 'staff'));
    }

    public function logout(Request $request): JsonResponse
    {
        AuditLogger::log('logout', $request->user());

        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['message' => 'Berhasil keluar.']);
    }

    public function me(Request $request): AuthUserResource
    {
        return new AuthUserResource($request->user()->load('roles', 'staff'));
    }

    public function changePassword(ChangePasswordRequest $request): AuthUserResource
    {
        $user = $request->user();

        $user->forceFill([
            'password' => $request->validated('password'),
            'must_change_password' => false,
        ])->save();

        // Cabut sesi lain milik akun ini (perangkat lain).
        DB::table('sessions')
            ->where('user_id', $user->id)
            ->where('id', '!=', $request->session()->getId())
            ->delete();

        $request->session()->regenerate();

        AuditLogger::log('password_changed', $user);

        return new AuthUserResource($user->fresh()->load('roles', 'staff'));
    }
}
