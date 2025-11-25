import { query } from "@/lib/db";

export async function GET() {
  const { rows } = await query(`
    SELECT 
      total_pelanggan AS pelanggan,
      total_kunjungan AS kunjungan,
      total_penjualan AS penjualan,
      menu_favorit AS favorit,
      to_char(tanggal, 'YYYY-MM-DD') AS tanggal
    FROM laporan
    ORDER BY tanggal DESC
    LIMIT 1
  `);

  return Response.json(rows[0] || {
    pelanggan: 0,
    kunjungan: 0,
    penjualan: 0,
    favorit: "-",
    grafik: []
  });
}
