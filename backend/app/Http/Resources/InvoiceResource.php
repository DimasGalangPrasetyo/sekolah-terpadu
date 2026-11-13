<?php

namespace App\Http\Resources;

use App\Enums\InvoiceStatus;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class InvoiceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $open = in_array($this->status, [InvoiceStatus::Unpaid, InvoiceStatus::Partial], true);

        return [
            'id' => $this->id,
            'number' => $this->number,
            'kind' => $this->kind->value,
            'period_month' => $this->period_month?->format('Y-m'),
            'due_date' => $this->due_date?->toDateString(),
            'total_amount' => (int) $this->total_amount,
            'paid_amount' => (int) $this->paid_amount,
            'outstanding' => $this->status === InvoiceStatus::Void ? 0 : max(0, (int) $this->total_amount - (int) $this->paid_amount),
            'status' => $this->status->value,
            'is_overdue' => $open && $this->due_date !== null && $this->due_date->lt(now()->startOfDay()),
            'notes' => $this->notes,
            'voided_at' => $this->voided_at?->toIso8601String(),
            'void_reason' => $this->void_reason,
            'created_at' => $this->created_at?->toIso8601String(),
            'student' => $this->whenLoaded('student', fn () => $this->student ? [
                'id' => $this->student->id,
                'nis' => $this->student->nis,
                'name' => $this->student->name,
            ] : null),
            'unit' => $this->whenLoaded('unit', fn () => [
                'id' => $this->unit->id,
                'code' => $this->unit->code,
                'name' => $this->unit->name,
            ]),
            'academic_year' => $this->whenLoaded('academicYear', fn () => [
                'id' => $this->academicYear->id,
                'name' => $this->academicYear->name,
            ]),
            'items' => $this->whenLoaded('items', fn () => $this->items->map(fn ($item) => [
                'id' => $item->id,
                'fee_type' => $item->relationLoaded('feeType') && $item->feeType ? [
                    'id' => $item->feeType->id,
                    'code' => $item->feeType->code,
                    'name' => $item->feeType->name,
                ] : null,
                'description' => $item->description,
                'quantity' => (int) $item->quantity,
                'unit_price' => (int) $item->unit_price,
                'discount_amount' => (int) $item->discount_amount,
                'subtotal' => (int) $item->subtotal,
            ])->values()),
            'allocations' => $this->whenLoaded('allocations', fn () => $this->allocations->map(fn ($a) => [
                'id' => $a->id,
                'amount' => (int) $a->amount,
                'payment' => $a->relationLoaded('payment') && $a->payment ? [
                    'id' => $a->payment->id,
                    'receipt_number' => $a->payment->receipt_number,
                    'payment_date' => $a->payment->payment_date?->toDateString(),
                    'status' => $a->payment->status->value,
                ] : null,
            ])->values()),
        ];
    }
}
