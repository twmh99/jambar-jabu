<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        // ✅ Cek dulu apakah kolom shift sudah ada sebelum menambah
        if (!Schema::hasColumn('absensi', 'shift')) {
            Schema::table('absensi', function (Blueprint $table) {
                $table->string('shift', 50)->nullable()->after('tanggal');
            });
        }
    }

    public function down()
    {
        if (Schema::hasColumn('absensi', 'shift')) {
            Schema::table('absensi', function (Blueprint $table) {
                $table->dropColumn('shift');
            });
        }
    }
};
