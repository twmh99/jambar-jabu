<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Absensi extends Model
{
    use HasFactory;

    protected $table = 'absensi';
    protected $fillable = [
        'pegawai_id',
        'supervisor_id',
        'tanggal',
        'jam_masuk',
        'jam_keluar',
        'status',
        'tip',
        'shift',
        'foto_url',
    ];


    protected $casts = [
        'verified' => 'boolean',
    ];

    public function pegawai()
    {
        return $this->belongsTo(Pegawai::class, 'pegawai_id');
    }

        public function supervisor()
    {
        return $this->belongsTo(User::class, 'supervisor_id');
    }


}
