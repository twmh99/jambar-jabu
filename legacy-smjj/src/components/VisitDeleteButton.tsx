"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import AppDialog from "./AppDialog";
import { useToast } from "./ToastProvider";

export default function VisitDeleteButton({ visitId }: { visitId: number }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const showToast = useToast();
  const router = useRouter();

  async function deleteVisit() {
    setIsDeleting(true);
    try {
      const form = new FormData();
      form.append("_method", "DELETE");
      const res = await fetch(`/api/visits/${visitId}`, {
        method: "POST",
        body: form,
        headers: { "x-requested-with": "fetch" },
      });
      if (!res.ok) throw new Error();
      showToast({ type: "success", message: "Riwayat kunjungan terhapus." });
      router.refresh();
    } catch {
      showToast({
        type: "error",
        message: "Gagal menghapus riwayat kunjungan. Coba lagi.",
      });
    } finally {
      setIsDeleting(false);
    }
  }

  const confirmDelete = () => {
    setConfirmOpen(false);
    void deleteVisit();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        disabled={isDeleting}
        className="inline-flex items-center rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-red-500 shadow hover:bg-red-50 hover:shadow-md transition disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Trash2 size={16} />
        <span className="ml-1 text-xs">{isDeleting ? "Menghapus..." : "Hapus"}</span>
      </button>

      <AppDialog
        open={confirmOpen}
        title="Hapus riwayat ini?"
        description="Data kunjungan yang dihapus tidak dapat dikembalikan."
        confirmText="Hapus"
        cancelText="Batal"
        tone="danger"
        icon={<Trash2 size={22} />}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
