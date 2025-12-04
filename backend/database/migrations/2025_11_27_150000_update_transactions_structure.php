<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('transactions')) {
            return;
        }

        Schema::table('transactions', function (Blueprint $table) {
            if (!Schema::hasColumn('transactions', 'trx_id')) {
                $table->string('trx_id', 100)->nullable()->after('pegawai_id');
            }

            if (!Schema::hasColumn('transactions', 'menu')) {
                $table->string('menu')->nullable()->after('trx_id');
            }
        });

        if (Schema::hasColumn('transactions', 'jam')) {
            Schema::table('transactions', function (Blueprint $table) {
                $table->dropColumn('jam');
            });
        }

        Schema::table('transactions', function (Blueprint $table) {
            if (!Schema::hasColumn('transactions', 'jam')) {
                $table->decimal('jam', 6, 2)->nullable()->after('jam_selesai');
            }
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('transactions')) {
            return;
        }

        Schema::table('transactions', function (Blueprint $table) {
            if (Schema::hasColumn('transactions', 'trx_id')) {
                $table->dropColumn('trx_id');
            }

            if (Schema::hasColumn('transactions', 'menu')) {
                $table->dropColumn('menu');
            }
        });

        if (Schema::hasColumn('transactions', 'jam')) {
            Schema::table('transactions', function (Blueprint $table) {
                $table->dropColumn('jam');
            });
        }

        Schema::table('transactions', function (Blueprint $table) {
            if (!Schema::hasColumn('transactions', 'jam')) {
                $table->time('jam')->nullable()->after('jam_selesai');
            }
        });
    }
};
