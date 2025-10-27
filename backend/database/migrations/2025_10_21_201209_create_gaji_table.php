<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('gaji', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pegawai_id')->constrained('pegawai')->onDelete('cascade');
            $table->date('periode_awal');
            $table->date('periode_akhir');
            $table->decimal('total_jam', 8, 2)->default(0);
            $table->decimal('gaji_pokok', 12, 2)->default(0);
            $table->decimal('bonus_tip', 12, 2)->default(0);
            $table->decimal('total_gaji', 12, 2)->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('gaji');
    }
};
