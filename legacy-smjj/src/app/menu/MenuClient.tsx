"use client";

import { useState } from "react";
import { Edit, Trash2, Star } from "lucide-react";
import AppDialog from "@/components/AppDialog";
import { useToast } from "@/components/ToastProvider";

type Status = { type: "success" | "error"; message: string } | null;

export default function MenuClient({ initialMenus }: { initialMenus: any[] }) {
  const [menus, setMenus] = useState(initialMenus);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<Status>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: number; name?: string } | null>(null);
  const showToast = useToast();

  // Tambah menu baru
  async function handleAddMenu(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setStatus(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/menus", {
        method: "POST",
        body: new FormData(form),
        headers: { "x-requested-with": "fetch" },
      });

      if (!res.ok) throw new Error("Gagal menambah menu");
      form.reset();
      const updated = await fetch("/api/menus").then((r) => r.json());
      setMenus(updated);
      setStatus({ type: "success", message: "Menu berhasil ditambahkan." });
      showToast({ type: "success", message: "Menu berhasil ditambahkan." });
    } catch (err: any) {
      const message = err.message || "Terjadi kesalahan.";
      setStatus({ type: "error", message });
      showToast({ type: "error", message });
    } finally {
      setIsSubmitting(false);
    }
  }

  // Hapus menu
  async function deleteMenu(id: number) {
    setStatus(null);
    setDeletingId(id);
    try {
      const formData = new FormData();
      formData.append("_method", "DELETE");
      const res = await fetch(`/api/menus/${id}`, {
        method: "POST",
        body: formData,
        headers: { "x-requested-with": "fetch" },
      });
      if (!res.ok) throw new Error("Gagal menghapus menu");
      setMenus((prev) => prev.filter((m) => m.id !== id));
      setStatus({ type: "success", message: "Menu berhasil dihapus." });
      showToast({ type: "success", message: "Menu berhasil dihapus." });
    } catch (err: any) {
      const message = err.message || "Terjadi kesalahan.";
      setStatus({ type: "error", message });
      showToast({ type: "error", message });
    } finally {
      setDeletingId(null);
    }
  }

  const confirmDeleteMenu = () => {
    if (!pendingDelete) return;
    const { id } = pendingDelete;
    setPendingDelete(null);
    void deleteMenu(id);
  };

  const filtered = menus.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6 text-gray-800">
        Menu Favorit
      </h1>

      {status && (
        <div
          className={`mb-4 rounded-2xl border px-4 py-3 text-sm ${
            status.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {status.message}
        </div>
      )}

      {/* === Tambah dan Cari === */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <form
          onSubmit={handleAddMenu}
          className="flex flex-wrap items-center gap-2 bg-white p-4 rounded-lg shadow-sm border border-gray-200"
        >
          <input
            name="name"
            placeholder="Nama Menu"
            className="border rounded p-2 text-sm"
            required
          />
          <input
            name="price"
            placeholder="Harga"
            type="number"
            className="border rounded p-2 text-sm w-28"
            required
          />
          <input
            name="image_url"
            placeholder="URL Gambar"
            className="border rounded p-2 text-sm w-60"
          />
          <select
            name="rating"
            defaultValue="5"
            className="border rounded p-2 text-sm"
          >
            <option value="5">Rating 5/5</option>
            <option value="4">Rating 4/5</option>
          </select>
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-[#e31c1c] text-white rounded px-3 py-2 text-sm hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Menyimpan..." : "Tambah"}
          </button>
        </form>

        <div className="flex items-center gap-2 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <span className="text-sm text-gray-700">Cari</span>
          <input
            type="text"
            placeholder="Nama menu..."
            className="border rounded px-2 py-1 text-sm flex-1"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* === Daftar Menu === */}
      <div className="rounded-2xl bg-gradient-to-br from-white via-rose-50 to-white shadow-lg border border-white/60 glow-panel animate-pop">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/70 bg-white/60 backdrop-blur">
          <div className="flex items-center gap-3">
            <img
              src="/logo-jj.png"
              alt="Logo SMJJ"
              className="h-10 w-10 rounded-full object-cover shadow animate-floaty"
              loading="lazy"
            />
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-rose-500">
                SMJJ
              </p>
              <h3 className="text-lg font-bold text-gray-900">Koleksi Menu</h3>
            </div>
          </div>
          <span className="text-xs font-semibold text-gray-500">
            {filtered.length} menu
          </span>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filtered.map((menu) => {
              const ratingValue = Math.max(
                1,
                Math.min(5, Number(menu.rating ?? 4))
              );
              const ratingLabel = `${ratingValue}/5`;
              const stars = Array.from({ length: 5 }).map((_, idx) => (
                <Star
                  key={idx}
                  size={14}
                  className={
                    idx < ratingValue
                      ? "fill-amber-400 text-amber-400"
                      : "text-gray-300"
                  }
                />
              ));
              return (
              <div
                key={menu.id}
                className="bg-white rounded-xl shadow-md hover:shadow-lg hover:-translate-y-1 transition-transform overflow-hidden border border-gray-100 flex flex-col animate-pop"
              >
                <img
                  src={menu.image_url || "/placeholder.png"}
                  alt={menu.name}
                  className="w-full h-48 object-cover"
                />

                <div className="p-4 flex flex-col flex-1 justify-between">
                  <div className="text-center">
                    <h2 className="font-semibold text-gray-800 text-lg">
                      {menu.name}
                    </h2>
                    <p className="text-gray-600 text-sm mt-1">
                      Rp {Number(menu.price || 0).toLocaleString("id-ID")}
                    </p>
                    <div className="mt-2 flex items-center justify-center gap-1 text-xs font-semibold text-amber-500">
                      {stars}
                      <span className="ml-1 text-gray-600">{ratingLabel}</span>
                    </div>
                  </div>

                  <div className="flex justify-center gap-3 mt-4">
                    <a
                      href={`/menu/edit/${menu.id}`}
                      title="Edit"
                      className="p-2 rounded bg-blue-500 hover:bg-blue-600 text-white"
                    >
                      <Edit size={16} />
                    </a>
                    <button
                      onClick={() => setPendingDelete({ id: menu.id, name: menu.name })}
                      title="Hapus"
                      disabled={deletingId === menu.id}
                      className="p-2 rounded bg-red-500 hover:bg-red-600 text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
            })}

            {filtered.length === 0 && (
              <div className="col-span-full text-center text-gray-500">
                Menu tidak ditemukan.
              </div>
            )}
          </div>
        </div>
      </div>
      </div>

      <AppDialog
        open={Boolean(pendingDelete)}
        title={`Hapus menu ${pendingDelete?.name || "ini"}?`}
        description="Menu yang dihapus tidak dapat dikembalikan."
        confirmText="Hapus"
        cancelText="Batal"
        tone="danger"
        icon={<Trash2 size={22} />}
        onConfirm={confirmDeleteMenu}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
