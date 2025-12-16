import React from "react";
import { createPortal } from "react-dom";

export default function Modal({
  open,
  title,
  onClose,
  children,
  maxWidth = "max-w-2xl",
}) {
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4 py-6">
      <div
        className={`relative w-full ${maxWidth} bg-[hsl(var(--card))] text-[hsl(var(--foreground))] rounded-2xl shadow-2xl border border-[hsl(var(--border))] animate-scaleIn overflow-hidden max-h-[90vh] flex flex-col`}
      >
        {/* === Header Modal === */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))]">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] transition"
          >
            <i className="fa-solid fa-xmark text-lg" />
          </button>
        </div>

        {/* === Isi Modal === */}
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>,
    document.body
  );
}
