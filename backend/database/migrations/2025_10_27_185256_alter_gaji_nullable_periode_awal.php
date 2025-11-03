<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
{
    Schema::table('gaji', function (Blueprint $table) {
        // Sebelum ubah, isi nilai NULL menjadi tanggal sekarang
        DB::table('gaji')->whereNull('periode_awal')->update(['periode_awal' => now()]);
        DB::table('gaji')->whereNull('periode_akhir')->update(['periode_akhir' => now()]);

        // Baru ubah struktur kolom
        $table->date('periode_awal')->nullable()->change();
        $table->date('periode_akhir')->nullable()->change();
    });
}

    public function down(): void
    {
        Schema::table('gaji', function (Blueprint $table) {
            if (Schema::hasColumn('gaji', 'periode_awal')) {
                $table->date('periode_awal')->nullable(false)->change();
            }
            if (Schema::hasColumn('gaji', 'periode_akhir')) {
                $table->date('periode_akhir')->nullable(false)->change();
            }
        });
    }
};
