<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('absensi', function (Blueprint $table) {
            if (!Schema::hasColumn('absensi', 'jam_masuk')) {
                $table->time('jam_masuk')->nullable()->after('tanggal');
            }
            if (!Schema::hasColumn('absensi', 'jam_keluar')) {
                $table->time('jam_keluar')->nullable()->after('jam_masuk');
            }
        });
    }

    public function down(): void
    {
        Schema::table('absensi', function (Blueprint $table) {
            if (Schema::hasColumn('absensi', 'jam_masuk')) {
                $table->dropColumn('jam_masuk');
            }
            if (Schema::hasColumn('absensi', 'jam_keluar')) {
                $table->dropColumn('jam_keluar');
            }
        });
    }
};
