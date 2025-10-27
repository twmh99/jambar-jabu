<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 🧑‍💼 Owner
        User::updateOrCreate(
            ['email' => 'owner@smpj.com'],
            [
                'name' => 'Owner SMPJ',
                'password' => Hash::make('owner123'),
                'role' => 'owner',
                'is_first_login' => false
            ]
        );

        // 👨‍🏫 Supervisor
        User::updateOrCreate(
            ['email' => 'supervisor@smpj.com'],
            [
                'name' => 'Supervisor Jambar',
                'password' => Hash::make('supervisor123'),
                'role' => 'supervisor',
                'is_first_login' => false
            ]
        );

        // 👷‍♂️ Pegawai
        User::updateOrCreate(
            ['email' => 'pegawai@smpj.com'],
            [
                'name' => 'Pegawai Jambar',
                'password' => Hash::make('pegawai123'),
                'role' => 'employee',
                'is_first_login' => true
            ]
        );
    }
}
