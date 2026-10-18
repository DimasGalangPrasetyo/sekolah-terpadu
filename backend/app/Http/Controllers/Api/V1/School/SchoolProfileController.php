<?php

namespace App\Http\Controllers\Api\V1\School;

use App\Http\Controllers\Controller;
use App\Http\Requests\School\SchoolProfileRequest;
use App\Models\SchoolProfile;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;

/** Profil sekolah/yayasan (kop surat rapor, laporan, dan kwitansi). Satu baris. */
class SchoolProfileController extends Controller
{
    public function show(): JsonResponse
    {
        return response()->json(['data' => $this->payload($this->profile())]);
    }

    public function update(SchoolProfileRequest $request): JsonResponse
    {
        $data = $request->validated();
        $profile = $this->profile();

        $letterhead = $profile->letterhead ?? [];
        $letterhead['headmasters'] = collect($data['headmasters'] ?? [])
            ->map(fn ($name) => trim((string) $name))
            ->all();

        $profile->update([
            'foundation_name' => $data['foundation_name'],
            'address' => $data['address'] ?? null,
            'phone' => $data['phone'] ?? null,
            'email' => $data['email'] ?? null,
            'letterhead' => $letterhead,
        ]);
        AuditLogger::log('school_profile_updated', $profile);

        return response()->json(['data' => $this->payload($profile->fresh())]);
    }

    private function profile(): SchoolProfile
    {
        return SchoolProfile::first() ?? SchoolProfile::create(['foundation_name' => 'Nama Yayasan']);
    }

    private function payload(SchoolProfile $profile): array
    {
        return [
            'foundation_name' => $profile->foundation_name,
            'address' => $profile->address,
            'phone' => $profile->phone,
            'email' => $profile->email,
            'headmasters' => ($profile->letterhead['headmasters'] ?? []) + ['TK' => '', 'SD' => '', 'SMP' => ''],
        ];
    }
}
