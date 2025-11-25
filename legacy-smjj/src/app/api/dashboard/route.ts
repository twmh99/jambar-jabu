import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  try {
    // Jalankan query secara paralel biar cepat
    const [pelanggan, kunjungan, penjualan] = await Promise.all([
      query("SELECT COUNT(*)::int AS total FROM customers"),
      query("SELECT COUNT(*)::int AS total FROM visits"),
      query("SELECT COALESCE(SUM(total_spend), 0)::int AS total FROM visits"),
    ]);

    // Ambil hasilnya dari setiap query
    const totalPelanggan = pelanggan.rows[0]?.total || 0;
    const totalKunjungan = kunjungan.rows[0]?.total || 0;
    const totalPenjualan = penjualan.rows[0]?.total || 0;

    // Kirim response JSON
    return NextResponse.json({
      success: true,
      totalPelanggan,
      totalKunjungan,
      totalPenjualan,
    });
  } catch (error) {
    console.error("❌ Error fetching dashboard data:", error);
    return NextResponse.json(
      { success: false, message: "Gagal memuat data dashboard" },
      { status: 500 }
    );
  }
}
