<?php

namespace App\Policies;

use App\Models\ReportCard;
use App\Models\User;
use App\Services\AcademicContext;
use Illuminate\Auth\Access\Response;

/**
 * Akses rapor: TU (reportcards.manage) ke semua rapor; guru (reportcards.fill) hanya ke
 * rapor siswa di rombel yang ia walikan, pada semester aktif, dan hanya selama masih draft.
 */
class ReportCardPolicy
{
    public function view(User $user, ReportCard $card): bool
    {
        return $user->can('reportcards.manage') || $this->ownsClassroom($user, $card);
    }

    public function update(User $user, ReportCard $card): Response
    {
        if (! $this->view($user, $card)) {
            return Response::deny('Anda tidak berhak mengubah rapor ini.');
        }

        if ($card->status->value === 'final') {
            return Response::deny('Rapor sudah final. Minta TU membuka kunci bila perlu diubah.');
        }

        if (! $user->can('reportcards.manage') && (int) $card->semester_id !== (int) app(AcademicContext::class)->semester()?->id) {
            return Response::deny('Rapor hanya dapat diisi pada semester yang sedang aktif.');
        }

        return Response::allow();
    }

    public function unlock(User $user, ReportCard $card): Response
    {
        if (! $user->can('reportcards.unlock')) {
            return Response::deny('Hanya TU yang dapat membuka kunci rapor.');
        }

        return $card->status->value === 'final'
            ? Response::allow()
            : Response::deny('Rapor ini belum final.');
    }

    private function ownsClassroom(User $user, ReportCard $card): bool
    {
        if (! $user->can('reportcards.fill')) {
            return false;
        }

        return $user->activeHomeroomClassrooms()->contains('id', $card->enrollment->classroom_id);
    }
}
