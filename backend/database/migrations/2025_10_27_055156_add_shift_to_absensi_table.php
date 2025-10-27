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
    Schema::table('absensi', function (Blueprint $table) {
        $table->string('shift', 50)->nullable()->after('tanggal'); // misalnya shift pagi/siang/malam
    });
}

public function down()
{
    Schema::table('absensi', function (Blueprint $table) {
        $table->dropColumn('shift');
    });
}
};
