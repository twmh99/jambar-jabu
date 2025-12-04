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
    private int $currentRow = 1;

    public function model(array $row)
    {
        $rowNumber   = ++$this->currentRow;
        $normalized  = $this->normalizeRow($row);

        if ($this->isRowEmpty($normalized)) {
            return null;
        }

        $pegawaiId = $this->resolvePegawaiId($normalized);
        if (!$pegawaiId) {
            $identifier = $this->value($normalized, [
                'id_pegawai', 'pegawai_id', 'pegawaiid', 'employee_id',
                'email', 'pegawai_email', 'nama_pegawai', 'nama', 'pegawai'
            ]) ?? 'tanpa identitas';

            $this->throwError($rowNumber, "Pegawai '{$identifier}' tidak ditemukan pada sistem.");
        }

        $trxId = $this->value($normalized, ['id_transaksi', 'trx_id', 'transaction_id']);
        if (!$trxId) {
            $this->throwError($rowNumber, "Kolom 'id_transaksi' wajib diisi.");
        }

        $shift = $this->value($normalized, ['shift']);
        if (!$shift) {
            $this->throwError($rowNumber, "Kolom 'shift' wajib diisi.");
        }

        $tanggalRaw = $this->value($normalized, ['tanggal', 'tanggal_transaksi']);
        $tanggal = $this->parseDate($tanggalRaw);
        if (!$tanggal) {
            $this->throwError($rowNumber, "Kolom 'tanggal' wajib diisi dengan format tanggal yang valid (YYYY-MM-DD).");
        }

        $jamMulaiRaw = $this->value($normalized, ['jam_mulai', 'mulai', 'jam_start']);
        $jamMulai = $this->parseTime($jamMulaiRaw);
        if (!$jamMulai) {
            $this->throwError($rowNumber, "Kolom 'jam_mulai' wajib diisi dengan format HH:MM.");
        }

        $jamSelesaiRaw = $this->value($normalized, ['jam_selesai', 'selesai', 'jam_end']);
        $jamSelesai = $this->parseTime($jamSelesaiRaw);
        if (!$jamSelesai) {
            $this->throwError($rowNumber, "Kolom 'jam_selesai' wajib diisi dengan format HH:MM.");
        }

        $customer = $this->value($normalized, ['nama_pelanggan', 'customer_name', 'pelanggan']);
        if (!$customer) {
            $this->throwError($rowNumber, "Kolom 'nama_pelanggan' wajib diisi.");
        }

        $menu = $this->value($normalized, ['menu_dipesan', 'menu', 'produk']);
        if (!$menu) {
            $this->throwError($rowNumber, "Kolom 'menu_dipesan' wajib diisi.");
        }

        $qtyRaw = $this->value($normalized, ['jumlah', 'qty', 'kuantitas']);
        $qty = $this->parseNumber($qtyRaw);
        if ($qty === null) {
            $this->throwError($rowNumber, "Kolom 'jumlah' wajib diisi dan harus berupa angka.");
        }

        $hargaRaw = $this->value($normalized, ['harga_satuan', 'harga', 'price_per_item']);
        $harga = $this->parseNumber($hargaRaw);
        if ($harga === null) {
            $this->throwError($rowNumber, "Kolom 'harga_satuan' wajib diisi dan harus berupa angka.");
        }

        $totalRaw = $this->value($normalized, ['total_harga', 'total', 'grand_total']);
        $total = $this->parseNumber($totalRaw);
        if ($total === null) {
            $total = $qty * $harga;
        }

        $payment = $this->value($normalized, ['metode_pembayaran', 'payment_method']);
        if (!$payment) {
            $this->throwError($rowNumber, "Kolom 'metode_pembayaran' wajib diisi.");
        }

        $this->trackDateRange($tanggal);

        return new Transaction([
            'pegawai_id'     => $pegawaiId,
            'trx_id'         => trim((string) $trxId),
            'shift'          => trim((string) $shift),
            'jam_mulai'      => $jamMulai,
            'jam_selesai'    => $jamSelesai,
            'jam'            => round($this->hitungJam($jamMulai, $jamSelesai), 2),
            'tanggal'        => $tanggal,
            'customer_name'  => trim((string) $customer),
            'menu'           => trim((string) $menu),
            'qty'            => $qty,
            'harga'          => $harga,
            'total'          => $total,
            'payment_method' => trim((string) $payment),
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

        if (is_string($value)) {
            $value = trim($value);
            $value = str_replace(['.', ',', ' '], ':', $value);
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

        $startTime = Carbon::createFromFormat('H:i', $mulai);
        $endTime   = Carbon::createFromFormat('H:i', $selesai);

        if ($endTime->lessThanOrEqualTo($startTime)) {
            $endTime->addDay();
        }

        return $startTime->diffInMinutes($endTime) / 60;
    }

    /**
     * 🎯 Cari pegawai_id dari berbagai kolom (ID, email, atau nama)
     */
    private function resolvePegawaiId(array $row): ?int
    {
        $rawId = $this->value($row, ['id_pegawai', 'pegawai_id', 'pegawaiid', 'employee_id', 'pegawai']);

        if ($rawId !== null && $rawId !== '') {
            if (is_numeric($rawId)) {
                $pegawai = Pegawai::find((int) $rawId);
                if ($pegawai) {
                    return (int) $pegawai->id;
                }
            }
        }

        $email = $this->value($row, ['email', 'pegawai_email']);
        if ($email) {
            $pegawai = Pegawai::where('email', $email)->first();
            if ($pegawai) {
                return $pegawai->id;
            }
        }

        $name = $this->value($row, ['nama_pegawai', 'nama', 'pegawai']);
        if ($name) {
            $pegawai = Pegawai::whereRaw('LOWER(nama) = ?', [strtolower($name)])->first();
            if ($pegawai) {
                return $pegawai->id;
            }
        }

        return null;
    }

    private function normalizeRow(array $row): array
    {
        $normalized = [];
        foreach ($row as $key => $value) {
            $normalized[$this->normalizeKey((string) $key)] = is_string($value)
                ? trim($value)
                : $value;
        }

        return $normalized;
    }

    private function normalizeKey(string $key): string
    {
        $key = strtolower(trim($key));
        $key = preg_replace('/[^a-z0-9]+/i', '_', $key);
        return trim($key, '_');
    }

    private function value(array $row, array $keys)
    {
        foreach ($keys as $key) {
            if (array_key_exists($key, $row) && $row[$key] !== null && $row[$key] !== '') {
                return $row[$key];
            }
        }

        return null;
    }

    private function parseNumber($value): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }

        if (is_numeric($value)) {
            return (int) round((float) $value);
        }

        $clean = preg_replace('/[^0-9,\.\-]/', '', (string) $value);
        if ($clean === '' || $clean === null) {
            return null;
        }

        $clean = str_replace('.', '', $clean);
        $clean = str_replace(',', '.', $clean);

        if (!is_numeric($clean)) {
            return null;
        }

        return (int) round((float) $clean);
    }

    private function throwError(int $rowNumber, string $message): void
    {
        throw new \InvalidArgumentException("Baris {$rowNumber}: {$message}");
    }

    private function trackDateRange(?string $tanggal): void
    {
        if (!$tanggal) {
            return;
        }

        $this->minDate = $this->minDate
            ? min($this->minDate, $tanggal)
            : $tanggal;

        $this->maxDate = $this->maxDate
            ? max($this->maxDate, $tanggal)
            : $tanggal;
    }

    private function isRowEmpty(array $row): bool
    {
        foreach ($row as $value) {
            if ($value !== null && trim((string) $value) !== '') {
                return false;
            }
        }

        return true;
    }
}
