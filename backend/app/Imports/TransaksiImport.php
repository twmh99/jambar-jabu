<?php

namespace App\Imports;

use App\Models\Transaction;
use App\Models\Pegawai;
use Carbon\Carbon;
use Maatwebsite\Excel\Concerns\ToModel;
use Maatwebsite\Excel\Concerns\WithHeadingRow;

class TransaksiImport implements ToModel, WithHeadingRow
{
    /** 🔎 untuk menyimpan range tanggal dari file */
    public ?string $minDate = null;
    public ?string $maxDate = null;

    public function model(array $row)
    {
        $tanggal = $this->parseDate($row['tanggal'] ?? null);

        if ($tanggal) {
            $this->minDate = $this->minDate
                ? min($this->minDate, $tanggal)
                : $tanggal;

            $this->maxDate = $this->maxDate
                ? max($this->maxDate, $tanggal)
                : $tanggal;
        }

        $pegawaiId = $this->resolvePegawaiId($row);

        if (!$pegawaiId) {
            $identifier = $row['pegawai_id']
                ?? $row['pegawaiid']
                ?? $row['employee_id']
                ?? $row['email']
                ?? $row['pegawai_email']
                ?? $row['nama_pegawai']
                ?? $row['nama']
                ?? $row['pegawai']
                ?? 'tanpa identitas';

            throw new \InvalidArgumentException(
                "Data pegawai '{$identifier}' tidak ditemukan pada sistem. Pastikan ID/nama/email sesuai dengan data pegawai terdaftar."
            );
        }

        $qty   = $row['qty']   ?? null;
        $harga = $row['harga'] ?? null;
        $total = $row['total'] ?? null;

        if ($total === null && $qty !== null && $harga !== null) {
            $total = $qty * $harga;
        }

        return new Transaction([
            'pegawai_id'  => $pegawaiId,
            'trx_id'      => $row['transaction_id'] ?? $row['trx_id'] ?? null,
            'menu'        => $row['menu'] ?? null,
            'qty'         => $row['qty'] ?? null,
            'harga'       => $row['harga'] ?? null,
            'total'       => $total ?? 0,
            'jam_mulai'   => $this->parseTime($row['jam_mulai']   ?? null),
            'jam_selesai' => $this->parseTime($row['jam_selesai'] ?? null),
            'shift'       => $row['shift'] ?? null,
            'jam'         => $this->hitungJam(
                $row['jam_mulai']   ?? null,
                $row['jam_selesai'] ?? null
            ),
            'tanggal'     => $tanggal,
        ]);
    }

    /** Getter supaya bisa diambil dari controller */
    public function getMinDate(): ?string
    {
        return $this->minDate;
    }

    public function getMaxDate(): ?string
    {
        return $this->maxDate;
    }

    /** 🛠 Parse fleksibel semua format tanggal */
    private function parseDate($value)
    {
        if (!$value) return null;

        // serial number Excel
        if (is_numeric($value)) {
            return Carbon::instance(
                \PhpOffice\PhpSpreadsheet\Shared\Date::excelToDateTimeObject($value)
            )->format('Y-m-d');
        }

        // format umum
        foreach (['d/m/Y', 'Y-m-d'] as $format) {
            try {
                return Carbon::createFromFormat($format, $value)->format('Y-m-d');
            } catch (\Exception $e) {
                // lanjut ke format berikutnya
            }
        }

        // fallback
        try {
            return Carbon::parse($value)->format('Y-m-d');
        } catch (\Exception $e) {
            return null;
        }
    }

    /** 🛠 Parse jam dari excel atau string */
    private function parseTime($value)
    {
        if (!$value) return null;

        if (is_numeric($value)) {
            return Carbon::instance(
                \PhpOffice\PhpSpreadsheet\Shared\Date::excelToDateTimeObject($value)
            )->format('H:i');
        }

        try {
            return Carbon::parse($value)->format('H:i');
        } catch (\Exception $e) {
            return null;
        }
    }

    /** 🛠 Hitung durasi jam (dalam jam desimal) */
    private function hitungJam($start, $end)
    {
        $mulai   = $this->parseTime($start);
        $selesai = $this->parseTime($end);

        if (!$mulai || !$selesai) return 0;

        return Carbon::parse($mulai)
            ->diffInMinutes(Carbon::parse($selesai)) / 60;
    }

    /**
     * 🎯 Cari pegawai_id dari berbagai kolom (ID, email, atau nama)
     */
    private function resolvePegawaiId(array $row): ?int
    {
        $rawId = $row['pegawai_id']
            ?? $row['pegawaiid']
            ?? $row['employee_id']
            ?? $row['pegawai']
            ?? null;

        if ($rawId && is_numeric($rawId)) {
            $pegawai = Pegawai::find((int) $rawId);
            if ($pegawai) {
                return (int) $pegawai->id;
            }
        }

        $email = $row['email']
            ?? $row['pegawai_email']
            ?? null;

        if ($email) {
            $pegawai = Pegawai::where('email', $email)->first();
            if ($pegawai) {
                return $pegawai->id;
            }
        }

        $name = $row['nama_pegawai']
            ?? $row['nama']
            ?? $row['pegawai']
            ?? null;

        if ($name) {
            $pegawai = Pegawai::whereRaw('LOWER(nama) = ?', [strtolower($name)])->first();
            if ($pegawai) {
                return $pegawai->id;
            }
        }

        return null;
    }
}
