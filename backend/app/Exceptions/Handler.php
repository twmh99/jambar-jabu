<?php

namespace App\Exceptions;

use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Throwable;

class Handler extends ExceptionHandler
{
    protected $dontReport = [
        //
    ];

    protected $dontFlash = [
        'current_password',
        'password',
        'password_confirmation',
    ];

    public function register(): void
    {
        //
    }

    public function render($request, Throwable $e)
    {
        // Kalau request ke /api/* kita balikin JSON yang jelas
        if ($request->is('api/*')) {
            $status = method_exists($e, 'getStatusCode') ? $e->getStatusCode() : 500;

            $payload = [
                'message' => $e->getMessage(),
                'exception' => class_basename($e),
            ];

            if (config('app.debug')) {
                $payload['file'] = $e->getFile();
                $payload['line'] = $e->getLine();
                $payload['trace'] = collect($e->getTrace())->take(10); // cukup 10 frame biar ringkas
            }

            return response()->json($payload, $status);
        }

        return parent::render($request, $e);
    }
}
