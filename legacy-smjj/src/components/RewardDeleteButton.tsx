"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import AppDialog from "./AppDialog";
import { useToast } from "./ToastProvider";

export default function RewardDeleteButton({ rewardId }: { rewardId: number }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const showToast = useToast();
  const router = useRouter();

  async function deleteReward() {
    setIsDeleting(true);
    try {
      const form = new FormData();
      form.append("_method", "DELETE");
      const res = await fetch(`/api/rewards/${rewardId}`, {
        method: "POST",
        body: form,
        headers: { "x-requested-with": "fetch" },
      });
      if (!res.ok) throw new Error();
      showToast({ type: "success", message: "Reward berhasil dihapus." });
      router.refresh();
    } catch {
      showToast({
        type: "error",
        message: "Gagal menghapus reward. Coba lagi.",
      });
    } finally {
      setIsDeleting(false);
    }
  }

  const handleConfirmDelete = () => {
    setShowConfirm(false);
    void deleteReward();
  };

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        disabled={isDeleting}
        className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-semibold text-red-500 shadow hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isDeleting ? "Menghapus..." : "Hapus"}
      </button>

      <AppDialog
        open={showConfirm}
        title="Hapus transaksi reward ini?"
        description="Data yang dihapus tidak dapat dikembalikan."
        confirmText="Hapus"
        cancelText="Batal"
        tone="danger"
        icon={<Trash2 size={22} />}
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  );
}
