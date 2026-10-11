<?php

namespace App\Http\Controllers\Api\V1\Users;

use App\Http\Controllers\Controller;
use App\Http\Requests\Users\StoreUserRequest;
use App\Http\Requests\Users\UpdateUserRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    private const ROLE_LABELS = [
        'superadmin' => 'Pengelola Sistem',
        'admin_tu_keuangan' => 'Admin TU dan Keuangan',
        'guru' => 'Guru',
    ];

    public function roles(): JsonResponse
    {
        $roles = Role::query()->orderBy('name')->pluck('name')->map(fn ($name) => [
            'name' => $name,
            'label' => self::ROLE_LABELS[$name] ?? $name,
        ])->values();

        return response()->json(['data' => $roles]);
    }

    public function index(Request $request)
    {
        $users = User::query()
            ->with(['roles', 'staff'])
            ->when($request->query('q'), fn ($q, $s) => $q->where(
                fn ($w) => $w->where('name', 'like', "%{$s}%")->orWhere('username', 'like', "%{$s}%")
            ))
            ->when($request->query('role'), fn ($q, $role) => $q->role($role))
            ->when($request->has('is_active'), fn ($q) => $q->where('is_active', $request->boolean('is_active')))
            ->orderBy('name')
            ->paginate(min((int) $request->query('per_page', 25), 100));

        return UserResource::collection($users);
    }

    public function show(User $user): UserResource
    {
        return new UserResource($user->load('roles', 'staff'));
    }

    public function store(StoreUserRequest $request): JsonResponse
    {
        $data = $request->validated();
        $temporary = $this->temporaryPassword();

        $user = DB::transaction(function () use ($data, $temporary) {
            $user = User::create([
                'name' => $data['name'],
                'username' => $data['username'],
                'email' => $data['email'] ?? null,
                'staff_id' => $data['staff_id'] ?? null,
                'password' => $temporary,
                'is_active' => true,
                'must_change_password' => true,
            ]);
            $user->syncRoles([$data['role']]);

            return $user;
        });

        AuditLogger::log('role_assigned', $user, null, ['role' => $data['role']]);

        return (new UserResource($user->load('roles', 'staff')))
            ->additional(['temporary_password' => $temporary])
            ->response()
            ->setStatusCode(201)
            ->header('Cache-Control', 'no-store');
    }

    public function update(UpdateUserRequest $request, User $user): UserResource
    {
        $data = $request->validated();
        $oldRole = $user->getRoleNames()->first();

        if ($request->user()->is($user) && $data['role'] !== $oldRole) {
            throw ValidationException::withMessages(['role' => ['Anda tidak dapat mengubah peran akun Anda sendiri.']]);
        }

        DB::transaction(function () use ($user, $data) {
            $user->update([
                'name' => $data['name'],
                'email' => $data['email'] ?? null,
                'staff_id' => $data['staff_id'] ?? null,
            ]);
            $user->syncRoles([$data['role']]);
        });

        if ($oldRole !== $data['role']) {
            AuditLogger::log('role_changed', $user, ['role' => $oldRole], ['role' => $data['role']]);
        }

        return new UserResource($user->fresh()->load('roles', 'staff'));
    }

    public function resetPassword(Request $request, User $user): JsonResponse
    {
        // Mereset akun sendiri akan mengakhiri sesi yang sedang dipakai; arahkan ke "Ganti password".
        if ($request->user()->is($user)) {
            throw ValidationException::withMessages(['user' => ['Untuk akun Anda sendiri, gunakan menu Ganti password.']]);
        }

        $temporary = $this->temporaryPassword();

        $user->forceFill([
            'password' => $temporary,
            'must_change_password' => true,
            'failed_attempts' => 0,
            'locked_until' => null,
        ])->save();

        $this->revokeSessions($user);
        AuditLogger::log('password_reset', $user);

        return response()->json(['temporary_password' => $temporary])->header('Cache-Control', 'no-store');
    }

    public function deactivate(Request $request, User $user): UserResource
    {
        if ($request->user()->is($user)) {
            throw ValidationException::withMessages(['user' => ['Anda tidak dapat menonaktifkan akun Anda sendiri.']]);
        }

        $user->update(['is_active' => false]);
        $this->revokeSessions($user);
        AuditLogger::log('user_deactivated', $user);

        return new UserResource($user->fresh()->load('roles', 'staff'));
    }

    public function activate(User $user): UserResource
    {
        $user->update(['is_active' => true]);
        AuditLogger::log('user_activated', $user);

        return new UserResource($user->fresh()->load('roles', 'staff'));
    }

    /** Huruf dan angka saja agar mudah dibaca/disalin; wajib diganti saat login pertama. */
    private function temporaryPassword(): string
    {
        return Str::password(12, symbols: false);
    }

    private function revokeSessions(User $user): void
    {
        DB::table('sessions')->where('user_id', $user->id)->delete();
    }
}
