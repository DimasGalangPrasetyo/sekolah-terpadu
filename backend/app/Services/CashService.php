<?php

namespace App\Services;

use App\Enums\RecordStatus;
use App\Models\CashCategory;
use App\Models\CashTransaction;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CashService
{
    public function __construct(
        private readonly DocumentNumberService $numbers,
    ) {}

    /**
     * @param  array{transaction_date:string, cash_category_id:int, amount:int, description:string, unit_id?:?int}  $data
     */
    public function record(array $data, User $by): CashTransaction
    {
        return DB::transaction(function () use ($data, $by) {
            $category = CashCategory::whereKey($data['cash_category_id'])->lockForUpdate()->firstOrFail();

            if (! $category->is_active) {
                throw ValidationException::withMessages([
                    'cash_category_id' => ['Kategori kas yang dipilih tidak aktif.'],
                ]);
            }

            $number = $this->numbers->next('KAS', now());

            $transaction = CashTransaction::create([
                'number' => $number,
                'transaction_date' => $data['transaction_date'],
                'type' => $category->type,
                'cash_category_id' => $category->id,
                'unit_id' => $data['unit_id'] ?? null,
                'amount' => (int) $data['amount'],
                'description' => $data['description'],
                'status' => RecordStatus::Valid,
                'created_by' => $by->id,
            ]);

            return $transaction->load(['cashCategory', 'unit', 'creator']);
        });
    }

    /**
     * Membatalkan transaksi kas yang salah input.
     */
    public function void(CashTransaction $transaction, string $reason, User $by): CashTransaction
    {
        return DB::transaction(function () use ($transaction, $reason, $by) {
            $locked = CashTransaction::whereKey($transaction->id)->lockForUpdate()->firstOrFail();

            if ($locked->status === RecordStatus::Void) {
                abort(409, 'Transaksi kas ini sudah dibatalkan.');
            }

            $locked->update([
                'status' => RecordStatus::Void,
                'voided_at' => now(),
                'voided_by' => $by->id,
                'void_reason' => $reason,
            ]);

            return $locked->fresh(['cashCategory', 'unit', 'creator', 'voider']);
        });
    }
}
