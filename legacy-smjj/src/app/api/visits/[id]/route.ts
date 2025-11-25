import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> } // ✅ params adalah Promise
) {
  const { id } = await params; // ✅ harus di-await dulu
  const form = await req.formData();
  const method = String(form.get("_method") || "").toUpperCase();

  if (method === "DELETE") {
    // 🔍 Ambil data kunjungan sebelum dihapus
    const { rows } = await query(
      "SELECT customer_id, earned_pts FROM visits WHERE id=$1",
      [id]
    );
    const v = (rows as any)[0];

    if (v) {
      // 🔁 Update data pelanggan (kurangi kunjungan dan poin)
      await query(
        `UPDATE customers 
         SET total_visits = GREATEST(total_visits - 1, 0), 
             points = GREATEST(points - $1, 0)
         WHERE id = $2`,
        [v.earned_pts, v.customer_id]
      );
    }

    // 🗑️ Hapus data kunjungan
    await query("DELETE FROM visits WHERE id=$1", [id]);
  }

  // 🔁 Redirect ke halaman riwayat
  return NextResponse.redirect(new URL("/riwayat", req.url));
}
