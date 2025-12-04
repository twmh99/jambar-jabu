<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TransactionImportLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'file_name',
        'imported_at',
        'meta',
    ];

    protected $casts = [
        'imported_at' => 'datetime',
        'meta' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
