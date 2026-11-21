<?php

namespace Tests\Concerns;

use App\Enums\CashType;
use App\Models\CashCategory;
use App\Models\User;
use Illuminate\Testing\TestResponse;

/** Data uji transaksi dan kategori kas. Dipakai bersama SchoolFixtures. */
trait CashFixtures
{
    protected function cashCategory(string $name = 'Kategori Uji', string|CashType $type = CashType::Income, bool $isActive = true): CashCategory
    {
        $typeVal = $type instanceof CashType ? $type->value : $type;

        return CashCategory::firstOrCreate(
            ['name' => $name, 'type' => $typeVal],
            ['is_active' => $isActive]
        );
    }

    protected function recordCashAs(User $user, array $payload): TestResponse
    {
        return $this->actingAs($user)->postJson('/api/v1/cash-transactions', array_merge([
            'transaction_date' => now()->toDateString(),
            'amount' => 500000,
            'description' => 'Transaksi kas uji coba',
        ], $payload));
    }

    protected function recordCash(array $payload, ?User $by = null): TestResponse
    {
        $user = $by ?? ($this->tu ?? User::first());

        return $this->recordCashAs($user, $payload);
    }
}
