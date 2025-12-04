<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('transactions')) {
            return;
        }

        Schema::table('transactions', function (Blueprint $table) {
            if (!Schema::hasColumn('transactions', 'customer_name')) {
                $table->string('customer_name')->nullable()->after('shift');
            }

            if (!Schema::hasColumn('transactions', 'payment_method')) {
                $table->string('payment_method', 100)->nullable()->after('total');
            }
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('transactions')) {
            return;
        }

        Schema::table('transactions', function (Blueprint $table) {
            if (Schema::hasColumn('transactions', 'customer_name')) {
                $table->dropColumn('customer_name');
            }

            if (Schema::hasColumn('transactions', 'payment_method')) {
                $table->dropColumn('payment_method');
            }
        });
    }
};
