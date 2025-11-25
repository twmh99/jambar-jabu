"use client";

import { useState } from "react";
import { Upload, Info } from "lucide-react";

type Status = { type: "success" | "error"; message: string } | null;

export default function VisitsImportForm() {
  const [status, setStatus] = useState<Status>(null);
  const [isUploading, setIsUploading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fileInput = form.elements.namedItem("file") as HTMLInputElement | null;
    const file = fileInput?.files?.[0];

    if (!file) {
      setStatus({ type: "error", message: "Pilih berkas CSV / JSON terlebih dahulu." });
      return;
    }

    setIsUploading(true);
    setStatus(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/visits/impor", {
        method: "POST",
        body: formData,
        headers: { "x-requested-with": "fetch" },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Impor gagal, periksa format berkas.");
      }

      setStatus({
        type: "success",
        message: "Riwayat berhasil diimpor. Silakan refresh data untuk melihat perubahan.",
      });
      form.reset();
    } catch (err: any) {
      setStatus({ type: "error", message: err.message || "Terjadi kesalahan." });
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 bg-white px-3 py-2 rounded-lg shadow border border-gray-200">
      <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
        <label className="text-sm text-gray-700 font-medium">
          Impor riwayat (CSV/JSON)
        </label>
        <input type="file" name="file" accept=".csv,.json" required className="text-xs" />
        <button
          type="submit"
          disabled={isUploading}
          className="flex items-center gap-1 bg-[#e31c1c] text-white text-xs px-3 py-1.5 rounded hover:bg-red-700 transition disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Upload size={14} />
          {isUploading ? "Mengunggah..." : "Impor"}
        </button>
      </form>

      <div className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">
        <Info size={14} />
        Contoh kolom: <code className="font-semibold">nama_pelanggan, nomor_telepon, tanggal_transaksi, total_transaksi, poin_didapat</code>
      </div>

      {status && (
        <p
          className={`text-xs ${
            status.type === "success" ? "text-emerald-600" : "text-rose-600"
          }`}
        >
          {status.message}
        </p>
      )}
    </div>
  );
}
