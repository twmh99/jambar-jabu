<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Pegawai extends Model
{
    use HasFactory;

    protected $table = 'pegawai';

    protected $fillable = [
        'nama',
        'jabatan',
        'telepon',
        'status',
        'hourly_rate',
    ];

    /**
     * 🔗 Relasi ke User (hindari loop)
     */
    public function user()
    {
        // Jangan select pegawai_id di sini agar tidak eager load balik
        return $this->hasOne(User::class, 'pegawai_id')
            ->select('id', 'name', 'email', 'role', 'pegawai_id');
    }

    public function absensi()
    {
        return $this->hasMany(Absensi::class);
    }

    public function gaji()
    {
        return $this->hasMany(Gaji::class);
    }
}
