<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->text('value')->nullable();
            $table->string('description')->nullable();
            $table->timestamps();
        });

        DB::table('settings')->insert([
            ['key' => 'attendance_buffer_before_start', 'value' => '30', 'description' => 'Buffer check-in (minutes) sebelum jadwal dimulai', 'created_at' => now(), 'updated_at' => now()],
            ['key' => 'attendance_buffer_after_end', 'value' => '30', 'description' => 'Buffer check-out (minutes) setelah jadwal selesai', 'created_at' => now(), 'updated_at' => now()],
            ['key' => 'attendance_geofence_latitude', 'value' => '-7.779071', 'description' => 'Latitude lokasi kantor', 'created_at' => now(), 'updated_at' => now()],
            ['key' => 'attendance_geofence_longitude', 'value' => '110.416098', 'description' => 'Longitude lokasi kantor', 'created_at' => now(), 'updated_at' => now()],
            ['key' => 'attendance_geofence_radius_m', 'value' => '100', 'description' => 'Radius geofence dalam meter', 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('settings');
    }
};
