<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Jalankan migrasi.
     */
    public function up(): void
    {
        // === USERS TABLE ===
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password');

            // 🔐 Tambahan kolom untuk sistem role dan relasi ke pegawai
            $table->string('role')->default('employee'); // employee, supervisor, owner
            $table->foreignId('pegawai_id')->nullable()
                  ->constrained('pegawai')
                  ->onDelete('cascade'); // jika pegawai dihapus, akun ikut dihapus

            // 🛡️ Flag untuk login pertama kali
            $table->boolean('is_first_login')->default(true);

            $table->rememberToken();
            $table->timestamps();
        });

        // === PASSWORD RESET TOKENS ===
        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        // === SESSIONS TABLE ===
        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }

    /**
     * Balikkan migrasi.
     */
    public function down(): void
    {
        Schema::dropIfExists('sessions');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('users');
    }
};
