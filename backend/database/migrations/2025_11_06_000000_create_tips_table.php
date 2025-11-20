<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // === Tambahkan supervisor_id ke ABSENSI ===
        if (Schema::hasTable('absensi') && !Schema::hasColumn('absensi', 'supervisor_id')) {
            Schema::table('absensi', function (Blueprint $table) {
                $table->foreignId('supervisor_id')
                    ->nullable()
                    ->after('pegawai_id')
                    ->constrained('users')
                    ->nullOnDelete();
            });
        }

        // === Tambahkan supervisor_id ke JADWAL ===
        if (Schema::hasTable('jadwal') && !Schema::hasColumn('jadwal', 'supervisor_id')) {
            Schema::table('jadwal', function (Blueprint $table) {
                $table->foreignId('supervisor_id')
                    ->nullable()
                    ->after('pegawai_id')
                    ->constrained('users')
                    ->nullOnDelete();
            });
        }

        // === Buat tabel TIPS ===
        if (!Schema::hasTable('tips')) {
            Schema::create('tips', function (Blueprint $table) {
                $table->id();
                $table->foreignId('pegawai_id')->constrained('pegawai')->onDelete('cascade');
                $table->foreignId('owner_id')->nullable()->constrained('users')->nullOnDelete();
                $table->decimal('jumlah_tip', 10, 2)->default(0);
                $table->date('tanggal');
                $table->string('keterangan')->nullable();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        // Hapus relasi supervisor_id dari absensi
        if (Schema::hasTable('absensi') && Schema::hasColumn('absensi', 'supervisor_id')) {
            Schema::table('absensi', function (Blueprint $table) {
                $table->dropForeign(['supervisor_id']);
                $table->dropColumn('supervisor_id');
            });
        }

        // Hapus relasi supervisor_id dari jadwal
        if (Schema::hasTable('jadwal') && Schema::hasColumn('jadwal', 'supervisor_id')) {
            Schema::table('jadwal', function (Blueprint $table) {
                $table->dropForeign(['supervisor_id']);
                $table->dropColumn('supervisor_id');
            });
        }

        // Hapus tabel tips
        Schema::dropIfExists('tips');
    }
};
