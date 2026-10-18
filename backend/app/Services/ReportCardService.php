<?php

namespace App\Services;

use App\Models\ReportCard;
use App\Models\ReportTemplate;
use App\Models\SchoolProfile;
use App\Models\Student;
use App\Models\StudentEnrollment;
use App\Models\Subject;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ReportCardService
{
    public function __construct(private readonly AcademicContext $context) {}

    /** Membuka rapor siswa untuk semester aktif; membuat draft (terisi dari template) bila belum ada. */
    public function open(Student $student, User $user): ReportCard
    {
        $semester = $this->context->semester();

        if (! $semester) {
            throw ValidationException::withMessages(['student_id' => ['Belum ada semester aktif.']]);
        }

        $enrollment = StudentEnrollment::with('classroom.unit')
            ->where('student_id', $student->id)
            ->where('academic_year_id', $semester->academic_year_id)
            ->first();

        if (! $enrollment || ! $enrollment->classroom->unit->has_report_card) {
            throw ValidationException::withMessages(['student_id' => ['Siswa belum ditempatkan di rombel SD/SMP pada tahun ajaran aktif.']]);
        }

        if ($enrollment->status->value !== 'active') {
            throw ValidationException::withMessages(['student_id' => ['Siswa ini tidak aktif di rombelnya.']]);
        }

        $existing = ReportCard::where('student_id', $student->id)->where('semester_id', $semester->id)->first();

        if ($existing) {
            abort_unless($user->can('view', $existing), 403, 'Anda tidak berhak membuka rapor ini.');

            return $existing;
        }

        $ownsClassroom = $user->can('reportcards.fill')
            && $user->activeHomeroomClassrooms()->contains('id', $enrollment->classroom_id);

        abort_unless($user->can('reportcards.manage') || $ownsClassroom, 403, 'Anda tidak berhak mengisi rapor siswa ini.');

        $template = ReportTemplate::where('unit_id', $enrollment->classroom->unit_id)
            ->where('is_active', true)
            ->orderByDesc('version')
            ->first();

        if (! $template) {
            throw ValidationException::withMessages(['student_id' => ["Template rapor untuk unit {$enrollment->classroom->unit->code} belum tersedia."]]);
        }

        return DB::transaction(function () use ($student, $semester, $enrollment, $template, $user) {
            $card = ReportCard::create([
                'student_id' => $student->id,
                'enrollment_id' => $enrollment->id,
                'semester_id' => $semester->id,
                'template_id' => $template->id,
                'status' => 'draft',
                'data' => $this->initialData($template, $enrollment),
                'filled_by' => $user->id,
            ]);

            $template->update(['is_locked' => true]);

            return $card;
        });
    }

    /** Isian awal: baris mata pelajaran terisi, nama penanda tangan terisi dari wali kelas/kepala sekolah. */
    public function initialData(ReportTemplate $template, StudentEnrollment $enrollment): array
    {
        $unit = $enrollment->classroom->unit;
        $profile = SchoolProfile::first();
        $headmaster = $profile?->letterhead['headmasters'][$unit->code] ?? '';
        $data = [];

        foreach ($template->definition['sections'] ?? [] as $section) {
            $key = $section['key'];

            switch ($section['type']) {
                case 'table':
                    $data[$key] = [];
                    if (($section['rows_from'] ?? null) === 'subjects') {
                        $first = $section['columns'][0]['key'] ?? 'subject';
                        foreach (Subject::where('unit_id', $unit->id)->where('is_active', true)->orderBy('sort_order')->get() as $subject) {
                            $row = [];
                            foreach ($section['columns'] ?? [] as $column) {
                                $row[$column['key']] = $column['key'] === $first ? $subject->name : '';
                            }
                            $data[$key][] = $row;
                        }
                    }
                    break;
                case 'fields':
                    foreach ($section['fields'] ?? [] as $field) {
                        $data[$key][$field['key']] = '';
                    }
                    break;
                case 'text':
                    $data[$key] = '';
                    break;
                case 'signature':
                    foreach ($section['signers'] ?? [] as $signer) {
                        $data[$key][$signer] = match (true) {
                            str_contains(mb_strtolower($signer), 'wali kelas') => $enrollment->classroom->homeroomStaff?->name ?? '',
                            str_contains(mb_strtolower($signer), 'kepala') => $headmaster,
                            default => '',
                        };
                    }
                    break;
            }
        }

        return $data;
    }

    /**
     * Memeriksa isian terhadap definisi template: kunci asing ditolak, tipe dan panjang dibatasi.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>  data yang sudah dinormalkan
     */
    public function validateData(array $data, array $definition): array
    {
        $sections = collect($definition['sections'] ?? [])->keyBy('key');
        $errors = [];
        $clean = [];

        foreach (array_keys($data) as $key) {
            if (! $sections->has($key)) {
                $errors["data.$key"] = ['Bagian rapor tidak dikenal.'];
            }
        }

        foreach ($sections as $key => $section) {
            if (! array_key_exists($key, $data)) {
                continue;
            }

            $value = $data[$key];

            switch ($section['type']) {
                case 'table':
                    if (! is_array($value) || count($value) > 60) {
                        $errors["data.$key"] = ['Tabel tidak valid atau terlalu banyak baris (maksimal 60).'];
                        break;
                    }
                    $columns = collect($section['columns'] ?? [])->pluck('key')->all();
                    $rows = [];
                    foreach (array_values($value) as $i => $row) {
                        if (! is_array($row)) {
                            $errors["data.$key.$i"] = ['Baris tidak valid.'];
                            continue;
                        }
                        $clean_row = [];
                        foreach ($row as $col => $cell) {
                            if (! in_array($col, $columns, true)) {
                                $errors["data.$key.$i.$col"] = ['Kolom tidak dikenal.'];
                            } elseif (! is_scalar($cell) && $cell !== null) {
                                $errors["data.$key.$i.$col"] = ['Isi sel harus berupa teks atau angka.'];
                            } elseif (mb_strlen((string) $cell) > 500) {
                                $errors["data.$key.$i.$col"] = ['Maksimal 500 karakter.'];
                            } else {
                                $clean_row[$col] = $cell === null ? '' : (string) $cell;
                            }
                        }
                        $rows[] = $clean_row;
                    }
                    $clean[$key] = $rows;
                    break;

                case 'fields':
                    if (! is_array($value)) {
                        $errors["data.$key"] = ['Isian tidak valid.'];
                        break;
                    }
                    $fields = collect($section['fields'] ?? [])->keyBy('key');
                    $group = [];
                    foreach ($value as $fieldKey => $fieldValue) {
                        $field = $fields->get($fieldKey);
                        if (! $field) {
                            $errors["data.$key.$fieldKey"] = ['Isian tidak dikenal.'];
                        } elseif (! is_scalar($fieldValue) && $fieldValue !== null) {
                            $errors["data.$key.$fieldKey"] = ['Isian tidak valid.'];
                        } elseif (($field['input'] ?? 'text') === 'number' && $fieldValue !== null && $fieldValue !== '' && ! is_numeric($fieldValue)) {
                            $errors["data.$key.$fieldKey"] = ['Harus berupa angka.'];
                        } elseif (mb_strlen((string) $fieldValue) > 500) {
                            $errors["data.$key.$fieldKey"] = ['Maksimal 500 karakter.'];
                        } else {
                            $group[$fieldKey] = $fieldValue === null ? '' : (string) $fieldValue;
                        }
                    }
                    $clean[$key] = $group;
                    break;

                case 'text':
                    $max = (int) ($section['max_length'] ?? 2000);
                    if (! is_string($value) && $value !== null) {
                        $errors["data.$key"] = ['Isian harus berupa teks.'];
                    } elseif (mb_strlen((string) $value) > $max) {
                        $errors["data.$key"] = ["Maksimal $max karakter."];
                    } else {
                        $clean[$key] = (string) $value;
                    }
                    break;

                case 'signature':
                    if (! is_array($value)) {
                        $errors["data.$key"] = ['Isian tidak valid.'];
                        break;
                    }
                    $signers = $section['signers'] ?? [];
                    $names = [];
                    foreach ($value as $signer => $name) {
                        if (! in_array($signer, $signers, true)) {
                            $errors["data.$key.$signer"] = ['Penanda tangan tidak dikenal.'];
                        } elseif (! is_string($name) && $name !== null || mb_strlen((string) $name) > 150) {
                            $errors["data.$key.$signer"] = ['Nama tidak valid (maksimal 150 karakter).'];
                        } else {
                            $names[$signer] = (string) $name;
                        }
                    }
                    $clean[$key] = $names;
                    break;

                default:
                    // student_identity dan jenis lain tidak menyimpan isian.
                    break;
            }
        }

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }

        return $clean;
    }
}
