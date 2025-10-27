<?php

namespace App\Providers;

use Illuminate\Support\Facades\Route;
use Illuminate\Foundation\Support\Providers\RouteServiceProvider as ServiceProvider;

class RouteServiceProvider extends ServiceProvider
{
    /**
     * Register routes untuk aplikasi SMPJ.
     */
    public function boot(): void
    {
        $this->routes(function () {
            // Semua route API akan memakai prefix /api/
            Route::middleware('api')
                ->prefix('api')
                ->group(base_path('routes/api.php'));

            // Semua route web (opsional)
            Route::middleware('web')
                ->group(base_path('routes/web.php'));
        });
    }
}
