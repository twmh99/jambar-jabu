<?php

return [

    'defaults' => [
        'guard' => 'web',
        'passwords' => 'users',
    ],

    'guards' => [
        // Session guard untuk web
        'web' => [
            'driver' => 'session',
            'provider' => 'users',
        ],

        // ❗JANGAN pakai 'sanctum' di sini.
        // Biarkan Sanctum bekerja lewat middleware 'auth:sanctum'.
        // Gunakan 'token' guard standar untuk kompatibilitas.
        'api' => [
            'driver' => 'token',
            'provider' => 'users',
            'hash' => false,
        ],
    ],

    'providers' => [
        'users' => [
            'driver' => 'eloquent',
            'model'  => App\Models\User::class,
        ],
    ],

    'passwords' => [
        'users' => [
            'provider' => 'users',
            'table'    => 'password_reset_tokens',
            'expire'   => 60,
            'throttle' => 60,
        ],
    ],

    'password_timeout' => 10800,

];
