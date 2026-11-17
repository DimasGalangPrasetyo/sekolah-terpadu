<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PaymentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'receipt_number' => $this->receipt_number,
            'payment_date' => $this->payment_date?->toDateString(),
            'method' => $this->method->value,
            'amount' => (int) $this->amount,
            'reference' => $this->reference,
            'notes' => $this->notes,
            'status' => $this->status->value,
            'voided_at' => $this->voided_at?->toIso8601String(),
            'void_reason' => $this->void_reason,
            'created_at' => $this->created_at?->toIso8601String(),
            'student' => $this->whenLoaded('student', fn () => $this->student ? [
                'id' => $this->student->id,
                'nis' => $this->student->nis,
                'name' => $this->student->name,
            ] : null),
            'received_by' => $this->whenLoaded('receiver', fn () => $this->receiver ? [
                'id' => $this->receiver->id,
                'name' => $this->receiver->name,
            ] : null),
            'allocations' => $this->whenLoaded('allocations', fn () => $this->allocations->map(fn ($a) => [
                'id' => $a->id,
                'amount' => (int) $a->amount,
                'invoice' => $a->relationLoaded('invoice') && $a->invoice ? [
                    'id' => $a->invoice->id,
                    'number' => $a->invoice->number,
                    'kind' => $a->invoice->kind->value,
                    'period_month' => $a->invoice->period_month?->format('Y-m'),
                    'status' => $a->invoice->status->value,
                ] : null,
            ])->values()),
        ];
    }
}
