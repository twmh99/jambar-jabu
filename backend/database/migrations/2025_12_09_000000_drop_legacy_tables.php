<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Remove unused legacy tables that are no longer part of the application schema.
     */
    public function up(): void
    {
        $tables = [
            'customers',
            'favorites',
            'menus',
            'products',
            'retail_products',
            'retail_suppliers',
            'retail_transactions',
            'rewards',
            'visits',
            'log_aktivitas',
        ];

        Schema::disableForeignKeyConstraints();

        foreach ($tables as $table) {
            Schema::dropIfExists($table);
        }

        Schema::enableForeignKeyConstraints();
    }

    /**
     * These tables were legacy artefacts, so we do not recreate them on rollback.
     */
    public function down(): void
    {
        // Intentionally left blank.
    }
};
