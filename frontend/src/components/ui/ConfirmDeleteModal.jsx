import React from "react";
import { createPortal } from "react-dom";

export default function ConfirmDeleteModal({
  open,
  onCancel,
  onConfirm,
  targetName,
  entityLabel = "data",
}) {
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4 animate-fadeIn">
      <div className="w-full max-w-lg rounded-2xl bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-2xl border border-[hsl(var(--border))] animate-scaleIn overflow-hidden">
        <div className="px-6 py-4 border-b border-[hsl(var(--border))] flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[hsl(var(--destructive))]">
            Konfirmasi Penghapusan
          </h3>
          <button
            onClick={onCancel}
            className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))]"
          >
            <i className="fa-solid fa-xmark text-lg" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-3 text-sm">
          <p>
            Apakah kamu yakin ingin menghapus {entityLabel}{" "}
            <span className="font-semibold text-[hsl(var(--foreground))]">
              {targetName || "ini"}
            </span>
            ?
          </p>
          <p className="text-[hsl(var(--muted-foreground))] italic">
            Tindakan ini tidak dapat dibatalkan dan data akan hilang permanen.
          </p>
        </div>
        <div className="px-6 py-4 border-t border-[hsl(var(--border))] flex justify-end gap-3">
          <button onClick={onCancel} className="btn-neutral">
            Batal
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-md bg-[hsl(var(--destructive))] text-white hover:bg-[hsl(var(--destructive)/0.9)] transition"
          >
            Hapus
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
