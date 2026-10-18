<?php

namespace Tests\Concerns;

use App\Models\ReportTemplate;
use App\Models\Subject;
use App\Models\Unit;

/** Data uji rapor: template generik dan mata pelajaran. */
trait ReportFixtures
{
    protected function genericDefinition(): array
    {
        return [
            'sections' => [
                ['key' => 'identity', 'type' => 'student_identity', 'title' => 'Identitas Siswa'],
                ['key' => 'subjects', 'type' => 'table', 'title' => 'Capaian', 'rows_from' => 'subjects', 'columns' => [
                    ['key' => 'subject', 'label' => 'Mata Pelajaran'],
                    ['key' => 'score', 'label' => 'Nilai'],
                    ['key' => 'note', 'label' => 'Deskripsi'],
                ]],
                ['key' => 'extra', 'type' => 'table', 'title' => 'Ekstrakurikuler', 'dynamic_rows' => true, 'columns' => [
                    ['key' => 'name', 'label' => 'Kegiatan'],
                    ['key' => 'note', 'label' => 'Keterangan'],
                ]],
                ['key' => 'attendance', 'type' => 'fields', 'title' => 'Kehadiran', 'fields' => [
                    ['key' => 'sick', 'label' => 'Sakit', 'input' => 'number'],
                    ['key' => 'permit', 'label' => 'Izin', 'input' => 'number'],
                ]],
                ['key' => 'homeroom_note', 'type' => 'text', 'label' => 'Catatan Wali Kelas', 'input' => 'textarea', 'max_length' => 50],
                ['key' => 'signature', 'type' => 'signature', 'signers' => ['Orang Tua/Wali', 'Wali Kelas', 'Kepala Sekolah']],
            ],
        ];
    }

    protected function makeTemplate(string $unit = 'SD', bool $active = true): ReportTemplate
    {
        $unitModel = Unit::where('code', $unit)->firstOrFail();

        foreach (['Matematika', 'Bahasa Indonesia'] as $i => $name) {
            Subject::firstOrCreate(['unit_id' => $unitModel->id, 'name' => $name], ['sort_order' => $i + 1, 'is_active' => true]);
        }

        return ReportTemplate::create([
            'unit_id' => $unitModel->id,
            'name' => 'Rapor Generik',
            'version' => 1,
            'definition' => $this->genericDefinition(),
            'is_active' => $active,
        ]);
    }
}
