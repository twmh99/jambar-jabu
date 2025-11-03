<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('gaji', function (Blueprint $table) {
            if (!Schema::hasColumn('gaji', 'periode')) {
                $table->string('periode', 10)->after('pegawai_id');
            }
            if (!Schema::hasColumn('gaji', 'total_jam')) {
                $table->integer('total_jam')->default(0)->after('periode');
            }
            if (!Schema::hasColumn('gaji', 'total_tip')) {
                $table->integer('total_tip')->default(0)->after('total_gaji');
            }
        });
    }

    public function down(): void
    {
        Schema::table('gaji', function (Blueprint $table) {
            $table->dropColumn(['periode', 'total_jam', 'total_tip']);
        });
    }
};
