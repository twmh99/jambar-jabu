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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm m-0 p-0">
      {/* === Kontainer utama modal === */}
      <div
        className={`relative w-full ${maxWidth} mx-auto bg-[hsl(var(--card))] text-[hsl(var(--foreground))] rounded-2xl shadow-2xl border border-[hsl(var(--border))] animate-scaleIn overflow-hidden`}
        style={{
          overflowX: "hidden",
          maxWidth: "640px",
        }}
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
        <div className="p-6 overflow-y-auto overflow-x-hidden max-h-[75vh] [scrollbar-width:none] modal-scroll">
          {children}
        </div>

      </div>
    </div>,
    document.body
  );
}
