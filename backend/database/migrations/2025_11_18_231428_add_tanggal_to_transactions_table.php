<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        if (!Schema::hasTable('transactions')) {
            return;
        }

        Schema::table('transactions', function (Blueprint $table) {
            if (!Schema::hasColumn('transactions', 'tanggal')) {
                $table->date('tanggal')->nullable()->after('pegawai_id');
            }
        });
    }

    public function down()
    {
        if (!Schema::hasTable('transactions')) {
            return;
        }

        Schema::table('transactions', function (Blueprint $table) {
            if (Schema::hasColumn('transactions', 'tanggal')) {
                $table->dropColumn('tanggal');
            }
        });
    }
};
