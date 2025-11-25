<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use App\Models\Pegawai;
use App\Models\Jadwal;
use App\Models\Absensi;
use App\Models\Gaji;
use App\Models\Tip;
use Carbon\Carbon;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $today        = Carbon::today();
        $startOfWeek  = $today->copy()->startOfWeek(Carbon::MONDAY);
        $shiftOptions = ['Pagi', 'Siang', 'Malam'];
        $jabatanList  = ['Kasir', 'Koki', 'Pelayan', 'Tukang Kebun'];

        $defaultPassword = Hash::make('Password123');

        /* ===================== OWNER ===================== */
        $ownerUser = User::firstOrCreate(
            ['email' => 'owner@gmail.com'],
            [
                'name'     => 'Owner',
                'password' => $defaultPassword,
                'role'     => 'owner',
            ]
        );

        /* ===================== SUPERVISOR ===================== */
        $willyPegawai = Pegawai::firstOrCreate(
            ['email' => 'willyhutagalung99@gmail.com'],
            [
                'nama'        => 'Willy Hutagalung',
                'jabatan'     => 'Supervisor',
                'telepon'     => '081286600011',
                'status'      => 'Aktif',
                'hourly_rate' => 32000,
            ]
        );
        $willyUser = User::updateOrCreate(
            ['email' => 'willyhutagalung99@gmail.com'],
            [
                'name'       => 'Willy Hutagalung',
                'password'   => $defaultPassword,
                'role'       => 'supervisor',
                'pegawai_id' => $willyPegawai->id,
            ]
        );

        /* ===================== PEGAWAI RAFAELIN ===================== */
        $rafaelinPegawai = Pegawai::firstOrCreate(
            ['email' => 'rafaelinamir@gmail.com'],
            [
                'nama'        => 'Rafaelin Amir',
                'jabatan'     => 'Kasir',
                'telepon'     => '081255500077',
                'status'      => 'Aktif',
                'hourly_rate' => 25000,
            ]
        );
        User::updateOrCreate(
            ['email' => 'rafaelinamir@gmail.com'],
            [
                'name'       => 'Rafaelin Amir',
                'password'   => $defaultPassword,
                'role'       => 'employee',
                'pegawai_id' => $rafaelinPegawai->id,
            ]
        );

        /* ===================== PEGAWAI TAMBAHAN UNTUK OWNER ===================== */
        $ownerPegawaiTambahan = [
            Pegawai::firstOrCreate(
                ['email' => 'koki.owner@gmail.com'],
                [
                    'nama'        => 'Alya Kusuma',
                    'jabatan'     => 'Koki',
                    'telepon'     => '081278900021',
                    'status'      => 'Aktif',
                    'hourly_rate' => 27000,
                ]
            ),
            Pegawai::firstOrCreate(
                ['email' => 'pelayan.owner@gmail.com'],
                [
                    'nama'        => 'Damar Prayoga',
                    'jabatan'     => 'Pelayan',
                    'telepon'     => '081211003344',
                    'status'      => 'Aktif',
                    'hourly_rate' => 23000,
                ]
            ),
        ];

        foreach ($ownerPegawaiTambahan as $pegawai) {
            User::updateOrCreate(
                ['email' => $pegawai->email],
                [
                    'name'       => $pegawai->nama,
                    'password'   => $defaultPassword,
                    'role'       => 'employee',
                    'pegawai_id' => $pegawai->id,
                ]
            );
        }

        /* ===================== ABSENSI & GAJI OWNER (10 data) ===================== */
        $ownerAbsensiPegawai = array_merge([$rafaelinPegawai], $ownerPegawaiTambahan);
        foreach (range(0, 9) as $i) {
            $date   = $today->copy()->subDays($i);
            $target = $ownerAbsensiPegawai[$i % count($ownerAbsensiPegawai)];
            $shift  = $shiftOptions[$i % count($shiftOptions)];

            Absensi::updateOrCreate(
                [
                    'pegawai_id' => $target->id,
                    'tanggal'    => $date->toDateString(),
                ],
                [
                    'shift'         => $shift,
                    'jam_masuk'     => $shift === 'Pagi' ? '08:00:00' : ($shift === 'Siang' ? '14:00:00' : '21:00:00'),
                    'jam_keluar'    => $shift === 'Pagi' ? '13:00:00' : ($shift === 'Siang' ? '19:30:00' : '06:00:00'),
                    'status'        => $i % 4 === 0 ? 'Terlambat' : 'Hadir',
                    'tip'           => 15000 + ($i * 700),
                    'supervisor_id' => $willyUser->id,
                ]
            );

            Gaji::updateOrCreate(
                [
                    'pegawai_id'   => $target->id,
                    'periode_awal' => $date->copy()->startOfWeek()->toDateString(),
                    'periode_akhir'=> $date->copy()->endOfWeek()->toDateString(),
                ],
                [
                    'periode'     => $date->format('Y-m'),
                    'total_jam'   => 40 + $i,
                    'gaji_pokok'  => 300000 + ($i * 12000),
                    'bonus_tip'   => 50000 + ($i * 2500),
                    'total_tip'   => 45000 + ($i * 2000),
                    'total_gaji'  => 350000 + ($i * 15000),
                ]
            );
        }

        /* ===================== SUPERVISOR WILLY: 10 PEGAWAI + DATA ===================== */
        $namaDummy = ['Lia Putri', 'Gilang Saputra', 'Maya Sari', 'Riko Mahesa', 'Sinta Dewi', 'Bagus Wirawan', 'Nadia Fajar', 'Yoga Pradipta', 'Helmi Akbar', 'Laras Pertiwi'];
        $dummyEmployees = [];
        foreach (range(0, 9) as $i) {
            $jabatan = $jabatanList[$i % count($jabatanList)];
            $peg = Pegawai::updateOrCreate(
                ['email' => 'pegawai' . ($i + 1) . '@gmail.com'],
                [
                    'nama'        => $namaDummy[$i],
                    'jabatan'     => $jabatan,
                    'telepon'     => '0819000' . str_pad($i + 1, 3, '0', STR_PAD_LEFT),
                    'status'      => 'Aktif',
                    'hourly_rate' => 20000 + ($i * 600),
                ]
            );
            $dummyEmployees[] = $peg;

            User::updateOrCreate(
                ['email' => $peg->email],
                [
                    'name'       => $peg->nama,
                    'password'   => $defaultPassword,
                    'role'       => 'employee',
                    'pegawai_id' => $peg->id,
                ]
            );

            $shift = $shiftOptions[$i % count($shiftOptions)];
            Jadwal::updateOrCreate(
                [
                    'pegawai_id' => $peg->id,
                    'tanggal'    => $today->toDateString(),
                ],
                [
                    'shift'      => $shift,
                    'jam_mulai'  => $shift === 'Pagi' ? '08:00:00' : ($shift === 'Siang' ? '14:00:00' : '21:00:00'),
                    'jam_selesai'=> $shift === 'Pagi' ? '14:00:00' : ($shift === 'Siang' ? '20:00:00' : '06:00:00'),
                ]
            );

            Absensi::updateOrCreate(
                [
                    'pegawai_id' => $peg->id,
                    'tanggal'    => $today->toDateString(),
                ],
                [
                    'shift'         => $shift,
                    'jam_masuk'     => $i % 3 === 0 ? '08:20:00' : '08:00:00',
                    'jam_keluar'    => $i % 4 === 0 ? null : '16:30:00',
                    'status'        => $i % 4 === 0 ? 'Terlambat' : 'Hadir',
                    'tip'           => 4000 + ($i * 500),
                    'supervisor_id' => $willyUser->id,
                ]
            );

            // jadwal overtime
            Jadwal::updateOrCreate(
                [
                    'pegawai_id' => $peg->id,
                    'tanggal'    => $today->copy()->subDays($i)->toDateString(),
                ],
                [
                    'shift'      => $shiftOptions[($i + 1) % count($shiftOptions)],
                    'jam_mulai'  => '08:00:00',
                    'jam_selesai'=> $i % 2 === 0 ? '18:30:00' : '16:00:00',
                ]
            );
        }

        foreach (range(1, 10) as $i) {
            Absensi::updateOrCreate(
                [
                    'pegawai_id' => $dummyEmployees[$i - 1]->id,
                    'tanggal'    => $today->copy()->subDays($i)->toDateString(),
                ],
                [
                    'shift'         => $shiftOptions[($i + 1) % count($shiftOptions)],
                    'jam_masuk'     => '09:00:00',
                    'jam_keluar'    => null,
                    'status'        => $i % 2 === 0 ? 'Terlambat' : 'Hadir',
                    'tip'           => 0,
                    'supervisor_id' => $willyUser->id,
                ]
            );
        }

        /* ===================== DATA PRIBADI RAFAELIN (10) ===================== */
        foreach (range(0, 9) as $i) {
            $date = $startOfWeek->copy()->subWeeks($i);
            $shift = $shiftOptions[$i % count($shiftOptions)];

            Jadwal::updateOrCreate(
                [
                    'pegawai_id' => $rafaelinPegawai->id,
                    'tanggal'    => $date->toDateString(),
                ],
                [
                    'shift'      => $shift,
                    'jam_mulai'  => '08:00:00',
                    'jam_selesai'=> '14:00:00',
                ]
            );

            Absensi::updateOrCreate(
                [
                    'pegawai_id' => $rafaelinPegawai->id,
                    'tanggal'    => $date->toDateString(),
                ],
                [
                    'shift'         => $shift,
                    'jam_masuk'     => '08:00:00',
                    'jam_keluar'    => '13:30:00',
                    'status'        => 'Hadir',
                    'tip'           => 9000 + ($i * 600),
                    'supervisor_id' => $willyUser->id,
                ]
            );

            Tip::updateOrCreate(
                [
                    'pegawai_id' => $rafaelinPegawai->id,
                    'tanggal'    => $date->toDateString(),
                ],
                [
                    'owner_id'   => $ownerUser->id,
                    'jumlah_tip' => 13500 + ($i * 700),
                    'keterangan' => "tip_rafaelin_week_$i",
                ]
            );

            Gaji::updateOrCreate(
                [
                    'pegawai_id'   => $rafaelinPegawai->id,
                    'periode_awal' => $date->copy()->startOfWeek()->toDateString(),
                    'periode_akhir'=> $date->copy()->endOfWeek()->toDateString(),
                ],
                [
                    'periode'     => $date->format('Y-m'),
                    'total_jam'   => 35 + $i,
                    'gaji_pokok'  => 320000 + ($i * 9000),
                    'bonus_tip'   => 45000 + ($i * 1200),
                    'total_tip'   => 45000 + ($i * 1200),
                    'total_gaji'  => 365000 + ($i * 10000),
                ]
            );
        }
    }
}