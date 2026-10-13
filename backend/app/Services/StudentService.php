<?php

namespace App\Services;

use App\Models\Classroom;
use App\Models\Student;
use App\Models\StudentEnrollment;
use App\Models\StudentStatusLog;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class StudentService
{
    private const LEAVING = ['transferred', 'dropped', 'graduated'];

    public function __construct(private readonly AcademicContext $context) {}

    public function create(array $data): Student
    {
        return DB::transaction(function () use ($data) {
            $student = Student::create($this->studentAttributes($data) + ['status' => 'active']);
            $this->syncGuardians($student, $data['guardians'] ?? []);

            if (! empty($data['classroom_id'])) {
                $this->place($student, Classroom::findOrFail($data['classroom_id']));
            }

            return $student;
        });
    }

    public function update(Student $student, array $data): Student
    {
        return DB::transaction(function () use ($student, $data) {
            $student->update($this->studentAttributes($data));

            if (array_key_exists('guardians', $data)) {
                $this->syncGuardians($student, $data['guardians'] ?? []);
            }

            return $student;
        });
    }

    /** Wali: yang punya id diperbarui, tanpa id ditambah, yang tidak dikirim dihapus. Satu kontak utama. */
    public function syncGuardians(Student $student, array $guardians): void
    {
        $keepIds = [];
        $hasPrimary = collect($guardians)->contains(fn ($g) => ! empty($g['is_primary_contact']));

        foreach (array_values($guardians) as $index => $row) {
            $attributes = [
                'relation' => $row['relation'],
                'name' => $row['name'],
                'occupation' => $row['occupation'] ?? null,
                'phone' => $row['phone'] ?? null,
                'address' => $row['address'] ?? null,
                'is_primary_contact' => $hasPrimary ? ! empty($row['is_primary_contact']) : $index === 0,
            ];

            $existing = ! empty($row['id']) ? $student->guardians()->whereKey($row['id'])->first() : null;

            if ($existing) {
                $existing->update($attributes);
                $keepIds[] = $existing->id;
            } else {
                $keepIds[] = $student->guardians()->create($attributes)->id;
            }
        }

        $student->guardians()->whereNotIn('id', $keepIds)->get()->each->delete();

        // Hanya satu kontak utama: yang pertama menang.
        $primaries = $student->guardians()->where('is_primary_contact', true)->orderBy('id')->get();
        $primaries->skip(1)->each->update(['is_primary_contact' => false]);
    }

    /** Menempatkan (atau memindahkan) siswa ke rombel tahun ajaran aktif. Satu enrollment per siswa per tahun. */
    public function place(Student $student, Classroom $classroom): StudentEnrollment
    {
        $year = $this->context->year();

        if (! $year || (int) $classroom->academic_year_id !== (int) $year->id) {
            throw ValidationException::withMessages(['classroom_id' => ['Rombel harus berasal dari tahun ajaran aktif.']]);
        }

        if (in_array($student->status->value, self::LEAVING, true)) {
            throw ValidationException::withMessages(['classroom_id' => ['Siswa yang sudah keluar atau lulus tidak dapat ditempatkan di rombel.']]);
        }

        $enrollment = StudentEnrollment::where('student_id', $student->id)->where('academic_year_id', $year->id)->first();

        if ($enrollment) {
            $enrollment->update(['classroom_id' => $classroom->id, 'status' => 'active', 'ended_at' => null]);

            return $enrollment;
        }

        return StudentEnrollment::create([
            'student_id' => $student->id,
            'classroom_id' => $classroom->id,
            'academic_year_id' => $year->id,
            'status' => 'active',
            'started_at' => now()->toDateString(),
        ]);
    }

    /** Mutasi status siswa: riwayat selalu dicatat; keluar/lulus menutup enrollment tahun aktif. */
    public function changeStatus(Student $student, array $data, ?User $actor): Student
    {
        $from = $student->status->value;
        $to = $data['to_status'];

        if ($from === $to) {
            throw ValidationException::withMessages(['to_status' => ['Status baru sama dengan status saat ini.']]);
        }

        return DB::transaction(function () use ($student, $data, $actor, $from, $to) {
            $student->update(['status' => $to]);

            StudentStatusLog::create([
                'student_id' => $student->id,
                'from_status' => $from,
                'to_status' => $to,
                'effective_date' => $data['effective_date'],
                'reason' => $data['reason'] ?? null,
                'destination_school' => $data['destination_school'] ?? null,
                'document_number' => $data['document_number'] ?? null,
                'created_by' => $actor?->id,
            ]);

            if (in_array($to, self::LEAVING, true) && ($year = $this->context->year())) {
                StudentEnrollment::where('student_id', $student->id)
                    ->where('academic_year_id', $year->id)
                    ->get()
                    ->each->update([
                        'status' => $to === 'graduated' ? 'graduated' : 'left',
                        'ended_at' => $data['effective_date'],
                    ]);
            }

            return $student->fresh();
        });
    }

    private function studentAttributes(array $data): array
    {
        return collect($data)->only([
            'nis', 'nisn', 'name', 'gender', 'birth_place', 'birth_date', 'religion',
            'address', 'phone', 'previous_school', 'entry_date', 'notes',
        ])->all();
    }
}
