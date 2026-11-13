<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Batas unik tagihan bulanan lama (student_id, kind, period_month) ikut menghitung tagihan yang sudah di-void,
 * sehingga SPP bulan yang sama tidak bisa dibuat ulang setelah di-void.
 * Pengganti: kolom biasa `active_period` (BUKAN generated column, sesuai D-07) yang diisi service
 * dengan period_month untuk tagihan bulanan yang masih berlaku dan dikosongkan (NULL) saat void.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->date('active_period')->nullable()->after('period_month');
        });

        DB::table('invoices')
            ->where('status', '!=', 'void')
            ->whereNotNull('period_month')
            ->update(['active_period' => DB::raw('period_month')]);

        Schema::table('invoices', function (Blueprint $table) {
            $table->dropUnique(['student_id', 'kind', 'period_month']);
        });

        Schema::table('invoices', function (Blueprint $table) {
            $table->unique(['student_id', 'kind', 'active_period'], 'invoices_student_kind_active_period_unique');
        });
    }

    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropUnique('invoices_student_kind_active_period_unique');
        });

        Schema::table('invoices', function (Blueprint $table) {
            $table->unique(['student_id', 'kind', 'period_month']);
        });

        Schema::table('invoices', function (Blueprint $table) {
            $table->dropColumn('active_period');
        });
    }
};
