import { query } from "@/lib/db";
import { requireRole } from "@/lib/session";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";

export default async function EditPelangganPage(props: {
  params: Promise<{ id: string }>;
}) {
  // ✅ Perbaikan utama — ambil params dengan await agar tidak error Promise
  const { id } = await props.params;

  // 🔐 Cek role user (OWNER / PEGAWAI)
  const can = await requireRole(["OWNER", "PEGAWAI"]);
  if (!can.ok) redirect("/login");

  // ✅ Ambil data pelanggan dari database
  const { rows } = await query("SELECT * FROM customers WHERE id = $1", [id]);
  const customer = rows[0];

  // ⚠️ Jika pelanggan tidak ditemukan
  if (!customer)
    return (
      <div className="p-6 text-center">
        <h1 className="text-xl font-semibold mb-2 text-[#e31c1c]">
          Pelanggan Tidak Ditemukan
        </h1>
        <Link href="/pelanggan" className="text-blue-600 underline">
          Kembali ke daftar pelanggan
        </Link>
      </div>
    );

  // 🧾 Tampilan form edit pelanggan
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-10">
      {/* Card form */}
      <div className="bg-white shadow-lg rounded-xl w-full max-w-md p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-800">
            Edit Pelanggan
          </h1>
          <Link
            href="/pelanggan"
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#e31c1c] transition"
          >
            <ArrowLeft size={16} /> Kembali
          </Link>
        </div>

        <form
          action={`/api/customers/${customer.id}`}
          method="post"
          className="flex flex-col gap-4"
        >
          <input type="hidden" name="_method" value="PUT" />

          {/* Nama Pelanggan */}
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">
              Nama Lengkap
            </label>
            <input
              name="name"
              defaultValue={customer.name}
              className="border border-gray-300 focus:border-[#e31c1c] rounded-lg p-2 focus:outline-none transition"
              required
            />
          </div>

          {/* Email */}
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              name="email"
              defaultValue={customer.email || ""}
              className="border border-gray-300 focus:border-[#e31c1c] rounded-lg p-2 focus:outline-none transition"
              type="email"
              />
          </div>

          {/* Nomor Telepon */}
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">
              Nomor Telepon
            </label>
            <input
              name="phone"
              defaultValue={customer.phone || ""}
              className="border border-gray-300 focus:border-[#e31c1c] rounded-lg p-2 focus:outline-none transition"
              type="text"
            />
          </div>

          {/* Tombol Simpan */}
          <button
            type="submit"
            className="bg-[#e31c1c] text-white rounded-lg py-2 mt-2 font-medium hover:bg-red-700 transition"
          >
            Simpan Perubahan
          </button>
        </form>
      </div>

      {/* Footer */}
      <p className="text-xs text-gray-400 mt-6">
        © {new Date().getFullYear()} SMJJ — Edit Data Pelanggan
      </p>
    </div>
  );
}
