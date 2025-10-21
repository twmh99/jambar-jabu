import React from 'react'

export default function ConfirmDeleteModal({ open, onCancel, onConfirm, targetName }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[hsl(var(--card))] text-[hsl(var(--foreground))] rounded-lg shadow-elevated p-6 w-[90%] sm:w-[400px] animate-scaleIn">
        <h2 className="text-lg font-semibold mb-3 text-[hsl(var(--destructive))]">Hapus Data</h2>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">
          Apakah kamu yakin ingin menghapus data pegawai{' '}
          <b className="text-[hsl(var(--foreground))]">{targetName || 'ini'}</b>?<br />
          Tindakan ini tidak dapat dibatalkan.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-md border border-[hsl(var(--primary))] text-[hsl(var(--primary))] hover:bg-[hsl(var(--muted))] transition"
          >
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
    </div>
  )
}
