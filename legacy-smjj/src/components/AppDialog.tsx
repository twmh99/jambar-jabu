"use client";

import { ReactNode, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";

type DialogTone = "info" | "danger";

const toneStyles: Record<
  DialogTone,
  { icon: string; confirm: string; cancel: string }
> = {
  info: {
    icon: "bg-sky-100 text-sky-600 dark:bg-sky-500/20 dark:text-sky-200",
    confirm:
      "bg-gradient-to-r from-sky-500 to-blue-500 text-white shadow-lg shadow-sky-200/70 hover:shadow-xl dark:shadow-sky-900/40",
    cancel:
      "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/10",
  },
  danger: {
    icon: "bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-200",
    confirm:
      "bg-gradient-to-r from-rose-500 to-orange-500 text-white shadow-lg shadow-rose-200/70 hover:shadow-xl dark:shadow-rose-900/40",
    cancel:
      "border-gray-200 text-gray-600 hover:bg-rose-50/40 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/10",
  },
};

export interface AppDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  eyebrow?: string;
  tone?: DialogTone;
  icon?: ReactNode;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export default function AppDialog({
  open,
  title,
  description,
  confirmText = "OK",
  cancelText,
  eyebrow = "Konfirmasi",
  tone = "info",
  icon,
  onConfirm,
  onCancel,
}: AppDialogProps) {
  const headingId = useId();
  const styles = toneStyles[tone];
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[2000] flex min-h-screen w-screen items-center justify-center px-4 py-8 pointer-events-none">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={headingId}
        className="pointer-events-auto w-full max-w-md rounded-3xl border border-white/70 bg-white/95 p-6 text-gray-900 shadow-2xl dark:border-white/10 dark:bg-slate-900 dark:text-gray-100"
      >
        <div className="flex items-start gap-3">
          {icon && <div className={`rounded-2xl p-3 ${styles.icon}`}>{icon}</div>}
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-500/70 dark:text-rose-200/70">
              {eyebrow}
            </p>
            <h2 id={headingId} className="text-lg font-bold text-gray-900 dark:text-white">
              {title}
            </h2>
          </div>
        </div>
        {description && (
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">{description}</p>
        )}
        <div className="mt-6 flex justify-end gap-3">
          {cancelText && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className={`rounded-2xl border px-4 py-2 text-sm font-semibold transition ${styles.cancel}`}
            >
              {cancelText}
            </button>
          )}
          {onConfirm && (
            <button
              type="button"
              onClick={onConfirm}
              className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${styles.confirm}`}
            >
              {confirmText}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
