<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Transaction extends Model
{
    use HasFactory;

    protected $table = 'transactions';

    // IZINKAN SEMUA FIELD YANG KITA PAKAI
    protected $fillable = [
        'pegawai_id',
        'trx_id',
        'menu',
        'qty',
        'harga',
        'total',
        'shift',
        'customer_name',
        'jam',          // durasi jam kerja (jika diisi)
        'jam_mulai',
        'jam_selesai',
        'tanggal',
        'payment_method',
    ];

    public function pegawai()
    {
        return $this->belongsTo(Pegawai::class, 'pegawai_id');
    }
}
