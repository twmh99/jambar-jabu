import Shell from "@/components/Shell";
import MenuClient from "./MenuClient";
import { requireRole } from "@/lib/session";
import { query } from "@/lib/db";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function MenuPage() {
  // dY"' Cek role user (OWNER / PEGAWAI)
  const can = await requireRole(["OWNER", "PEGAWAI"]);
  if (!can.ok) redirect("/login");

  await query(
    "ALTER TABLE menus ADD COLUMN IF NOT EXISTS rating INTEGER NOT NULL DEFAULT 4"
  );

  // �o. Ambil semua menu aktif dari database
  const { rows: menus } = await query(
    "SELECT * FROM menus WHERE is_active = true ORDER BY created_at DESC"
  );

  return (
    <Shell>
      <MenuClient initialMenus={menus} />
    </Shell>
  );
}
