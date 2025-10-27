<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use App\Models\Pegawai;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        // Owner
        User::updateOrCreate(
            ['email' => 'owner@example.com'],
            [
                'name' => 'Owner',
                'password' => Hash::make('Owner123'),
                'role' => 'owner',
            ]
        );

        // Supervisor
        $supervisor = Pegawai::firstOrCreate(['nama' => 'Supervisor Utama']);
        User::updateOrCreate(
            ['email' => 'supervisor@example.com'],
            [
                'name' => 'Supervisor Utama',
                'password' => Hash::make('Supervisor123'),
                'role' => 'supervisor',
                'pegawai_id' => $supervisor->id,
            ]
        );

        // Pegawai 1
        $p1 = Pegawai::firstOrCreate(['nama' => 'Yoel'], ['jabatan' => 'Pelayan']);
        User::updateOrCreate(
            ['email' => 'yoel@example.com'],
            [
                'name' => 'Yoel',
                'password' => Hash::make('Yoel123'),
                'role' => 'employee',
                'pegawai_id' => $p1->id,
            ]
        );

        // Pegawai 2
        $p2 = Pegawai::firstOrCreate(['nama' => 'Natalia'], ['jabatan' => 'Kasir']);
        User::updateOrCreate(
            ['email' => 'natalia@example.com'],
            [
                'name' => 'Natalia',
                'password' => Hash::make('Natalia123'),
                'role' => 'employee',
                'pegawai_id' => $p2->id,
            ]
        );
    }
}
