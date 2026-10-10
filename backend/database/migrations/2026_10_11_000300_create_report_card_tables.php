<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('report_templates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('unit_id')->constrained('units')->restrictOnDelete();
            $table->string('name');
            $table->unsignedInteger('version')->default(1);
            $table->string('page_size', 10)->default('A4');
            $table->decimal('page_width_mm', 6, 1)->default(210);
            $table->decimal('page_height_mm', 6, 1)->default(297);
            $table->string('orientation', 10)->default('portrait');
            $table->decimal('margin_top_mm', 5, 1)->default(15);
            $table->decimal('margin_right_mm', 5, 1)->default(15);
            $table->decimal('margin_bottom_mm', 5, 1)->default(15);
            $table->decimal('margin_left_mm', 5, 1)->default(15);
            $table->decimal('offset_x_mm', 5, 1)->default(0);
            $table->decimal('offset_y_mm', 5, 1)->default(0);
            $table->string('font_family', 100)->default('Times New Roman');
            $table->unsignedSmallInteger('font_size_pt')->default(11);
            $table->json('definition');
            $table->boolean('is_active')->default(false);
            $table->boolean('is_locked')->default(false);
            $table->unique(['unit_id', 'name', 'version']);
            $table->timestamps();
        });

        Schema::create('report_cards', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('students')->restrictOnDelete();
            $table->foreignId('enrollment_id')->constrained('student_enrollments')->restrictOnDelete();
            $table->foreignId('semester_id')->constrained('semesters')->restrictOnDelete();
            $table->foreignId('template_id')->constrained('report_templates')->restrictOnDelete();
            $table->string('status', 10)->default('draft');
            $table->json('data')->nullable();
            $table->foreignId('filled_by')->constrained('users')->restrictOnDelete();
            $table->foreignId('finalized_by')->nullable()->constrained('users')->restrictOnDelete();
            $table->timestamp('finalized_at')->nullable();
            $table->unique(['student_id', 'semester_id']);
            $table->index(['semester_id', 'status']);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('report_cards');
        Schema::dropIfExists('report_templates');
    }
};
