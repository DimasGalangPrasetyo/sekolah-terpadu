<?php

namespace App\Http\Controllers\Api\V1\Users;

use App\Http\Controllers\Controller;
use App\Models\Staff;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Pilihan staf guru untuk ditautkan ke akun (hanya yang aktif dan belum punya akun). */
class StaffOptionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $includeId = $request->integer('include_id') ?: null;

        $staff = Staff::query()
            ->where('is_teacher', true)
            ->where('is_active', true)
            ->where(fn ($q) => $q
                ->whereDoesntHave('user')
                ->when($includeId, fn ($w) => $w->orWhere('id', $includeId)))
            ->when($request->query('q'), fn ($q, $s) => $q->where('name', 'like', "%{$s}%"))
            ->orderBy('name')
            ->limit(50)
            ->get(['id', 'name', 'position']);

        return response()->json(['data' => $staff]);
    }
}
