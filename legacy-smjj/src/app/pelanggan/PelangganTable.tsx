"use client";

import { useEffect, useState } from "react";
import { Edit, Gift, Trash2 } from "lucide-react";
import AppDialog from "@/components/AppDialog";
import { useToast } from "@/components/ToastProvider";

type Status = { type: "success" | "error"; message: string } | null;

export default function PelangganTable({ customers }: { customers: any[] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [list, setList] = useState(customers);
  const [status, setStatus] = useState<Status>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: number; name?: string } | null>(null);
  const [page, setPage] = useState(1);
  const showToast = useToast();
  const perPage = 10;
  const [formError, setFormError] = useState<{ message: string; field?: string } | null>(null);

  async function handleAddCustomer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus(null);
    setFormError(null);
    setIsSubmitting(true);
    const form = e.currentTarget;

    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        body: new FormData(form),
        headers: { "x-requested-with": "fetch" },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message = data.error || "Gagal menambahkan pelanggan.";
        setFormError({ message, field: data.field });
        throw new Error(message);
      }
      const created = await res.json();
      form.reset();
      setList((prev) => [created, ...prev]);
      setStatus({ type: "success", message: "Pelanggan berhasil ditambahkan." });
      showToast({ type: "success", message: "Pelanggan berhasil ditambahkan." });
      setFormError(null);
    } catch (err: any) {
      const message = err.message || "Terjadi kesalahan.";
      setStatus({ type: "error", message });
      showToast({ type: "error", message });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function deleteCustomer(id: number) {
    setStatus(null);
    setBusyId(id);
    try {
      const formData = new FormData();
      formData.append("_method", "DELETE");
      const res = await fetch(`/api/customers/${id}`, {
        method: "POST",
        body: formData,
        headers: { "x-requested-with": "fetch" },
      });
      if (!res.ok) throw new Error("Gagal menghapus pelanggan.");
      setList((prev) => prev.filter((c) => c.id !== id));
      setStatus({ type: "success", message: "Data pelanggan terhapus." });
      showToast({ type: "success", message: "Data pelanggan terhapus." });
    } catch (err: any) {
      const message = err.message || "Terjadi kesalahan.";
      setStatus({ type: "error", message });
      showToast({ type: "error", message });
    } finally {
      setBusyId(null);
    }
  }

  const confirmDeleteCustomer = () => {
    if (!pendingDelete) return;
    const { id } = pendingDelete;
    setPendingDelete(null);
    void deleteCustomer(id);
  };

  // Filter data pelanggan (nama, email, telepon)
  const filtered = list.filter(
    (c) =>
      c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * perPage;
  const pageItems = filtered.slice(startIndex, startIndex + perPage);
  const startEntry = total === 0 ? 0 : startIndex + 1;
  const endEntry = Math.min(startIndex + pageItems.length, total);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return (
    <>
      {/* === Bagian Tambah & Cari === */}
      <div className="flex justify-between items-center mb-4">
        <form
          onSubmit={handleAddCustomer}
          className="flex gap-2 items-center"
        >
          <input
            name="name"
            placeholder="Nama"
            className={`border rounded p-2 text-sm ${formError?.field === "name" ? "border-red-500 focus:border-red-500" : ""}`}
            required
            onChange={() => {
              if (formError?.field === "name") setFormError(null);
            }}
          />
          <input
            name="email"
            placeholder="Email"
            className={`border rounded p-2 text-sm ${formError?.field === "email" ? "border-red-500 focus:border-red-500" : ""}`}
            type="email"
            onChange={() => {
              if (formError?.field === "email") setFormError(null);
            }}
          />
          <input
            name="phone"
            placeholder="Telepon"
            className={`border rounded p-2 text-sm ${formError?.field === "phone" ? "border-red-500 focus:border-red-500" : ""}`}
            onChange={() => {
              if (formError?.field === "phone") setFormError(null);
            }}
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-[#e31c1c] text-white rounded px-3 py-2 text-sm hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Menyimpan..." : "Tambah"}
          </button>
        </form>
        {formError && (
          <p className="text-xs text-red-500 mt-1">{formError.message}</p>
        )}

        {/* Input cari */}
        <div className="flex items-center gap-2">
          <span className="text-sm">Cari</span>
          <input
            type="text"
            placeholder="Nama / Email / Telepon"
            className="border rounded px-2 py-1 text-sm"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

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

      {/* === Tabel Data Pelanggan === */}
      <div className="rounded-2xl bg-gradient-to-br from-white via-rose-50 to-white shadow-lg border border-white/60 glow-panel animate-pop">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/70 bg-white/60 backdrop-blur">
          <div className="flex items-center gap-3">
            <img
              src="/logo-jj.png"
              alt="Logo JJ"
              className="h-10 w-10 rounded-full object-cover shadow animate-floaty"
              loading="lazy"
            />
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-rose-500">
                SMJJ
              </p>
              <h3 className="text-lg font-bold text-gray-900">
                Daftar Pelanggan
              </h3>
            </div>
          </div>
          <span className="text-xs font-semibold text-gray-500">
            Total: {filtered.length} orang
          </span>
        </div>
        <div className="overflow-auto">
          <table className="table-playful">
            <thead className="text-left">
              <tr>
                <th className="w-10 text-center">No</th>
                <th>Nama</th>
                <th>Email</th>
              <th>Telepon</th>
              <th className="text-center">Poin</th>
              <th className="text-center">Kunjungan</th>
              <th className="text-center w-32">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((c: any, i: number) => (
              <tr key={c.id}>
                <td className="text-center font-semibold text-gray-600">
                  {startIndex + i + 1}
                </td>
                <td>
                  <div className="font-semibold text-gray-900">{c.name}</div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    ID #{c.id.toString().padStart(3, "0")}
                  </p>
                </td>
                <td className="text-gray-600">{c.email || "-"}</td>
                <td className="text-gray-600">{c.phone || "-"}</td>
                <td className="text-center">
                  <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-600 animate-badge">
                    {c.points} pts
                  </span>
                </td>
                <td className="text-center">
                  <span className="inline-flex items-center rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700 animate-badge">
                    {c.total_visits}x
                  </span>
                </td>

                {/* Kolom aksi */}
                <td className="text-center">
                  <div className="flex flex-wrap justify-center gap-2">
                    {/* Edit */}
                    <a
                      href={`/pelanggan/edit/${c.id}`}
                      title="Edit"
                      className="inline-flex items-center gap-1 rounded-full bg-blue-500/90 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-500"
                    >
                      <Edit size={16} />
                      Edit
                    </a>

                    {/* Tukar reward */}
                    <a
                      href={`/reward?customer_id=${c.id}&type=REDEEM`}
                      title="Tukar Reward"
                      className="inline-flex items-center gap-1 rounded-full bg-amber-500/90 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-500"
                    >
                      <Gift size={16} />
                      Tukar
                    </a>

                    {/* Hapus */}
                    <button
                      onClick={() => setPendingDelete({ id: c.id, name: c.name })}
                      type="button"
                      title="Hapus"
                      disabled={busyId === c.id}
                      className="inline-flex items-center gap-1 rounded-full bg-red-500/90 px-3 py-1 text-xs font-semibold text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Trash2 size={16} />
                      Hapus
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-gray-500 p-4">
                  Tidak ada pelanggan ditemukan.
                </td>
              </tr>
            )}
          </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 rounded-2xl bg-white/70 px-4 py-3 text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between">
        <p>
          Menampilkan {startEntry}&ndash;{endEntry} dari {total} pelanggan
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
              currentPage === 1
                ? "border-gray-100 text-gray-400"
                : "border-gray-200 text-gray-700 hover:bg-gray-100"
            }`}
          >
            &lsaquo; Sebelumnya
          </button>
          <span className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700">
            Halaman {currentPage} dari {totalPages}
          </span>
          <button
            type="button"
            disabled={currentPage === totalPages || total === 0}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
              currentPage === totalPages || total === 0
                ? "border-gray-100 text-gray-400"
                : "border-gray-200 text-gray-700 hover:bg-gray-100"
            }`}
          >
            Selanjutnya &rsaquo;
          </button>
        </div>
      </div>

      <AppDialog
        open={Boolean(pendingDelete)}
        title={`Hapus pelanggan ${pendingDelete?.name || "ini"}?`}
        description="Seluruh data terkait pelanggan ini akan terhapus permanen."
        confirmText="Hapus"
        cancelText="Batal"
        tone="danger"
        icon={<Trash2 size={22} />}
        onConfirm={confirmDeleteCustomer}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
