<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use App\Models\Pegawai;
use App\Models\Jadwal;
use App\Models\Absensi;
use App\Models\Gaji;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class DummyDataSeeder extends Seeder
{
    public function run(): void
    {
        // 🔄 Bersihkan data dummy lama
        DB::table('users')->whereIn('email', [
            'owner@gmail.com', 'supervisor@gmail.com', 'budi@gmail.com', 'citra@gmail.com'
        ])->delete();
        DB::table('pegawai')->whereIn('nama', ['Bintang', 'Budi', 'Citra'])->delete();
        DB::table('jadwal')->delete();
        DB::table('absensi')->delete();
        if (Schema::hasTable('gaji')) DB::table('gaji')->delete();

        // 👑 Owner
        $owner = User::create([
            'name' => 'Owner SMPJ',
            'email' => 'owner@gmail.com',
            'password' => Hash::make('Willy123'),
            'role' => 'owner',
            'is_first_login' => false,
        ]);

        // 🧭 Supervisor
        $supPeg = Pegawai::create([
            'nama' => 'Bintang',
            'jabatan' => 'Supervisor',
            'telepon' => '0811111111',
            'status' => 'Aktif',
            'hourly_rate' => 25000,
        ]);

        $supervisor = User::create([
            'name' => 'Bintang',
            'email' => 'supervisor@gmail.com',
            'password' => Hash::make('Willy123'),
            'role' => 'supervisor',
            'pegawai_id' => $supPeg->id,
            'is_first_login' => false,
        ]);

        // 👷 Pegawai 1 (Budi)
        $peg1 = Pegawai::create([
            'nama' => 'Budi',
            'jabatan' => 'Kasir',
            'telepon' => '0822222222',
            'status' => 'Aktif',
            'hourly_rate' => 20000,
        ]);

        User::create([
            'name' => 'Budi',
            'email' => 'budi@gmail.com',
            'password' => Hash::make('Willy123'),
            'role' => 'employee',
            'pegawai_id' => $peg1->id,
            'is_first_login' => false,
        ]);

        // 👷 Pegawai 2 (Citra)
        $peg2 = Pegawai::create([
            'nama' => 'Citra',
            'jabatan' => 'Pelayan',
            'telepon' => '0833333333',
            'status' => 'Aktif',
            'hourly_rate' => 18000,
        ]);

        User::create([
            'name' => 'Citra',
            'email' => 'citra@gmail.com',
            'password' => Hash::make('Willy123'),
            'role' => 'employee',
            'pegawai_id' => $peg2->id,
            'is_first_login' => false,
        ]);

        // 📆 Jadwal kerja minggu ini (Senin–Minggu)
        $start = Carbon::now()->startOfWeek(); // Senin
        $shifts = ['Pagi', 'Siang', 'Malam'];

        foreach (range(0, 6) as $i) {
            $date = $start->copy()->addDays($i)->toDateString();

            foreach ([$peg1, $peg2] as $peg) {
                $shift = $shifts[array_rand($shifts)];
                $jamMulai = match ($shift) {
                    'Pagi' => '09:00',
                    'Siang' => '14:00',
                    default => '19:00',
                };
                $jamSelesai = match ($shift) {
                    'Pagi' => '14:00',
                    'Siang' => '19:00',
                    default => '00:00',
                };

                Jadwal::create([
                    'pegawai_id' => $peg->id,
                    'tanggal' => $date,
                    'shift' => $shift,
                    'jam_mulai' => $jamMulai,
                    'jam_selesai' => $jamSelesai,
                ]);
            }
        }

        // 🕓 Riwayat 7 hari absensi terakhir
        $absensiStatus = ['Hadir', 'Hadir', 'Hadir', 'Terlambat', 'Izin', 'Alpha', 'Hadir'];

        foreach (range(0, 6) as $i) {
            $tgl = Carbon::now()->subDays($i)->toDateString();

            Absensi::create([
                'pegawai_id' => $peg1->id,
                'tanggal' => $tgl,
                'status' => $absensiStatus[$i],
            ]);

            Absensi::create([
                'pegawai_id' => $peg2->id,
                'tanggal' => $tgl,
                'status' => $absensiStatus[array_rand($absensiStatus)],
            ]);
        }

        // 💰 Gaji & Tip minggu ini (dummy)
        if (Schema::hasTable('gaji')) {
            DB::table('gaji')->insert([
                [
                    'pegawai_id' => $peg1->id,
                    'periode' => now()->format('Y-m'),
                    'total_jam' => 40,
                    'total_gaji' => 800000,
                    'total_tip' => 150000,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
                [
                    'pegawai_id' => $peg2->id,
                    'periode' => now()->format('Y-m'),
                    'total_jam' => 36,
                    'total_gaji' => 648000,
                    'total_tip' => 90000,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
            ]);
        }

        echo "\n✅ Dummy data pegawai lengkap berhasil ditambahkan!\n";
    }
}
