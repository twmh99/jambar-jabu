import React from "react";
import { createPortal } from "react-dom";

export default function ConfirmActionModal({
  open,
  title = "Konfirmasi",
  message,
  description,
  confirmLabel = "Ya, Simpan",
  cancelLabel = "Batal",
  onConfirm,
  onCancel,
  loading = false,
}) {
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4 animate-fadeIn">
      <div className="w-full max-w-lg rounded-2xl bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-2xl border border-[hsl(var(--border))] animate-scaleIn overflow-hidden">
        <div className="px-6 py-4 border-b border-[hsl(var(--border))] flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            onClick={onCancel}
            className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
          >
            <i className="fa-solid fa-xmark text-lg" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-3 text-sm">
          {message && <p className="font-medium">{message}</p>}
          {description && <p className="text-[hsl(var(--muted-foreground))]">{description}</p>}
        </div>
        <div className="px-6 py-4 border-t border-[hsl(var(--border))] flex justify-end gap-3">
          <button onClick={onCancel} className="btn-neutral" disabled={loading}>
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-[hsl(var(--primary))] text-white hover:bg-[hsl(var(--primary)/0.9)] transition flex items-center gap-2 disabled:opacity-70"
          >
            {loading ? (
              <>
                <i className="fa-solid fa-spinner animate-spin" /> Menyimpan...
              </>
            ) : (
              <>
                <i className="fa-solid fa-floppy-disk" /> {confirmLabel}
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
