<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->unsignedBigInteger('pegawai_id')->nullable();
            $table->string('shift')->nullable();
            $table->time('jam_mulai')->nullable();
            $table->time('jam_selesai')->nullable();
            $table->integer('qty')->nullable();
            $table->integer('harga')->nullable();
        });
    }

    public function down()
    {
        Schema::dropIfExists('transactions');
    }
};
