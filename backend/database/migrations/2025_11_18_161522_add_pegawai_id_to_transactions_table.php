<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up()
    {
        if (!Schema::hasTable('transactions')) {
            return;
        }

        Schema::table('transactions', function (Blueprint $table) {
            if (!Schema::hasColumn('transactions', 'pegawai_id')) {
                $table->unsignedBigInteger('pegawai_id')->nullable()->after('id');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (!Schema::hasTable('transactions')) {
            return;
        }

        Schema::table('transactions', function (Blueprint $table) {
            if (Schema::hasColumn('transactions', 'pegawai_id')) {
                $table->dropColumn('pegawai_id');
            }
        });
    }
};
