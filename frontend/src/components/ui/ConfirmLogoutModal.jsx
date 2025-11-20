import React from 'react'

export default function ConfirmLogoutModal({ open, onCancel, onConfirm }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[hsl(var(--card))] text-[hsl(var(--foreground))] rounded-lg shadow-elevated p-6 w-[90%] sm:w-[380px] animate-scaleIn">
        <h2 className="text-lg font-semibold mb-3">Konfirmasi Keluar</h2>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">
          Apakah kamu yakin ingin keluar dari akun ini?
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="btn-neutral"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-md bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] hover:bg-[hsl(var(--accent)/0.9)] transition"
          >
            Keluar
          </button>
        </div>
      </div>
    </div>
  )
}
