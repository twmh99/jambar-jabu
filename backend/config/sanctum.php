<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Stateful Domains
    |--------------------------------------------------------------------------
    |
    | Biarkan default untuk SPA. Untuk penggunaan token Bearer, konfigurasi ini
    | tidak memicu loop.
    |
    */
    'stateful' => explode(',', env('SANCTUM_STATEFUL_DOMAINS', implode(',', [
        'localhost',
        'localhost:3000',
        '127.0.0.1',
        '127.0.0.1:3000',
    ]))),

    /*
    |--------------------------------------------------------------------------
    | Guards
    |--------------------------------------------------------------------------
    |
    | ❗JANGAN set ke ['api'] (itu penyebab recursion).
    | Biarkan 'web' (default) supaya Sanctum tidak memanggil dirinya sendiri.
    |
    */
    'guard' => ['web'],

    /*
    |--------------------------------------------------------------------------
    | Expiration (minutes)
    |--------------------------------------------------------------------------
    */
    'expiration' => env('SANCTUM_EXPIRATION', 43200), // 30 hari

    /*
    |--------------------------------------------------------------------------
    | Token Prefix
    |--------------------------------------------------------------------------
    */
    'token_prefix' => env('SANCTUM_TOKEN_PREFIX', ''),

    /*
    |--------------------------------------------------------------------------
    | Sanctum Middleware
    |--------------------------------------------------------------------------
    */
    'middleware' => [
        // Dipakai jika kamu juga pakai SPA auth (cookie-based)
        'authenticate_session' => Laravel\Sanctum\Http\Middleware\AuthenticateSession::class,
        'validate_csrf_token'  => Illuminate\Foundation\Http\Middleware\ValidateCsrfToken::class,
        'encrypt_cookies'      => Illuminate\Cookie\Middleware\EncryptCookies::class,
    ],
];
