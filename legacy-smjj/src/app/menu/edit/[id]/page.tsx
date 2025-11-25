import { query } from "@/lib/db";
import EditMenuClient from "./EditMenuClient";

export default async function EditMenuPage(props: { params: Promise<{ id: string }> }) {
  // ✅ Wajib pakai await di sini
  const { id } = await props.params;

  // 🔍 Ambil data menu dari database
  const { rows } = await query("SELECT * FROM menus WHERE id = $1", [id]);
  const menu = rows[0];

  // ⚠️ Jika data tidak ditemukan
  if (!menu) {
    return (
      <div className="p-6 text-center text-gray-600">
        <h1 className="text-xl font-semibold mb-2 text-[#e31c1c]">
          Menu Tidak Ditemukan
        </h1>
        <a
          href="/menu"
          className="text-blue-600 underline hover:text-blue-800 transition"
        >
          Kembali ke daftar menu
        </a>
      </div>
    );
  }

  // ✅ Kirim data ke komponen client
  return <EditMenuClient menu={menu} />;
}
