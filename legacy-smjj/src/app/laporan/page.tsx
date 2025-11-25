import Shell from "@/components/Shell";
import { requireRole } from "@/lib/session";
import { query } from "@/lib/db";
import { redirect } from "next/navigation";
import LaporanClient from "@/components/LaporanClient"; 

export const dynamic = "force-dynamic";

export default async function LaporanPage() {
  const can = await requireRole(["OWNER"]);
  if (!can.ok) redirect("/login");

  // 🔹 Query data dari database (server side)
  const { rows: pelanggan } = await query("SELECT COUNT(*)::int AS total FROM customers");
  const { rows: kunjungan } = await query("SELECT COUNT(*)::int AS total FROM visits");
  const { rows: penjualan } = await query("SELECT COALESCE(SUM(total_spend),0)::int AS total FROM visits");
  const { rows: favorit } = await query(`
  SELECT m.name, COUNT(v.id) AS total
  FROM visits v
  JOIN menus m ON m.id = v.menu_id
  GROUP BY m.name
  ORDER BY total DESC
  LIMIT 1
`);
  const { rows: grafik } = await query(`
    SELECT TO_CHAR(visited_at, 'Mon') AS bulan, SUM(total_spend)::int AS total
    FROM visits
    GROUP BY bulan
    ORDER BY MIN(visited_at)
  `);

  // Kirim hasil ke komponen Client
  return (
    <Shell>
      <LaporanClient
        data={{
          pelanggan: pelanggan[0]?.total || 0,
          kunjungan: kunjungan[0]?.total || 0,
          penjualan: penjualan[0]?.total || 0,
          favorit: favorit[0]?.name || "-",
          grafik,
        }}
      />
    </Shell>
  );
}
