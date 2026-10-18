<?php

namespace App\Http\Resources;

use App\Models\SchoolProfile;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** Rapor lengkap untuk workspace dan cetak: isian, siswa, rombel, template, dan kop sekolah. */
class ReportCardResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $card = $this->resource;
        $enrollment = $card->enrollment;
        $classroom = $enrollment->classroom;
        $unit = $classroom->unit;
        $template = $card->template;
        $student = $card->student;
        $profile = SchoolProfile::first();
        $user = $request->user();

        return [
            'id' => $card->id,
            'status' => $card->status->value,
            'editable' => $user ? $user->can('update', $card) : false,
            // Jangan dinamai 'data': kunci itu bentrok dengan pembungkus 'data' milik Laravel,
            // sehingga respons tidak akan dibungkus dan klien kehilangan struktur {data: ...}.
            'answers' => $card->data ?? [],
            'student' => [
                'id' => $student->id,
                'name' => $student->name,
                'nis' => $student->nis,
                'nisn' => $student->nisn,
                'gender' => $student->gender->value,
                'birth_place' => $student->birth_place,
                'birth_date' => $student->birth_date?->toDateString(),
                'religion' => $student->religion,
                'address' => $student->address,
            ],
            'classroom' => [
                'id' => $classroom->id,
                'name' => $classroom->name,
                'unit' => ['code' => $unit->code, 'name' => $unit->name],
                'grade' => $classroom->gradeLevel?->name,
                'homeroom' => $classroom->homeroomStaff?->name,
            ],
            'semester' => [
                'id' => $card->semester->id,
                'name' => $card->semester->name->value,
                'year' => $card->semester->academicYear->name,
            ],
            'template' => [
                'id' => $template->id,
                'name' => $template->name,
                'version' => $template->version,
                'page' => [
                    'size' => $template->page_size,
                    'width_mm' => (float) $template->page_width_mm,
                    'height_mm' => (float) $template->page_height_mm,
                    'orientation' => $template->orientation,
                    'margin_top_mm' => (float) $template->margin_top_mm,
                    'margin_right_mm' => (float) $template->margin_right_mm,
                    'margin_bottom_mm' => (float) $template->margin_bottom_mm,
                    'margin_left_mm' => (float) $template->margin_left_mm,
                    'offset_x_mm' => (float) $template->offset_x_mm,
                    'offset_y_mm' => (float) $template->offset_y_mm,
                    'font_family' => $template->font_family,
                    'font_size_pt' => $template->font_size_pt,
                ],
                'definition' => $template->definition,
            ],
            'school' => [
                'foundation_name' => $profile?->foundation_name,
                'address' => $profile?->address,
                'phone' => $profile?->phone,
                'email' => $profile?->email,
            ],
            'finalized_at' => $card->finalized_at?->toIso8601String(),
            'updated_at' => $card->updated_at?->toIso8601String(),
        ];
    }
}
