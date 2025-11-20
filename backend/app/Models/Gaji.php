<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Gaji extends Model
{
    use HasFactory;

    protected $table = 'gaji';
    protected $fillable = [
        'pegawai_id', 'periode_awal', 'periode_akhir',
        'total_jam', 'gaji_pokok', 'bonus_tip', 'total_gaji', 'total_tip'
    ];

    public function pegawai()
    {
        return $this->belongsTo(Pegawai::class, 'pegawai_id');
    }

    public function tips()
    {
        return $this->hasMany(Tip::class, 'pegawai_id', 'pegawai_id');
    }
}
