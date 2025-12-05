<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class Setting extends Model
{
    protected $fillable = ['key', 'value', 'description'];

    /**
     * Retrieve a setting value with caching.
     */
    public static function getValue(string $key, $default = null)
    {
        return Cache::remember("setting:{$key}", 3600, function () use ($key, $default) {
            $record = static::where('key', $key)->first();
            return $record ? $record->value : $default;
        });
    }

    /**
     * Update or create a setting value and flush cache.
     */
    public static function setValue(string $key, $value, ?string $description = null): void
    {
        static::updateOrCreate(
            ['key' => $key],
            ['value' => (string) $value, 'description' => $description]
        );

        Cache::forget("setting:{$key}");
    }

    /**
     * Retrieve coordinate-like values and automatically migrate legacy defaults.
     */
    public static function getCoordinate(string $key, float $default, ?float $legacyDefault = null): float
    {
        return static::getNumericWithMigration($key, $default, $legacyDefault);
    }

    /**
     * General helper for numeric settings with optional migration from old defaults.
     */
    public static function getNumericWithMigration(string $key, float $default, ?float $legacyDefault = null): float
    {
        $value = (float) static::getValue($key, $default);

        if ($legacyDefault !== null && abs($value - $legacyDefault) < 0.000001) {
            static::setValue($key, $default);
            return $default;
        }

        return $value;
    }
}
